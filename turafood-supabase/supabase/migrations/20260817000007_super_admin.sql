-- ============================================================
-- TURAFOOD — Lo que necesita dash.turafood.com
--
-- El esquema ya trae `is_admin()` y casi todas las tablas ya dejan
-- mirar al administrador. Lo que falta es lo que el panel HACE:
-- aprobar un negocio, aprobar un repartidor, mover una solicitud de
-- servicio, y un resumen que no cueste ocho viajes a la base.
--
-- Todo pasa por funciones, no por UPDATE directo desde el navegador.
-- No es ceremonia: aprobar un negocio también tiene que dejar quién
-- lo aprobó y cuándo, y eso no se le puede confiar al cliente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. El administrador ve la cola de correos
--
-- La migración de marketing solo dejó que cada quien viera lo suyo.
-- El panel necesita verla completa para poder reintentar lo que falló.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS marketing_events_admin ON public.marketing_events;
CREATE POLICY marketing_events_admin
    ON public.marketing_events FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS marketing_contacts_admin ON public.marketing_contacts;
CREATE POLICY marketing_contacts_admin
    ON public.marketing_contacts FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ------------------------------------------------------------
-- 2. Aprobar o rechazar un negocio
--
-- Rechazar SIN motivo no se permite. Un negocio que recibe "rechazado"
-- y nada más vuelve a mandar lo mismo, y alguien tiene que revisarlo
-- otra vez: el motivo ahorra ese viaje a los dos lados.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_review_business(
    p_business_id UUID,
    p_approve     BOOLEAN,
    p_reason      TEXT DEFAULT NULL
)
RETURNS public.business_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.business_profiles;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede revisar negocios';
    END IF;

    IF NOT p_approve AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
        RAISE EXCEPTION 'Para rechazar hay que escribir el motivo';
    END IF;

    UPDATE public.business_profiles
       SET status           = CASE WHEN p_approve THEN 'active' ELSE 'rejected' END,
           rejection_reason = CASE WHEN p_approve THEN NULL ELSE btrim(p_reason) END,
           reviewed_at      = now(),
           reviewed_by      = auth.uid()
     WHERE id = p_business_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese negocio no existe';
    END IF;

    -- Al aprobar el negocio damos por buenos los documentos que
    -- estaban esperando. Dejar uno en 'pending' después de aprobar la
    -- cuenta hace que el panel del negocio siga mostrando la alerta.
    IF p_approve THEN
        UPDATE public.business_documents
           SET status = 'approved'
         WHERE business_id = p_business_id
           AND status = 'pending';
    END IF;

    RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 3. Suspender un negocio ya aprobado
--
-- Separado de la revisión a propósito: son dos decisiones distintas y
-- mezclarlas hace fácil suspender queriendo rechazar.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_business_status(
    p_business_id UUID,
    p_status      TEXT,
    p_reason      TEXT DEFAULT NULL
)
RETURNS public.business_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.business_profiles;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede cambiar el estado de un negocio';
    END IF;

    IF p_status NOT IN ('active', 'suspended', 'closed') THEN
        RAISE EXCEPTION 'Estado no válido: %', p_status;
    END IF;

    UPDATE public.business_profiles
       SET status           = p_status,
           rejection_reason = CASE WHEN p_status = 'active' THEN NULL ELSE btrim(p_reason) END,
           -- Suspendido significa que deja de recibir pedidos ya, no
           -- cuando al dueño se le ocurra abrir la tienda.
           is_open          = CASE WHEN p_status = 'active' THEN is_open ELSE FALSE END,
           reviewed_at      = now(),
           reviewed_by      = auth.uid()
     WHERE id = p_business_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese negocio no existe';
    END IF;

    RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 4. Aprobar o rechazar un repartidor
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_review_courier(
    p_courier_id UUID,
    p_approve    BOOLEAN,
    p_reason     TEXT DEFAULT NULL
)
RETURNS public.courier_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.courier_profiles;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede revisar repartidores';
    END IF;

    IF NOT p_approve AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
        RAISE EXCEPTION 'Para rechazar hay que escribir el motivo';
    END IF;

    UPDATE public.courier_profiles
       SET approval_status  = CASE WHEN p_approve THEN 'active' ELSE 'rejected' END,
           rejection_reason = CASE WHEN p_approve THEN NULL ELSE btrim(p_reason) END,
           reviewed_at      = now(),
           reviewed_by      = auth.uid()
     WHERE id = p_courier_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese repartidor no existe';
    END IF;

    RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 5. Mover una solicitud de servicio (Growth Partner)
--
-- El trigger de marketing escucha estos cambios: pasar a 'active' es
-- lo que dispara la secuencia de correos del plan.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_service_status(
    p_request_id UUID,
    p_status     TEXT,
    p_notes      TEXT DEFAULT NULL
)
RETURNS public.service_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.service_requests;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede mover una solicitud';
    END IF;

    IF p_status NOT IN ('in_progress', 'active', 'rejected', 'cancelled') THEN
        RAISE EXCEPTION 'Estado no válido: %', p_status;
    END IF;

    IF p_status = 'rejected' AND (p_notes IS NULL OR btrim(p_notes) = '') THEN
        RAISE EXCEPTION 'Para rechazar hay que escribir el motivo';
    END IF;

    UPDATE public.service_requests
       SET status        = p_status,
           team_notes    = COALESCE(btrim(p_notes), team_notes),
           reject_reason = CASE WHEN p_status = 'rejected' THEN btrim(p_notes) ELSE NULL END,
           assigned_to   = COALESCE(assigned_to, auth.uid()),
           updated_at    = now()
     WHERE id = p_request_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Esa solicitud no existe';
    END IF;

    RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 6. El resumen del tablero
--
-- Un solo viaje en vez de ocho `count(*)` desde el navegador. Devuelve
-- jsonb porque son cifras sueltas de tablas distintas y una fila con
-- veinte columnas sería peor de leer.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_today DATE := (now() AT TIME ZONE 'America/Bogota')::date;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede ver el resumen';
    END IF;

    RETURN jsonb_build_object(
        'negocios', jsonb_build_object(
            'pendientes', (SELECT count(*) FROM business_profiles WHERE status = 'pending_review'),
            'activos',    (SELECT count(*) FROM business_profiles WHERE status = 'active'),
            'suspendidos',(SELECT count(*) FROM business_profiles WHERE status = 'suspended')
        ),
        'repartidores', jsonb_build_object(
            'pendientes', (SELECT count(*) FROM courier_profiles WHERE approval_status = 'pending_review'),
            'activos',    (SELECT count(*) FROM courier_profiles WHERE approval_status = 'active'),
            'en_linea',   (SELECT count(*) FROM courier_profiles WHERE approval_status = 'active' AND status = 'online')
        ),
        'pedidos', jsonb_build_object(
            'hoy',        (SELECT count(*) FROM orders
                            WHERE (created_at AT TIME ZONE 'America/Bogota')::date = v_today),
            'en_curso',   (SELECT count(*) FROM orders
                            WHERE status NOT IN ('delivered', 'cancelled')),
            'entregados_hoy', (SELECT count(*) FROM orders
                            WHERE status = 'delivered'
                              AND (created_at AT TIME ZONE 'America/Bogota')::date = v_today)
        ),
        'plata', jsonb_build_object(
            -- Lo que se movió hoy y lo que nos quedamos de eso
            'bruto_hoy',   COALESCE((SELECT sum(subtotal) FROM orders
                            WHERE status = 'delivered'
                              AND (created_at AT TIME ZONE 'America/Bogota')::date = v_today), 0),
            'comision_hoy',COALESCE((SELECT sum(business_commission) FROM orders
                            WHERE status = 'delivered'
                              AND (created_at AT TIME ZONE 'America/Bogota')::date = v_today), 0),
            'bruto_mes',   COALESCE((SELECT sum(subtotal) FROM orders
                            WHERE status = 'delivered'
                              AND created_at >= date_trunc('month', now())), 0),
            'comision_mes',COALESCE((SELECT sum(business_commission) FROM orders
                            WHERE status = 'delivered'
                              AND created_at >= date_trunc('month', now())), 0)
        ),
        'servicios', jsonb_build_object(
            'por_revisar', (SELECT count(*) FROM service_requests WHERE status = 'submitted'),
            'montando',    (SELECT count(*) FROM service_requests WHERE status = 'in_progress'),
            'activos',     (SELECT count(*) FROM service_requests WHERE status = 'active')
        ),
        'soporte', jsonb_build_object(
            'abiertos',    (SELECT count(*) FROM support_tickets WHERE status = 'open'),
            'esperando',   (SELECT count(*) FROM support_tickets WHERE status = 'waiting')
        ),
        'marketing', jsonb_build_object(
            'pendientes',  (SELECT count(*) FROM marketing_events WHERE status = 'pending'),
            'fallidos',    (SELECT count(*) FROM marketing_events WHERE status = 'failed'),
            'enviados',    (SELECT count(*) FROM marketing_events WHERE status = 'sent')
        )
    );
END;
$$;

-- ------------------------------------------------------------
-- 7. Permisos
--
-- Se conceden a `authenticated` porque la primera línea de cada
-- función ya comprueba `is_admin()`. Un negocio que las llame recibe
-- la excepción, no los datos.
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.admin_review_business(UUID, BOOLEAN, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_business_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_courier(UUID, BOOLEAN, TEXT)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_service_status(UUID, TEXT, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview()                            TO authenticated;
