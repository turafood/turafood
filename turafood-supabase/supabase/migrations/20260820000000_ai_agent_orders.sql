-- Añadir columna de canal de origen a los pedidos
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source_channel text DEFAULT 'app';

-- Tabla para almacenar los registros de llamadas del Agente IA
CREATE TABLE IF NOT EXISTS public.ai_agent_calls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.business_profiles(id) NOT NULL,
    order_id uuid REFERENCES public.orders(id), -- Puede ser nulo si la llamada no terminó en pedido
    customer_phone text,
    recording_url text,
    transcription text,
    summary text,
    status text DEFAULT 'completed', -- 'in_progress', 'completed', 'failed'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ai_agent_calls ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "ai_agent_calls_select_admin" ON public.ai_agent_calls FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "ai_agent_calls_select_business" ON public.ai_agent_calls FOR SELECT USING (
    business_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'business' AND auth.uid() = business_id
    )
);

CREATE POLICY "ai_agent_calls_insert" ON public.ai_agent_calls FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'service_role'))
);

CREATE POLICY "ai_agent_calls_update" ON public.ai_agent_calls FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'service_role'))
);

-- Notificaciones: Crear un canal en Supabase Realtime para llamadas del Agente IA
-- (La tabla ya soporta Realtime si se habilita en el dashboard o mediante alter publication)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agent_calls;
