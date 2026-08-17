-- ============================================================
-- TURAFOOD — ESQUEMA CANÓNICO (fuente única de verdad)
-- Reemplaza: app_tables.sql, epayco_tables.sql, auth_triggers.sql
--            y las migraciones 20260814*.
--
-- Convenciones fijadas aquí (todo el frontend debe respetarlas):
--   · roles en minúscula: customer | business | courier | admin | ops
--   · estados de pedido en minúscula (ver CHECK de orders.status)
--   · el precio SIEMPRE lo calcula el servidor (ver place_order)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ------------------------------------------------------------
-- 1. PROFILES — un registro por usuario de auth
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer','business','courier','admin','ops')),
    full_name   TEXT,
    phone       TEXT,
    email       TEXT,
    avatar_url  TEXT,
    rating      NUMERIC(3,2) DEFAULT 5.00,

    -- Tura Plus (suscripción del cliente)
    tura_plus            BOOLEAN DEFAULT false,
    tura_plus_expires_at TIMESTAMPTZ,

    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_touch
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 2. ZONAS DE ENTREGA — Buenaventura
-- ------------------------------------------------------------
CREATE TABLE public.delivery_zones (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    neighborhoods TEXT[],
    base_fee      NUMERIC NOT NULL DEFAULT 3900,
    per_km_fee    NUMERIC NOT NULL DEFAULT 800,
    min_order     NUMERIC DEFAULT 0,
    polygon       GEOMETRY(Polygon, 4326),
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. NEGOCIOS
--    Se crean desde el wizard de registro, NO desde el trigger de auth.
--    Nacen en 'pending_review' y el Super Admin los aprueba.
-- ------------------------------------------------------------
CREATE TABLE public.business_profiles (
    id            UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    slug          TEXT UNIQUE NOT NULL,
    description   TEXT,
    category      TEXT,                    -- "Asados · Picadas · Criolla"
    vertical      TEXT NOT NULL DEFAULT 'restaurant'
                  CHECK (vertical IN (
                      'restaurant','market','pharmacy','liquor','store','turbo',
                      'boat'   -- reserva de lanchas a playas de Buenaventura
                  )),

    logo_url      TEXT,
    cover_url     TEXT,

    address       TEXT NOT NULL,
    location      GEOMETRY(Point, 4326),
    phone         TEXT,

    status        TEXT NOT NULL DEFAULT 'pending_review'
                  CHECK (status IN ('pending_review','active','rejected','suspended','closed')),
    rejection_reason TEXT,
    reviewed_at   TIMESTAMPTZ,
    reviewed_by   UUID REFERENCES public.profiles(id),

    is_open       BOOLEAN DEFAULT true,    -- toggle manual del negocio
    rating        NUMERIC(2,1) DEFAULT 5.0,
    reviews_count INTEGER DEFAULT 0,
    total_orders  INTEGER DEFAULT 0,

    prep_time_min INTEGER DEFAULT 25,      -- alimenta el "28 min" del diseño
    delivery_fee  NUMERIC DEFAULT 3900,
    min_order     NUMERIC DEFAULT 0,
    badge         TEXT,                    -- 'Turbo' | 'Top' | 'Nuevo'
    offer_label   TEXT,                    -- '2x1 en picadas'

    -- Comisión por pedido. La fija `default_commission_rate()` según la
    -- vertical: 10% general, 15% farmacia y licores. Un admin puede
    -- sobrescribirla por negocio (por ejemplo, para un acuerdo especial).
    commission_rate NUMERIC,
    accepts_pickup  BOOLEAN DEFAULT true,

    -- Biz Pro (suscripción del negocio)
    pro_plan            BOOLEAN DEFAULT false,
    pro_plan_expires_at TIMESTAMPTZ,

    zone_id       UUID REFERENCES public.delivery_zones(id),
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- MODELO DE COBRO A NEGOCIOS
--   · 10% por pedido en general
--   · 15% en farmacia y licoreras
--   · 0% si el negocio tiene Biz Pro vigente: en ese caso solo paga
--     la suscripción fija, no un porcentaje por pedido.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.default_commission_rate(p_vertical TEXT)
RETURNS NUMERIC AS $$
    SELECT CASE
        WHEN p_vertical IN ('pharmacy', 'liquor') THEN 0.15
        ELSE 0.10
    END;
$$ LANGUAGE sql IMMUTABLE;

/**
 * Comisión efectiva de un negocio en este momento.
 * Un negocio con Biz Pro vigente no paga porcentaje por pedido.
 */
CREATE OR REPLACE FUNCTION public.effective_commission_rate(p_business_id UUID)
RETURNS NUMERIC AS $$
    SELECT CASE
        WHEN b.pro_plan
             AND (b.pro_plan_expires_at IS NULL OR b.pro_plan_expires_at > now())
        THEN 0
        ELSE COALESCE(b.commission_rate, public.default_commission_rate(b.vertical))
    END
    FROM public.business_profiles b
    WHERE b.id = p_business_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.set_default_commission()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.commission_rate IS NULL THEN
        NEW.commission_rate := public.default_commission_rate(NEW.vertical);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_default_commission
    BEFORE INSERT ON public.business_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_default_commission();

CREATE INDEX idx_business_location ON public.business_profiles USING GIST (location);
CREATE INDEX idx_business_active   ON public.business_profiles (status) WHERE status = 'active';
CREATE INDEX idx_business_vertical ON public.business_profiles (vertical);

CREATE TABLE public.business_hours (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    opens_at    TIME NOT NULL,
    closes_at   TIME NOT NULL,
    is_open     BOOLEAN DEFAULT true,
    UNIQUE (business_id, day_of_week)
);

-- ------------------------------------------------------------
-- 4. CATÁLOGO
-- ------------------------------------------------------------
CREATE TABLE public.product_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,             -- "Recomendados", "Criolla", "Bebidas"
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT true
);

CREATE TABLE public.products (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    category_id   UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    description   TEXT,
    price         NUMERIC NOT NULL CHECK (price >= 0),
    compare_price NUMERIC,                 -- precio tachado ("was" en el mockup)
    image_url     TEXT,
    is_available  BOOLEAN DEFAULT true,
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_business ON public.products (business_id) WHERE is_available;

-- Grupos de opciones: "Tamaño" (requerido, 1), "Extras" (opcional, N)
CREATE TABLE public.product_extras (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    group_name  TEXT NOT NULL,
    name        TEXT NOT NULL,
    price_delta NUMERIC DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    max_select  INTEGER DEFAULT 1,
    sort_order  INTEGER DEFAULT 0
);

CREATE INDEX idx_extras_product ON public.product_extras (product_id);

-- ------------------------------------------------------------
-- 5. REPARTIDORES
-- ------------------------------------------------------------
CREATE TABLE public.courier_profiles (
    id               UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    status           TEXT DEFAULT 'offline' CHECK (status IN ('offline','online','busy')),
    approval_status  TEXT NOT NULL DEFAULT 'pending_review'
                     CHECK (approval_status IN ('pending_review','active','rejected','suspended')),
    rejection_reason TEXT,
    reviewed_at      TIMESTAMPTZ,
    reviewed_by      UUID REFERENCES public.profiles(id),

    current_location GEOMETRY(Point, 4326),
    vehicle_type     TEXT CHECK (vehicle_type IN ('motorcycle','bicycle','car')),
    plate            TEXT,

    acceptance_rate  NUMERIC(5,2) DEFAULT 100.00,
    total_deliveries INTEGER DEFAULT 0,
    total_earnings   NUMERIC DEFAULT 0,
    commission_rate  NUMERIC DEFAULT 0.10,

    pro_plan            BOOLEAN DEFAULT false,
    pro_plan_expires_at TIMESTAMPTZ,

    zone_id          UUID REFERENCES public.delivery_zones(id),
    created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_courier_location ON public.courier_profiles USING GIST (current_location);
CREATE INDEX idx_courier_online   ON public.courier_profiles (status) WHERE status = 'online';

CREATE TABLE public.courier_locations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES public.courier_profiles(id) ON DELETE CASCADE,
    location   GEOMETRY(Point, 4326) NOT NULL,
    heading    REAL,
    speed      REAL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.sync_courier_location()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.courier_profiles
       SET current_location = NEW.location
     WHERE id = NEW.courier_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_courier_location_insert
    AFTER INSERT ON public.courier_locations
    FOR EACH ROW EXECUTE FUNCTION public.sync_courier_location();

-- ------------------------------------------------------------
-- 6. DIRECCIONES DEL CLIENTE
-- ------------------------------------------------------------
CREATE TABLE public.addresses (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label        TEXT NOT NULL DEFAULT 'Casa',   -- Casa | Trabajo | Otro
    address      TEXT NOT NULL,
    detail       TEXT,                            -- "Torre B, apto 402"
    neighborhood TEXT,
    location     GEOMETRY(Point, 4326),
    is_default   BOOLEAN DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_addresses_user ON public.addresses (user_id);

-- Solo una dirección por defecto por usuario
CREATE UNIQUE INDEX idx_addresses_one_default
    ON public.addresses (user_id) WHERE is_default;

-- ------------------------------------------------------------
-- 7. CUPONES
-- ------------------------------------------------------------
CREATE TABLE public.coupons (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code           TEXT UNIQUE NOT NULL,
    description    TEXT,
    discount_type  TEXT NOT NULL CHECK (discount_type IN ('percent','fixed','free_delivery')),
    discount_value NUMERIC NOT NULL DEFAULT 0,
    max_discount   NUMERIC,
    min_order      NUMERIC DEFAULT 0,
    uses_limit     INTEGER,
    uses_count     INTEGER DEFAULT 0,
    valid_until    TIMESTAMPTZ,
    verticals      TEXT[],
    is_active      BOOLEAN DEFAULT true
);

-- ------------------------------------------------------------
-- 8. PEDIDOS
-- ------------------------------------------------------------
CREATE SEQUENCE public.order_number_seq START 4821;   -- arranca en el #TS-4821 del diseño

CREATE TABLE public.orders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number  TEXT UNIQUE NOT NULL DEFAULT ('TS-' || nextval('public.order_number_seq')),

    customer_id   UUID NOT NULL REFERENCES public.profiles(id),
    business_id   UUID NOT NULL REFERENCES public.business_profiles(id),
    courier_id    UUID REFERENCES public.courier_profiles(id),

    delivery_address      TEXT,
    delivery_detail       TEXT,
    delivery_location     GEOMETRY(Point, 4326),
    delivery_instructions TEXT,

    mode   TEXT NOT NULL DEFAULT 'delivery' CHECK (mode IN ('delivery','pickup')),

    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',           -- creada, esperando pago o aceptación
        'accepted',          -- el negocio la aceptó
        'preparing',
        'ready',             -- lista para recoger
        'courier_assigned',
        'picked_up',
        'delivering',
        'delivered',
        'cancelled',
        'refunded'
    )),

    -- Montos: los calcula place_order, NUNCA el cliente
    subtotal     NUMERIC NOT NULL DEFAULT 0,
    delivery_fee NUMERIC NOT NULL DEFAULT 0,
    service_fee  NUMERIC NOT NULL DEFAULT 0,
    tip          NUMERIC NOT NULL DEFAULT 0,
    discount     NUMERIC NOT NULL DEFAULT 0,
    total        NUMERIC NOT NULL DEFAULT 0,

    business_commission NUMERIC DEFAULT 0,
    courier_earnings    NUMERIC DEFAULT 0,
    platform_revenue    NUMERIC DEFAULT 0,

    payment_method TEXT CHECK (payment_method IN ('cash','nequi','daviplata','card')),
    payment_status TEXT NOT NULL DEFAULT 'pending'
                   CHECK (payment_status IN ('pending','paid','failed','refunded')),
    epayco_ref     TEXT,

    coupon_code   TEXT,
    scheduled_at  TIMESTAMPTZ,

    accepted_at   TIMESTAMPTZ,
    ready_at      TIMESTAMPTZ,
    picked_up_at  TIMESTAMPTZ,
    delivered_at  TIMESTAMPTZ,
    cancelled_at  TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_customer ON public.orders (customer_id, created_at DESC);
CREATE INDEX idx_orders_business ON public.orders (business_id, created_at DESC);
CREATE INDEX idx_orders_courier  ON public.orders (courier_id, created_at DESC);
CREATE INDEX idx_orders_live     ON public.orders (status)
    WHERE status IN ('pending','accepted','preparing','ready','courier_assigned','picked_up','delivering');

CREATE TABLE public.order_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    name       TEXT NOT NULL,          -- snapshot: el nombre al momento de comprar
    unit_price NUMERIC NOT NULL,       -- snapshot del precio base + extras
    quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    extras     JSONB DEFAULT '[]'::jsonb,
    notes      TEXT,
    subtotal   NUMERIC NOT NULL
);

CREATE INDEX idx_order_items_order ON public.order_items (order_id);

-- Ofertas de pedido a repartidores
CREATE TABLE public.order_offers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    courier_id  UUID NOT NULL REFERENCES public.courier_profiles(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','rejected','expired')),
    pay_amount  NUMERIC NOT NULL,
    distance_km NUMERIC,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '45 seconds'),
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (order_id, courier_id)
);

CREATE INDEX idx_offers_courier ON public.order_offers (courier_id, status);

-- Reseñas
CREATE TABLE public.reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    courier_id  UUID REFERENCES public.courier_profiles(id) ON DELETE SET NULL,
    business_rating INTEGER CHECK (business_rating BETWEEN 1 AND 5),
    courier_rating  INTEGER CHECK (courier_rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Recalcular el rating del negocio con cada reseña
CREATE OR REPLACE FUNCTION public.recalc_business_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.business_profiles b
       SET rating = COALESCE(sub.avg_rating, 5.0),
           reviews_count = sub.n
      FROM (
          SELECT ROUND(AVG(business_rating)::numeric, 1) AS avg_rating, COUNT(*) AS n
            FROM public.reviews
           WHERE business_id = NEW.business_id AND business_rating IS NOT NULL
      ) sub
     WHERE b.id = NEW.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_review_created
    AFTER INSERT ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.recalc_business_rating();

-- ------------------------------------------------------------
-- 9. SUSCRIPCIONES
-- ------------------------------------------------------------
CREATE TABLE public.subscription_plans (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code          TEXT UNIQUE NOT NULL,       -- PLUS | BUSINESS_PRO | RIDER_PRO
    name          TEXT NOT NULL,
    actor_type    TEXT NOT NULL CHECK (actor_type IN ('customer','business','courier')),
    price_intro   NUMERIC NOT NULL,
    price_regular NUMERIC NOT NULL,
    intro_months  INTEGER DEFAULT 3,
    features      JSONB DEFAULT '[]'::jsonb,
    is_active     BOOLEAN DEFAULT true
);

CREATE TABLE public.subscriptions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id            UUID REFERENCES public.subscription_plans(id),
    status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','cancelled','past_due','expired')),
    started_at         TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    epayco_ref         TEXT
);

-- ------------------------------------------------------------
-- 10. WALLETS
-- ------------------------------------------------------------
CREATE TABLE public.wallets (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_type         TEXT NOT NULL CHECK (actor_type IN ('customer','business','courier','admin','ops')),
    credits            NUMERIC DEFAULT 0,
    pending_payout     NUMERIC DEFAULT 0,
    available_withdraw NUMERIC DEFAULT 0,
    cash_owed          NUMERIC DEFAULT 0,
    payout_method      TEXT,
    payout_account     TEXT,
    updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.wallet_transactions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id      UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    type           TEXT NOT NULL CHECK (type IN (
        'earning','tip','commission','cashback','bonus','referral','refund',
        'payout','withdrawal','cash_collected','cash_settled','promo_cost',
        'adjustment','subscription'
    )),
    amount         NUMERIC NOT NULL,
    balance_after  NUMERIC,
    reference_type TEXT,
    reference_id   UUID,
    description    TEXT,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallet_tx ON public.wallet_transactions (wallet_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_wallet_transaction()
RETURNS TRIGGER AS $$
DECLARE
    w public.wallets%ROWTYPE;
BEGIN
    CASE NEW.type
        WHEN 'cashback','bonus','referral','refund' THEN
            UPDATE public.wallets SET credits = credits + NEW.amount, updated_at = now()
             WHERE id = NEW.wallet_id;
        WHEN 'earning','tip','commission','subscription','adjustment' THEN
            UPDATE public.wallets SET available_withdraw = available_withdraw + NEW.amount, updated_at = now()
             WHERE id = NEW.wallet_id;
        WHEN 'withdrawal','payout' THEN
            UPDATE public.wallets SET available_withdraw = available_withdraw - ABS(NEW.amount), updated_at = now()
             WHERE id = NEW.wallet_id;
        WHEN 'cash_collected' THEN
            UPDATE public.wallets SET cash_owed = cash_owed + ABS(NEW.amount), updated_at = now()
             WHERE id = NEW.wallet_id;
        WHEN 'cash_settled' THEN
            UPDATE public.wallets SET cash_owed = cash_owed - ABS(NEW.amount), updated_at = now()
             WHERE id = NEW.wallet_id;
        ELSE NULL;
    END CASE;

    SELECT * INTO w FROM public.wallets WHERE id = NEW.wallet_id;
    NEW.balance_after = CASE w.actor_type
        WHEN 'customer' THEN w.credits
        WHEN 'courier'  THEN w.available_withdraw - w.cash_owed
        WHEN 'business' THEN w.pending_payout + w.available_withdraw
        ELSE 0
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_wallet_transaction
    BEFORE INSERT ON public.wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION public.apply_wallet_transaction();

-- ------------------------------------------------------------
-- 11. TRIGGER DE ALTA DE USUARIO
--     Crea SOLO profiles + wallet. Los perfiles de negocio y
--     repartidor los crea su propio wizard, porque necesitan
--     datos que no existen al momento del signup.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'customer'));
    IF v_role NOT IN ('customer','business','courier','admin','ops') THEN
        v_role := 'customer';
    END IF;

    INSERT INTO public.profiles (id, role, full_name, phone, email)
    VALUES (
        NEW.id,
        v_role,
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), NEW.phone),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.wallets (user_id, actor_type)
    VALUES (NEW.id, v_role)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 12. HELPERS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
         WHERE id = auth.uid() AND role IN ('admin','ops')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.find_nearby_couriers(
    lat      double precision,
    lon      double precision,
    radius_m double precision DEFAULT 5000
)
RETURNS TABLE (
    courier_id UUID,
    full_name  TEXT,
    vehicle_type TEXT,
    plate      TEXT,
    rating     NUMERIC,
    distance_m double precision
) AS $$
    SELECT cp.id,
           p.full_name,
           cp.vehicle_type,
           cp.plate,
           p.rating,
           ST_Distance(cp.current_location::geography,
                       ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography)
      FROM public.courier_profiles cp
      JOIN public.profiles p ON p.id = cp.id
     WHERE cp.status = 'online'
       AND cp.approval_status = 'active'
       AND cp.current_location IS NOT NULL
       AND ST_DWithin(cp.current_location::geography,
                      ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
                      radius_m)
     ORDER BY 6 ASC
     LIMIT 10;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 13. place_order — EL PRECIO LO CALCULA EL SERVIDOR
--
-- El cliente manda QUÉ quiere, nunca CUÁNTO cuesta.
-- Cada precio se relee de la tabla products/product_extras.
-- Devuelve el pedido creado para que el front lo muestre.
-- ============================================================
CREATE OR REPLACE FUNCTION public.place_order(
    p_business_id  UUID,
    p_items        JSONB,      -- [{product_id, quantity, extra_ids:[], notes}]
    p_mode         TEXT DEFAULT 'delivery',
    p_address_id   UUID DEFAULT NULL,
    p_tip          NUMERIC DEFAULT 0,
    p_coupon_code  TEXT DEFAULT NULL,
    p_instructions TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash'
)
RETURNS public.orders AS $$
DECLARE
    v_user        UUID := auth.uid();
    v_biz         public.business_profiles%ROWTYPE;
    v_addr        public.addresses%ROWTYPE;
    v_item        JSONB;
    v_product     public.products%ROWTYPE;
    v_unit_price  NUMERIC;
    v_extras_json JSONB;
    v_qty         INTEGER;
    v_subtotal    NUMERIC := 0;
    v_delivery    NUMERIC := 0;
    v_service     NUMERIC := 0;
    v_discount    NUMERIC := 0;
    v_tip         NUMERIC := GREATEST(COALESCE(p_tip, 0), 0);
    v_total       NUMERIC;
    v_coupon      public.coupons%ROWTYPE;
    v_order       public.orders%ROWTYPE;
    v_is_plus     BOOLEAN := false;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para hacer un pedido';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El carrito está vacío';
    END IF;

    SELECT * INTO v_biz FROM public.business_profiles WHERE id = p_business_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El negocio no existe';
    END IF;
    IF v_biz.status <> 'active' THEN
        RAISE EXCEPTION 'El negocio no está disponible en este momento';
    END IF;
    IF NOT v_biz.is_open THEN
        RAISE EXCEPTION 'El negocio está cerrado en este momento';
    END IF;

    -- Dirección (solo para domicilio, y solo si es del propio usuario)
    IF p_mode = 'delivery' THEN
        IF p_address_id IS NULL THEN
            RAISE EXCEPTION 'Selecciona una dirección de entrega';
        END IF;
        SELECT * INTO v_addr
          FROM public.addresses
         WHERE id = p_address_id AND user_id = v_user;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Dirección inválida';
        END IF;
    END IF;

    SELECT COALESCE(tura_plus, false)
             AND (tura_plus_expires_at IS NULL OR tura_plus_expires_at > now())
      INTO v_is_plus
      FROM public.profiles WHERE id = v_user;

    -- Crear el pedido vacío para poder colgarle los items
    INSERT INTO public.orders (
        customer_id, business_id, mode, status,
        delivery_address, delivery_detail, delivery_location, delivery_instructions,
        payment_method, coupon_code
    ) VALUES (
        v_user, p_business_id, p_mode, 'pending',
        v_addr.address, v_addr.detail, v_addr.location, p_instructions,
        p_payment_method, NULLIF(TRIM(p_coupon_code), '')
    ) RETURNING * INTO v_order;

    -- Recorrer items releyendo SIEMPRE el precio real de la BD
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT * INTO v_product
          FROM public.products
         WHERE id = (v_item->>'product_id')::uuid
           AND business_id = p_business_id
           AND is_available;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Un producto de tu carrito ya no está disponible';
        END IF;

        v_qty := GREATEST(COALESCE((v_item->>'quantity')::int, 1), 1);
        v_unit_price := v_product.price;
        v_extras_json := '[]'::jsonb;

        -- Sumar extras, validando que pertenezcan al producto
        IF v_item ? 'extra_ids' AND jsonb_array_length(v_item->'extra_ids') > 0 THEN
            SELECT COALESCE(SUM(e.price_delta), 0),
                   COALESCE(jsonb_agg(jsonb_build_object(
                       'id', e.id, 'group', e.group_name,
                       'name', e.name, 'price', e.price_delta)), '[]'::jsonb)
              INTO v_unit_price, v_extras_json
              FROM public.product_extras e
             WHERE e.product_id = v_product.id
               AND e.id IN (
                   SELECT (jsonb_array_elements_text(v_item->'extra_ids'))::uuid
               );
            v_unit_price := v_product.price + COALESCE(v_unit_price, 0);
        END IF;

        v_subtotal := v_subtotal + (v_unit_price * v_qty);

        INSERT INTO public.order_items (
            order_id, product_id, name, unit_price, quantity, extras, notes, subtotal
        ) VALUES (
            v_order.id, v_product.id, v_product.name, v_unit_price, v_qty,
            v_extras_json, NULLIF(v_item->>'notes', ''), v_unit_price * v_qty
        );
    END LOOP;

    IF v_subtotal < COALESCE(v_biz.min_order, 0) THEN
        RAISE EXCEPTION 'El pedido mínimo de este negocio es %', v_biz.min_order;
    END IF;

    -- Envío y tarifa de servicio
    IF p_mode = 'delivery' THEN
        v_delivery := COALESCE(v_biz.delivery_fee, 3900);
        IF v_is_plus THEN
            v_delivery := 0;   -- beneficio Tura Plus
        END IF;
    END IF;
    -- Tarifa de servicio fija ($1.900), como la muestra el diseño en
    -- carrito y checkout. No es un porcentaje del subtotal.
    v_service := CASE WHEN v_subtotal > 0 THEN 1900 ELSE 0 END;

    -- Cupón
    IF v_order.coupon_code IS NOT NULL THEN
        SELECT * INTO v_coupon
          FROM public.coupons
         WHERE UPPER(code) = UPPER(v_order.coupon_code)
           AND is_active
           AND (valid_until IS NULL OR valid_until > now())
           AND (uses_limit IS NULL OR uses_count < uses_limit);

        IF FOUND AND v_subtotal >= COALESCE(v_coupon.min_order, 0) THEN
            v_discount := CASE v_coupon.discount_type
                WHEN 'percent'       THEN LEAST(ROUND(v_subtotal * v_coupon.discount_value / 100),
                                                COALESCE(v_coupon.max_discount, 1e9))
                WHEN 'fixed'         THEN LEAST(v_coupon.discount_value, v_subtotal)
                WHEN 'free_delivery' THEN v_delivery
            END;
            UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = v_coupon.id;
        ELSE
            UPDATE public.orders SET coupon_code = NULL WHERE id = v_order.id;
        END IF;
    END IF;

    v_total := GREATEST(v_subtotal + v_delivery + v_service + v_tip - v_discount, 0);

    UPDATE public.orders
       SET subtotal            = v_subtotal,
           delivery_fee        = v_delivery,
           service_fee         = v_service,
           tip                 = v_tip,
           discount            = v_discount,
           total               = v_total,
           -- 0% si el negocio tiene Biz Pro vigente (solo paga suscripción)
           business_commission = ROUND(v_subtotal * public.effective_commission_rate(p_business_id)),
           platform_revenue    = v_service
                                 + ROUND(v_subtotal * public.effective_commission_rate(p_business_id))
     WHERE id = v_order.id
     RETURNING * INTO v_order;

    RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.place_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order TO authenticated;

-- ------------------------------------------------------------
-- 14. Transiciones de estado del pedido (con sellos de tiempo)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stamp_order_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        CASE NEW.status
            WHEN 'accepted'  THEN NEW.accepted_at  := COALESCE(NEW.accepted_at, now());
            WHEN 'ready'     THEN NEW.ready_at     := COALESCE(NEW.ready_at, now());
            WHEN 'picked_up' THEN NEW.picked_up_at := COALESCE(NEW.picked_up_at, now());
            WHEN 'delivered' THEN NEW.delivered_at := COALESCE(NEW.delivered_at, now());
            WHEN 'cancelled' THEN NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
            ELSE NULL;
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_stamp_status
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.stamp_order_status();

-- Contador de pedidos del negocio al entregar
CREATE OR REPLACE FUNCTION public.bump_business_orders()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
        UPDATE public.business_profiles
           SET total_orders = total_orders + 1
         WHERE id = NEW.business_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER orders_bump_business
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.bump_business_orders();

-- ------------------------------------------------------------
-- 15. Realtime — el kanban del negocio y el tracking del cliente
-- ------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_profiles;
