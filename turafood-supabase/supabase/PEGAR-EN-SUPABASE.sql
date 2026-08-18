-- ============================================================
-- TURAFOOD — TODO LO QUE FALTA, EN UNA SOLA PEGADA
--
-- Este archivo se genera juntando las migraciones pendientes. Es un
-- ATAJO para el panel de Supabase; la forma correcta sigue siendo:
--
--     cd turafood-supabase && supabase db push
--
-- porque `db push` lleva la cuenta de lo que ya se aplico y esto no.
-- Usalo cuando el CLI te de problemas.
--
-- Se puede correr dos veces sin romper nada: cada tabla, politica,
-- disparador e indice trae su guarda. Lo que ya exista se reemplaza.
--
-- Despues de esto, corre en este orden:
--     1. seed-usuarios-prueba.sql   -> las cuatro cuentas
--     2. seed-catalogos.sql         -> los menus de los negocios demo
-- ============================================================



-- ============================================================
-- 20260816000008_grants.sql
-- Permisos base (esto es lo que estaba tumbando la app)
-- ============================================================

-- ============================================================
-- TURAFOOD — PERMISOS DE ROLES SOBRE public
--
-- Al recrear el esquema `public` desde cero se perdieron los permisos
-- que Supabase asigna por defecto a `anon` y `authenticated`. Sin
-- ellos, PostgREST responde "permission denied for table ..." aunque
-- las políticas RLS sean correctas: Postgres revisa primero el GRANT
-- y solo después aplica RLS.
--
-- Sobre el `GRANT ALL`: es el estándar de Supabase y no abre la base.
-- Quien decide qué filas ve cada quien son las políticas RLS, que
-- están activas en todas las tablas (ver 20260816000001_rls.sql).
-- Sin política que lo permita, un GRANT no sirve de nada.
-- ============================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Tablas y vistas que ya existen
GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Y las que se creen de aquí en adelante, para no repetir este problema
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- ------------------------------------------------------------
-- Excepciones: funciones que NO debe poder llamar cualquiera.
-- El GRANT ALL de arriba las habría abierto a `anon`, así que se
-- vuelven a cerrar aquí.
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.place_order                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_payment             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_referral             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_payout             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.settle_payout              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_business            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_courier             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_default_payment_method FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.place_order                TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment             TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral             TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_payout             TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_payout              TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_business            TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_courier             TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_default_payment_method TO authenticated;


-- ============================================================
-- 20260816000009_app_negocio_repartidor.sql
-- Aceptar pedidos, avanzar entregas, cupones
-- ============================================================

-- ============================================================
-- TURAFOOD — SOPORTE PARA app.turafood.com
--
-- Añade lo que necesitan el panel del negocio y la app del
-- repartidor y que el esquema todavía no tenía:
--
--   1. Respuesta del negocio a una reseña.
--   2. Que un repartidor en línea vea los pedidos listos sin asignar.
--   3. Tomar un pedido sin que dos repartidores se lo peleen.
--   4. Marcar la entrega verificando el código del cliente.
--
-- Todo pasa por funciones SECURITY DEFINER con validaciones adentro:
-- la app nunca escribe montos ni se autoasigna un pedido a mano.
-- ============================================================

-- ------------------------------------------------------------
-- 1. RESPUESTA DEL NEGOCIO A UNA RESEÑA
-- ------------------------------------------------------------
ALTER TABLE public.reviews
    ADD COLUMN IF NOT EXISTS business_reply TEXT,
    ADD COLUMN IF NOT EXISTS replied_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tags           TEXT[] DEFAULT '{}';

/**
 * El negocio responde una reseña suya. Se hace por función para que
 * solo pueda tocar la respuesta: ni la calificación, ni el comentario
 * del cliente, ni a quién pertenece la reseña.
 */
CREATE OR REPLACE FUNCTION public.reply_to_review(
    p_review_id UUID,
    p_reply     TEXT
)
RETURNS public.reviews AS $$
DECLARE
    v_row public.reviews%ROWTYPE;
BEGIN
    IF p_reply IS NULL OR btrim(p_reply) = '' THEN
        RAISE EXCEPTION 'La respuesta no puede estar vacía';
    END IF;

    UPDATE public.reviews
       SET business_reply = btrim(p_reply),
           replied_at     = now()
     WHERE id = p_review_id
       AND business_id = auth.uid()
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Esa reseña no es de tu negocio';
    END IF;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.reply_to_review FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_to_review TO authenticated;


-- ------------------------------------------------------------
-- 2. PEDIDOS DISPONIBLES PARA REPARTIDORES
--
-- Sin un despachador que reparta ofertas una por una, el modelo es
-- de bolsa: los pedidos listos y sin repartidor los ve cualquier
-- repartidor aprobado y en línea, y se los lleva el primero que
-- los tome. La política solo abre la LECTURA; asignarse el pedido
-- pasa por accept_order() más abajo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_courier()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.courier_profiles c
         WHERE c.id = auth.uid()
           AND c.approval_status = 'active'
           AND c.status = 'online'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.is_active_courier FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_courier TO authenticated;

DROP POLICY IF EXISTS orders_select_dispatch ON public.orders;
CREATE POLICY orders_select_dispatch ON public.orders
    FOR SELECT USING (
        courier_id IS NULL
        AND mode = 'delivery'
        AND status IN ('accepted', 'preparing', 'ready')
        AND public.is_active_courier()
    );

-- Para poder mostrar qué lleva el pedido antes de aceptarlo
DROP POLICY IF EXISTS order_items_select_dispatch ON public.order_items;
CREATE POLICY order_items_select_dispatch ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
             WHERE o.id = order_id
               AND o.courier_id IS NULL
               AND o.mode = 'delivery'
               AND o.status IN ('accepted', 'preparing', 'ready')
        )
        AND public.is_active_courier()
    );


-- ------------------------------------------------------------
-- 3. TOMAR UN PEDIDO
--
-- El WHERE con `courier_id IS NULL` es la carrera: si dos
-- repartidores tocan "Aceptar" a la vez, solo uno actualiza la fila
-- y el otro recibe el error. No hace falta bloqueo explícito.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_order(p_order_id UUID)
RETURNS public.orders AS $$
DECLARE
    v_row public.orders%ROWTYPE;
BEGIN
    IF NOT public.is_active_courier() THEN
        RAISE EXCEPTION 'Debes estar en línea y con la cuenta aprobada para tomar pedidos';
    END IF;

    UPDATE public.orders
       SET courier_id = auth.uid(),
           status     = 'courier_assigned'
     WHERE id = p_order_id
       AND courier_id IS NULL
       AND mode = 'delivery'
       AND status IN ('accepted', 'preparing', 'ready')
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese pedido ya lo tomó otro repartidor';
    END IF;

    -- Si existía una oferta para este repartidor, queda aceptada
    UPDATE public.order_offers
       SET status = 'accepted'
     WHERE order_id = p_order_id AND courier_id = auth.uid();

    -- Y las demás ofertas del mismo pedido se caen
    UPDATE public.order_offers
       SET status = 'expired'
     WHERE order_id = p_order_id AND courier_id <> auth.uid() AND status = 'pending';

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.accept_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_order TO authenticated;


-- ------------------------------------------------------------
-- 4. AVANZAR Y CERRAR LA ENTREGA
--
-- El repartidor solo puede mover SU pedido y solo hacia adelante.
-- Al entregar se valida el código que el cliente ve en su app: los
-- últimos 4 dígitos del número de pedido.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.courier_advance_order(
    p_order_id UUID,
    p_status   TEXT
)
RETURNS public.orders AS $$
DECLARE
    v_row public.orders%ROWTYPE;
BEGIN
    IF p_status NOT IN ('picked_up', 'delivering') THEN
        RAISE EXCEPTION 'Estado no permitido desde la app del repartidor';
    END IF;

    UPDATE public.orders
       SET status       = p_status,
           picked_up_at = CASE WHEN p_status = 'picked_up' THEN now() ELSE picked_up_at END
     WHERE id = p_order_id
       AND courier_id = auth.uid()
       AND status IN ('courier_assigned', 'picked_up', 'delivering')
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese pedido no está asignado a ti';
    END IF;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

/**
 * Cierra la entrega. `p_code` son los 4 últimos dígitos del número de
 * pedido, que el cliente tiene a la vista en su seguimiento.
 */
CREATE OR REPLACE FUNCTION public.complete_delivery(
    p_order_id UUID,
    p_code     TEXT
)
RETURNS public.orders AS $$
DECLARE
    v_row      public.orders%ROWTYPE;
    v_expected TEXT;
BEGIN
    SELECT * INTO v_row
      FROM public.orders
     WHERE id = p_order_id AND courier_id = auth.uid()
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese pedido no está asignado a ti';
    END IF;

    IF v_row.status = 'delivered' THEN
        RETURN v_row;   -- idempotente: reintentar no rompe nada
    END IF;

    v_expected := right(regexp_replace(v_row.order_number, '\D', '', 'g'), 4);

    IF p_code IS DISTINCT FROM v_expected THEN
        RAISE EXCEPTION 'Código incorrecto';
    END IF;

    UPDATE public.orders
       SET status       = 'delivered',
           delivered_at = now()
     WHERE id = p_order_id
    RETURNING * INTO v_row;

    -- El repartidor suma la entrega a su historial
    UPDATE public.courier_profiles
       SET total_deliveries = total_deliveries + 1,
           total_earnings   = total_earnings + COALESCE(v_row.courier_earnings, 0)
     WHERE id = auth.uid();

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.courier_advance_order FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_delivery     FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_advance_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_delivery     TO authenticated;


-- ------------------------------------------------------------
-- 5. PROMOCIONES DEL NEGOCIO
--
-- `coupons` era solo de plataforma. Con `business_id` un negocio
-- puede crear las suyas, que aplican únicamente en su tienda.
-- Las de plataforma (business_id NULL) las siguen manejando los
-- administradores.
-- ------------------------------------------------------------
ALTER TABLE public.coupons
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_coupons_business ON public.coupons (business_id);

DROP POLICY IF EXISTS coupons_business_write ON public.coupons;
CREATE POLICY coupons_business_write ON public.coupons
    FOR ALL
    USING (business_id IS NOT NULL AND business_id = auth.uid())
    WITH CHECK (business_id IS NOT NULL AND business_id = auth.uid());

-- El negocio ve las suyas aunque estén pausadas
DROP POLICY IF EXISTS coupons_select_own ON public.coupons;
CREATE POLICY coupons_select_own ON public.coupons
    FOR SELECT USING (business_id = auth.uid());


-- ------------------------------------------------------------
-- 6. Permisos sobre lo que se acaba de crear
-- ------------------------------------------------------------
GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;


-- ============================================================
-- 20260817000000_onboarding_negocio.sql
-- Alta de negocio y sus documentos
-- ============================================================

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


-- ============================================================
-- 20260817000001_fotos_producto.sql
-- Varias fotos por producto
-- ============================================================

-- ============================================================
-- TURAFOOD — GALERÍA DE FOTOS DEL PRODUCTO
--
-- Antes solo cabía una foto, y como texto libre (`image_url`), lo que
-- obligaba al negocio a conseguir la imagen en otro lado y pegar un
-- enlace. Ahora sube los archivos desde su computador o su celular.
--
-- `image_url` se conserva como la foto principal: es lo que ya leen la
-- app de cliente y el resto de pantallas. `images` guarda la galería
-- completa, y la primera de esa lista es siempre la principal.
-- ============================================================

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.products.images IS
    'Galería del producto. La primera es la principal y se copia a image_url.';

/**
 * Mantiene `image_url` sincronizada con la primera de la galería.
 * Así nada de lo que ya existe tiene que cambiar para seguir viendo
 * la foto correcta.
 */
CREATE OR REPLACE FUNCTION public.sync_product_cover()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.images IS NOT NULL AND array_length(NEW.images, 1) > 0 THEN
        NEW.image_url := NEW.images[1];
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS products_sync_cover ON public.products;
CREATE TRIGGER products_sync_cover
    BEFORE INSERT OR UPDATE OF images ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.sync_product_cover();

-- Lo que ya tenía foto arranca con ella dentro de la galería
UPDATE public.products
   SET images = ARRAY[image_url]
 WHERE image_url IS NOT NULL
   AND btrim(image_url) <> ''
   AND (images IS NULL OR array_length(images, 1) IS NULL);


-- ------------------------------------------------------------
-- BUCKET DE FOTOS
--
-- Este sí es público en lectura: son las fotos del menú, tienen que
-- verse en la app de cliente sin sesión. Escribir sigue siendo solo
-- del dueño, y la ruta empieza por su id para que nadie pueda
-- sobrescribir la carpeta de otro.
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-photos', 'product-photos', true, 5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

DROP POLICY IF EXISTS "fotos de producto: ver" ON storage.objects;
CREATE POLICY "fotos de producto: ver" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-photos');

DROP POLICY IF EXISTS "fotos de producto: subir" ON storage.objects;
CREATE POLICY "fotos de producto: subir" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'product-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "fotos de producto: reemplazar" ON storage.objects;
CREATE POLICY "fotos de producto: reemplazar" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'product-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "fotos de producto: borrar" ON storage.objects;
CREATE POLICY "fotos de producto: borrar" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'product-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;


-- ============================================================
-- 20260817000002_servicios.sql
-- Solicitudes de Growth Partner
-- ============================================================

-- ============================================================
-- TURAFOOD — SOLICITUDES DE SERVICIOS
--
-- Módulo de crecimiento del negocio: ficha de Google, campañas de
-- Google Ads y agente de voz que contesta y toma pedidos.
--
-- Ninguno de estos servicios se conecta solo. Lo que hace la app es
-- recoger, en un asistente guiado, TODO lo que el equipo de TuraFood
-- necesita para montarlo a mano, y dejarlo en una bandeja que el
-- Super Admin puede trabajar. La pantalla lo dice de frente: nadie
-- debe creer que apretando un botón ya quedó publicado en Google.
--
-- El borrador se guarda a medias a propósito: estos formularios son
-- largos y nadie los llena de una sentada.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.service_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id  UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,

    kind         TEXT NOT NULL CHECK (kind IN (
                     'gmb',          -- ficha de Google (Google Business Profile)
                     'google_ads',   -- campañas de búsqueda o video
                     'voice_agent',  -- agente de voz que contesta la línea
                     'booking',      -- reservas con recordatorio automático
                     'website',      -- sitio web
                     'custom_app',   -- app a la medida
                     'other'
                 )),

    status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                     'draft',        -- el negocio lo está llenando
                     'submitted',    -- lo mandó, esperando a TuraFood
                     'in_progress',  -- el equipo lo está montando
                     'active',       -- funcionando
                     'rejected',
                     'cancelled'
                 )),

    -- Respuestas del asistente. Va como JSON porque cada servicio pide
    -- cosas distintas y no vale la pena una tabla por cada uno.
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Lo que el equipo escribe de vuelta y el negocio ve en su panel
    team_notes   TEXT,
    reject_reason TEXT,

    assigned_to  UUID REFERENCES public.profiles(id),
    submitted_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),

    -- Un servicio activo por negocio a la vez: si quiere otro sitio web
    -- se edita el mismo, no se acumulan diez borradores iguales.
    UNIQUE (business_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_service_requests_biz
    ON public.service_requests (business_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_queue
    ON public.service_requests (status, submitted_at)
    WHERE status IN ('submitted', 'in_progress');

DROP TRIGGER IF EXISTS service_requests_touch ON public.service_requests;
CREATE TRIGGER service_requests_touch
    BEFORE UPDATE ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_requests_owner ON public.service_requests;
CREATE POLICY service_requests_owner ON public.service_requests
    FOR ALL
    USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid());

/**
 * El negocio no puede moverse el estado ni asignarse a nadie: eso lo
 * maneja el equipo. Solo puede editar sus respuestas y mandarlas.
 */
CREATE OR REPLACE FUNCTION public.guard_service_request()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;
    NEW.status        := OLD.status;
    NEW.team_notes    := OLD.team_notes;
    NEW.reject_reason := OLD.reject_reason;
    NEW.assigned_to   := OLD.assigned_to;
    NEW.submitted_at  := OLD.submitted_at;
    NEW.business_id   := OLD.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS service_requests_guard ON public.service_requests;
CREATE TRIGGER service_requests_guard
    BEFORE UPDATE ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.guard_service_request();


/**
 * Guarda el borrador. Se puede llamar cuantas veces haga falta: el
 * negocio va llenando el asistente por partes.
 */
CREATE OR REPLACE FUNCTION public.save_service_draft(
    p_kind    TEXT,
    p_payload JSONB
)
RETURNS public.service_requests AS $$
DECLARE
    v_row public.service_requests%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Necesitas una sesión';
    END IF;

    INSERT INTO public.service_requests (business_id, kind, payload)
    VALUES (auth.uid(), p_kind, COALESCE(p_payload, '{}'::jsonb))
    ON CONFLICT (business_id, kind) DO UPDATE
        SET payload = COALESCE(EXCLUDED.payload, '{}'::jsonb)
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

/**
 * Manda la solicitud al equipo. Es SECURITY DEFINER porque el trigger
 * de arriba le impide al negocio tocar `status` por su cuenta, y este
 * es el único camino permitido para hacerlo.
 */
CREATE OR REPLACE FUNCTION public.submit_service_request(
    p_kind    TEXT,
    p_payload JSONB DEFAULT NULL
)
RETURNS public.service_requests AS $$
DECLARE
    v_row public.service_requests%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Necesitas una sesión';
    END IF;

    INSERT INTO public.service_requests (business_id, kind, payload, status, submitted_at)
    VALUES (auth.uid(), p_kind, COALESCE(p_payload, '{}'::jsonb), 'submitted', now())
    ON CONFLICT (business_id, kind) DO UPDATE
        SET payload      = COALESCE(p_payload, public.service_requests.payload),
            status       = CASE
                               -- Si ya está andando, mandar de nuevo no lo
                               -- devuelve a la cola: solo actualiza datos.
                               WHEN public.service_requests.status IN ('in_progress', 'active')
                               THEN public.service_requests.status
                               ELSE 'submitted'
                           END,
            submitted_at = COALESCE(public.service_requests.submitted_at, now())
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.save_service_draft      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_service_request  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_service_draft     TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_service_request TO authenticated;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;


-- ============================================================
-- 20260817000003_limite_sin_verificar.sql
-- Tope de 20 pedidos sin verificar
-- ============================================================

-- ============================================================
-- TURAFOOD — LÍMITE DIARIO PARA NEGOCIOS SIN VERIFICAR
--
-- Un negocio puede empezar a vender apenas se registra, pero con tope:
-- 20 pedidos al día hasta que suba sus documentos y lo aprobemos.
--
-- El motivo es de seguridad, no de producto. Sin verificación no
-- sabemos quién está detrás de la cuenta ni a qué cuenta bancaria se
-- le está consignando. El tope acota cuánto daño puede hacer alguien
-- que se registre con datos falsos mientras lo revisamos.
--
-- Se aplica con un trigger sobre `orders` y NO en la pantalla: quien
-- llame a la API directamente choca con el mismo muro.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_unverified_daily_cap()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
    v_today  INTEGER;
    v_cap    CONSTANT INTEGER := 20;
BEGIN
    SELECT status INTO v_status
      FROM public.business_profiles
     WHERE id = NEW.business_id;

    -- Aprobado: sin tope
    IF v_status = 'active' THEN
        RETURN NEW;
    END IF;

    -- Suspendido o rechazado: no recibe pedidos
    IF v_status IN ('suspended', 'rejected', 'closed') THEN
        RAISE EXCEPTION 'Este negocio no está recibiendo pedidos en este momento';
    END IF;

    SELECT COUNT(*) INTO v_today
      FROM public.orders
     WHERE business_id = NEW.business_id
       AND created_at >= date_trunc('day', now());

    IF v_today >= v_cap THEN
        RAISE EXCEPTION
            'Este negocio alcanzó su límite de % pedidos diarios mientras completa su verificación', v_cap
            USING HINT = 'El negocio debe subir sus documentos en app.turafood.com para levantar el límite';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS orders_unverified_cap ON public.orders;
CREATE TRIGGER orders_unverified_cap
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.enforce_unverified_daily_cap();


/**
 * Cuántos pedidos lleva hoy y cuántos le quedan. La usa el panel para
 * mostrar el aviso con números reales en vez de un texto fijo.
 */
CREATE OR REPLACE FUNCTION public.my_daily_quota()
RETURNS TABLE (used INTEGER, cap INTEGER, verified BOOLEAN) AS $$
    SELECT
        (SELECT COUNT(*)::INTEGER
           FROM public.orders o
          WHERE o.business_id = auth.uid()
            AND o.created_at >= date_trunc('day', now())),
        20,
        (SELECT b.status = 'active' FROM public.business_profiles b WHERE b.id = auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.my_daily_quota FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_daily_quota TO authenticated;


-- ============================================================
-- 20260817000004_redes_sociales.sql
-- Cuentas, publicaciones y bandeja
-- ============================================================

-- ============================================================
-- TURAFOOD — SUITE DE REDES SOCIALES
--
-- El negocio arma sus publicaciones y anuncios aquí, ve cómo van a
-- quedar, y el equipo de TuraFood los publica con las cuentas ya
-- conectadas. Igual que el resto del módulo de crecimiento: la app es
-- la herramienta, el trabajo lo hace el equipo.
--
-- Tres piezas:
--   1. Cuentas conectadas por red
--   2. Publicaciones, con su estado y sus números
--   3. Bandeja unificada de mensajes de todas las redes
--
-- Nada guarda tokens de las redes: eso vive del lado del servidor
-- cuando exista la integración, nunca en una tabla que lee el
-- navegador con la llave pública.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CUENTAS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,

    platform    TEXT NOT NULL CHECK (platform IN (
                    'facebook', 'instagram', 'x', 'linkedin',
                    'tiktok', 'youtube', 'youtube_shorts', 'whatsapp'
                )),

    -- Cómo se llama la cuenta, para que la persona la reconozca
    account_name   TEXT,
    account_handle TEXT,
    avatar_url     TEXT,

    status      TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
                    'requested',   -- el negocio pidió conectarla
                    'connected',   -- el equipo la dejó lista
                    'error',       -- se cayó la conexión
                    'disabled'
                )),
    status_note TEXT,

    connected_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),

    UNIQUE (business_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_biz
    ON public.social_accounts (business_id);

DROP TRIGGER IF EXISTS social_accounts_touch ON public.social_accounts;
CREATE TRIGGER social_accounts_touch
    BEFORE UPDATE ON public.social_accounts
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ------------------------------------------------------------
-- 2. PUBLICACIONES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,

    -- Una publicación puede ir a varias redes a la vez
    platforms   TEXT[] NOT NULL DEFAULT '{}',
    kind        TEXT NOT NULL DEFAULT 'post' CHECK (kind IN ('post', 'story', 'reel', 'ad')),

    content     TEXT,
    images      TEXT[] DEFAULT '{}',
    link_url    TEXT,
    tone        TEXT,

    status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                    'draft',       -- el negocio lo está armando
                    'scheduled',   -- pidió que salga a una hora
                    'queued',      -- el equipo lo tiene en cola
                    'published',
                    'failed'
                )),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    failure_note TEXT,

    -- Números que el equipo trae de vuelta desde cada red
    likes    INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares   INTEGER DEFAULT 0,
    views    INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_biz
    ON public.social_posts (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_queue
    ON public.social_posts (status, scheduled_at)
    WHERE status IN ('scheduled', 'queued');

DROP TRIGGER IF EXISTS social_posts_touch ON public.social_posts;
CREATE TRIGGER social_posts_touch
    BEFORE UPDATE ON public.social_posts
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ------------------------------------------------------------
-- 3. BANDEJA DE MENSAJES
--
-- Una sola bandeja con lo que llega de todas las redes. El negocio
-- responde desde aquí y el equipo lo entrega por el canal que sea.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_threads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,

    platform    TEXT NOT NULL,
    contact_name   TEXT,
    contact_handle TEXT,
    avatar_url     TEXT,

    last_message_at TIMESTAMPTZ DEFAULT now(),
    unread_count    INTEGER DEFAULT 0,
    archived        BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_threads_biz
    ON public.social_threads (business_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.social_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id  UUID NOT NULL REFERENCES public.social_threads(id) ON DELETE CASCADE,

    -- `in` es del cliente hacia el negocio; `out` al revés
    direction  TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    body       TEXT,
    media_url  TEXT,

    -- Lo que el negocio escribe queda pendiente hasta que el equipo
    -- lo entrega por la red correspondiente
    delivery   TEXT NOT NULL DEFAULT 'pending'
               CHECK (delivery IN ('pending', 'sent', 'failed')),

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_messages_thread
    ON public.social_messages (thread_id, created_at);


-- ------------------------------------------------------------
-- 4. PERMISOS
-- ------------------------------------------------------------
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_accounts_owner ON public.social_accounts;
CREATE POLICY social_accounts_owner ON public.social_accounts
    FOR ALL USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid());

DROP POLICY IF EXISTS social_posts_owner ON public.social_posts;
CREATE POLICY social_posts_owner ON public.social_posts
    FOR ALL USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid());

DROP POLICY IF EXISTS social_threads_owner ON public.social_threads;
CREATE POLICY social_threads_owner ON public.social_threads
    FOR ALL USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid());

DROP POLICY IF EXISTS social_messages_owner ON public.social_messages;
CREATE POLICY social_messages_owner ON public.social_messages
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.social_threads t
         WHERE t.id = thread_id
           AND (t.business_id = auth.uid() OR public.is_admin())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.social_threads t
         WHERE t.id = thread_id AND t.business_id = auth.uid()
    ));

/**
 * El negocio no marca sus propias publicaciones como publicadas ni se
 * inventa los números: eso lo trae el equipo desde cada red.
 */
CREATE OR REPLACE FUNCTION public.guard_social_post()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;
    NEW.published_at := OLD.published_at;
    NEW.failure_note := OLD.failure_note;
    NEW.likes        := OLD.likes;
    NEW.comments     := OLD.comments;
    NEW.shares       := OLD.shares;
    NEW.views        := OLD.views;
    NEW.business_id  := OLD.business_id;

    -- Puede mandarlo a la cola o volverlo borrador, nada más
    IF NEW.status NOT IN ('draft', 'scheduled', 'queued') THEN
        NEW.status := OLD.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS social_posts_guard ON public.social_posts;
CREATE TRIGGER social_posts_guard
    BEFORE UPDATE ON public.social_posts
    FOR EACH ROW EXECUTE FUNCTION public.guard_social_post();

/** Igual con el estado de conexión de una cuenta */
CREATE OR REPLACE FUNCTION public.guard_social_account()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;
    NEW.status       := OLD.status;
    NEW.status_note  := OLD.status_note;
    NEW.connected_at := OLD.connected_at;
    NEW.business_id  := OLD.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS social_accounts_guard ON public.social_accounts;
CREATE TRIGGER social_accounts_guard
    BEFORE UPDATE ON public.social_accounts
    FOR EACH ROW EXECUTE FUNCTION public.guard_social_account();

GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;


-- ============================================================
-- 20260817000005_soporte.sql
-- Tickets de soporte
-- ============================================================

-- ============================================================
-- TURAFOOD — SOPORTE
--
-- Cada solicitud es una conversación, no un correo perdido. El negocio
-- ve en qué va la suya y el equipo la trabaja desde el Super Admin.
--
-- El estado y la prioridad los mueve el equipo. El negocio abre, escribe
-- y puede cerrar la suya si se resolvió; nada más. Eso evita que una
-- solicitud aparezca "resuelta" sin que nadie la haya tocado.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Quien abre. Puede ser un negocio o un repartidor: los dos entran
    -- por app.turafood.com y los dos necesitan pedir ayuda.
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Número corto para hablarlo por teléfono sin dictar un UUID
    reference   TEXT UNIQUE NOT NULL DEFAULT (
                    'TS-' || upper(substr(md5(gen_random_uuid()::text), 1, 6))
                ),

    subject     TEXT NOT NULL CHECK (length(btrim(subject)) BETWEEN 3 AND 140),
    category    TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
                    'orders',      -- pedidos y comandas
                    'payouts',     -- liquidaciones y pagos
                    'catalog',     -- menú y productos
                    'account',     -- cuenta y verificación
                    'growth',      -- servicios de crecimiento
                    'technical',   -- algo no funciona
                    'other'
                )),

    priority    TEXT NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                    'open',         -- recién abierta
                    'in_progress',  -- el equipo la está viendo
                    'waiting',      -- esperando respuesta del negocio
                    'resolved',
                    'closed'
                )),

    assigned_to UUID REFERENCES public.profiles(id),

    -- Para medir de verdad qué tan rápido contestamos
    first_response_at TIMESTAMPTZ,
    resolved_at       TIMESTAMPTZ,

    last_message_at TIMESTAMPTZ DEFAULT now(),
    unread_for_user INTEGER DEFAULT 0,

    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user
    ON public.support_tickets (user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_queue
    ON public.support_tickets (status, priority, created_at)
    WHERE status IN ('open', 'in_progress', 'waiting');

DROP TRIGGER IF EXISTS support_tickets_touch ON public.support_tickets;
CREATE TRIGGER support_tickets_touch
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


CREATE TABLE IF NOT EXISTS public.support_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id  UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    author_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- `user` es quien abrió; `team` es TuraFood
    author_role TEXT NOT NULL DEFAULT 'user' CHECK (author_role IN ('user', 'team')),

    body       TEXT NOT NULL CHECK (length(btrim(body)) > 0),
    attachment_url TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
    ON public.support_messages (ticket_id, created_at);


-- ------------------------------------------------------------
-- PERMISOS
-- ------------------------------------------------------------
ALTER TABLE public.support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tickets_owner ON public.support_tickets;
CREATE POLICY tickets_owner ON public.support_tickets
    FOR ALL USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS support_messages_owner ON public.support_messages;
CREATE POLICY support_messages_owner ON public.support_messages
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.support_tickets t
         WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_admin())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.support_tickets t
         WHERE t.id = ticket_id AND t.user_id = auth.uid()
    ) AND author_role = 'user');

/**
 * El negocio no se mueve el estado, ni la prioridad, ni se asigna a
 * nadie. Lo único suyo es cerrar una solicitud que ya se resolvió.
 */
CREATE OR REPLACE FUNCTION public.guard_support_ticket()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    NEW.priority          := OLD.priority;
    NEW.assigned_to       := OLD.assigned_to;
    NEW.first_response_at := OLD.first_response_at;
    NEW.resolved_at       := OLD.resolved_at;
    NEW.user_id           := OLD.user_id;
    NEW.reference         := OLD.reference;

    -- Reabrir o cerrar la suya sí puede
    IF NEW.status NOT IN ('open', 'closed') THEN
        NEW.status := OLD.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS support_tickets_guard ON public.support_tickets;
CREATE TRIGGER support_tickets_guard
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.guard_support_ticket();

/** Mantiene la conversación ordenada por su último mensaje */
CREATE OR REPLACE FUNCTION public.touch_support_ticket()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.support_tickets
       SET last_message_at = NEW.created_at,
           -- Si contesta el equipo, al negocio le queda sin leer
           unread_for_user = CASE
               WHEN NEW.author_role = 'team' THEN unread_for_user + 1
               ELSE 0
           END,
           first_response_at = CASE
               WHEN NEW.author_role = 'team' AND first_response_at IS NULL
               THEN NEW.created_at ELSE first_response_at
           END,
           -- Una respuesta del negocio reabre lo que estaba esperándolo
           status = CASE
               WHEN NEW.author_role = 'user' AND status = 'waiting' THEN 'in_progress'
               ELSE status
           END
     WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS support_messages_touch ON public.support_messages;
CREATE TRIGGER support_messages_touch
    AFTER INSERT ON public.support_messages
    FOR EACH ROW EXECUTE FUNCTION public.touch_support_ticket();


/**
 * Abre una solicitud con su primer mensaje, en una sola transacción.
 * Sin esto puede quedar un ticket vacío si falla el segundo insert.
 */
CREATE OR REPLACE FUNCTION public.open_support_ticket(
    p_subject  TEXT,
    p_category TEXT,
    p_body     TEXT
)
RETURNS public.support_tickets AS $$
DECLARE
    v_row public.support_tickets%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Necesitas una sesión';
    END IF;

    INSERT INTO public.support_tickets (user_id, subject, category)
    VALUES (auth.uid(), btrim(p_subject), COALESCE(p_category, 'other'))
    RETURNING * INTO v_row;

    INSERT INTO public.support_messages (ticket_id, author_id, author_role, body)
    VALUES (v_row.id, auth.uid(), 'user', btrim(p_body));

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.open_support_ticket FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_support_ticket TO authenticated;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;


-- ============================================================
-- 20260817000006_marketing.sql
-- Cola de correos hacia MailerLite
-- ============================================================

-- ============================================================
-- TURAFOOD — Marketing por correo (MailerLite)
--
-- Cuando un negocio activa un plan queremos que le llegue una
-- secuencia de correos. La tentación es llamar a MailerLite desde el
-- mismo momento en que se activa, pero eso ata dos sistemas: si
-- MailerLite está caído o el token venció, la activación del plan
-- falla. Y la activación del plan es lo que le importa al negocio.
--
-- Así que se separa en dos: aquí solo se ANOTA que hay que avisar
-- (`marketing_events`), dentro de la misma transacción que ya está
-- pasando. Una función aparte lee esa cola y llama a MailerLite. Si
-- falla, reintenta; el plan del negocio nunca se entera.
--
-- El token de MailerLite NO vive aquí ni en el repositorio: vive en
-- los secrets de Supabase, que solo el dueño pone.
--     supabase secrets set MAILERLITE_TOKEN=...
-- ============================================================

-- ------------------------------------------------------------
-- 1. A quién le escribimos
--
-- Guardamos el id que MailerLite nos devuelve para no crear el mismo
-- contacto dos veces cuando alguien compra un segundo plan.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_contacts (
    user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email        TEXT NOT NULL,
    full_name    TEXT,
    phone        TEXT,

    -- Identificador del contacto en MailerLite
    provider_id  TEXT,

    -- Si la persona se da de baja allá, lo reflejamos para no volver a
    -- meterla en grupos. MailerLite ya lo respeta, pero prefiero que la
    -- base también lo sepa: así ninguna consulta nuestra la cuenta.
    unsubscribed BOOLEAN NOT NULL DEFAULT FALSE,

    synced_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketing_contacts IS
    'Espejo local de los contactos en MailerLite. provider_id evita duplicarlos.';

-- ------------------------------------------------------------
-- 2. La cola
--
-- Cada fila es "hay que decirle esto a MailerLite". La función
-- `mailerlite-sync` la drena. `status` no se toca desde el cliente:
-- solo service_role escribe aquí.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_events (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    kind         TEXT NOT NULL CHECK (kind IN (
                     'business_registered',  -- creó su cuenta de negocio
                     'business_approved',    -- pasó la verificación
                     'plan_requested',       -- mandó la solicitud de un servicio
                     'plan_activated',       -- el plan quedó funcionando
                     'plan_cancelled'
                 )),

    -- Nombre del grupo en MailerLite. La función lo busca por nombre y
    -- lo crea si no existe: así no hay que copiar identificadores a
    -- mano cada vez que se inventa un plan nuevo.
    group_name   TEXT NOT NULL,

    -- Lo que se manda como campos del contacto (nombre del negocio,
    -- plan, precio). Nunca datos de tarjeta.
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,

    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    attempts     INT NOT NULL DEFAULT 0,
    last_error   TEXT,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at      TIMESTAMPTZ
);

-- El índice que usa la función para drenar: solo lo pendiente
CREATE INDEX IF NOT EXISTS marketing_events_pending_idx
    ON public.marketing_events (created_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS marketing_events_user_idx
    ON public.marketing_events (user_id, created_at DESC);

-- ------------------------------------------------------------
-- 3. Quién puede ver qué
--
-- Nadie escribe estas tablas desde el navegador. El negocio puede ver
-- sus propios eventos (para que el panel pueda decir "te mandamos la
-- guía de arranque"), nada más.
-- ------------------------------------------------------------
ALTER TABLE public.marketing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_events   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_contacts_self ON public.marketing_contacts;
CREATE POLICY marketing_contacts_self
    ON public.marketing_contacts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS marketing_events_self ON public.marketing_events;
CREATE POLICY marketing_events_self
    ON public.marketing_events FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Sin políticas de INSERT/UPDATE a propósito: solo service_role
-- (la Edge Function) y los triggers SECURITY DEFINER escriben.

GRANT SELECT ON public.marketing_contacts TO authenticated;
GRANT SELECT ON public.marketing_events   TO authenticated;

-- ------------------------------------------------------------
-- 4. Encolar
--
-- Una función sola, para que los triggers no repitan la resolución
-- del correo. Si la persona no tiene correo (entró con celular) el
-- evento se marca 'skipped': no es un error, es que no hay a dónde
-- escribirle.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_marketing_event(
    p_user_id    UUID,
    p_kind       TEXT,
    p_group_name TEXT,
    p_payload    JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email TEXT;
    v_name  TEXT;
    v_phone TEXT;
BEGIN
    SELECT u.email,
           COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
           u.phone
      INTO v_email, v_name, v_phone
      FROM auth.users u
     WHERE u.id = p_user_id;

    -- Sin correo no hay a quién escribirle. Queda anotado igual, para
    -- que se pueda ver en el panel de administración que pasó.
    IF v_email IS NULL OR v_email = '' THEN
        INSERT INTO public.marketing_events (user_id, kind, group_name, payload, status, last_error)
        VALUES (p_user_id, p_kind, p_group_name, p_payload, 'skipped',
                'La cuenta no tiene correo: entró con celular o con un proveedor que no lo comparte.');
        RETURN;
    END IF;

    INSERT INTO public.marketing_contacts (user_id, email, full_name, phone)
    VALUES (p_user_id, v_email, v_name, v_phone)
    ON CONFLICT (user_id) DO UPDATE
        SET email     = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, public.marketing_contacts.full_name),
            phone     = COALESCE(EXCLUDED.phone, public.marketing_contacts.phone);

    INSERT INTO public.marketing_events (user_id, kind, group_name, payload)
    VALUES (p_user_id, p_kind, p_group_name, p_payload);
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_marketing_event(UUID, TEXT, TEXT, JSONB) FROM PUBLIC;

-- ------------------------------------------------------------
-- 5. Los disparadores
--
-- Nombres de grupo en español y legibles porque el dueño los va a ver
-- en MailerLite al armar las automatizaciones. "TuraFood · Ficha de
-- Google · Activo" se entiende; "svc_gmb_active" no.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.service_kind_label(p_kind TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE p_kind
        WHEN 'gmb'         THEN 'Ficha de Google'
        WHEN 'google_ads'  THEN 'Campañas en Google'
        WHEN 'voice_agent' THEN 'Agente de voz'
        WHEN 'booking'     THEN 'Reservas'
        WHEN 'website'     THEN 'Sitio web'
        WHEN 'custom_app'  THEN 'App a la medida'
        ELSE 'Otro servicio'
    END;
$$;

CREATE OR REPLACE FUNCTION public.on_service_request_marketing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_label   TEXT := public.service_kind_label(NEW.kind);
    v_plan    TEXT := COALESCE(NEW.payload ->> 'plan', 'sin plan');
    v_payload JSONB;
BEGIN
    -- Solo nos interesan los cambios de estado, no cada tecla que el
    -- negocio escribe mientras llena el asistente.
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    v_payload := jsonb_build_object(
        'servicio', v_label,
        'kind',     NEW.kind,
        'plan',     v_plan,
        'estado',   NEW.status
    );

    IF NEW.status = 'submitted' THEN
        PERFORM public.enqueue_marketing_event(
            NEW.business_id, 'plan_requested',
            'TuraFood · ' || v_label || ' · Solicitado', v_payload);

    ELSIF NEW.status = 'active' THEN
        PERFORM public.enqueue_marketing_event(
            NEW.business_id, 'plan_activated',
            'TuraFood · ' || v_label || ' · Activo', v_payload);

    ELSIF NEW.status = 'cancelled' THEN
        PERFORM public.enqueue_marketing_event(
            NEW.business_id, 'plan_cancelled',
            'TuraFood · ' || v_label || ' · Cancelado', v_payload);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_requests_marketing ON public.service_requests;
CREATE TRIGGER service_requests_marketing
    AFTER INSERT OR UPDATE OF status ON public.service_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.on_service_request_marketing();

-- Alta y aprobación del negocio: son los dos momentos donde una
-- secuencia de bienvenida rinde más.
CREATE OR REPLACE FUNCTION public.on_business_marketing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.enqueue_marketing_event(
            NEW.id, 'business_registered', 'TuraFood · Negocios · Nuevos',
            jsonb_build_object('negocio', NEW.name));
        RETURN NEW;
    END IF;

    -- 'active' es el estado que pone el super admin al aprobar. Se
    -- compara contra el anterior para no reenviar la bienvenida cada
    -- vez que se suspende y se reactiva un negocio.
    IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
        PERFORM public.enqueue_marketing_event(
            NEW.id, 'business_approved', 'TuraFood · Negocios · Aprobados',
            jsonb_build_object('negocio', NEW.name));
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_profiles_marketing ON public.business_profiles;
CREATE TRIGGER business_profiles_marketing
    AFTER INSERT OR UPDATE OF status ON public.business_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.on_business_marketing();

-- ------------------------------------------------------------
-- 6. Lo que ve el super admin
--
-- Una vista para no repetir el join en el panel. Solo lectura y solo
-- para quien tenga rol admin: la política vive en la tabla de abajo.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.marketing_queue AS
SELECT e.id,
       e.kind,
       e.group_name,
       e.status,
       e.attempts,
       e.last_error,
       e.created_at,
       e.sent_at,
       c.email,
       c.full_name,
       e.payload
  FROM public.marketing_events e
  LEFT JOIN public.marketing_contacts c ON c.user_id = e.user_id;

COMMENT ON VIEW public.marketing_queue IS
    'Cola de correos con el contacto ya resuelto. Para el panel de administración.';


-- ============================================================
-- 20260817000007_super_admin.sql
-- Lo que necesita dash.turafood.com
-- ============================================================

-- ============================================================
-- TURAFOOD — Lo que necesita dash.turafood.com
--
-- El esquema ya trae `is_admin()` y casi todas las tablas ya dejan
-- mirar al administrador. Lo que falta es lo que el panel HACE:
-- aprobar un negocio, aprobar un repartidor, mover una solicitud de
-- servicio, y un resumen que no cueste ocho viajes a la base.
--
-- Todo pasa por funciones, no por UPDATE directo desde el navegador.
-- No es ceremonia: aprobar un negocio también tiene que dejar quién
-- lo aprobó y cuándo, y eso no se le puede confiar al cliente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. El administrador ve la cola de correos
--
-- La migración de marketing solo dejó que cada quien viera lo suyo.
-- El panel necesita verla completa para poder reintentar lo que falló.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS marketing_events_admin ON public.marketing_events;
CREATE POLICY marketing_events_admin
    ON public.marketing_events FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS marketing_contacts_admin ON public.marketing_contacts;
CREATE POLICY marketing_contacts_admin
    ON public.marketing_contacts FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ------------------------------------------------------------
-- 2. Aprobar o rechazar un negocio
--
-- Rechazar SIN motivo no se permite. Un negocio que recibe "rechazado"
-- y nada más vuelve a mandar lo mismo, y alguien tiene que revisarlo
-- otra vez: el motivo ahorra ese viaje a los dos lados.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_review_business(
    p_business_id UUID,
    p_approve     BOOLEAN,
    p_reason      TEXT DEFAULT NULL
)
RETURNS public.business_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.business_profiles;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede revisar negocios';
    END IF;

    IF NOT p_approve AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
        RAISE EXCEPTION 'Para rechazar hay que escribir el motivo';
    END IF;

    UPDATE public.business_profiles
       SET status           = CASE WHEN p_approve THEN 'active' ELSE 'rejected' END,
           rejection_reason = CASE WHEN p_approve THEN NULL ELSE btrim(p_reason) END,
           reviewed_at      = now(),
           reviewed_by      = auth.uid()
     WHERE id = p_business_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese negocio no existe';
    END IF;

    -- Al aprobar el negocio damos por buenos los documentos que
    -- estaban esperando. Dejar uno en 'pending' después de aprobar la
    -- cuenta hace que el panel del negocio siga mostrando la alerta.
    IF p_approve THEN
        UPDATE public.business_documents
           SET status = 'approved'
         WHERE business_id = p_business_id
           AND status = 'pending';
    END IF;

    RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 3. Suspender un negocio ya aprobado
--
-- Separado de la revisión a propósito: son dos decisiones distintas y
-- mezclarlas hace fácil suspender queriendo rechazar.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_business_status(
    p_business_id UUID,
    p_status      TEXT,
    p_reason      TEXT DEFAULT NULL
)
RETURNS public.business_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.business_profiles;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede cambiar el estado de un negocio';
    END IF;

    IF p_status NOT IN ('active', 'suspended', 'closed') THEN
        RAISE EXCEPTION 'Estado no válido: %', p_status;
    END IF;

    UPDATE public.business_profiles
       SET status           = p_status,
           rejection_reason = CASE WHEN p_status = 'active' THEN NULL ELSE btrim(p_reason) END,
           -- Suspendido significa que deja de recibir pedidos ya, no
           -- cuando al dueño se le ocurra abrir la tienda.
           is_open          = CASE WHEN p_status = 'active' THEN is_open ELSE FALSE END,
           reviewed_at      = now(),
           reviewed_by      = auth.uid()
     WHERE id = p_business_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese negocio no existe';
    END IF;

    RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 4. Aprobar o rechazar un repartidor
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_review_courier(
    p_courier_id UUID,
    p_approve    BOOLEAN,
    p_reason     TEXT DEFAULT NULL
)
RETURNS public.courier_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.courier_profiles;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede revisar repartidores';
    END IF;

    IF NOT p_approve AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
        RAISE EXCEPTION 'Para rechazar hay que escribir el motivo';
    END IF;

    UPDATE public.courier_profiles
       SET approval_status  = CASE WHEN p_approve THEN 'active' ELSE 'rejected' END,
           rejection_reason = CASE WHEN p_approve THEN NULL ELSE btrim(p_reason) END,
           reviewed_at      = now(),
           reviewed_by      = auth.uid()
     WHERE id = p_courier_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese repartidor no existe';
    END IF;

    RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 5. Mover una solicitud de servicio (Growth Partner)
--
-- El trigger de marketing escucha estos cambios: pasar a 'active' es
-- lo que dispara la secuencia de correos del plan.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_service_status(
    p_request_id UUID,
    p_status     TEXT,
    p_notes      TEXT DEFAULT NULL
)
RETURNS public.service_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.service_requests;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede mover una solicitud';
    END IF;

    IF p_status NOT IN ('in_progress', 'active', 'rejected', 'cancelled') THEN
        RAISE EXCEPTION 'Estado no válido: %', p_status;
    END IF;

    IF p_status = 'rejected' AND (p_notes IS NULL OR btrim(p_notes) = '') THEN
        RAISE EXCEPTION 'Para rechazar hay que escribir el motivo';
    END IF;

    UPDATE public.service_requests
       SET status        = p_status,
           team_notes    = COALESCE(btrim(p_notes), team_notes),
           reject_reason = CASE WHEN p_status = 'rejected' THEN btrim(p_notes) ELSE NULL END,
           assigned_to   = COALESCE(assigned_to, auth.uid()),
           updated_at    = now()
     WHERE id = p_request_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Esa solicitud no existe';
    END IF;

    RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 6. El resumen del tablero
--
-- Un solo viaje en vez de ocho `count(*)` desde el navegador. Devuelve
-- jsonb porque son cifras sueltas de tablas distintas y una fila con
-- veinte columnas sería peor de leer.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_today DATE := (now() AT TIME ZONE 'America/Bogota')::date;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede ver el resumen';
    END IF;

    RETURN jsonb_build_object(
        'negocios', jsonb_build_object(
            'pendientes', (SELECT count(*) FROM business_profiles WHERE status = 'pending_review'),
            'activos',    (SELECT count(*) FROM business_profiles WHERE status = 'active'),
            'suspendidos',(SELECT count(*) FROM business_profiles WHERE status = 'suspended')
        ),
        'repartidores', jsonb_build_object(
            'pendientes', (SELECT count(*) FROM courier_profiles WHERE approval_status = 'pending_review'),
            'activos',    (SELECT count(*) FROM courier_profiles WHERE approval_status = 'active'),
            'en_linea',   (SELECT count(*) FROM courier_profiles WHERE approval_status = 'active' AND status = 'online')
        ),
        'pedidos', jsonb_build_object(
            'hoy',        (SELECT count(*) FROM orders
                            WHERE (created_at AT TIME ZONE 'America/Bogota')::date = v_today),
            'en_curso',   (SELECT count(*) FROM orders
                            WHERE status NOT IN ('delivered', 'cancelled')),
            'entregados_hoy', (SELECT count(*) FROM orders
                            WHERE status = 'delivered'
                              AND (created_at AT TIME ZONE 'America/Bogota')::date = v_today)
        ),
        'plata', jsonb_build_object(
            -- Lo que se movió hoy y lo que nos quedamos de eso
            'bruto_hoy',   COALESCE((SELECT sum(subtotal) FROM orders
                            WHERE status = 'delivered'
                              AND (created_at AT TIME ZONE 'America/Bogota')::date = v_today), 0),
            'comision_hoy',COALESCE((SELECT sum(business_commission) FROM orders
                            WHERE status = 'delivered'
                              AND (created_at AT TIME ZONE 'America/Bogota')::date = v_today), 0),
            'bruto_mes',   COALESCE((SELECT sum(subtotal) FROM orders
                            WHERE status = 'delivered'
                              AND created_at >= date_trunc('month', now())), 0),
            'comision_mes',COALESCE((SELECT sum(business_commission) FROM orders
                            WHERE status = 'delivered'
                              AND created_at >= date_trunc('month', now())), 0)
        ),
        'servicios', jsonb_build_object(
            'por_revisar', (SELECT count(*) FROM service_requests WHERE status = 'submitted'),
            'montando',    (SELECT count(*) FROM service_requests WHERE status = 'in_progress'),
            'activos',     (SELECT count(*) FROM service_requests WHERE status = 'active')
        ),
        'soporte', jsonb_build_object(
            'abiertos',    (SELECT count(*) FROM support_tickets WHERE status = 'open'),
            'esperando',   (SELECT count(*) FROM support_tickets WHERE status = 'waiting')
        ),
        'marketing', jsonb_build_object(
            'pendientes',  (SELECT count(*) FROM marketing_events WHERE status = 'pending'),
            'fallidos',    (SELECT count(*) FROM marketing_events WHERE status = 'failed'),
            'enviados',    (SELECT count(*) FROM marketing_events WHERE status = 'sent')
        )
    );
END;
$$;

-- ------------------------------------------------------------
-- 7. Permisos
--
-- Se conceden a `authenticated` porque la primera línea de cada
-- función ya comprueba `is_admin()`. Un negocio que las llame recibe
-- la excepción, no los datos.
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.admin_review_business(UUID, BOOLEAN, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_business_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_courier(UUID, BOOLEAN, TEXT)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_service_status(UUID, TEXT, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview()                            TO authenticated;


-- ============================================================
-- COMPROBACION
-- Si todo entro bien, esto lista las tablas nuevas.
-- ============================================================
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN (
       'business_documents','service_requests','social_accounts',
       'social_posts','social_threads','social_messages',
       'support_tickets','support_messages',
       'marketing_contacts','marketing_events')
 ORDER BY table_name;
