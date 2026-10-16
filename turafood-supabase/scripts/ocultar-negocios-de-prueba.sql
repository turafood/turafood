-- Oculta del catálogo público los negocios que dejaron las pruebas de la auditoría
-- (se crearon antes de cerrar el hueco de alta de negocios). No borra nada: los suspende.
BEGIN;
SELECT set_config('turafood.sella_negocio', 'on', true);
UPDATE public.business_profiles
   SET status = 'suspended'
 WHERE status = 'active' AND name ILIKE 'Auditoria%';
COMMIT;
