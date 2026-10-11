-- ============================================================
-- TURAFOOD — Quitar el trigger de notificaciones que apuntaba a localhost
--
-- La migración 20260820000001 creó `ai_agent_notifications_trigger`
-- sobre `orders`. Hacía POST a http://host.docker.internal:54321/...
-- con un token de ejemplo, en CADA cambio de estado de un pedido.
-- En producción ese host no existe: la llamada nunca llegaba a ningún
-- lado y solo llenaba la cola de pg_net.
--
-- Las notificaciones reales (Web Push) llegan en la Fase 2 con su
-- propia función. Mientras tanto no debe haber nada disparando al vacío.
-- ============================================================

DROP TRIGGER IF EXISTS ai_agent_notifications_trigger ON public.orders;
DROP FUNCTION IF EXISTS public.trigger_ai_agent_notification();
