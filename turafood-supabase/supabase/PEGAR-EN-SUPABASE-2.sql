-- ============================================================================
--  TURAFOOD — LO QUE FALTA PARA PRODUCCIÓN
--
--  Pegá TODO esto de una vez en:
--     Supabase -> SQL Editor -> New query -> Run
--
--  Son tres arreglos, todos encontrados haciendo pedidos y entregas
--  de verdad contra esta misma base, no leyendo código:
--
--   1. El tablero de comandas salía vacío para todo el que entraba a
--      probar su negocio.
--   2. El repartidor entregaba y ganaba $0 — y cualquiera podía
--      escribirse su propia parte de la plata.
--   3. Seis correos de la marca quedaron en .co y son justo los que
--      se sincronizan a MailerLite.
--
--  Es seguro correrlo dos veces.
-- ============================================================================



-- ############################################################
-- ##  20260818000005_fix_comandas_demo.sql
-- ############################################################

-- ============================================================
-- TURAFOOD — Arreglar las comandas de ejemplo
--
-- Quien entra a probar su negocio ve el tablero vacío. La función que
-- debía sembrarle cuatro comandas está fallando de dos formas, y las
-- dos quedaban invisibles porque la app se traga el error para no
-- frenar la entrada:
--
--   1. `order_items.subtotal` es NOT NULL y la función no lo mandaba.
--      Un negocio CON menú revienta con 23502 y no recibe ni una
--      comanda. Es el caso normal, porque el menú de arranque se
--      carga justo antes.
--
--   2. Un negocio SIN menú sí recibía las cuatro, pero vacías y en
--      $0: cuatro tarjetas sin un solo producto. Eso no parece un
--      ejemplo, parece que el sistema está roto.
--
-- Y hay una tercera, heredada: el trigger `guard_order_amounts`
-- revierte los montos en cualquier UPDATE que no venga marcado. La
-- función calcula el subtotal y lo escribe con un UPDATE al final,
-- así que el guard se lo devolvía a cero. Se usa la misma marca de
-- transacción que ya usa `place_order`.
--
-- Al final se limpian las comandas vacías que quedaron sembradas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sembrar_pedidos_demo()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_biz      UUID := auth.uid();
    v_reales   INT;
    v_creados  INT := 0;
    v_orden    UUID;
    v_num      INT;
    r          RECORD;
    p          RECORD;
    v_sub      NUMERIC;
BEGIN
    IF v_biz IS NULL THEN
        RAISE EXCEPTION 'Hay que estar dentro de una sesión';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM business_profiles WHERE id = v_biz) THEN
        RAISE EXCEPTION 'Esta cuenta no tiene un negocio';
    END IF;

    -- Si ya trabajó de verdad, no se le mete ruido en el tablero
    SELECT count(*) INTO v_reales
      FROM orders WHERE business_id = v_biz AND NOT is_demo;
    IF v_reales > 0 THEN
        RETURN 0;
    END IF;

    -- Sin menú no hay comanda que sembrar. Cuatro pedidos sin
    -- productos y en cero pesos enseñan menos que un tablero vacío.
    IF NOT EXISTS (
        SELECT 1 FROM products WHERE business_id = v_biz AND is_available
    ) THEN
        RETURN 0;
    END IF;

    -- Volver a llamarla no acumula
    DELETE FROM order_items
     WHERE order_id IN (SELECT id FROM orders WHERE business_id = v_biz AND is_demo);
    DELETE FROM orders WHERE business_id = v_biz AND is_demo;

    FOR r IN
        SELECT * FROM (VALUES
            ('pending',           'Marleny Cuero',    'Cl. 8 # 52-14, Punta del Este',  2, 'nequi',     3),
            ('preparing',         'Andrés Riascos',   'Cra. 4 # 9-30, Bellavista',      1, 'cash',      11),
            ('ready',             'Yurany Valencia',  'Barrio El Jorge, Comuna 4',      3, 'card',      19),
            ('courier_assigned',  'Delvid Mosquera',  'Ciudadela San Antonio',          2, 'daviplata', 28)
        ) AS t(estado, cliente, direccion, cuantos, medio, hace_min)
    LOOP
        v_orden := gen_random_uuid();
        SELECT COALESCE(max(NULLIF(regexp_replace(order_number, '\D', '', 'g'), ''))::INT, 4800) + 1
          INTO v_num FROM orders;

        v_sub := 0;

        INSERT INTO orders (
            id, business_id, customer_id, order_number, status, mode,
            payment_method, payment_status,
            delivery_address, subtotal, delivery_fee, service_fee, total,
            business_commission, is_demo, created_at
        ) VALUES (
            v_orden, v_biz, v_biz,
            'TS-' || v_num, r.estado, 'delivery',
            r.medio,
            CASE WHEN r.medio = 'cash' THEN 'pending' ELSE 'paid' END,
            r.direccion, 0, 3900, 1900, 0, 0, TRUE,
            now() - (r.hace_min || ' minutes')::interval
        );

        -- Productos de SU menú, no inventados.
        -- `subtotal` va explícito: la columna es NOT NULL y sin él la
        -- función entera falla con 23502 justo en el caso normal, el
        -- del negocio que acaba de cargar su menú de arranque.
        FOR p IN
            SELECT id, name, price FROM products
             WHERE business_id = v_biz AND is_available
             ORDER BY sort_order
             LIMIT r.cuantos
        LOOP
            INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, subtotal)
            VALUES (v_orden, p.id, p.name, 1, p.price, p.price);
            v_sub := v_sub + p.price;
        END LOOP;

        -- El guard revierte los montos en todo UPDATE que no venga
        -- marcado. Es la misma marca de transacción que usa
        -- `place_order`; sin ella el tablero muestra las comandas
        -- pero todas en $0.
        PERFORM set_config('turafood.sella_montos', 'on', true);

        UPDATE orders
           SET subtotal = v_sub,
               total = v_sub + 3900 + 1900,
               business_commission = round(v_sub * 0.10)
         WHERE id = v_orden;

        PERFORM set_config('turafood.sella_montos', 'off', true);

        v_creados := v_creados + 1;
    END LOOP;

    RETURN v_creados;
END;
$$;

REVOKE ALL ON FUNCTION public.sembrar_pedidos_demo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sembrar_pedidos_demo() TO authenticated;

-- ------------------------------------------------------------
-- Barrer lo que quedó mal sembrado
--
-- Las comandas de demostración sin un solo producto son las que creó
-- la versión anterior. No sirven para nada y hacen ver el tablero
-- como si estuviera roto.
-- ------------------------------------------------------------
DELETE FROM public.orders o
 WHERE o.is_demo
   AND NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id);


-- ############################################################
-- ##  20260818000006_pago_repartidor.sql
-- ############################################################

-- ============================================================
-- TURAFOOD — El repartidor cobra, y nadie se firma su propio cheque
--
-- Dos cosas que salieron al hacer una entrega completa de verdad:
-- pedir, cocinar, despachar, recoger y entregar.
--
-- 1. EL REPARTIDOR ENTREGA GRATIS
--    `courier_earnings` nunca se escribe en ningún lado: se declara
--    con DEFAULT 0 y solo se lee, al sumarlo a su historial. Así que
--    entrega, la app le suma 0 a sus ganancias, y no tiene qué
--    retirar. El domicilio de $3.900 que paga el cliente no llega a
--    nadie.
--
--    Que sea del repartidor no lo estoy inventando: `place_order` ya
--    calcula `platform_revenue` como servicio + comisión, dejando el
--    domicilio y la propina deliberadamente por fuera. Eran suyos, lo
--    que faltaba era escribirlo.
--
--    >>> Si tu reparto es otro, el número está en UNA sola línea, más
--    >>> abajo, marcada. Cambiala ahí y ya.
--
-- 2. CADA UNO PUEDE ESCRIBIRSE SU PARTE
--    El guard protege subtotal, total, comisión y demás, pero se le
--    quedaron por fuera cuatro columnas de plata. Comprobado contra
--    la base, no leyendo el código:
--
--      · el repartidor se puso `courier_earnings` en 999.999
--      · el negocio se puso `restaurant_amount` en 777.777
--      · y también `commission_percentage` y
--        `payment_processing_cost`
--
--    Todas pasaron. Con `request_payout` de por medio, eso es retirar
--    plata que nunca se ganó.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Que el domicilio y la propina lleguen a quien maneja
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sellar_pago_repartidor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se recalcula cada vez que cambian los montos del pedido, así un
    -- cupón de envío gratis o una propina agregada después quedan
    -- reflejados sin tener que acordarse de tocar esto aparte.
    --
    -- >>> ACÁ está el reparto. Hoy: todo el domicilio + toda la
    -- >>> propina son del repartidor. Si querés dejarle, por ejemplo,
    -- >>> el 80% del domicilio, sería:
    -- >>>     ROUND(COALESCE(NEW.delivery_fee,0) * 0.80) + COALESCE(NEW.tip,0)
    NEW.courier_earnings := COALESCE(NEW.delivery_fee, 0) + COALESCE(NEW.tip, 0);

    -- Para llevar: se lo lleva quien pidió, no hay quien maneje
    IF NEW.mode = 'pickup' THEN
        NEW.courier_earnings := 0;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sellar_pago_repartidor ON public.orders;

-- BEFORE, para que escriba sobre la misma fila sin un UPDATE aparte
-- que el guard tendría que volver a dejar pasar.
CREATE TRIGGER trg_sellar_pago_repartidor
    BEFORE INSERT OR UPDATE OF delivery_fee, tip, mode ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.sellar_pago_repartidor();


-- ------------------------------------------------------------
-- 2. Cerrar las cuatro columnas que quedaron abiertas
--
-- Es el mismo guard de la migración 004 con cuatro líneas más. Se
-- reescribe completo a propósito: un guard partido en pedazos entre
-- migraciones es imposible de leer cuando toca revisarlo con plata
-- de por medio.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_order_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $guard$
BEGIN
    -- Un administrador puede corregir un pedido a mano
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- Las funciones de la base que sellan montos. La bandera solo vive
    -- dentro de la transacción que la encendió.
    IF COALESCE(current_setting('turafood.sella_montos', true), '') = 'on' THEN
        RETURN NEW;
    END IF;

    -- El webhook de pagos: es la única autoridad sobre si un pago se
    -- dio por bueno, y entra con la llave de servicio.
    IF COALESCE(auth.role(), '') = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Para todos los demás, los montos son de solo lectura.
    NEW.subtotal       := OLD.subtotal;
    NEW.delivery_fee   := OLD.delivery_fee;
    NEW.service_fee    := OLD.service_fee;
    NEW.tip            := OLD.tip;
    NEW.discount       := OLD.discount;
    NEW.total          := OLD.total;
    NEW.payment_status := OLD.payment_status;
    NEW.epayco_ref     := OLD.epayco_ref;
    NEW.business_commission := OLD.business_commission;
    NEW.platform_revenue    := OLD.platform_revenue;
    NEW.customer_id    := OLD.customer_id;
    NEW.business_id    := OLD.business_id;
    NEW.order_number   := OLD.order_number;

    -- Las cuatro que faltaban. Cada una la escribía justo la parte a
    -- la que le convenía inflarla.
    NEW.courier_earnings        := OLD.courier_earnings;
    NEW.restaurant_amount       := OLD.restaurant_amount;
    NEW.commission_percentage   := OLD.commission_percentage;
    NEW.payment_processing_cost := OLD.payment_processing_cost;

    RETURN NEW;
END;
$guard$;


-- ------------------------------------------------------------
-- 3. Pagarle a quien ya entregó
--
-- Los pedidos que se entregaron con la versión anterior quedaron con
-- el repartidor en cero. Se recalculan con la misma regla.
-- ------------------------------------------------------------
DO $$
DECLARE
    v_n INT;
BEGIN
    PERFORM set_config('turafood.sella_montos', 'on', true);

    UPDATE public.orders
       SET courier_earnings = CASE
               WHEN mode = 'pickup' THEN 0
               ELSE COALESCE(delivery_fee, 0) + COALESCE(tip, 0)
           END
     WHERE courier_id IS NOT NULL
       AND COALESCE(courier_earnings, 0) <> CASE
               WHEN mode = 'pickup' THEN 0
               ELSE COALESCE(delivery_fee, 0) + COALESCE(tip, 0)
           END;

    GET DIAGNOSTICS v_n = ROW_COUNT;

    PERFORM set_config('turafood.sella_montos', 'off', true);

    RAISE NOTICE 'Pedidos con el pago del repartidor corregido: %', v_n;
END;
$$;


-- ############################################################
-- ##  20260818000007_correos_punto_com.sql
-- ############################################################

-- ============================================================
-- TURAFOOD — Los correos de la marca son .com
--
-- La marca es turafood.com. En el código ya no queda un solo .co,
-- pero en `marketing_contacts` quedaron seis direcciones viejas
-- sembradas por un seed anterior:
--
--   negocio@ · burger@ · faro@ · parrilla@ · rosa@ · jorge@
--
-- No es cosmético: esa tabla es exactamente la que `mailerlite-sync`
-- empuja a MailerLite. Tal como está, las automatizaciones saldrían
-- a direcciones que no existen — rebotan, y los rebotes le bajan la
-- reputación de envío al dominio de verdad.
--
-- Se corrige acá y no desde la app a propósito: `marketing_contacts`
-- no es escribible desde el navegador ni siquiera por un admin, y
-- así debe seguir.
-- ============================================================

DO $$
DECLARE
    v_n INT;
BEGIN
    UPDATE public.marketing_contacts
       SET email = left(email, length(email) - 3) || '.com'
     WHERE email LIKE '%@turafood.co';

    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE 'Correos pasados a .com: %', v_n;
END;
$$;

-- Por si algún seed viejo vuelve a correr
DO $$
DECLARE
    v_n INT;
BEGIN
    UPDATE public.profiles
       SET email = left(email, length(email) - 3) || '.com'
     WHERE email LIKE '%@turafood.co';

    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE 'Perfiles pasados a .com: %', v_n;
END;
$$;

