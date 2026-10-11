-- ====================================================================
-- TURAFOOD — Un negocio no puede crearse ya aprobado
--
-- `guard_business_privileged_fields` solo corre en UPDATE. La política
-- `business_insert_own` deja a cualquier sesión (incluida una anónima)
-- insertar su ficha escribiendo las columnas que quiera, así que se podía
-- crear un negocio con status = 'active' (visible en el catálogo público
-- sin pasar revisión), calificación 5 con 999 reseñas, plan Pro y comisión
-- cero. Comprobado con una sesión anónima en producción.
--
-- Un negocio nuevo siempre nace pendiente y sin historial. Quedan fuera
-- de la guarda quien administra la base (auth.uid() nulo), un admin y las
-- funciones que prenden la marca `turafood.sella_negocio`.
-- `register_business()` ya inserta exactamente esto, así que no cambia.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.guard_business_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF COALESCE(current_setting('turafood.sella_negocio', true), '') = 'on' THEN
        RETURN NEW;
    END IF;

    NEW.status              := 'pending_review';
    NEW.rejection_reason    := NULL;
    NEW.reviewed_at         := NULL;
    NEW.reviewed_by         := NULL;
    NEW.submitted_at        := NULL;
    NEW.rating              := 5.0;
    NEW.reviews_count       := 0;
    NEW.total_orders        := 0;
    NEW.pro_plan            := false;
    NEW.pro_plan_expires_at := NULL;
    NEW.plan_id             := NULL;
    NEW.commission_rate     := public.default_commission_rate(NEW.vertical);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_guard_insert ON public.business_profiles;
CREATE TRIGGER business_guard_insert
    BEFORE INSERT ON public.business_profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_business_insert();
