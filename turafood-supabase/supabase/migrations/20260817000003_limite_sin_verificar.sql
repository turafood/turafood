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
