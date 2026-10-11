-- ====================================================================
-- TURAFOOD — El negocio fija su ubicación en el mapa
--
-- Hasta hoy `business_profiles.location` quedaba vacía: ningún negocio
-- podía fijarla, así que el cliente no veía el local en el seguimiento
-- y el repartidor solo tenía una dirección escrita. Se fija con esta
-- función, que valida en el servidor que el punto esté dentro de la
-- zona de entrega (la misma regla de las direcciones de los clientes).
-- ====================================================================

CREATE OR REPLACE FUNCTION public.fijar_ubicacion_negocio(
    p_lat     DOUBLE PRECISION,
    p_lng     DOUBLE PRECISION,
    p_address TEXT DEFAULT NULL,
    p_neighborhood TEXT DEFAULT NULL
)
RETURNS public.business_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
SET row_security = off
AS $$
DECLARE
    v_row public.business_profiles%ROWTYPE;
    v_geom geometry;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = auth.uid()) THEN
        RAISE EXCEPTION 'Solo un negocio puede fijar su ubicación';
    END IF;

    IF p_lat IS NULL OR p_lng IS NULL THEN
        RAISE EXCEPTION 'Marca la ubicación de tu negocio en el mapa';
    END IF;

    v_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
    IF NOT public.en_cobertura(v_geom) THEN
        RAISE EXCEPTION 'Esa ubicación queda fuera de la zona de entrega (Buenaventura)';
    END IF;

    UPDATE public.business_profiles
       SET location     = v_geom,
           address      = COALESCE(NULLIF(btrim(p_address), ''), address),
           neighborhood = COALESCE(NULLIF(btrim(p_neighborhood), ''), neighborhood)
     WHERE id = auth.uid()
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.fijar_ubicacion_negocio(DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fijar_ubicacion_negocio(DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT) TO authenticated;
