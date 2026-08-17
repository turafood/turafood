-- ============================================================
-- TURAFOOD — POLÍTICAS RLS
-- Ejecutar después de 20260816000000_schema.sql
--
-- Regla de oro: el cliente NUNCA escribe montos ni estados de pago.
-- Los pedidos se crean solo vía place_order() y se pagan solo
-- vía el webhook (service_role).
-- ============================================================

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_extras      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_locations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_offers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
CREATE POLICY profiles_select_own_or_admin ON public.profiles
    FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- Nadie inserta a mano: lo hace handle_new_user()

-- ------------------------------------------------------------
-- ZONAS — lectura pública
-- ------------------------------------------------------------
CREATE POLICY zones_select_public ON public.delivery_zones
    FOR SELECT USING (is_active OR public.is_admin());

CREATE POLICY zones_admin_write ON public.delivery_zones
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- NEGOCIOS
--   · público: solo los aprobados y activos
--   · dueño: ve y edita el suyo en cualquier estado
--   · admin: todo (es lo que alimenta la pantalla de Aprobaciones)
-- ------------------------------------------------------------
CREATE POLICY business_select_active ON public.business_profiles
    FOR SELECT USING (status = 'active' OR id = auth.uid() OR public.is_admin());

CREATE POLICY business_insert_own ON public.business_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- El dueño edita su negocio pero NO puede auto-aprobarse:
-- status/commission_rate solo los cambia un admin.
CREATE POLICY business_update_own ON public.business_profiles
    FOR UPDATE USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.guard_business_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;
    -- Un negocio no se aprueba a sí mismo ni se baja la comisión
    NEW.status          := OLD.status;
    NEW.commission_rate := OLD.commission_rate;
    NEW.reviewed_at     := OLD.reviewed_at;
    NEW.reviewed_by     := OLD.reviewed_by;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.rating          := OLD.rating;
    NEW.reviews_count   := OLD.reviews_count;
    NEW.total_orders    := OLD.total_orders;
    NEW.pro_plan        := OLD.pro_plan;
    NEW.pro_plan_expires_at := OLD.pro_plan_expires_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER business_guard_fields
    BEFORE UPDATE ON public.business_profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_business_privileged_fields();

-- ------------------------------------------------------------
-- CATÁLOGO — lectura pública, escritura del dueño
-- ------------------------------------------------------------
CREATE POLICY hours_select_public ON public.business_hours
    FOR SELECT USING (true);
CREATE POLICY hours_write_own ON public.business_hours
    FOR ALL USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid() OR public.is_admin());

CREATE POLICY categories_select_public ON public.product_categories
    FOR SELECT USING (true);
CREATE POLICY categories_write_own ON public.product_categories
    FOR ALL USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid() OR public.is_admin());

CREATE POLICY products_select_public ON public.products
    FOR SELECT USING (true);
CREATE POLICY products_write_own ON public.products
    FOR ALL USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid() OR public.is_admin());

CREATE POLICY extras_select_public ON public.product_extras
    FOR SELECT USING (true);
CREATE POLICY extras_write_own ON public.product_extras
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.products p
                 WHERE p.id = product_id AND (p.business_id = auth.uid() OR public.is_admin()))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.products p
                 WHERE p.id = product_id AND (p.business_id = auth.uid() OR public.is_admin()))
    );

-- ------------------------------------------------------------
-- REPARTIDORES
-- ------------------------------------------------------------
CREATE POLICY courier_select ON public.courier_profiles
    FOR SELECT USING (
        id = auth.uid()
        OR public.is_admin()
        -- el cliente ve al repartidor que lleva su pedido
        OR EXISTS (SELECT 1 FROM public.orders o
                    WHERE o.courier_id = courier_profiles.id
                      AND (o.customer_id = auth.uid() OR o.business_id = auth.uid()))
    );

CREATE POLICY courier_insert_own ON public.courier_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY courier_update_own ON public.courier_profiles
    FOR UPDATE USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- Un repartidor no se aprueba a sí mismo
CREATE OR REPLACE FUNCTION public.guard_courier_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;
    NEW.approval_status  := OLD.approval_status;
    NEW.commission_rate  := OLD.commission_rate;
    NEW.total_earnings   := OLD.total_earnings;
    NEW.total_deliveries := OLD.total_deliveries;
    NEW.pro_plan         := OLD.pro_plan;
    NEW.pro_plan_expires_at := OLD.pro_plan_expires_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER courier_guard_fields
    BEFORE UPDATE ON public.courier_profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_courier_privileged_fields();

CREATE POLICY courier_loc_insert_own ON public.courier_locations
    FOR INSERT WITH CHECK (courier_id = auth.uid());

CREATE POLICY courier_loc_select ON public.courier_locations
    FOR SELECT USING (
        courier_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (SELECT 1 FROM public.orders o
                    WHERE o.courier_id = courier_locations.courier_id
                      AND o.customer_id = auth.uid()
                      AND o.status IN ('courier_assigned','picked_up','delivering'))
    );

-- ------------------------------------------------------------
-- DIRECCIONES — estrictamente privadas
-- ------------------------------------------------------------
CREATE POLICY addresses_own ON public.addresses
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- CUPONES — lectura pública de los activos
-- ------------------------------------------------------------
CREATE POLICY coupons_select_public ON public.coupons
    FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY coupons_admin_write ON public.coupons
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- PEDIDOS
--   SELECT: cliente, negocio, repartidor asignado, repartidor con
--           oferta viva, admin.
--   INSERT: NADIE directamente — solo place_order() (SECURITY DEFINER).
--   UPDATE: los actores involucrados, pero un trigger bloquea que
--           toquen montos o el estado de pago.
-- ------------------------------------------------------------
CREATE POLICY orders_select ON public.orders
    FOR SELECT USING (
        customer_id = auth.uid()
        OR business_id = auth.uid()
        OR courier_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (SELECT 1 FROM public.order_offers f
                    WHERE f.order_id = orders.id
                      AND f.courier_id = auth.uid()
                      AND f.status = 'pending'
                      AND f.expires_at > now())
    );

CREATE POLICY orders_update ON public.orders
    FOR UPDATE USING (
        customer_id = auth.uid()
        OR business_id = auth.uid()
        OR courier_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (SELECT 1 FROM public.order_offers f
                    WHERE f.order_id = orders.id
                      AND f.courier_id = auth.uid()
                      AND f.status = 'pending'
                      AND f.expires_at > now())
    )
    WITH CHECK (
        customer_id = auth.uid()
        OR business_id = auth.uid()
        OR courier_id = auth.uid()
        OR public.is_admin()
    );

-- Blindaje de montos: ni el cliente ni el negocio pueden reescribir precios
CREATE OR REPLACE FUNCTION public.guard_order_amounts()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;
    NEW.subtotal       := OLD.subtotal;
    NEW.delivery_fee   := OLD.delivery_fee;
    NEW.service_fee    := OLD.service_fee;
    NEW.tip            := OLD.tip;
    NEW.discount       := OLD.discount;
    NEW.total          := OLD.total;
    NEW.payment_status := OLD.payment_status;   -- solo el webhook (service_role)
    NEW.epayco_ref     := OLD.epayco_ref;
    NEW.business_commission := OLD.business_commission;
    NEW.platform_revenue    := OLD.platform_revenue;
    NEW.customer_id    := OLD.customer_id;
    NEW.business_id    := OLD.business_id;
    NEW.order_number   := OLD.order_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER orders_guard_amounts
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.guard_order_amounts();

-- ITEMS — se leen con el pedido; se insertan solo desde place_order()
CREATE POLICY order_items_select ON public.order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.orders o
                 WHERE o.id = order_id
                   AND (o.customer_id = auth.uid()
                        OR o.business_id = auth.uid()
                        OR o.courier_id = auth.uid()
                        OR public.is_admin()))
    );

-- OFERTAS A REPARTIDORES
CREATE POLICY offers_select ON public.order_offers
    FOR SELECT USING (
        courier_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (SELECT 1 FROM public.orders o
                    WHERE o.id = order_id AND o.business_id = auth.uid())
    );

CREATE POLICY offers_update_own ON public.order_offers
    FOR UPDATE USING (courier_id = auth.uid() OR public.is_admin())
    WITH CHECK (courier_id = auth.uid() OR public.is_admin());

-- RESEÑAS — el cliente reseña su propio pedido entregado
CREATE POLICY reviews_select_public ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY reviews_insert_own ON public.reviews
    FOR INSERT WITH CHECK (
        customer_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.orders o
                     WHERE o.id = order_id
                       AND o.customer_id = auth.uid()
                       AND o.status = 'delivered')
    );

-- ------------------------------------------------------------
-- SUSCRIPCIONES Y WALLETS
-- ------------------------------------------------------------
CREATE POLICY plans_select_public ON public.subscription_plans
    FOR SELECT USING (is_active OR public.is_admin());

CREATE POLICY subs_select_own ON public.subscriptions
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY wallets_select_own ON public.wallets
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

-- Solo método de retiro; los saldos los mueven los triggers
CREATE POLICY wallets_update_own ON public.wallets
    FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.guard_wallet_balances()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;
    NEW.credits            := OLD.credits;
    NEW.pending_payout     := OLD.pending_payout;
    NEW.available_withdraw := OLD.available_withdraw;
    NEW.cash_owed          := OLD.cash_owed;
    NEW.actor_type         := OLD.actor_type;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER wallets_guard_balances
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION public.guard_wallet_balances();

CREATE POLICY wallet_tx_select ON public.wallet_transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.wallets w
                 WHERE w.id = wallet_id AND (w.user_id = auth.uid() OR public.is_admin()))
    );

-- ------------------------------------------------------------
-- RPC del Super Admin: aprobar / rechazar
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_business(
    p_business_id UUID,
    p_approve     BOOLEAN,
    p_reason      TEXT DEFAULT NULL
)
RETURNS public.business_profiles AS $$
DECLARE
    v_row public.business_profiles%ROWTYPE;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede aprobar negocios';
    END IF;

    UPDATE public.business_profiles
       SET status           = CASE WHEN p_approve THEN 'active' ELSE 'rejected' END,
           rejection_reason = CASE WHEN p_approve THEN NULL ELSE p_reason END,
           reviewed_at      = now(),
           reviewed_by      = auth.uid()
     WHERE id = p_business_id
     RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Negocio no encontrado';
    END IF;
    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.review_courier(
    p_courier_id UUID,
    p_approve    BOOLEAN,
    p_reason     TEXT DEFAULT NULL
)
RETURNS public.courier_profiles AS $$
DECLARE
    v_row public.courier_profiles%ROWTYPE;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede aprobar repartidores';
    END IF;

    UPDATE public.courier_profiles
       SET approval_status  = CASE WHEN p_approve THEN 'active' ELSE 'rejected' END,
           rejection_reason = CASE WHEN p_approve THEN NULL ELSE p_reason END,
           reviewed_at      = now(),
           reviewed_by      = auth.uid()
     WHERE id = p_courier_id
     RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repartidor no encontrado';
    END IF;
    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.review_business FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_courier  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_business TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_courier  TO authenticated;
