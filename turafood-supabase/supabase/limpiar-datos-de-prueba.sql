-- ============================================================
--  TURAFOOD — Barrer lo que dejaron las pruebas
--
--  Cada vez que alguien entra a "probar sin registrarse" se crea una
--  cuenta anónima de verdad, con su negocio y su menú. Es lo que
--  queremos que pase — pero después de tanta prueba, la consola de
--  administración muestra once "Mi negocio" en revisión y eso tapa
--  los negocios de verdad.
--
--  Esto borra SOLO las cuentas anónimas. Se apoya en
--  `auth.users.is_anonymous`, que lo pone GoTrue y no se puede
--  falsificar desde el navegador, así que no hay forma de que se
--  lleve por delante a un negocio real:
--
--    · los 6 negocios del seed tienen correo y contraseña
--    · las 4 cuentas de prueba (admin@, negocio@, etc.) también
--
--  Corre en Supabase -> SQL Editor. Es seguro repetirlo.
--
--  >>> OJO: si dejaste un negocio de prueba a medio configurar y lo
--  >>> querés conservar, ponele correo y clave ANTES de correr esto.
-- ============================================================

DO $$
DECLARE
    v_negocios INT;
    v_pedidos  INT;
    v_usuarios INT;
BEGIN
    -- ------------------------------------------------------------
    -- Qué se va a llevar, antes de llevárselo
    -- ------------------------------------------------------------
    SELECT count(*) INTO v_negocios
      FROM public.business_profiles b
      JOIN auth.users u ON u.id = b.id
     WHERE u.is_anonymous;

    SELECT count(*) INTO v_pedidos
      FROM public.orders o
     WHERE o.business_id IN (
             SELECT b.id FROM public.business_profiles b
               JOIN auth.users u ON u.id = b.id
              WHERE u.is_anonymous)
        OR o.customer_id IN (SELECT id FROM auth.users WHERE is_anonymous);

    SELECT count(*) INTO v_usuarios
      FROM auth.users WHERE is_anonymous;

    RAISE NOTICE 'Se van: % negocios, % pedidos, % cuentas anónimas',
                 v_negocios, v_pedidos, v_usuarios;

    -- ------------------------------------------------------------
    -- Borrar
    --
    -- Los pedidos primero, porque un pedido puede ser de un cliente
    -- anónimo aunque el negocio sea de verdad (alguien probando la
    -- compra sin cuenta contra un restaurante real).
    --
    -- `order_items` cae solo por ON DELETE CASCADE. El resto
    -- —productos, categorías, documentos, wallets— cuelga de
    -- `business_profiles`, que a su vez cuelga de `auth.users`.
    -- ------------------------------------------------------------
    DELETE FROM public.orders o
     WHERE o.business_id IN (
             SELECT b.id FROM public.business_profiles b
               JOIN auth.users u ON u.id = b.id
              WHERE u.is_anonymous)
        OR o.customer_id IN (SELECT id FROM auth.users WHERE is_anonymous);

    -- Y con esto se va el negocio, su menú, su ficha y su perfil
    DELETE FROM auth.users WHERE is_anonymous;

    RAISE NOTICE 'Listo.';
END;
$$;


-- ------------------------------------------------------------
-- Cómo quedó
-- ------------------------------------------------------------
SELECT
    (SELECT count(*) FROM public.business_profiles) AS negocios,
    (SELECT count(*) FROM public.products)          AS productos,
    (SELECT count(*) FROM public.orders)            AS pedidos,
    (SELECT count(*) FROM auth.users)               AS usuarios,
    (SELECT count(*) FROM auth.users WHERE is_anonymous) AS anonimos_restantes;
