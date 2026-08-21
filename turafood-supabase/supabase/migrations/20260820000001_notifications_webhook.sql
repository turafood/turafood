-- 1. Asegurarnos de que pg_net está habilitado para llamadas HTTP
create extension if not exists pg_net with schema extensions;

-- 2. Crear la función que envía el POST a la Edge Function
create or replace function public.trigger_ai_agent_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_url text;
  v_payload jsonb;
begin
  -- Usamos la URL local para el entorno de desarrollo.
  -- En producción, esto debería apuntar a la URL pública de la Edge Function.
  v_url := 'http://host.docker.internal:54321/functions/v1/ai-agent-notifications';
  
  -- Solo disparamos si cambió el status o el courier_id
  if TG_OP = 'UPDATE' and (OLD.status IS DISTINCT FROM NEW.status OR OLD.courier_id IS DISTINCT FROM NEW.courier_id) then
    v_payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    );

    -- Enviar la petición asíncrona
    perform net.http_post(
      url := v_url,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer anon_key_here"}'::jsonb,
      body := v_payload
    );
  end if;

  return NEW;
end;
$$;

-- 3. Crear el Trigger en la tabla orders
drop trigger if exists ai_agent_notifications_trigger on public.orders;
create trigger ai_agent_notifications_trigger
after update on public.orders
for each row
execute function public.trigger_ai_agent_notification();
