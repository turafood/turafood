import PaginaLegal, { H2 } from '../components/PaginaLegal';

export const metadata = {
  title: 'Política de privacidad',
  description: 'Qué datos recoge TuraFood, para qué los usa y cómo puedes consultarlos, corregirlos o borrarlos.',
};

export default function Privacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad" actualizado="11 de octubre de 2026">
      <p>
        TuraFood es una plataforma de domicilios en Buenaventura. Esta política explica, en palabras simples, qué datos
        personales tratamos, para qué y cuáles son tus derechos según la Ley 1581 de 2012 (protección de datos
        personales en Colombia).
      </p>

      <H2>Responsable del tratamiento</H2>
      <p>TuraFood. Contacto para temas de datos: turafood.com@gmail.com.</p>

      <H2>Qué datos recogemos</H2>
      <ul>
        <li><b>Contacto:</b> nombre, celular y, si lo das, correo electrónico.</li>
        <li><b>Entrega:</b> las direcciones que escribes o marcas en el mapa, con su ubicación aproximada, y las indicaciones para el repartidor.</li>
        <li><b>Pedidos:</b> qué pediste, a quién, el valor, el método de pago elegido y el estado del pedido.</li>
        <li><b>Ubicación del repartidor:</b> mientras entrega tu pedido, para que puedas verlo en el mapa.</li>
        <li><b>Dispositivo:</b> si activas los avisos, el identificador técnico necesario para enviarte notificaciones.</li>
        <li><b>Mensajes</b> del chat de tu pedido y las reseñas que publicas.</li>
      </ul>
      <p>
        Puedes pedir sin crear cuenta. En ese caso guardamos lo necesario para entregar tu pedido; si luego guardas tu
        cuenta, verificamos tu celular con un código.
      </p>

      <H2>Para qué los usamos</H2>
      <ul>
        <li>Procesar y entregar tu pedido, y mostrarte su seguimiento.</li>
        <li>Enviarte avisos del estado del pedido y códigos de verificación (SMS o WhatsApp).</li>
        <li>Atender reclamos, garantías y soporte.</li>
        <li>Mantener la seguridad de la plataforma y prevenir fraudes.</li>
        <li>Mejorar el servicio con estadísticas generales, sin identificarte.</li>
      </ul>

      <H2>Con quién los compartimos</H2>
      <ul>
        <li><b>El negocio y el repartidor</b> de tu pedido reciben lo necesario para prepararlo y entregarlo (qué pediste, tu nombre, dirección y celular).</li>
        <li><b>Proveedores técnicos</b> que operan el servicio por nosotros: alojamiento y base de datos (Supabase, Cloudflare), envío de códigos (Twilio), mapas y búsqueda de direcciones (OpenStreetMap, CARTO) y pagos cuando aplique.</li>
        <li>Autoridades, cuando la ley lo exija.</li>
      </ul>
      <p>No vendemos tus datos.</p>

      <H2>Tus derechos</H2>
      <p>Puedes en cualquier momento:</p>
      <ul>
        <li>Conocer, actualizar y corregir tus datos.</li>
        <li>Pedir prueba de la autorización que nos diste.</li>
        <li>Saber cómo los usamos.</li>
        <li>Revocar tu autorización y pedir que eliminemos tus datos, salvo los que debamos conservar por obligación legal (por ejemplo, registros de pedidos y pagos).</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
      </ul>
      <p>Para ejercerlos, escríbenos y respondemos dentro de los 15 días hábiles siguientes.</p>

      <H2>Cuánto tiempo los guardamos</H2>
      <p>
        Mientras tengas cuenta o los necesitemos para el servicio, y después solo lo que la ley nos obligue a conservar.
      </p>

      <H2>Seguridad</H2>
      <p>
        Las conexiones van cifradas y cada persona solo ve sus propios datos. Aun así, ningún sistema es infalible: si
        notas algo raro, avísanos de inmediato.
      </p>

      <H2>Cambios a esta política</H2>
      <p>Si la cambiamos, publicaremos aquí la nueva versión con su fecha.</p>
    </PaginaLegal>
  );
}
