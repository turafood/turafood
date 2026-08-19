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
