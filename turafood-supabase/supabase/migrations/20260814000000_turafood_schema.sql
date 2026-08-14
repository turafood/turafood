-- ============================================================
-- TURAFOOD — Schema Inicial (Agosto 2026)
-- Incluye: Usuarios, Negocios, Repartidores, Pedidos, Suscripciones y Wallets
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. PROFILES — Todos los usuarios
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'customer' 
        CHECK (role IN ('customer', 'business', 'courier', 'admin', 'ops')),
    first_name TEXT,
    last_name TEXT,
    phone TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    rating DECIMAL(3,2) DEFAULT 5.00,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para auto-actualizar updated_at en profiles
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para crear perfil al registrarse vía Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, phone, first_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.phone, NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario Nuevo'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. DELIVERY ZONES — Zonas de Buenaventura
CREATE TABLE public.delivery_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    neighborhoods TEXT[],  -- barrios incluidos
    base_fee NUMERIC NOT NULL,
    per_km_fee NUMERIC NOT NULL,
    min_order NUMERIC DEFAULT 0,
    polygon GEOMETRY(Polygon, 4326),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- 3. BUSINESS PROFILES — Negocios (restaurantes, mercados, etc.)
CREATE TABLE public.business_profiles (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    address TEXT NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    phone TEXT,
    vertical TEXT NOT NULL 
        CHECK (vertical IN ('restaurant','market','pharmacy','liquor','store','turbo')),
    status TEXT DEFAULT 'pending_review' 
        CHECK (status IN ('pending_review','active','suspended','closed')),
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_orders INTEGER DEFAULT 0,
    prep_time_avg INTEGER DEFAULT 25,  -- minutos
    min_order NUMERIC DEFAULT 0,
    commission_rate NUMERIC DEFAULT 0.10, -- Base software fee
    accepts_pickup BOOLEAN DEFAULT true,
    zone_id UUID REFERENCES public.delivery_zones(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_business_location ON public.business_profiles USING GIST (location);
CREATE INDEX idx_business_status ON public.business_profiles (status) WHERE status = 'active';

-- 4. BUSINESS HOURS — Horarios de apertura
CREATE TABLE public.business_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    opens_at TIME NOT NULL,
    closes_at TIME NOT NULL,
    is_open BOOLEAN DEFAULT true,
    UNIQUE (business_id, day_of_week)
);

-- 5. PRODUCT CATEGORIES
CREATE TABLE public.product_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- 6. PRODUCTS — Catálogo
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.product_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    compare_price NUMERIC,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PRODUCT EXTRAS — Adicionales / variantes
CREATE TABLE public.product_extras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,  -- "Tamaño", "Extras", "Bebida"
    name TEXT NOT NULL,
    price_delta NUMERIC DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    max_select INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
);

-- 8. COURIER PROFILES — Repartidores
CREATE TABLE public.courier_profiles (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    status TEXT DEFAULT 'offline' 
        CHECK (status IN ('offline','online','busy')),
    current_location GEOMETRY(Point, 4326),
    vehicle_type TEXT CHECK (vehicle_type IN ('motorcycle','bicycle','car')),
    plate TEXT,
    acceptance_rate DECIMAL(5,2) DEFAULT 100.00,
    total_deliveries INTEGER DEFAULT 0,
    total_earnings NUMERIC DEFAULT 0,
    commission_rate NUMERIC DEFAULT 0.10,
    zone_id UUID REFERENCES public.delivery_zones(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_courier_location ON public.courier_profiles USING GIST (current_location);
CREATE INDEX idx_courier_status ON public.courier_profiles (status) WHERE status = 'online';

-- 9. COURIER LOCATIONS — Historial GPS
CREATE TABLE public.courier_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    courier_id UUID REFERENCES public.courier_profiles(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    heading REAL,
    speed REAL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para copiar ubicación a courier_profiles.current_location
CREATE OR REPLACE FUNCTION public.sync_courier_location()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.courier_profiles 
    SET current_location = NEW.location 
    WHERE id = NEW.courier_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_courier_location_insert
    AFTER INSERT ON public.courier_locations
    FOR EACH ROW EXECUTE FUNCTION public.sync_courier_location();

-- Función para buscar repartidores cercanos
CREATE OR REPLACE FUNCTION public.find_nearby_couriers(
    lat double precision,
    lon double precision,
    radius_m double precision DEFAULT 5000
)
RETURNS TABLE (
    courier_id UUID,
    first_name TEXT,
    vehicle_type TEXT,
    plate TEXT,
    rating DECIMAL,
    distance double precision
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id,
        p.first_name,
        cp.vehicle_type,
        cp.plate,
        p.rating,
        ST_Distance(
            cp.current_location,
            ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
        ) as distance
    FROM public.courier_profiles cp
    JOIN public.profiles p ON p.id = cp.id
    WHERE cp.status = 'online'
      AND cp.current_location IS NOT NULL
      AND ST_DWithin(
          cp.current_location,
          ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
          radius_m
      )
    ORDER BY distance ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. ORDERS — Pedidos
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,  -- #TF-0001
    customer_id UUID REFERENCES public.profiles(id) NOT NULL,
    business_id UUID REFERENCES public.business_profiles(id) NOT NULL,
    courier_id UUID REFERENCES public.courier_profiles(id),
    
    delivery_address TEXT NOT NULL,
    delivery_location GEOMETRY(Point, 4326) NOT NULL,
    delivery_instructions TEXT,
    
    mode TEXT DEFAULT 'delivery' CHECK (mode IN ('delivery','pickup')),
    
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'preparing', 'ready', 'courier_assigned', 
        'picking_up', 'picked_up', 'delivering', 'delivered', 'cancelled', 'refunded'
    )),
    
    subtotal NUMERIC NOT NULL,
    delivery_fee NUMERIC DEFAULT 0,
    service_fee NUMERIC DEFAULT 0,
    tip NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    
    business_commission NUMERIC DEFAULT 0,
    courier_commission NUMERIC DEFAULT 0,
    platform_revenue NUMERIC DEFAULT 0,
    
    payment_method TEXT CHECK (payment_method IN ('cash','nequi','daviplata','card')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded')),
    
    coupon_code TEXT,
    scheduled_at TIMESTAMPTZ,
    
    accepted_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. ORDER ITEMS — Items del pedido
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    extras JSONB DEFAULT '[]',
    notes TEXT,
    subtotal NUMERIC NOT NULL
);

-- 12. ORDER OFFERS — Ofertas a repartidores
CREATE TABLE public.order_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    courier_id UUID REFERENCES public.courier_profiles(id),
    status TEXT DEFAULT 'pending' 
        CHECK (status IN ('pending','accepted','rejected','expired')),
    pay_amount NUMERIC NOT NULL,
    distance_km NUMERIC,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. SUBSCRIPTIONS — Tura Plus, Biz Pro, Rider Pro
CREATE TABLE public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('customer','business','courier')),
    price_intro NUMERIC NOT NULL,
    price_regular NUMERIC NOT NULL,
    intro_months INTEGER DEFAULT 3,
    features JSONB,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.subscription_plans(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','past_due','expired')),
    started_at TIMESTAMPTZ DEFAULT now(),
    intro_ends_at TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    payment_method TEXT
);

-- 14. COUPONS — Cupones
CREATE TABLE public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT CHECK (discount_type IN ('percent','fixed','free_delivery')),
    discount_value NUMERIC NOT NULL,
    max_discount NUMERIC,
    min_order NUMERIC DEFAULT 0,
    uses_limit INTEGER,
    uses_count INTEGER DEFAULT 0,
    valid_until TIMESTAMPTZ,
    verticals TEXT[],
    is_active BOOLEAN DEFAULT true
);

-- 15. WALLETS — Sistema financiero
CREATE TABLE public.wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('customer','business','courier')),
    
    credits NUMERIC DEFAULT 0,
    pending_payout NUMERIC DEFAULT 0,
    available_withdraw NUMERIC DEFAULT 0,
    cash_owed NUMERIC DEFAULT 0,
    
    payout_method TEXT,
    payout_account TEXT,
    payout_account_full TEXT,
    
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'earning','tip','commission','cashback','bonus',
        'referral','refund','payout','withdrawal',
        'cash_collected','cash_settled','promo_cost',
        'adjustment','subscription'
    )),
    amount NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para balances de Wallet
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    CASE NEW.type
        WHEN 'cashback', 'bonus', 'referral', 'refund' THEN
            UPDATE public.wallets SET credits = credits + NEW.amount WHERE id = NEW.wallet_id;
        WHEN 'earning', 'tip', 'commission', 'subscription', 'withdrawal' THEN
            UPDATE public.wallets SET available_withdraw = available_withdraw + NEW.amount WHERE id = NEW.wallet_id;
        WHEN 'cash_collected' THEN
            UPDATE public.wallets SET cash_owed = cash_owed + ABS(NEW.amount) WHERE id = NEW.wallet_id;
        WHEN 'cash_settled' THEN
            UPDATE public.wallets SET cash_owed = cash_owed - ABS(NEW.amount) WHERE id = NEW.wallet_id;
        WHEN 'payout' THEN
            UPDATE public.wallets SET pending_payout = pending_payout + NEW.amount WHERE id = NEW.wallet_id;
        ELSE NULL;
    END CASE;
    
    NEW.balance_after = (SELECT 
        CASE 
            WHEN actor_type = 'customer' THEN credits
            WHEN actor_type = 'courier' THEN available_withdraw - cash_owed
            WHEN actor_type = 'business' THEN pending_payout
        END
        FROM public.wallets WHERE id = NEW.wallet_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_wallet_transaction
    BEFORE INSERT ON public.wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance();

-- Trigger para inicializar wallet al crear un perfil
CREATE OR REPLACE FUNCTION public.initialize_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallets (user_id, actor_type)
    VALUES (NEW.id, NEW.role);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_create_wallet
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.initialize_wallet();
