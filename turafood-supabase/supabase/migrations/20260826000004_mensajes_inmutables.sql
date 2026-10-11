-- ====================================================================
-- TURAFOOD — Los mensajes y avisos no se reescriben
--
-- La política `messages_update_read` deja actualizar los mensajes DE LOS
-- DEMÁS de un pedido al que se tiene acceso (pensada para marcarlos como
-- leídos), pero el permiso era sobre toda la fila: el cliente podía
-- cambiar el texto de lo que escribió el repartidor, o al revés, y quedaba
-- como si lo hubiera dicho el otro.
--
-- Lo único que se actualiza desde el navegador es `read_at`. Lo mismo para
-- las notificaciones.
-- ====================================================================

REVOKE UPDATE ON public.messages      FROM PUBLIC, anon, authenticated;
GRANT  UPDATE (read_at) ON public.messages      TO authenticated;

REVOKE UPDATE ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT  UPDATE (read_at) ON public.notifications TO authenticated;
