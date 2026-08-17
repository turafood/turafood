-- ============================================================
-- TURAFOOD — PROGRAMA DE AFILIADOS ("Invita y gana")
--
-- Cada usuario tiene un código propio. Cuando alguien se registra
-- con ese código y completa su primer pedido entregado, ambos
-- reciben crédito en su wallet.
--
-- El crédito NO lo otorga el frontend: lo otorga un trigger cuando
-- el pedido llega a 'delivered'. Así no se puede reclamar dos veces
-- ni inventar referidos desde el cliente.
-- ============================================================

-- Recompensas (en pesos). Ajustables sin tocar código.
CREATE TABLE public.referral_config (
    id                  BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
    reward_referrer     NUMERIC NOT NULL DEFAULT 10000,
    reward_referred     NUMERIC NOT NULL DEFAULT 10000,
    min_order_amount    NUMERIC NOT NULL DEFAULT 25000,
    is_active           BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO public.referral_config (id) VALUES (true);

-- Código de invitación por usuario
ALTER TABLE public.profiles
    ADD COLUMN referral_code TEXT UNIQUE,
    ADD COLUMN referred_by   UUID REFERENCES public.profiles(id);

/**
 * Genera un código corto y legible a partir del nombre.
 * Ej. "María Camila" → "MARIA4F2A". Evita 0/O y 1/I para que se
 * pueda dictar por teléfono sin confusiones.
 */
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_base  TEXT;
    v_code  TEXT;
    v_tries INTEGER := 0;
BEGIN
    v_base := UPPER(REGEXP_REPLACE(
        COALESCE(NULLIF(SPLIT_PART(TRIM(p_name), ' ', 1), ''), 'TURA'),
        '[^A-Za-z]', '', 'g'
    ));
    v_base := LEFT(TRANSLATE(v_base, 'ÁÉÍÓÚÑ', 'AEIOUN'), 6);
    IF v_base = '' THEN v_base := 'TURA'; END IF;

    LOOP
        v_code := v_base || UPPER(
            TRANSLATE(SUBSTRING(MD5(random()::text) FROM 1 FOR 4), 'o01l', 'q23m')
        );
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code);
        v_tries := v_tries + 1;
        IF v_tries > 10 THEN
            v_code := v_base || UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 8));
            EXIT;
        END IF;
    END LOOP;

    RETURN v_code;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

-- Asignar código al crear el perfil
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := public.generate_referral_code(NEW.full_name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_referral_code
    BEFORE INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- Códigos para los perfiles que ya existen
UPDATE public.profiles
   SET referral_code = public.generate_referral_code(full_name)
 WHERE referral_code IS NULL;

-- ------------------------------------------------------------
-- REFERIDOS
-- ------------------------------------------------------------
CREATE TABLE public.referrals (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id  UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','completed','expired')),
    order_id     UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    reward_referrer NUMERIC,
    reward_referred NUMERIC,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT now(),
    CHECK (referrer_id <> referred_id)   -- nadie se invita a sí mismo
);

CREATE INDEX idx_referrals_referrer ON public.referrals (referrer_id, status);

/**
 * Registra el referido. La llama el frontend justo después del
 * signup, con el código que escribió el usuario.
 */
CREATE OR REPLACE FUNCTION public.claim_referral(p_code TEXT)
RETURNS public.referrals AS $$
DECLARE
    v_user     UUID := auth.uid();
    v_referrer UUID;
    v_row      public.referrals%ROWTYPE;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión';
    END IF;

    SELECT id INTO v_referrer
      FROM public.profiles
     WHERE UPPER(referral_code) = UPPER(TRIM(p_code));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese código de invitación no existe';
    END IF;
    IF v_referrer = v_user THEN
        RAISE EXCEPTION 'No puedes usar tu propio código';
    END IF;
    IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_user) THEN
        RAISE EXCEPTION 'Ya usaste un código de invitación';
    END IF;
    -- Solo cuentas nuevas: si ya pidió antes, no aplica
    IF EXISTS (SELECT 1 FROM public.orders WHERE customer_id = v_user) THEN
        RAISE EXCEPTION 'Los códigos solo aplican para cuentas nuevas';
    END IF;

    INSERT INTO public.referrals (referrer_id, referred_id)
    VALUES (v_referrer, v_user)
    RETURNING * INTO v_row;

    UPDATE public.profiles SET referred_by = v_referrer WHERE id = v_user;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

/**
 * Paga a ambos cuando el referido recibe su primer pedido.
 * Se dispara solo, desde la base de datos.
 */
CREATE OR REPLACE FUNCTION public.settle_referral()
RETURNS TRIGGER AS $$
DECLARE
    v_ref  public.referrals%ROWTYPE;
    v_cfg  public.referral_config%ROWTYPE;
BEGIN
    IF NEW.status <> 'delivered' OR OLD.status = 'delivered' THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_cfg FROM public.referral_config WHERE id;
    IF NOT v_cfg.is_active OR NEW.total < v_cfg.min_order_amount THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_ref
      FROM public.referrals
     WHERE referred_id = NEW.customer_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Crédito a quien invitó
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description)
    SELECT w.id, 'referral', v_cfg.reward_referrer, 'referral', v_ref.id,
           'Bono por invitar a un amigo'
      FROM public.wallets w WHERE w.user_id = v_ref.referrer_id;

    -- Crédito a quien fue invitado
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description)
    SELECT w.id, 'referral', v_cfg.reward_referred, 'referral', v_ref.id,
           'Bono de bienvenida por código de invitación'
      FROM public.wallets w WHERE w.user_id = v_ref.referred_id;

    UPDATE public.referrals
       SET status = 'completed',
           order_id = NEW.id,
           reward_referrer = v_cfg.reward_referrer,
           reward_referred = v_cfg.reward_referred,
           completed_at = now()
     WHERE id = v_ref.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER orders_settle_referral
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.settle_referral();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.referrals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_config ENABLE ROW LEVEL SECURITY;

-- Cada quien ve sus invitaciones (las que hizo y la que recibió)
CREATE POLICY referrals_select_own ON public.referrals
    FOR SELECT USING (
        referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_admin()
    );

-- Nadie inserta a mano: solo claim_referral()
CREATE POLICY referral_config_select ON public.referral_config
    FOR SELECT USING (true);

CREATE POLICY referral_config_admin ON public.referral_config
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE ALL ON FUNCTION public.claim_referral FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral TO authenticated;

-- El código de invitación de otro usuario debe poder consultarse
-- para validarlo, pero sin exponer el resto del perfil: eso lo
-- resuelve claim_referral(), que corre con SECURITY DEFINER.
