-- ============================================================
-- TURAFOOD — Verificación sin papeles
--
-- Se quitó el requisito de RUT, cámara de comercio y concepto
-- sanitario. Eso dejaba por fuera a la mitad de los negocios del
-- puerto —los que trabajan hace años sin papeles al día— que es justo
-- a quienes queremos adentro.
--
-- Ahora se piden datos livianos y la verificación pasa en una
-- videollamada con el equipo. Un humano decidiendo en 30 minutos es
-- mejor filtro que un PDF que nadie mira.
--
-- Dos columnas nuevas: con quién se habla, y cuándo quedó la llamada.
-- ============================================================

ALTER TABLE public.business_profiles
    ADD COLUMN IF NOT EXISTS owner_name            TEXT,
    ADD COLUMN IF NOT EXISTS verification_call_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.business_profiles.owner_name IS
    'Con quién habla el equipo. No sale en la app de clientes.';
COMMENT ON COLUMN public.business_profiles.verification_call_at IS
    'Cuándo quedó agendada la videollamada de verificación. NULL = todavía no agenda.';

-- Para que el equipo encuentre las llamadas que vienen
CREATE INDEX IF NOT EXISTS idx_business_llamada
    ON public.business_profiles (verification_call_at)
    WHERE verification_call_at IS NOT NULL;

-- Los documentos ya no son obligatorios para operar. La tabla se
-- queda: los negocios que YA subieron sus papeles no tienen por qué
-- perderlos, y el equipo los puede seguir mirando si quiere.
COMMENT ON TABLE public.business_documents IS
    'Documentos del negocio. Desde el 19/08/2026 son OPCIONALES: la verificación se hace por videollamada.';
