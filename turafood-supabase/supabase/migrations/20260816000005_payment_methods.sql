-- ============================================================
-- TURAFOOD — MÉTODOS DE PAGO DEL CLIENTE
--
-- Guarda SOLO métodos que no implican datos de tarjeta:
-- Nequi y Daviplata son números de celular, y efectivo no guarda nada.
--
-- Las tarjetas NO se almacenan aquí ni en ningún lado nuestro. Se
-- capturan dentro del formulario de ePayco al pagar, que corre en su
-- dominio. Esa es la razón por la que TuraFood no queda sujeta a
-- PCI-DSS: nunca ve un número de tarjeta ni un CVV.
-- ============================================================

CREATE TABLE public.payment_methods (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    kind        TEXT NOT NULL CHECK (kind IN ('nequi', 'daviplata', 'cash')),

    -- Solo para billeteras: el celular asociado.
    -- Se guarda completo porque es el identificador de cobro, igual que
    -- un número de teléfono cualquiera. NO es un dato de tarjeta.
    phone       TEXT,
    -- Últimos 4 dígitos, para pintar "*** 4821" sin exponer el resto
    last4       TEXT,

    alias       TEXT,
    is_default  BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now(),

    -- Una billetera debe traer celular; efectivo no
    CONSTRAINT wallet_needs_phone CHECK (
        (kind = 'cash' AND phone IS NULL) OR (kind <> 'cash' AND phone IS NOT NULL)
    ),
    -- No repetir el mismo número dos veces por usuario
    UNIQUE (user_id, kind, phone)
);

CREATE INDEX idx_payment_methods_user ON public.payment_methods (user_id);

-- Solo un método por defecto por usuario
CREATE UNIQUE INDEX idx_payment_methods_one_default
    ON public.payment_methods (user_id) WHERE is_default;

/** Deriva los últimos 4 y normaliza el celular */
CREATE OR REPLACE FUNCTION public.normalize_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.phone IS NOT NULL THEN
        NEW.phone := REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g');

        IF LENGTH(NEW.phone) < 10 THEN
            RAISE EXCEPTION 'El número de celular debe tener 10 dígitos';
        END IF;

        NEW.last4 := RIGHT(NEW.phone, 4);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER payment_methods_normalize
    BEFORE INSERT OR UPDATE ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.normalize_payment_method();

-- ------------------------------------------------------------
-- RLS: cada quien maneja los suyos y nada más
-- ------------------------------------------------------------
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_methods_own ON public.payment_methods
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

/**
 * Marca uno como predeterminado quitando la marca de los demás.
 * Va en una función para que las dos escrituras ocurran juntas y el
 * índice único nunca se viole a medio camino.
 */
CREATE OR REPLACE FUNCTION public.set_default_payment_method(p_id UUID)
RETURNS public.payment_methods AS $$
DECLARE
    v_user UUID := auth.uid();
    v_row  public.payment_methods%ROWTYPE;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión';
    END IF;

    UPDATE public.payment_methods SET is_default = false
     WHERE user_id = v_user AND is_default;

    UPDATE public.payment_methods SET is_default = true
     WHERE id = p_id AND user_id = v_user
     RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese método de pago no es tuyo';
    END IF;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.set_default_payment_method FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_default_payment_method TO authenticated;
