-- ====================================================================
-- TURAFOOD — Recibo por correo al entregar el pedido
--
-- Cuando un pedido pasa a "entregado", la base le avisa a la función
-- send-order-email (Resend), que manda el recibo. Quien pidió como
-- invitado puede dejar su correo para ese pedido; quien tiene cuenta con
-- correo lo recibe sin hacer nada.
--
-- El correo se guarda aparte (order_receipts) y no en `orders`: así no se
-- toca la tabla vigilada de pedidos ni sus guardas.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.order_receipts (
    order_id   UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    sent_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_receipts FROM PUBLIC, anon, authenticated;

-- Quien hizo el pedido puede ver a qué correo irá (o fue) su recibo
GRANT SELECT (order_id, email, sent_at) ON public.order_receipts TO authenticated;
DROP POLICY IF EXISTS order_receipts_select_own ON public.order_receipts;
CREATE POLICY order_receipts_select_own ON public.order_receipts
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.orders o
                    WHERE o.id = order_receipts.order_id AND o.customer_id = auth.uid()));

-- --------------------------------------------------------------------
-- Aviso a la función de correo (asíncrono, nunca rompe el pedido)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._enviar_recibo(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_secret TEXT;
BEGIN
    SELECT value INTO v_secret FROM public.internal_config WHERE key = 'push_secret';
    IF v_secret IS NULL THEN
        RETURN;                              -- aún no configurado
    END IF;

    PERFORM net.http_post(
        url     := 'https://btaddjjzpvyqltkchqki.supabase.co/functions/v1/send-order-email',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
        body    := jsonb_build_object('order_id', p_order_id),
        timeout_milliseconds := 5000
    );
EXCEPTION WHEN OTHERS THEN
    NULL;                                    -- el correo nunca rompe el pedido
END;
$$;
REVOKE ALL ON FUNCTION public._enviar_recibo(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.recibo_al_entregar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public._enviar_recibo(NEW.id);
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.recibo_al_entregar() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_recibo ON public.orders;
CREATE TRIGGER orders_recibo
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    WHEN (NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered')
    EXECUTE FUNCTION public.recibo_al_entregar();

-- --------------------------------------------------------------------
-- El cliente deja su correo para el recibo de un pedido suyo
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pedir_recibo_por_correo(p_order_id UUID, p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_uid    UUID := auth.uid();
    v_email  TEXT := lower(btrim(COALESCE(p_email, '')));
    v_status TEXT;
    v_sent   TIMESTAMPTZ;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Inicia sesión para pedir tu recibo';
    END IF;

    SELECT status INTO v_status
      FROM public.orders WHERE id = p_order_id AND customer_id = v_uid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese pedido no es tuyo';
    END IF;

    IF length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Escribe un correo válido, por ejemplo nombre@correo.com');
    END IF;

    SELECT sent_at INTO v_sent FROM public.order_receipts WHERE order_id = p_order_id;
    IF v_sent IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'El recibo de este pedido ya se envió.');
    END IF;

    INSERT INTO public.order_receipts (order_id, email)
    VALUES (p_order_id, v_email)
    ON CONFLICT (order_id) DO UPDATE SET email = EXCLUDED.email;

    -- Si ya se entregó, se manda ahora; si no, saldrá al entregarse
    IF v_status = 'delivered' THEN
        PERFORM public._enviar_recibo(p_order_id);
    END IF;

    RETURN jsonb_build_object('ok', true, 'email', v_email, 'enviado_ahora', v_status = 'delivered');
END;
$$;

REVOKE ALL ON FUNCTION public.pedir_recibo_por_correo(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pedir_recibo_por_correo(UUID, TEXT) TO authenticated;
