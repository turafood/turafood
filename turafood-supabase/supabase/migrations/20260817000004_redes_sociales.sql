-- ============================================================
-- TURAFOOD — SUITE DE REDES SOCIALES
--
-- El negocio arma sus publicaciones y anuncios aquí, ve cómo van a
-- quedar, y el equipo de TuraFood los publica con las cuentas ya
-- conectadas. Igual que el resto del módulo de crecimiento: la app es
-- la herramienta, el trabajo lo hace el equipo.
--
-- Tres piezas:
--   1. Cuentas conectadas por red
--   2. Publicaciones, con su estado y sus números
--   3. Bandeja unificada de mensajes de todas las redes
--
-- Nada guarda tokens de las redes: eso vive del lado del servidor
-- cuando exista la integración, nunca en una tabla que lee el
-- navegador con la llave pública.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CUENTAS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,

    platform    TEXT NOT NULL CHECK (platform IN (
                    'facebook', 'instagram', 'x', 'linkedin',
                    'tiktok', 'youtube', 'youtube_shorts', 'whatsapp'
                )),

    -- Cómo se llama la cuenta, para que la persona la reconozca
    account_name   TEXT,
    account_handle TEXT,
    avatar_url     TEXT,

    status      TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
                    'requested',   -- el negocio pidió conectarla
                    'connected',   -- el equipo la dejó lista
                    'error',       -- se cayó la conexión
                    'disabled'
                )),
    status_note TEXT,

    connected_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),

    UNIQUE (business_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_biz
    ON public.social_accounts (business_id);

CREATE TRIGGER social_accounts_touch
    BEFORE UPDATE ON public.social_accounts
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ------------------------------------------------------------
-- 2. PUBLICACIONES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,

    -- Una publicación puede ir a varias redes a la vez
    platforms   TEXT[] NOT NULL DEFAULT '{}',
    kind        TEXT NOT NULL DEFAULT 'post' CHECK (kind IN ('post', 'story', 'reel', 'ad')),

    content     TEXT,
    images      TEXT[] DEFAULT '{}',
    link_url    TEXT,
    tone        TEXT,

    status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                    'draft',       -- el negocio lo está armando
                    'scheduled',   -- pidió que salga a una hora
                    'queued',      -- el equipo lo tiene en cola
                    'published',
                    'failed'
                )),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    failure_note TEXT,

    -- Números que el equipo trae de vuelta desde cada red
    likes    INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares   INTEGER DEFAULT 0,
    views    INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_biz
    ON public.social_posts (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_queue
    ON public.social_posts (status, scheduled_at)
    WHERE status IN ('scheduled', 'queued');

CREATE TRIGGER social_posts_touch
    BEFORE UPDATE ON public.social_posts
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ------------------------------------------------------------
-- 3. BANDEJA DE MENSAJES
--
-- Una sola bandeja con lo que llega de todas las redes. El negocio
-- responde desde aquí y el equipo lo entrega por el canal que sea.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_threads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,

    platform    TEXT NOT NULL,
    contact_name   TEXT,
    contact_handle TEXT,
    avatar_url     TEXT,

    last_message_at TIMESTAMPTZ DEFAULT now(),
    unread_count    INTEGER DEFAULT 0,
    archived        BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_threads_biz
    ON public.social_threads (business_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.social_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id  UUID NOT NULL REFERENCES public.social_threads(id) ON DELETE CASCADE,

    -- `in` es del cliente hacia el negocio; `out` al revés
    direction  TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    body       TEXT,
    media_url  TEXT,

    -- Lo que el negocio escribe queda pendiente hasta que el equipo
    -- lo entrega por la red correspondiente
    delivery   TEXT NOT NULL DEFAULT 'pending'
               CHECK (delivery IN ('pending', 'sent', 'failed')),

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_messages_thread
    ON public.social_messages (thread_id, created_at);


-- ------------------------------------------------------------
-- 4. PERMISOS
-- ------------------------------------------------------------
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_accounts_owner ON public.social_accounts;
CREATE POLICY social_accounts_owner ON public.social_accounts
    FOR ALL USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid());

DROP POLICY IF EXISTS social_posts_owner ON public.social_posts;
CREATE POLICY social_posts_owner ON public.social_posts
    FOR ALL USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid());

DROP POLICY IF EXISTS social_threads_owner ON public.social_threads;
CREATE POLICY social_threads_owner ON public.social_threads
    FOR ALL USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid());

DROP POLICY IF EXISTS social_messages_owner ON public.social_messages;
CREATE POLICY social_messages_owner ON public.social_messages
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.social_threads t
         WHERE t.id = thread_id
           AND (t.business_id = auth.uid() OR public.is_admin())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.social_threads t
         WHERE t.id = thread_id AND t.business_id = auth.uid()
    ));

/**
 * El negocio no marca sus propias publicaciones como publicadas ni se
 * inventa los números: eso lo trae el equipo desde cada red.
 */
CREATE OR REPLACE FUNCTION public.guard_social_post()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;
    NEW.published_at := OLD.published_at;
    NEW.failure_note := OLD.failure_note;
    NEW.likes        := OLD.likes;
    NEW.comments     := OLD.comments;
    NEW.shares       := OLD.shares;
    NEW.views        := OLD.views;
    NEW.business_id  := OLD.business_id;

    -- Puede mandarlo a la cola o volverlo borrador, nada más
    IF NEW.status NOT IN ('draft', 'scheduled', 'queued') THEN
        NEW.status := OLD.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS social_posts_guard ON public.social_posts;
CREATE TRIGGER social_posts_guard
    BEFORE UPDATE ON public.social_posts
    FOR EACH ROW EXECUTE FUNCTION public.guard_social_post();

/** Igual con el estado de conexión de una cuenta */
CREATE OR REPLACE FUNCTION public.guard_social_account()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;
    NEW.status       := OLD.status;
    NEW.status_note  := OLD.status_note;
    NEW.connected_at := OLD.connected_at;
    NEW.business_id  := OLD.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS social_accounts_guard ON public.social_accounts;
CREATE TRIGGER social_accounts_guard
    BEFORE UPDATE ON public.social_accounts
    FOR EACH ROW EXECUTE FUNCTION public.guard_social_account();

GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
