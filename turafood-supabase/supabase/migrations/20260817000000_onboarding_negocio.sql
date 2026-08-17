-- ============================================================
-- TURAFOOD — ONBOARDING DEL NEGOCIO DENTRO DEL PANEL
--
-- Antes el negocio tenía que llenar 4 pasos ANTES de poder entrar.
-- Eso pierde gente: quien no tiene el RUT a mano cierra la pestaña y
-- no vuelve. Ahora el registro es corto (correo y contraseña), la
-- cuenta se crea de una vez, y los requisitos se completan adentro
-- de app.turafood.com con una lista de verificación.
--
-- Esto agrega lo que hacía falta para guardar esos requisitos:
--   1. Datos de contacto y cuenta bancaria en business_profiles
--   2. Tabla de documentos + bucket privado donde viven los archivos
--   3. submit_business_for_review(): valida que esté completo ANTES
--      de mandarlo a revisión, en el servidor
-- ============================================================

-- ------------------------------------------------------------
-- 1. DATOS QUE PEDÍA EL ASISTENTE Y NO TENÍAN DÓNDE GUARDARSE
-- ------------------------------------------------------------
ALTER TABLE public.business_profiles
    ADD COLUMN IF NOT EXISTS nit                  TEXT,
    ADD COLUMN IF NOT EXISTS neighborhood         TEXT,
    ADD COLUMN IF NOT EXISTS courier_notes        TEXT,
    ADD COLUMN IF NOT EXISTS bank_name            TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_type    TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_number  TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_holder  TEXT,
    ADD COLUMN IF NOT EXISTS submitted_at         TIMESTAMPTZ;

COMMENT ON COLUMN public.business_profiles.submitted_at IS
    'Cuándo el negocio mandó su registro a revisión. NULL = todavía lo está llenando.';


-- ------------------------------------------------------------
-- 2. DOCUMENTOS
--
-- Solo se guarda la RUTA del archivo. El archivo vive en Storage,
-- en un bucket privado: sin URL pública, se lee con enlace firmado.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('rut', 'chamber', 'id_card', 'health')),
    file_path   TEXT NOT NULL,
    file_name   TEXT,
    status      TEXT NOT NULL DEFAULT 'uploaded'
                CHECK (status IN ('uploaded', 'approved', 'rejected')),
    reject_reason TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (business_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_business_docs ON public.business_documents (business_id);

ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS docs_owner_all ON public.business_documents;
CREATE POLICY docs_owner_all ON public.business_documents
    FOR ALL
    USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid());

/**
 * Un negocio no puede aprobarse sus propios documentos. El trigger
 * devuelve el estado y el revisor a lo que estaban si quien edita no
 * es administrador.
 */
CREATE OR REPLACE FUNCTION public.guard_document_review()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;
    NEW.status        := OLD.status;
    NEW.reject_reason := OLD.reject_reason;
    NEW.reviewed_by   := OLD.reviewed_by;
    NEW.reviewed_at   := OLD.reviewed_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS business_docs_guard ON public.business_documents;
CREATE TRIGGER business_docs_guard
    BEFORE UPDATE ON public.business_documents
    FOR EACH ROW EXECUTE FUNCTION public.guard_document_review();


-- ------------------------------------------------------------
-- 3. BUCKET PRIVADO PARA LOS ARCHIVOS
--
-- `public = false`: nadie los abre por URL. Cada archivo se guarda
-- bajo <business_id>/<tipo>, y las políticas exigen que la primera
-- carpeta de la ruta sea el id de quien sube.
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'business-docs', 'business-docs', false, 8388608,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = 8388608,
        allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "docs propios: subir" ON storage.objects;
CREATE POLICY "docs propios: subir" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'business-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "docs propios: leer" ON storage.objects;
CREATE POLICY "docs propios: leer" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'business-docs'
        AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
    );

DROP POLICY IF EXISTS "docs propios: reemplazar" ON storage.objects;
CREATE POLICY "docs propios: reemplazar" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'business-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "docs propios: borrar" ON storage.objects;
CREATE POLICY "docs propios: borrar" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'business-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );


-- ------------------------------------------------------------
-- 4. ALTA MÍNIMA
--
-- El registro solo pide correo, contraseña y nombre del negocio.
-- Esta función crea el perfil y la ficha en una sola transacción, con
-- el slug único resuelto en el servidor. Si ya existe, no falla: la
-- devuelve, para que reintentar no rompa nada.
-- ------------------------------------------------------------
/** Quita tildes sin depender de la extensión `unaccent` */
CREATE OR REPLACE FUNCTION public.unaccent_es(t TEXT)
RETURNS TEXT AS $$
    SELECT translate(
        t,
        'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
        'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
    );
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.register_business(
    p_name  TEXT,
    p_phone TEXT DEFAULT NULL
)
RETURNS public.business_profiles AS $$
DECLARE
    v_row  public.business_profiles%ROWTYPE;
    v_slug TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Necesitas una sesión para registrar un negocio';
    END IF;
    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RAISE EXCEPTION 'El nombre del negocio es obligatorio';
    END IF;

    SELECT * INTO v_row FROM public.business_profiles WHERE id = auth.uid();
    IF FOUND THEN
        RETURN v_row;   -- ya estaba registrado: reintentar no duplica
    END IF;

    v_slug := regexp_replace(lower(unaccent_es(btrim(p_name))), '[^a-z0-9]+', '-', 'g');
    v_slug := btrim(v_slug, '-');
    IF v_slug = '' THEN v_slug := 'negocio'; END IF;
    v_slug := left(v_slug, 40) || '-' || left(auth.uid()::text, 6);

    UPDATE public.profiles
       SET role  = 'business',
           phone = COALESCE(p_phone, phone)
     WHERE id = auth.uid();

    INSERT INTO public.business_profiles (id, name, slug, address, phone, status)
    VALUES (auth.uid(), btrim(p_name), v_slug, '', p_phone, 'pending_review')
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ------------------------------------------------------------
-- 5. MANDAR A REVISIÓN
--
-- La pantalla puede pintar la lista como quiera, pero quien decide si
-- el registro está completo es esta función. Sin los cuatro bloques
-- llenos y los tres documentos obligatorios, no pasa.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_business_for_review()
RETURNS public.business_profiles AS $$
DECLARE
    v_row     public.business_profiles%ROWTYPE;
    v_missing TEXT[] := '{}';
    v_docs    INTEGER;
BEGIN
    SELECT * INTO v_row FROM public.business_profiles WHERE id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No tienes un negocio registrado';
    END IF;

    IF btrim(COALESCE(v_row.name, '')) = ''    THEN v_missing := v_missing || 'nombre del negocio'; END IF;
    IF btrim(COALESCE(v_row.nit, '')) = ''     THEN v_missing := v_missing || 'NIT o cédula'; END IF;
    IF btrim(COALESCE(v_row.phone, '')) = ''   THEN v_missing := v_missing || 'celular de contacto'; END IF;
    IF btrim(COALESCE(v_row.address, '')) = '' THEN v_missing := v_missing || 'dirección'; END IF;
    IF btrim(COALESCE(v_row.bank_name, '')) = ''
       OR btrim(COALESCE(v_row.bank_account_number, '')) = ''
       OR btrim(COALESCE(v_row.bank_account_holder, '')) = ''
    THEN v_missing := v_missing || 'cuenta bancaria'; END IF;

    SELECT COUNT(*) INTO v_docs
      FROM public.business_documents
     WHERE business_id = auth.uid()
       AND kind IN ('rut', 'chamber', 'id_card');

    IF v_docs < 3 THEN
        v_missing := v_missing || 'documentos obligatorios (RUT, cámara de comercio y cédula)';
    END IF;

    IF array_length(v_missing, 1) > 0 THEN
        RAISE EXCEPTION 'Falta completar: %', array_to_string(v_missing, ', ');
    END IF;

    UPDATE public.business_profiles
       SET submitted_at = now(),
           status = CASE WHEN status = 'rejected' THEN 'pending_review' ELSE status END
     WHERE id = auth.uid()
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.register_business            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_business_for_review   FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_business          TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_business_for_review TO authenticated;


-- ------------------------------------------------------------
-- 6. Permisos sobre lo nuevo
-- ------------------------------------------------------------
GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
