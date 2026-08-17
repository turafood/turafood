-- ============================================================
-- TURAFOOD — TARJETAS GUARDADAS (solo referencia, nunca el número)
--
-- REGLA QUE NO SE NEGOCIA:
-- Aquí NUNCA se guarda el número completo (PAN) ni el CVV. Ni cifrado.
-- Solo lo que se necesita para que el usuario reconozca su tarjeta:
-- marca, últimos 4 dígitos y vencimiento. Eso es lo mismo que muestra
-- cualquier app seria, y mantiene a TuraFood fuera del alcance de
-- PCI-DSS.
--
-- El cobro real se hace con `provider_token`, que emite la pasarela
-- cuando se habilite su tokenización. Mientras tanto la columna queda
-- nula y la tarjeta funciona como referencia visual: al pagar, el
-- usuario digita los datos en el formulario de ePayco.
-- ============================================================

-- Permitir tarjetas en la tabla de métodos
ALTER TABLE public.payment_methods
    DROP CONSTRAINT IF EXISTS payment_methods_kind_check;

ALTER TABLE public.payment_methods
    ADD CONSTRAINT payment_methods_kind_check
    CHECK (kind IN ('nequi', 'daviplata', 'cash', 'card'));

ALTER TABLE public.payment_methods
    ADD COLUMN brand          TEXT CHECK (brand IN ('visa','mastercard','amex','diners','other')),
    ADD COLUMN exp_month      SMALLINT CHECK (exp_month BETWEEN 1 AND 12),
    ADD COLUMN exp_year       SMALLINT CHECK (exp_year BETWEEN 2024 AND 2100),
    ADD COLUMN holder_name    TEXT,
    -- Token de la pasarela. Nulo mientras no exista tokenización.
    ADD COLUMN provider_token TEXT,
    ADD COLUMN provider       TEXT DEFAULT 'epayco';

COMMENT ON COLUMN public.payment_methods.last4 IS
    'Últimos 4 dígitos. Es lo ÚNICO del número que se guarda.';
COMMENT ON COLUMN public.payment_methods.provider_token IS
    'Token de la pasarela para cobrar sin pedir la tarjeta de nuevo. '
    'Nulo hasta habilitar la tokenización de ePayco.';

-- La restricción anterior exigía celular a todo lo que no fuera efectivo.
-- Una tarjeta no tiene celular: la reescribimos por tipo.
ALTER TABLE public.payment_methods DROP CONSTRAINT IF EXISTS wallet_needs_phone;

ALTER TABLE public.payment_methods
    ADD CONSTRAINT payment_method_shape CHECK (
        (kind = 'cash'  AND phone IS NULL AND last4 IS NULL)
     OR (kind IN ('nequi','daviplata') AND phone IS NOT NULL)
     OR (kind = 'card'  AND phone IS NULL AND last4 IS NOT NULL
                        AND brand IS NOT NULL
                        AND exp_month IS NOT NULL AND exp_year IS NOT NULL)
    );

/**
 * Blindaje: si alguna vez alguien intenta meter un número completo en
 * `last4`, la base lo rechaza. Cuatro dígitos, ni uno más.
 */
CREATE OR REPLACE FUNCTION public.guard_card_data()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.kind = 'card' THEN
        NEW.phone := NULL;

        IF NEW.last4 IS NULL OR NEW.last4 !~ '^[0-9]{4}$' THEN
            RAISE EXCEPTION 'Solo se admiten los últimos 4 dígitos de la tarjeta';
        END IF;

        -- Vencida
        IF make_date(NEW.exp_year, NEW.exp_month, 1) + interval '1 month'
           <= date_trunc('month', now()) THEN
            RAISE EXCEPTION 'La tarjeta está vencida';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER payment_methods_guard_card
    BEFORE INSERT OR UPDATE ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.guard_card_data();

-- El índice de unicidad por celular no aplica a tarjetas.
--
-- OJO con el orden: `UNIQUE (...)` en el CREATE TABLE genera una
-- CONSTRAINT, y Postgres no deja borrar el índice que la respalda
-- ("cannot drop index ... because constraint requires it"). Hay que
-- quitar primero la constraint, que se lleva su índice consigo.
ALTER TABLE public.payment_methods
    DROP CONSTRAINT IF EXISTS payment_methods_user_id_kind_phone_key;

-- Y solo entonces, por si quedara un índice suelto sin constraint
DROP INDEX IF EXISTS payment_methods_user_id_kind_phone_key;

-- Sin duplicados: misma billetera con mismo número, o misma tarjeta
CREATE UNIQUE INDEX idx_payment_methods_wallet_unique
    ON public.payment_methods (user_id, kind, phone)
    WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX idx_payment_methods_card_unique
    ON public.payment_methods (user_id, brand, last4, exp_month, exp_year)
    WHERE kind = 'card';
