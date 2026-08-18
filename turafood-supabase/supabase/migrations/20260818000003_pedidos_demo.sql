-- ============================================================
-- TURAFOOD — Comandas de demostración para un negocio nuevo
--
-- Un tablero vacío no enseña nada. Quien entra a probar ve cuatro
-- columnas que dicen "Sin comandas" y no puede saber cómo se ve su
-- restaurante trabajando: no hay nada que aceptar, nada que mover,
-- nada que cronometrar.
--
-- Esta función le siembra cuatro pedidos EN SU PROPIA CUENTA, uno por
-- columna, con productos de su propio menú. Son filas de verdad en
-- `orders`: se aceptan, se mueven y se entregan con los mismos
-- botones que un pedido real, porque son pedidos reales.
--
-- Se marcan con `is_demo` para poder borrarlos de un golpe cuando el
-- negocio empiece a operar en serio.
--
-- El INSERT va por función y no por política porque `orders` no deja
-- insertar a nadie desde el navegador — solo `place_order()`. Esto es
-- la excepción, y está limitada: solo puede sembrar en la cuenta de
-- quien la llama, y solo si no tiene pedidos de verdad.
-- ============================================================

-- Marca para distinguirlos. Nullable: los pedidos reales la dejan en
-- NULL y no hay que tocar ninguna consulta existente.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_demo
    ON public.orders (business_id)
    WHERE is_demo;

COMMENT ON COLUMN public.orders.is_demo IS
    'Pedido sembrado para que el negocio vea su tablero funcionando. Se borra con limpiar_pedidos_demo().';

-- ------------------------------------------------------------
-- Sembrar
--
-- Cuatro pedidos, uno por columna del tablero, con horas escalonadas
-- para que el semáforo de demora tenga algo que mostrar.
-- ------------------------------------------------------------
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

    -- Volver a llamarla no acumula: se borran los de antes
    DELETE FROM order_items
     WHERE order_id IN (SELECT id FROM orders WHERE business_id = v_biz AND is_demo);
    DELETE FROM orders WHERE business_id = v_biz AND is_demo;

    -- Un pedido por columna. Los nombres son de acá a propósito: un
    -- tablero con "John Doe" no se siente propio.
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

        -- Productos de SU menú, no inventados
        FOR p IN
            SELECT id, name, price FROM products
             WHERE business_id = v_biz AND is_available
             ORDER BY sort_order
             LIMIT r.cuantos
        LOOP
            INSERT INTO order_items (order_id, product_id, name, quantity, unit_price)
            VALUES (v_orden, p.id, p.name, 1, p.price);
            v_sub := v_sub + p.price;
        END LOOP;

        -- Totales coherentes con lo que se metió
        UPDATE orders
           SET subtotal = v_sub,
               total = v_sub + 3900 + 1900,
               business_commission = round(v_sub * 0.10)
         WHERE id = v_orden;

        v_creados := v_creados + 1;
    END LOOP;

    RETURN v_creados;
END;
$$;

-- ------------------------------------------------------------
-- Limpiar
--
-- Se llama sola desde el panel cuando entra el primer pedido de
-- verdad, y también hay un botón. Nadie debería tener que convivir
-- con comandas falsas mientras despacha de verdad.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.limpiar_pedidos_demo()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_biz  UUID := auth.uid();
    v_n    INT;
BEGIN
    IF v_biz IS NULL THEN
        RAISE EXCEPTION 'Hay que estar dentro de una sesión';
    END IF;

    DELETE FROM order_items
     WHERE order_id IN (SELECT id FROM orders WHERE business_id = v_biz AND is_demo);

    WITH borrados AS (
        DELETE FROM orders WHERE business_id = v_biz AND is_demo RETURNING 1
    )
    SELECT count(*) INTO v_n FROM borrados;

    RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.sembrar_pedidos_demo() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.limpiar_pedidos_demo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sembrar_pedidos_demo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.limpiar_pedidos_demo() TO authenticated;
