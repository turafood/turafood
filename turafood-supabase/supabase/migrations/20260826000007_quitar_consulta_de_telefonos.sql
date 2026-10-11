-- ====================================================================
-- TURAFOOD — Se retira la consulta "¿este celular ya tiene cuenta?"
--
-- Ya no hace falta: todo pedido verifica el celular por SMS, y si el
-- número es de una cuenta existente el propio código entra a ella. Dejar
-- la función sería dejar un buscador de números registrados.
-- ====================================================================

DROP FUNCTION IF EXISTS public.telefono_tiene_cuenta(TEXT);
DROP TABLE IF EXISTS public.consultas_telefono;
