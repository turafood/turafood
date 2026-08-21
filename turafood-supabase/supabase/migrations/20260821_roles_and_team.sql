-- ====================================================================
-- MIGRACIÓN SUPABASE: ROLES DE EQUIPO, RECUPERACIÓN & SEGURIDAD
-- ====================================================================

-- 1. TABLA PARA MIEMBROS Y ROLES DE EQUIPO DEL NEGOCIO
CREATE TABLE IF NOT EXISTS public.business_team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'kitchen' CHECK (role IN ('owner', 'admin', 'kitchen', 'cashier', 'rider')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    permissions JSONB DEFAULT '{"comandas": true, "menu": false, "finanzas": false, "promos": false, "ajustes": false}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.business_team_members ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad RLS
DROP POLICY IF EXISTS "Dueños y admins gestionan los miembros de su negocio" ON public.business_team_members;
CREATE POLICY "Dueños y admins gestionan los miembros de su negocio"
ON public.business_team_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.business_profiles
        WHERE business_profiles.id = business_team_members.business_id
        AND business_profiles.id = auth.uid()
    )
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_team_members_biz ON public.business_team_members(business_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.business_team_members(role);
