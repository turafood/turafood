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
