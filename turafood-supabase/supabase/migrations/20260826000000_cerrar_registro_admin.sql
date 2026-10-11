-- ====================================================================
-- TURAFOOD — Nadie puede registrarse como admin
--
-- `handle_new_user()` toma el rol de los metadatos del registro
-- (`raw_user_meta_data.role`), y esos metadatos los escribe QUIEN SE
-- REGISTRA: `POST /auth/v1/signup {"data": {"role": "admin"}}` o
-- `signInAnonymously({ options: { data: { role: 'admin' } } })` creaba
-- un perfil con rol admin (is_admin() = true) sin pedirle nada a nadie.
-- Con eso se leen todos los pedidos, perfiles y chats y se aprueban
-- negocios y repartidores.
--
-- Desde el registro solo se admiten los roles de uso normal. Un admin
-- u ops se crea con un UPDATE hecho por quien administra la base
-- (auth.uid() nulo), nunca desde el navegador.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'customer'));
    IF v_role NOT IN ('customer','business','courier') THEN
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
