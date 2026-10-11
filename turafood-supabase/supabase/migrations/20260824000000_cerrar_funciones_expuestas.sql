-- ============================================================
-- TURAFOOD — Cerrar lo que la API pública dejaba abierto
--
-- Auditoría de seguridad (Supabase advisors + pruebas con la clave anónima).
-- Causa de fondo: Supabase da EXECUTE a `anon` y `authenticated` de forma
-- explícita sobre cada función nueva. Un `REVOKE ... FROM PUBLIC` no lo
-- quita, así que todas las funciones nacían llamables por cualquier
-- visitante aunque la migración dijera lo contrario.
--
-- Fugas confirmadas con la clave anónima antes de este archivo:
--   · marketing_queue: 94 filas con correo y nombre de usuarios, legibles
--     sin sesión. Era una vista sin security_invoker, o sea corría con los
--     permisos de su dueño y se saltaba el RLS de marketing_*.
--   · find_nearby_couriers(): nombre real, placa y calificación de los
--     repartidores conectados cerca de cualquier coordenada. Ninguna app
--     la usa.
--   · enqueue_marketing_event(): cualquiera podía encolar correos de
--     marketing a nombre de cualquier usuario. Solo la usan los triggers.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Vistas
-- ------------------------------------------------------------
ALTER VIEW public.marketing_queue SET (security_invoker = true);
-- La lee solo mailerlite-sync con la service_role (que no necesita este permiso)
REVOKE ALL ON public.marketing_queue FROM PUBLIC, anon, authenticated;

-- Los feeds del super admin: el admin entra con sesión (authenticated),
-- un visitante sin sesión no tiene nada que hacer aquí.
REVOKE ALL ON public.negocios_recien_llegados FROM anon;
REVOKE ALL ON public.repartidores_recien_llegados FROM anon;

-- ------------------------------------------------------------
-- 2. Funciones que nadie debe llamar por la API
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.enqueue_marketing_event(UUID, TEXT, TEXT, JSONB)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_nearby_couriers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION)
    FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 3. Funciones de trigger: para que un trigger corra no hace falta que
--    quien dispara tenga EXECUTE. Se quita a todos.
-- ------------------------------------------------------------
DO $$
DECLARE
    f RECORD;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS firma
          FROM pg_proc p
         WHERE p.pronamespace = 'public'::regnamespace
           AND p.prorettype = 'trigger'::regtype
           AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.firma);
    END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 4. RPC que exigen sesión: se quita `anon`.
--    (Quien compra sin cuenta tiene sesión anónima de GoTrue, que es
--    el rol `authenticated`, no `anon`.)
--    Se dejan abiertas a propósito: anotar_evento_producto (las vistas de
--    producto de visitantes), is_admin() y can_access_order() (las usan
--    políticas RLS que también se evalúan para `anon`).
-- ------------------------------------------------------------
DO $$
DECLARE
    nombre TEXT;
    f RECORD;
BEGIN
    FOREACH nombre IN ARRAY ARRAY[
        'accept_order', 'admin_overview', 'admin_review_business', 'admin_review_courier',
        'admin_set_business_status', 'admin_set_service_status', 'claim_referral',
        'courier_advance_order', 'create_payment', 'metricas_producto', 'my_daily_quota',
        'open_support_ticket', 'register_business', 'reply_to_review', 'request_payout',
        'review_business', 'review_courier', 'save_service_draft', 'set_default_payment_method',
        'settle_payout', 'submit_business_for_review', 'submit_service_request'
    ]
    LOOP
        FOR f IN
            SELECT p.oid::regprocedure AS firma
              FROM pg_proc p
             WHERE p.pronamespace = 'public'::regnamespace AND p.proname = nombre
        LOOP
            EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.firma);
            EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.firma);
        END LOOP;
    END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 5. Que lo nuevo nazca cerrado: las funciones que se creen desde ahora
--    ya no heredan EXECUTE para `anon`. Quien lo necesite lo concede
--    explícitamente.
-- ------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- ------------------------------------------------------------
-- 6. search_path fijo en las funciones auxiliares que no lo tenían
--    (aviso function_search_path_mutable): evita que un esquema
--    anteponga objetos propios y cambie lo que la función resuelve.
-- ------------------------------------------------------------
DO $$
DECLARE
    f RECORD;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS firma
          FROM pg_proc p
         WHERE p.pronamespace = 'public'::regnamespace
           AND p.prokind = 'f'
           AND p.proconfig IS NULL
           AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', f.firma);
    END LOOP;
END;
$$;
