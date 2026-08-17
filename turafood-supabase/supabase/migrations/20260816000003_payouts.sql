-- ============================================================
-- TURAFOOD — RETIROS DE AFILIADOS
--
-- El programa de afiliados pasa de "créditos dentro de la app" a
-- comisiones retirables a una cuenta bancaria o billetera.
--
-- El saldo NUNCA lo escribe el frontend: lo mueven los triggers de
-- wallet_transactions. Solicitar un retiro solo crea una solicitud;
-- un admin la aprueba y ahí se descuenta.
-- ============================================================

-- Parámetros del programa, editables sin tocar código
ALTER TABLE public.referral_config
    ADD COLUMN commission_rate    NUMERIC NOT NULL DEFAULT 0.10,
    ADD COLUMN min_withdrawal     NUMERIC NOT NULL DEFAULT 50000,
    ADD COLUMN recurring          BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.referral_config.commission_rate IS
    'Comisión del afiliado sobre cada compra de su referido';
COMMENT ON COLUMN public.referral_config.recurring IS
    'true = comisión de por vida en cada compra; false = solo la primera';

-- ------------------------------------------------------------
-- SOLICITUDES DE RETIRO
-- ------------------------------------------------------------
CREATE TABLE public.payout_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount       NUMERIC NOT NULL CHECK (amount > 0),
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','paid','rejected')),
    method       TEXT NOT NULL DEFAULT 'nequi'
                 CHECK (method IN ('nequi','daviplata','bancolombia','otro')),
    account      TEXT NOT NULL,
    account_name TEXT,
    reject_reason TEXT,
    reviewed_by  UUID REFERENCES public.profiles(id),
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payouts_user ON public.payout_requests (user_id, created_at DESC);
CREATE INDEX idx_payouts_pending ON public.payout_requests (status) WHERE status = 'pending';

/**
 * Solicita un retiro. Valida contra el saldo REAL de la billetera,
 * no contra lo que diga la pantalla.
 */
CREATE OR REPLACE FUNCTION public.request_payout(
    p_amount       NUMERIC,
    p_method       TEXT,
    p_account      TEXT,
    p_account_name TEXT DEFAULT NULL
)
RETURNS public.payout_requests AS $$
DECLARE
    v_user      UUID := auth.uid();
    v_wallet    public.wallets%ROWTYPE;
    v_cfg       public.referral_config%ROWTYPE;
    v_pending   NUMERIC;
    v_row       public.payout_requests%ROWTYPE;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión';
    END IF;

    SELECT * INTO v_cfg FROM public.referral_config WHERE id;
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_user;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No encontramos tu billetera';
    END IF;

    IF p_amount < v_cfg.min_withdrawal THEN
        RAISE EXCEPTION 'El retiro mínimo es %', v_cfg.min_withdrawal;
    END IF;

    IF COALESCE(TRIM(p_account), '') = '' THEN
        RAISE EXCEPTION 'Escribe la cuenta donde quieres recibir el dinero';
    END IF;

    -- Lo ya solicitado y sin pagar también compromete saldo
    SELECT COALESCE(SUM(amount), 0) INTO v_pending
      FROM public.payout_requests
     WHERE user_id = v_user AND status IN ('pending','approved');

    IF (v_wallet.available_withdraw - v_pending) < p_amount THEN
        RAISE EXCEPTION 'No tienes saldo suficiente disponible para retirar';
    END IF;

    INSERT INTO public.payout_requests (user_id, amount, method, account, account_name)
    VALUES (v_user, p_amount, p_method, TRIM(p_account), NULLIF(TRIM(p_account_name), ''))
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

/**
 * Un admin marca el retiro como pagado: ahí se descuenta el saldo,
 * mediante una transacción de billetera (no un UPDATE directo).
 */
CREATE OR REPLACE FUNCTION public.settle_payout(p_id UUID, p_approve BOOLEAN, p_reason TEXT DEFAULT NULL)
RETURNS public.payout_requests AS $$
DECLARE
    v_row public.payout_requests%ROWTYPE;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo un administrador puede procesar retiros';
    END IF;

    SELECT * INTO v_row FROM public.payout_requests WHERE id = p_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud no encontrada';
    END IF;
    IF v_row.status NOT IN ('pending','approved') THEN
        RAISE EXCEPTION 'Esta solicitud ya fue procesada';
    END IF;

    IF p_approve THEN
        INSERT INTO public.wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description)
        SELECT w.id, 'withdrawal', v_row.amount, 'payout_request', v_row.id,
               'Retiro de comisiones de afiliado'
          FROM public.wallets w WHERE w.user_id = v_row.user_id;
    END IF;

    UPDATE public.payout_requests
       SET status = CASE WHEN p_approve THEN 'paid' ELSE 'rejected' END,
           reject_reason = CASE WHEN p_approve THEN NULL ELSE p_reason END,
           reviewed_by = auth.uid(),
           reviewed_at = now()
     WHERE id = p_id
     RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- COMISIÓN RECURRENTE
-- Reemplaza settle_referral: ahora el afiliado gana en CADA compra
-- de su referido, no solo en la primera.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_referral()
RETURNS TRIGGER AS $$
DECLARE
    v_ref  public.referrals%ROWTYPE;
    v_cfg  public.referral_config%ROWTYPE;
    v_commission NUMERIC;
BEGIN
    IF NEW.status <> 'delivered' OR OLD.status = 'delivered' THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_cfg FROM public.referral_config WHERE id;
    IF NOT v_cfg.is_active THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_ref
      FROM public.referrals
     WHERE referred_id = NEW.customer_id
       AND status IN ('pending','completed');

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Si no es recurrente, solo paga la primera vez
    IF NOT v_cfg.recurring AND v_ref.status = 'completed' THEN
        RETURN NEW;
    END IF;

    v_commission := ROUND(NEW.subtotal * v_cfg.commission_rate);

    IF v_commission > 0 THEN
        INSERT INTO public.wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description)
        SELECT w.id, 'referral', v_commission, 'order', NEW.id,
               'Comisión por compra de tu referido'
          FROM public.wallets w WHERE w.user_id = v_ref.referrer_id;
    END IF;

    -- Bono de bienvenida al referido: solo la primera vez
    IF v_ref.status = 'pending' AND NEW.total >= v_cfg.min_order_amount THEN
        INSERT INTO public.wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description)
        SELECT w.id, 'referral', v_cfg.reward_referred, 'referral', v_ref.id,
               'Bono de bienvenida por código de invitación'
          FROM public.wallets w WHERE w.user_id = v_ref.referred_id;

        UPDATE public.referrals
           SET status = 'completed',
               order_id = NEW.id,
               reward_referred = v_cfg.reward_referred,
               completed_at = now()
         WHERE id = v_ref.id;
    END IF;

    -- Acumulado ganado por este referido
    UPDATE public.referrals
       SET reward_referrer = COALESCE(reward_referrer, 0) + v_commission
     WHERE id = v_ref.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY payouts_select_own ON public.payout_requests
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

-- Nadie inserta ni edita a mano: solo request_payout() y settle_payout()

REVOKE ALL ON FUNCTION public.request_payout FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_payout  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_payout TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_payout  TO authenticated;
