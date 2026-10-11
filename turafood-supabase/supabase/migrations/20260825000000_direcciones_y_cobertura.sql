-- ============================================================
-- TURAFOOD — Direcciones reales y cobertura validada en el servidor
--
-- Hallazgos de la auditoría E2E:
--   · La cobertura solo se miraba en el navegador. Había direcciones
--     guardadas hasta en Cali (lat 3.33, lng -76.52) y 2 sin ubicación.
--   · El checkout traía precargada "Carrera 3 # 4-58, Centro" y, si la
--     persona no guardaba una dirección, mandaba un id inventado
--     ('default'): place_order lo rechazaba y el cliente caía a rutas
--     de respaldo.
--
-- Qué hace esto: el servidor exige que toda dirección nueva tenga
-- ubicación en el mapa DENTRO del puerto, que todo domicilio nuevo salga
-- hacia un punto dentro del puerto, y limita los pedidos por hora de
-- cada cuenta (las cuentas anónimas son gratis: sin tope, un script
-- podría llenarle la pantalla de pedidos falsos a un negocio).
--
-- Se hace con triggers y no reescribiendo place_order (TRASPASO: copiar
-- esa función entera es la mejor forma de perder algo). Los triggers
-- solo validan: no modifican columnas, así que no caen en la trampa de
-- los guards contra SECURITY DEFINER.
--
-- Las filas que ya existen no se tocan: se valida al insertar y al
-- cambiar la dirección o la ubicación.
-- ============================================================

-- Caja de cobertura: casco urbano de Buenaventura y alrededores.
-- Debe coincidir con BOUNDS en turafood-cliente/src/lib/direcciones.js
CREATE OR REPLACE FUNCTION public.en_cobertura(p_geom geometry)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
    SELECT p_geom IS NOT NULL
       AND ST_Y(p_geom) BETWEEN 3.78 AND 3.98
       AND ST_X(p_geom) BETWEEN -77.18 AND -76.92;
$$;

-- ------------------------------------------------------------
-- 1. Direcciones
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_address()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    IF NEW.location IS NULL THEN
        RAISE EXCEPTION 'Marca tu dirección en el mapa para que el repartidor te encuentre';
    END IF;
    IF NOT public.en_cobertura(NEW.location) THEN
        RAISE EXCEPTION 'Esa dirección queda fuera de la zona de entrega (Buenaventura)';
    END IF;
    IF length(btrim(coalesce(NEW.address, ''))) < 4 THEN
        RAISE EXCEPTION 'Escribe tu dirección (calle, carrera o barrio)';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS addresses_guard ON public.addresses;
CREATE TRIGGER addresses_guard
    BEFORE INSERT OR UPDATE OF address, location ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION public.guard_address();

-- ------------------------------------------------------------
-- 1.b Guardar una dirección en UN solo paso
--
-- Antes el cliente desmarcaba la predeterminada y después insertaba la
-- nueva: si el insert fallaba (fuera de cobertura, sin red) la persona se
-- quedaba sin ninguna predeterminada. Aquí todo corre en una transacción.
-- SECURITY INVOKER a propósito: RLS (addresses_own) sigue mandando.
-- Si ya existe la misma dirección con el mismo detalle a menos de 15 m,
-- se reutiliza en vez de duplicarla (quien pide seguido no llena su
-- lista de copias).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guardar_direccion(
    p_label        TEXT,
    p_address      TEXT,
    p_detail       TEXT DEFAULT NULL,
    p_neighborhood TEXT DEFAULT NULL,
    p_lat          DOUBLE PRECISION DEFAULT NULL,
    p_lng          DOUBLE PRECISION DEFAULT NULL,
    p_default      BOOLEAN DEFAULT FALSE
)
RETURNS public.addresses
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_user   UUID := auth.uid();
    v_punto  geometry;
    v_hay    INTEGER;
    v_row    public.addresses%ROWTYPE;
    v_make   BOOLEAN;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'No se pudo abrir tu sesión. Revisa tu conexión';
    END IF;
    IF p_lat IS NULL OR p_lng IS NULL THEN
        RAISE EXCEPTION 'Marca tu dirección en el mapa para que el repartidor te encuentre';
    END IF;

    v_punto := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
    IF NOT public.en_cobertura(v_punto) THEN
        RAISE EXCEPTION 'Esa dirección queda fuera de la zona de entrega (Buenaventura)';
    END IF;

    SELECT count(*) INTO v_hay FROM public.addresses WHERE user_id = v_user;
    v_make := COALESCE(p_default, FALSE) OR v_hay = 0;

    -- ¿Ya la tiene guardada? Se reutiliza
    SELECT * INTO v_row
      FROM public.addresses a
     WHERE a.user_id = v_user
       AND lower(btrim(a.address)) = lower(btrim(p_address))
       AND coalesce(btrim(a.detail), '') = coalesce(btrim(p_detail), '')
       AND a.location IS NOT NULL
       AND ST_DWithin(a.location::geography, v_punto::geography, 15)
     LIMIT 1;

    IF FOUND THEN
        IF v_make AND NOT v_row.is_default THEN
            UPDATE public.addresses SET is_default = FALSE WHERE user_id = v_user AND is_default;
            UPDATE public.addresses SET is_default = TRUE WHERE id = v_row.id RETURNING * INTO v_row;
        END IF;
        RETURN v_row;
    END IF;

    IF v_make THEN
        UPDATE public.addresses SET is_default = FALSE WHERE user_id = v_user AND is_default;
    END IF;

    INSERT INTO public.addresses (user_id, label, address, detail, neighborhood, location, is_default)
    VALUES (v_user,
            COALESCE(NULLIF(btrim(p_label), ''), 'Casa'),
            btrim(p_address),
            NULLIF(btrim(p_detail), ''),
            NULLIF(btrim(p_neighborhood), ''),
            v_punto,
            v_make)
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.guardar_direccion(TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_direccion(TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) TO authenticated;

-- ------------------------------------------------------------
-- 2. Pedidos a domicilio
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_order_delivery()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_recientes INTEGER;
BEGIN
    IF COALESCE(NEW.is_demo, FALSE) THEN
        RETURN NEW;                       -- las comandas de ejemplo no cuentan
    END IF;

    IF NEW.mode = 'delivery' AND NOT public.en_cobertura(NEW.delivery_location) THEN
        RAISE EXCEPTION 'Tu dirección no está dentro de la zona de entrega. Ajusta el punto en el mapa';
    END IF;

    -- Tope por cuenta: 6 pedidos por hora
    SELECT count(*) INTO v_recientes
      FROM public.orders o
     WHERE o.customer_id = NEW.customer_id
       AND o.created_at > now() - interval '1 hour'
       AND NOT COALESCE(o.is_demo, FALSE);
    IF v_recientes >= 6 THEN
        RAISE EXCEPTION 'Hiciste varios pedidos seguidos. Espera un momento antes de pedir de nuevo';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_delivery ON public.orders;
CREATE TRIGGER orders_guard_delivery
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.guard_order_delivery();
