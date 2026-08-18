-- ============================================================
-- TURAFOOD — Devolverle a Auth el acceso a public
--
-- Sintoma: al entrar con correo y contrasena, Supabase responde
--     "Database error querying schema"
-- aunque /auth/v1/health devuelva 200 y el REST funcione.
--
-- La causa: cuando se recreo el esquema `public` desde cero se
-- perdieron los permisos de TODOS los roles, no solo de anon y
-- authenticated. La migracion 008 restauro esos dos y se dejo por
-- fuera a `supabase_auth_admin`, que es el rol con el que GoTrue
-- habla con la base.
--
-- GoTrue necesita leer `public` porque hay un disparador sobre
-- `auth.users` (handle_new_user) que escribe ahi. Sin permiso, la
-- consulta falla y el error sale como si fuera del esquema.
--
-- Esto no abre nada: `supabase_auth_admin` es un rol interno de
-- Supabase que no se expone por la API.
-- ============================================================

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO supabase_auth_admin;

-- Y las que se creen despues, para no repetir el problema
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO supabase_auth_admin;
