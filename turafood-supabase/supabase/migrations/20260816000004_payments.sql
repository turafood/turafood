-- ============================================================
-- TURAFOOD — SISTEMA DE PAGOS
--
-- Separa el PAGO del PEDIDO. Antes el pago vivía en columnas de
-- `orders`, lo que impedía reintentar: un pedido solo podía tener un
-- intento. Ahora un pedido puede tener N intentos de pago y solo uno
-- aprobado.
--
-- Principios que sostienen el diseño:
--   · el monto lo calcula el servidor, nunca el navegador;
--   · la comisión se congela en el pedido (histórico inmutable);
--   · el estado definitivo del pago lo fija el webhook, no el frontend;
--   · todo intento queda auditado en payment_events.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PLANES COMERCIALES DE NEGOCIOS
--    Mensualidad sin comisión, o comisión sin mensualidad.
-- ------------------------------------------------------------
CREATE TABLE public.restaurant_plans (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                  TEXT UNIQUE NOT NULL,
    name                  TEXT NOT NULL,
    monthly_price         NUMERIC NOT NULL DEFAULT 0,
    commission_percentage NUMERIC NOT NULL DEFAULT 0
                          CHECK (commission_percentage BETWEEN 0 AND 100),
    intro_price           NUMERIC,
    intro_months          INTEGER DEFAULT 0,
    description           TEXT,
    active                BOOLEAN NOT NULL DEFAULT true,
    created_at            TIMESTAMPTZ DEFAULT now(),
    updated_at            TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.restaurant_plans
 (code, name, monthly_price, commission_percentage, intro_price, intro_months, description) VALUES
 ('SUBSCRIPTION', 'Tura Biz Pro', 59990, 0, 9990, 3,
  'Mensualidad fija sin comisión por pedido. $9.990 los primeros 3 meses.'),
 ('COMMISSION_10', 'Comisión 10%', 0, 10, NULL, 0,
  'Sin mensualidad. 10% sobre el subtotal de cada pedido.'),
 ('COMMISSION_15', 'Comisión 15%', 0, 15, NULL, 0,
  'Sin mensualidad. 15% sobre el subtotal. Aplica a farmacia y licoreras.');

-- Plan asignado a cada negocio
ALTER TABLE public.business_profiles
    ADD COLUMN plan_id UUID REFERENCES public.restaurant_plans(id);

-- Asignación por defecto según la vertical, respetando lo ya acordado
UPDATE public.business_profiles b
   SET plan_id = p.id
  FROM public.restaurant_plans p
 WHERE p.code = CASE
     WHEN b.vertical IN ('pharmacy','liquor') THEN 'COMMISSION_15'
     ELSE 'COMMISSION_10'
 END;

-- ------------------------------------------------------------
-- 2. SUSCRIPCIONES DE NEGOCIO
-- ------------------------------------------------------------
CREATE TABLE public.restaurant_subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id           UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    plan_id                 UUID NOT NULL REFERENCES public.restaurant_plans(id),
    status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','active','past_due','cancelled','expired')),
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    provider                TEXT NOT NULL DEFAULT 'epayco',
    -- Lo llena la integración de cobros recurrentes cuando exista.
    -- PENDIENTE: confirmar el flujo de suscripciones contra la
    -- documentación oficial de ePayco antes de automatizar la renovación.
    provider_subscription_id TEXT,
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rsubs_restaurant ON public.restaurant_subscriptions (restaurant_id, status);

-- ------------------------------------------------------------
-- 3. HISTÓRICO DE COMISIÓN EN EL PEDIDO
--    Se congela al crear: si el negocio cambia de plan mañana, los
--    pedidos viejos conservan lo que se cobró ese día.
-- ------------------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN commission_percentage   NUMERIC,
    ADD COLUMN platform_fee            NUMERIC DEFAULT 0,
    ADD COLUMN restaurant_amount       NUMERIC DEFAULT 0,
    ADD COLUMN payment_processing_cost NUMERIC DEFAULT 0,
    ADD COLUMN plan_id_at_order        UUID REFERENCES public.restaurant_plans(id);

COMMENT ON COLUMN public.orders.platform_fee IS
    'Comisión de TuraFood congelada al crear el pedido';
COMMENT ON COLUMN public.orders.restaurant_amount IS
    'Lo que le corresponde al negocio (subtotal - platform_fee)';
COMMENT ON COLUMN public.orders.payment_processing_cost IS
    'Costo de la pasarela. Por ahora lo asume TuraFood; se registra para conciliar.';

-- ------------------------------------------------------------
-- 4. PAGOS
--    Un pedido puede tener varios intentos; solo uno aprobado.
-- ------------------------------------------------------------
CREATE TABLE public.payments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID REFERENCES public.orders(id) ON DELETE CASCADE,

    -- Genérico a propósito: mañana puede ser 'wompi' o 'stripe'
    provider      TEXT NOT NULL DEFAULT 'epayco'
                  CHECK (provider IN ('epayco','wompi','stripe','mercadopago','cash')),

    -- Identificadores del proveedor
    provider_transaction_id TEXT,   -- x_transaction_id
    provider_reference      TEXT,   -- x_ref_payco
    -- Referencia propia que viaja al proveedor y vuelve en el webhook
    reference     TEXT UNIQUE NOT NULL DEFAULT ('TF-' || replace(gen_random_uuid()::text, '-', '')),

    amount        NUMERIC NOT NULL CHECK (amount >= 0),
    currency      TEXT NOT NULL DEFAULT 'COP',

    -- Estados internos de TuraFood, NO los de ePayco
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','paid','failed','cancelled','refunded')),

    payment_method TEXT,
    -- Respuesta del proveedor para auditoría. Nunca guardar datos de
    -- tarjeta: el webhook filtra antes de escribir aquí.
    provider_response JSONB,

    failure_reason TEXT,
    paid_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_order ON public.payments (order_id, created_at DESC);
CREATE INDEX idx_payments_ref   ON public.payments (provider_reference);
CREATE INDEX idx_payments_status ON public.payments (status) WHERE status IN ('pending','processing');

-- Un solo pago aprobado por pedido: la red de seguridad contra
-- webhooks duplicados que se cuelen por otra vía.
CREATE UNIQUE INDEX idx_payments_one_paid
    ON public.payments (order_id) WHERE status = 'paid';

CREATE TRIGGER payments_touch
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 5. AUDITORÍA
-- ------------------------------------------------------------
CREATE TABLE public.payment_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id  UUID REFERENCES public.payments(id) ON DELETE CASCADE,
    order_id    UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    event_type  TEXT NOT NULL,   -- created | webhook_received | approved | rejected | mismatch | duplicate
    provider    TEXT NOT NULL DEFAULT 'epayco',
    payload     JSONB,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payment_events ON public.payment_events (payment_id, created_at DESC);

-- ------------------------------------------------------------
-- 6. COMISIÓN SEGÚN EL PLAN
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.effective_commission_rate(p_business_id UUID)
RETURNS NUMERIC AS $$
    SELECT CASE
        -- Biz Pro vigente: paga mensualidad, no comisión
        WHEN b.pro_plan
             AND (b.pro_plan_expires_at IS NULL OR b.pro_plan_expires_at > now())
        THEN 0
        -- Plan asignado explícitamente
        WHEN p.id IS NOT NULL THEN p.commission_percentage / 100.0
        -- Sin plan: la tarifa por vertical
        ELSE COALESCE(b.commission_rate, public.default_commission_rate(b.vertical))
    END
    FROM public.business_profiles b
    LEFT JOIN public.restaurant_plans p ON p.id = b.plan_id AND p.active
    WHERE b.id = p_business_id;
$$ LANGUAGE sql STABLE SET search_path = public;

-- ------------------------------------------------------------
-- 7. CREAR EL INTENTO DE PAGO
--    Devuelve el pago con el monto REAL del pedido. El frontend no
--    manda montos: los lee de aquí.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_payment(
    p_order_id       UUID,
    p_payment_method TEXT DEFAULT 'card',
    p_provider       TEXT DEFAULT 'epayco'
)
RETURNS public.payments AS $$
DECLARE
    v_user    UUID := auth.uid();
    v_order   public.orders%ROWTYPE;
    v_payment public.payments%ROWTYPE;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión';
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido no existe';
    END IF;
    IF v_order.customer_id <> v_user THEN
        RAISE EXCEPTION 'Este pedido no es tuyo';
    END IF;
    IF v_order.payment_status = 'paid' THEN
        RAISE EXCEPTION 'Este pedido ya está pagado';
    END IF;
    IF v_order.status = 'cancelled' THEN
        RAISE EXCEPTION 'Este pedido fue cancelado';
    END IF;

    -- Reutilizar un intento pendiente en vez de crear basura
    SELECT * INTO v_payment
      FROM public.payments
     WHERE order_id = p_order_id
       AND status = 'pending'
       AND amount = v_order.total
     ORDER BY created_at DESC
     LIMIT 1;

    IF FOUND THEN
        RETURN v_payment;
    END IF;

    INSERT INTO public.payments (order_id, provider, amount, payment_method, status)
    VALUES (p_order_id, p_provider, v_order.total, p_payment_method, 'pending')
    RETURNING * INTO v_payment;

    INSERT INTO public.payment_events (payment_id, order_id, event_type, provider, payload)
    VALUES (v_payment.id, p_order_id, 'created', p_provider,
            jsonb_build_object('amount', v_order.total, 'method', p_payment_method));

    RETURN v_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.create_payment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payment TO authenticated;

-- ------------------------------------------------------------
-- 8. CONGELAR LA COMISIÓN AL CREAR EL PEDIDO
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stamp_order_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_rate NUMERIC;
    v_plan UUID;
BEGIN
    v_rate := public.effective_commission_rate(NEW.business_id);
    SELECT plan_id INTO v_plan FROM public.business_profiles WHERE id = NEW.business_id;

    NEW.commission_percentage := ROUND(v_rate * 100, 2);
    NEW.platform_fee          := ROUND(NEW.subtotal * v_rate);
    NEW.restaurant_amount     := NEW.subtotal - ROUND(NEW.subtotal * v_rate);
    NEW.plan_id_at_order      := v_plan;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER orders_stamp_commission
    BEFORE UPDATE OF subtotal ON public.orders
    FOR EACH ROW
    WHEN (NEW.subtotal IS DISTINCT FROM OLD.subtotal AND NEW.subtotal > 0)
    EXECUTE FUNCTION public.stamp_order_commission();

-- ------------------------------------------------------------
-- 9. RLS
-- ------------------------------------------------------------
ALTER TABLE public.payments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_subscriptions ENABLE ROW LEVEL SECURITY;

-- El cliente ve sus pagos; el negocio ve los de sus pedidos.
-- NADIE los escribe: solo create_payment() y el webhook (service_role).
CREATE POLICY payments_select ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
             WHERE o.id = payments.order_id
               AND (o.customer_id = auth.uid() OR o.business_id = auth.uid())
        )
        OR public.is_admin()
    );

-- La auditoría es solo para administración
CREATE POLICY payment_events_admin ON public.payment_events
    FOR SELECT USING (public.is_admin());

CREATE POLICY plans_select_public ON public.restaurant_plans
    FOR SELECT USING (active OR public.is_admin());
CREATE POLICY plans_admin_write ON public.restaurant_plans
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY rsubs_select ON public.restaurant_subscriptions
    FOR SELECT USING (restaurant_id = auth.uid() OR public.is_admin());
CREATE POLICY rsubs_admin_write ON public.restaurant_subscriptions
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- El negocio NO puede cambiarse de plan solo: lo asigna un admin
CREATE OR REPLACE FUNCTION public.guard_business_plan()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_admin() THEN
        NEW.plan_id := OLD.plan_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER business_guard_plan
    BEFORE UPDATE ON public.business_profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_business_plan();

-- Realtime: el cliente ve su pago cambiar a 'paid' sin recargar
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
