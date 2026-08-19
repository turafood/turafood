-- ============================================================================
--  TURAFOOD — CADA NEGOCIO COBRA COMO PUEDE COBRAR
--
--  Pegá TODO esto en:  Supabase -> SQL Editor -> New query -> Run
--
--  Qué hace:
--   1. Cada negocio elige qué medios acepta, y el checkout del cliente
--      solo le muestra esos.
--   2. Guarda a qué número le transfieren (Nequi / Daviplata) y a qué
--      WhatsApp le llegan los pedidos.
--   3. La base rechaza un pedido con un medio que el negocio no
--      habilitó, aunque alguien arme la llamada a mano.
--
--  Es seguro correrlo dos veces.
-- ============================================================================



-- ############################################################
-- ##  20260818000008_metodos_de_pago_del_negocio.sql
-- ############################################################

-- ============================================================
-- TURAFOOD — Cada negocio cobra como puede cobrar
--
-- No todos los restaurantes de Buenaventura tienen pasarela. Muchos
-- reciben por Nequi, otros solo efectivo, y varios cierran la venta
-- por WhatsApp porque así trabajan hace años.
--
-- Hasta ahora el checkout ofrecía los cuatro métodos a todo el mundo.
-- Si un negocio no recibe tarjeta, el cliente igual podía elegirla:
-- el pedido entraba y quedaba un problema para los dos.
--
-- Con esto el negocio decide qué acepta, y el cliente solo ve eso.
--
-- LO IMPORTANTE: la regla vive acá, no en el navegador. El pedido se
-- rechaza aunque alguien arme la llamada a mano. Un checkout que solo
-- esconde botones no es una regla, es una sugerencia.
--
-- WhatsApp merece una aclaración. No es "pagar por WhatsApp": el
-- pedido se crea igual, con su número y todos sus productos, y le
-- aparece al negocio en su tablero como cualquier otro. Lo que cambia
-- es que el cobro se acuerda por chat. Queda en `payment_status =
-- 'pending'` y no toca la pasarela.
--
-- Va por trigger y no reescribiendo `place_order` a propósito: esa
-- función tiene el manejo de cupones, los descuentos y el sellado de
-- montos. Copiarla entera para meterle cuatro líneas en la mitad es
-- la mejor forma de perder algo por el camino. Además así la regla
-- también cubre cualquier otro camino que cree un pedido.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Qué acepta cada negocio
-- ------------------------------------------------------------
ALTER TABLE public.business_profiles
    ADD COLUMN IF NOT EXISTS payment_methods TEXT[] NOT NULL DEFAULT ARRAY['cash']::TEXT[],
    ADD COLUMN IF NOT EXISTS whatsapp_phone  TEXT;

COMMENT ON COLUMN public.business_profiles.payment_methods IS
    'Métodos que este negocio acepta. El trigger guard_payment_method rechaza cualquier otro.';
COMMENT ON COLUMN public.business_profiles.whatsapp_phone IS
    'A dónde llega la comanda cuando el cliente cierra por WhatsApp. Solo dígitos, con indicativo.';

-- Que no se pueda guardar un método que no existe, ni dejar la lista
-- vacía: un negocio sin ninguna forma de cobrar no puede vender, y el
-- checkout se quedaría sin nada que mostrar.
ALTER TABLE public.business_profiles
    DROP CONSTRAINT IF EXISTS business_payment_methods_validos;

ALTER TABLE public.business_profiles
    ADD CONSTRAINT business_payment_methods_validos CHECK (
        array_length(payment_methods, 1) >= 1
        AND payment_methods <@ ARRAY['cash','nequi','daviplata','card','whatsapp']::TEXT[]
    );

-- Si eligió WhatsApp, hace falta el número. Sin él la comanda no
-- llega a ningún lado y el pedido se pierde en el aire.
ALTER TABLE public.business_profiles
    DROP CONSTRAINT IF EXISTS business_whatsapp_con_numero;

ALTER TABLE public.business_profiles
    ADD CONSTRAINT business_whatsapp_con_numero CHECK (
        NOT ('whatsapp' = ANY(payment_methods))
        OR (whatsapp_phone IS NOT NULL AND length(trim(whatsapp_phone)) >= 10)
    );


-- ------------------------------------------------------------
-- 2. 'whatsapp' es un método válido de pedido
-- ------------------------------------------------------------
ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('cash','nequi','daviplata','card','whatsapp'));


-- ------------------------------------------------------------
-- 3. Arrancar con algo sensato
--
-- Los negocios que ya existen quedan con efectivo y WhatsApp: es lo
-- que cualquiera puede recibir sin firmar nada con nadie. Los que
-- tengan pasarela la prenden ellos desde su panel.
--
-- El WhatsApp sale del teléfono que ya tienen cargado. Si no tienen,
-- queda solo efectivo — el constraint no dejaría otra cosa.
-- ------------------------------------------------------------
UPDATE public.business_profiles
   SET whatsapp_phone = regexp_replace(COALESCE(phone, ''), '\D', '', 'g')
 WHERE whatsapp_phone IS NULL
   AND length(regexp_replace(COALESCE(phone, ''), '\D', '', 'g')) >= 10;

UPDATE public.business_profiles
   SET payment_methods = CASE
           WHEN whatsapp_phone IS NOT NULL THEN ARRAY['cash','whatsapp']::TEXT[]
           ELSE ARRAY['cash']::TEXT[]
       END
 WHERE payment_methods = ARRAY['cash']::TEXT[];


-- ------------------------------------------------------------
-- 4. El servidor rechaza lo que el negocio no acepta
--
-- Mismo patrón que `orders_unverified_cap`: BEFORE INSERT, corto y
-- con un mensaje que se le puede mostrar tal cual a la persona.
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
BEGIN
    -- Sin método elegido no hay nada que revisar: la columna es
    -- nullable y hay pedidos que se cierran después.
    IF NEW.payment_method IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT payment_methods, whatsapp_phone
      INTO v_metodos, v_wa
      FROM public.business_profiles
     WHERE id = NEW.business_id;

    IF NOT FOUND THEN
        RETURN NEW;   -- que se queje la llave foránea, no este trigger
    END IF;

    IF NOT (NEW.payment_method = ANY(v_metodos)) THEN
        RAISE EXCEPTION 'Este negocio no recibe pagos por ese medio';
    END IF;

    -- Habilitado pero sin número: el pedido entraría y la comanda no
    -- llegaría a ninguna parte.
    IF NEW.payment_method = 'whatsapp'
       AND COALESCE(length(trim(v_wa)), 0) < 10 THEN
        RAISE EXCEPTION 'Este negocio no tiene WhatsApp configurado';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_payment_method ON public.orders;

CREATE TRIGGER orders_guard_payment_method
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_payment_method();


-- ------------------------------------------------------------
-- 5. Nota sobre permisos — no hace falta tocar nada
--
-- `guard_business_privileged_fields` protege por lista negra: revierte
-- status, commission_rate, rating, pro_plan y demás, y deja pasar todo
-- lo otro. Así que `payment_methods` y `whatsapp_phone` quedan
-- editables por el dueño sin agregar una sola política, y el negocio
-- sigue sin poder auto-aprobarse ni bajarse la comisión.
--
-- Comprobado contra la base antes de escribir esto: un negocio nuevo
-- intentó ponerse status='active', commission_rate=0 y pro_plan=true
-- en el mismo PATCH. Los tres rebotaron.
-- ------------------------------------------------------------


-- ############################################################
-- ##  20260818000009_datos_de_cobro_del_negocio.sql
-- ############################################################

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

