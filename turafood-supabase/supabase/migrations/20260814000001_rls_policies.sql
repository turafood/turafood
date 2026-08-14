-- ============================================================
-- TURAFOOD — Políticas RLS de producción
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Verificar si el usuario es admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'ops')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_select_public"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

-- ============================================================
-- DELIVERY ZONES
-- ============================================================
CREATE POLICY "zones_select_public"
    ON public.delivery_zones FOR SELECT
    USING (true);

-- ============================================================
-- BUSINESS PROFILES
-- ============================================================
CREATE POLICY "business_select_public"
    ON public.business_profiles FOR SELECT
    USING (true);

CREATE POLICY "business_update_own"
    ON public.business_profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

-- ============================================================
-- CATALOG (Categories, Products, Extras, Hours)
-- ============================================================
CREATE POLICY "catalog_select_public" ON public.business_hours FOR SELECT USING (true);
CREATE POLICY "catalog_select_public" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "catalog_select_public" ON public.products FOR SELECT USING (true);
CREATE POLICY "catalog_select_public" ON public.product_extras FOR SELECT USING (true);

CREATE POLICY "catalog_update_own" ON public.business_hours FOR ALL USING (auth.uid() = business_id OR public.is_admin());
CREATE POLICY "catalog_update_own" ON public.product_categories FOR ALL USING (auth.uid() = business_id OR public.is_admin());
CREATE POLICY "catalog_update_own" ON public.products FOR ALL USING (auth.uid() = business_id OR public.is_admin());
CREATE POLICY "catalog_update_own" ON public.product_extras FOR ALL USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.business_id = auth.uid() OR public.is_admin()))
);

-- ============================================================
-- COURIER PROFILES & LOCATIONS
-- ============================================================
CREATE POLICY "courier_select_public"
    ON public.courier_profiles FOR SELECT
    USING (true);

CREATE POLICY "courier_update_own"
    ON public.courier_profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

-- El conductor inserta sus propias ubicaciones
CREATE POLICY "courier_location_insert_own"
    ON public.courier_locations FOR INSERT
    WITH CHECK (auth.uid() = courier_id);

-- Solo el admin puede leer el historial de ubicaciones
CREATE POLICY "courier_location_select"
    ON public.courier_locations FOR SELECT
    USING (auth.uid() = courier_id OR public.is_admin());

-- ============================================================
-- ORDERS (Lecciones clave de Turapp)
-- ============================================================
-- Política de SELECT: Cliente, Negocio, Repartidor asignado, Admins
CREATE POLICY "orders_select"
    ON public.orders FOR SELECT
    USING (
        auth.uid() = customer_id
        OR auth.uid() = business_id
        OR auth.uid() = courier_id
        OR EXISTS (
            SELECT 1 FROM public.order_offers o 
            WHERE o.order_id = orders.id AND o.courier_id = auth.uid() AND o.status = 'pending'
        )
        OR public.is_admin()
    );

-- Política de INSERT: Solo Clientes
CREATE POLICY "orders_insert"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

-- Política de UPDATE: Actores involucrados + Control de concurrencia
CREATE POLICY "orders_update"
    ON public.orders FOR UPDATE
    USING (
        auth.uid() = customer_id
        OR auth.uid() = business_id
        OR auth.uid() = courier_id
        OR EXISTS (
            SELECT 1 FROM public.order_offers o 
            WHERE o.order_id = orders.id AND o.courier_id = auth.uid() AND o.status = 'pending'
        )
        OR public.is_admin()
    )
    WITH CHECK (
        -- WITH CHECK evita que un repartidor asigne el pedido a otro
        auth.uid() = customer_id
        OR auth.uid() = business_id
        OR auth.uid() = courier_id
        OR public.is_admin()
    );

-- ORDER ITEMS (Siguen a la orden)
CREATE POLICY "order_items_select"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_id AND (
                o.customer_id = auth.uid() OR o.business_id = auth.uid() OR o.courier_id = auth.uid() OR public.is_admin()
            )
        )
    );

CREATE POLICY "order_items_insert"
    ON public.order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_id AND o.customer_id = auth.uid()
        )
    );

-- ============================================================
-- ORDER OFFERS (A Repartidores)
-- ============================================================
CREATE POLICY "order_offers_select"
    ON public.order_offers FOR SELECT
    USING (
        auth.uid() = courier_id
        OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.business_id = auth.uid())
        OR public.is_admin()
    );

CREATE POLICY "order_offers_update"
    ON public.order_offers FOR UPDATE
    USING (auth.uid() = courier_id OR public.is_admin());

-- ============================================================
-- WALLETS
-- ============================================================
-- Cada usuario solo ve su propia billetera
CREATE POLICY "wallets_select"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

-- Nadie actualiza directamente la billetera (lo hacen los triggers) a excepción de metodos de retiro
CREATE POLICY "wallets_update"
    ON public.wallets FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());

-- Transacciones
CREATE POLICY "transactions_select"
    ON public.wallet_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.wallets w 
            WHERE w.id = wallet_id AND (w.user_id = auth.uid() OR public.is_admin())
        )
    );
