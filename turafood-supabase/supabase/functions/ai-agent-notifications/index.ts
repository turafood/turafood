import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Simulación de envío de mensajes.
// TODO: Reemplazar con llamadas reales a Twilio API o WhatsApp Cloud API.
async function sendNotification(phone: string, message: string, channel: 'sms' | 'whatsapp') {
  console.log(`[SIMULADOR ${channel.toUpperCase()}] Enviando a ${phone}: ${message}`);
  // Aquí iría el código real de Twilio:
  // const twilioClient = require('twilio')(accountSid, authToken);
  // twilioClient.messages.create({ body: message, from: twilioNumber, to: phone })
  return { success: true, simulated: true, timestamp: new Date().toISOString() };
}

serve(async (req) => {
  try {
    const payload = await req.json();
    
    // Webhook de Supabase envía { type: 'INSERT' | 'UPDATE', record: {...}, old_record: {...} }
    const { type, record, old_record } = payload;
    
    if (type === 'UPDATE' && record && old_record) {
      // Cambio de estado de un pedido
      if (record.status !== old_record.status) {
        
        // Notificaciones al Usuario final
        let messageToUser = '';
        if (record.status === 'accepted') {
          messageToUser = `¡Hola! Tu pedido en Turafood ha sido aceptado por el negocio y está en preparación. 🍔`;
        } else if (record.status === 'ready') {
          messageToUser = `Tu pedido está listo y esperando al repartidor. 🛵`;
        } else if (record.status === 'delivering') {
          messageToUser = `¡Tu pedido va en camino! El repartidor se dirige a tu dirección. 🚀`;
        } else if (record.status === 'completed') {
          messageToUser = `¡Tu pedido ha sido entregado! ¡Que lo disfrutes! 🎉`;
        }

        if (messageToUser && record.delivery_address && record.delivery_address.phone) {
           await sendNotification(record.delivery_address.phone, messageToUser, 'whatsapp');
        }
      }
      
      // Cambio de repartidor asignado (Notificación al Repartidor)
      if (record.courier_id && record.courier_id !== old_record.courier_id) {
        // Asumiendo que podemos obtener el teléfono del repartidor (requeriría consultar courier_profiles si no viene en el payload)
        // Por ahora simulamos con un log
        console.log(`[SIMULADOR IA] Notificando al repartidor asignado (ID: ${record.courier_id}) sobre un nuevo pedido.`);
      }
    }
    
    return new Response(
      JSON.stringify({ message: "Notificaciones procesadas correctamente" }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Error procesando notificaciones:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 400 },
    )
  }
})
