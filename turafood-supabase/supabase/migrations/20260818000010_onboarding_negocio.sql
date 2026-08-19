-- ============================================================
-- TURAFOOD — Las seis preguntas del arranque
--
-- Quien entra a app.turafood.com y toca "Tengo un negocio" queda
-- adentro en dos segundos, sin dar un dato. Eso está bien y no se
-- toca. Pero entra a un panel genérico: el mismo menú de ejemplo para
-- una pizzería que para una droguería.
--
-- Estas seis preguntas arreglan eso. NINGUNA pide datos personales
-- —ni nombre, ni correo, ni teléfono— a propósito: pedir eso en el
-- primer minuto es exactamente el muro que quitamos. Todas preguntan
-- por el negocio, y todas sirven para armarle mejor el panel:
--
--   nicho    → qué menú de ejemplo cargarle y qué vertical asignarle
--   volumen  → si mostrarle el tablero simple o el completo
--   canal    → de dónde viene, para saber qué le duele migrar
--   reparto  → si necesita nuestra flota o tiene la suya
--   dolor    → qué ponerle de primero en el panel
--   cuando   → qué tan caliente está, para el equipo
--
-- Las últimas dos no configuran nada técnico, y aun así se preguntan:
-- son las que le dicen al equipo a quién llamar hoy. Se guardan en la
-- misma fila, no en un CRM aparte que nadie mira.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Dónde se guarda
-- ------------------------------------------------------------
ALTER TABLE public.business_profiles
    ADD COLUMN IF NOT EXISTS nicho          TEXT,
    ADD COLUMN IF NOT EXISTS onboarding     JSONB,
    ADD COLUMN IF NOT EXISTS onboarding_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.business_profiles.nicho IS
    'Más fino que `vertical`: pizzeria, hamburgueseria, farmacia… Define el menú de ejemplo y los textos del panel.';
COMMENT ON COLUMN public.business_profiles.onboarding IS
    'Las respuestas del arranque. Sin datos personales, solo cómo trabaja el negocio.';
COMMENT ON COLUMN public.business_profiles.onboarding_at IS
    'Cuándo terminó. NULL = entró pero no contestó; el equipo lo puede buscar.';

-- Para que el equipo encuentre rápido a los que acaban de contestar
CREATE INDEX IF NOT EXISTS idx_business_onboarding_reciente
    ON public.business_profiles (onboarding_at DESC)
    WHERE onboarding_at IS NOT NULL;


-- ------------------------------------------------------------
-- 2. Qué nicho corresponde a qué vertical
--
-- El nicho es lo que la persona entiende ("soy una pizzería"). El
-- vertical es lo que la plataforma necesita, porque de él sale la
-- comisión. Que la persona elija lo primero y el sistema deduzca lo
-- segundo — no al revés.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vertical_de_nicho(p_nicho TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE p_nicho
        WHEN 'farmacia'  THEN 'pharmacy'
        WHEN 'licores'   THEN 'liquor'
        WHEN 'mercado'   THEN 'market'
        WHEN 'sexshop'   THEN 'store'
        WHEN 'tienda'    THEN 'store'
        WHEN 'lanchas'   THEN 'boat'
        ELSE 'restaurant'   -- pizzeria, hamburguesas, mar, asadero, café…
    END
$$;


-- ------------------------------------------------------------
-- 3. Guardar las respuestas
--
-- Va por RPC y no por UPDATE directo porque además de guardar tiene
-- que traducir el nicho a vertical, y el vertical decide la comisión:
-- si eso quedara en manos del navegador, cualquiera se pondría la del
-- 10% siendo droguería.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guardar_onboarding(p_respuestas JSONB)
RETURNS public.business_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_biz    UUID := auth.uid();
    v_nicho  TEXT := NULLIF(TRIM(p_respuestas->>'nicho'), '');
    v_fila   public.business_profiles%ROWTYPE;
BEGIN
    IF v_biz IS NULL THEN
        RAISE EXCEPTION 'Hay que estar dentro de una sesión';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM business_profiles WHERE id = v_biz) THEN
        RAISE EXCEPTION 'Esta cuenta no tiene un negocio';
    END IF;

    UPDATE business_profiles
       SET nicho         = COALESCE(v_nicho, nicho),
           -- La comisión sale del vertical, y el vertical del nicho.
           -- Nunca de lo que mande el navegador.
           vertical      = COALESCE(public.vertical_de_nicho(v_nicho), vertical),
           onboarding    = p_respuestas,
           onboarding_at = now()
     WHERE id = v_biz
    RETURNING * INTO v_fila;

    RETURN v_fila;
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_onboarding(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_onboarding(JSONB) TO authenticated;


-- ------------------------------------------------------------
-- 4. Que le llegue al equipo
--
-- No se arma un sistema de notificaciones nuevo: la consola ya lee
-- `business_profiles`. Con una vista que junte las respuestas y las
-- ordene por más reciente, el equipo abre dash.turafood.com y ve quién
-- acaba de entrar y qué contestó.
--
-- Vista y no tabla: no hay nada que sincronizar ni que se pueda
-- quedar viejo.
-- ------------------------------------------------------------
-- `security_invoker` NO es un detalle: una vista normal en Postgres
-- corre con los permisos de QUIEN LA CREÓ, no de quien la consulta.
-- Sin esta línea, cualquier negocio autenticado leería por acá las
-- respuestas de todos los demás — RLS no se aplicaría. Con ella, la
-- vista sí respeta las políticas de `business_profiles`: el negocio
-- se ve a sí mismo y el admin los ve todos.
CREATE OR REPLACE VIEW public.negocios_recien_llegados
WITH (security_invoker = true)
AS
SELECT
    b.id,
    b.name,
    b.slug,
    b.nicho,
    b.vertical,
    b.status,
    b.onboarding_at,
    b.whatsapp_phone,
    b.phone,
    b.onboarding->>'volumen'  AS volumen,
    b.onboarding->>'canal'    AS canal_actual,
    b.onboarding->>'reparto'  AS reparto,
    b.onboarding->>'dolor'    AS dolor,
    b.onboarding->>'cuando'   AS cuando_empieza,
    b.onboarding             AS respuestas,
    -- Qué tan urgente es llamarlo. "Ya mismo" y mucho volumen primero.
    (CASE WHEN b.onboarding->>'cuando' = 'ya' THEN 2
          WHEN b.onboarding->>'cuando' = 'semana' THEN 1
          ELSE 0 END
     + CASE WHEN b.onboarding->>'volumen' IN ('30-100', 'mas100') THEN 2
            WHEN b.onboarding->>'volumen' = '10-30' THEN 1
            ELSE 0 END) AS prioridad,
    (SELECT count(*) FROM public.products p
      WHERE p.business_id = b.id) AS productos,
    (SELECT count(*) FROM public.orders o
      WHERE o.business_id = b.id AND NOT o.is_demo) AS pedidos_reales
FROM public.business_profiles b
WHERE b.onboarding_at IS NOT NULL
ORDER BY b.onboarding_at DESC;

COMMENT ON VIEW public.negocios_recien_llegados IS
    'Feed para dash.turafood.com: quién acaba de contestar el arranque y qué dijo. Ordenado por más reciente; `prioridad` sugiere a quién llamar primero.';

GRANT SELECT ON public.negocios_recien_llegados TO authenticated;


-- ------------------------------------------------------------
-- 5. Lo mismo para el repartidor
--
-- Sus cuatro preguntas no tocan plata —en qué se mueve, cuándo puede,
-- cuánto tiempo le mete y si ya repartió— así que van directo a su
-- ficha, sin RPC.
-- ------------------------------------------------------------
ALTER TABLE public.courier_profiles
    ADD COLUMN IF NOT EXISTS onboarding    JSONB,
    ADD COLUMN IF NOT EXISTS onboarding_at TIMESTAMPTZ;

COMMENT ON COLUMN public.courier_profiles.onboarding IS
    'Respuestas del arranque: vehículo, horarios, dedicación y experiencia.';

-- `vehicle_type` solo admitía moto, bici y carro. En el centro de
-- Buenaventura hay quien reparte a pie y son entregas de verdad —
-- dejarlos por fuera del catálogo los obliga a mentir en el formulario.
ALTER TABLE public.courier_profiles
    DROP CONSTRAINT IF EXISTS courier_profiles_vehicle_type_check;

ALTER TABLE public.courier_profiles
    ADD CONSTRAINT courier_profiles_vehicle_type_check
    CHECK (vehicle_type IN ('motorcycle','bicycle','car','walk'));


-- ------------------------------------------------------------
-- 6. Feed de repartidores recién llegados, para el equipo
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.repartidores_recien_llegados
WITH (security_invoker = true)
AS
SELECT
    c.id,
    c.vehicle_type,
    c.approval_status,
    c.onboarding_at,
    c.onboarding->>'dedicacion'  AS dedicacion,
    c.onboarding->>'experiencia' AS experiencia,
    c.onboarding->'horario'      AS horarios,
    c.onboarding                 AS respuestas
FROM public.courier_profiles c
WHERE c.onboarding_at IS NOT NULL
ORDER BY c.onboarding_at DESC;

GRANT SELECT ON public.repartidores_recien_llegados TO authenticated;
