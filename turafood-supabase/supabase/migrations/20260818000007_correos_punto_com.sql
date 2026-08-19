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
