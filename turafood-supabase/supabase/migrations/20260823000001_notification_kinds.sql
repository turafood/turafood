-- ============================================================
-- TURAFOOD — Tipos de notificación para negocio y repartidor
--
-- `notifications.kind` solo admitía order_status/promo/referral/payment/
-- system. Los avisos nuevos (pedido nuevo para el negocio, pedido asignado
-- para el repartidor) usan 'new_order' y 'courier_assigned'. Sin esto el
-- INSERT falla, y como los triggers tragan los errores para no romper el
-- pedido, el aviso simplemente no se crearía y nadie se enteraría.
-- ============================================================

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_kind_check
    CHECK (kind IN ('order_status', 'promo', 'referral', 'payment', 'system',
                    'new_order', 'courier_assigned'));
