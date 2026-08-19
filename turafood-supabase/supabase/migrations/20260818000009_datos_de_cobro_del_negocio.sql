-- ============================================================
-- TURAFOOD — A qué número le transfiere el cliente
--
-- Cambió el modelo: TuraFood no cobra comisión por pedido y no
-- procesa la plata de las ventas. Cada negocio recibe directo. ePayco
-- queda solo para lo que TuraFood le vende AL negocio: planes y
-- servicios de marketing.
--
-- Eso rompe algo que estaba implícito. Si el negocio habilita Nequi,
-- el cliente tiene que ver A QUÉ NÚMERO transferir — antes eso no
-- hacía falta porque el cobro pasaba por la pasarela de TuraFood.
-- Sin este dato, "Nequi" en el checkout es un botón que no lleva a
-- ninguna parte.
--
-- Va en JSONB y no en tres columnas sueltas porque cada medio pide un
-- dato distinto: Nequi y Daviplata un celular, y mañana un link de
-- pago propio o un código QR. Una columna por medio obliga a una
-- migración cada vez que aparece uno nuevo.
-- ============================================================

ALTER TABLE public.business_profiles
    ADD COLUMN IF NOT EXISTS payment_details JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.business_profiles.payment_details IS
    'Datos de cobro propios del negocio: {"nequi":"3137594713","daviplata":"...","link":"https://..."}. El cliente los ve en el checkout.';


-- ------------------------------------------------------------
-- Que no se pueda habilitar un medio sin decir dónde recibir
--
-- Mismo criterio que ya rige para WhatsApp: prender el botón sin el
-- dato deja al cliente frente a una instrucción incompleta, y el
-- pedido se cae en el peor momento — cuando ya decidió comprar.
--
-- Nequi y Daviplata son celulares colombianos: 10 dígitos.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.solo_digitos(t TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$ SELECT regexp_replace(COALESCE(t, ''), '\D', '', 'g') $$;

ALTER TABLE public.business_profiles
    DROP CONSTRAINT IF EXISTS business_cobro_completo;

ALTER TABLE public.business_profiles
    ADD CONSTRAINT business_cobro_completo CHECK (
        (NOT ('nequi' = ANY(payment_methods))
         OR length(public.solo_digitos(payment_details->>'nequi')) = 10)
        AND
        (NOT ('daviplata' = ANY(payment_methods))
         OR length(public.solo_digitos(payment_details->>'daviplata')) = 10)
    );


-- ------------------------------------------------------------
-- El trigger también lo revisa al entrar el pedido
--
-- El constraint protege la fila del negocio, pero un negocio pudo
-- haber quedado con Nequi habilitado desde antes de esta migración.
-- Acá se atrapa en el momento en que importa.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_payment_method()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_metodos TEXT[];
    v_wa      TEXT;
    v_datos   JSONB;
BEGIN
    IF NEW.payment_method IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT payment_methods, whatsapp_phone, payment_details
      INTO v_metodos, v_wa, v_datos
      FROM public.business_profiles
     WHERE id = NEW.business_id;

    IF NOT FOUND THEN
        RETURN NEW;   -- que se queje la llave foránea, no este trigger
    END IF;

    IF NOT (NEW.payment_method = ANY(v_metodos)) THEN
        RAISE EXCEPTION 'Este negocio no recibe pagos por ese medio';
    END IF;

    IF NEW.payment_method = 'whatsapp'
       AND length(public.solo_digitos(v_wa)) < 10 THEN
        RAISE EXCEPTION 'Este negocio no tiene WhatsApp configurado';
    END IF;

    -- Sin número al que transferir, el cliente se queda con un pedido
    -- hecho y ninguna forma de pagarlo.
    IF NEW.payment_method IN ('nequi', 'daviplata')
       AND length(public.solo_digitos(v_datos->>NEW.payment_method)) <> 10 THEN
        RAISE EXCEPTION 'Este negocio todavía no configuró su cuenta para ese medio';
    END IF;

    RETURN NEW;
END;
$$;


-- ------------------------------------------------------------
-- Nadie queda con un medio a medio configurar
--
-- Los que tengan Nequi o Daviplata prendido sin número, se les apaga.
-- Es preferible un medio menos a un botón que no funciona.
-- ------------------------------------------------------------
DO $$
DECLARE
    v_n INT;
BEGIN
    UPDATE public.business_profiles
       SET payment_methods = ARRAY(
               SELECT m FROM unnest(payment_methods) AS m
                WHERE m NOT IN ('nequi','daviplata')
                   OR length(public.solo_digitos(payment_details->>m)) = 10
           )
     WHERE ('nequi' = ANY(payment_methods) AND length(public.solo_digitos(payment_details->>'nequi')) <> 10)
        OR ('daviplata' = ANY(payment_methods) AND length(public.solo_digitos(payment_details->>'daviplata')) <> 10);

    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE 'Negocios a los que se les apagó un medio sin configurar: %', v_n;

    -- Y si con eso alguno quedó sin ninguno, vuelve a efectivo: el
    -- constraint no admite la lista vacía, y un negocio sin forma de
    -- cobrar desaparece del catálogo.
    UPDATE public.business_profiles
       SET payment_methods = ARRAY['cash']::TEXT[]
     WHERE COALESCE(array_length(payment_methods, 1), 0) = 0;
END;
$$;
