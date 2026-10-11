import PaginaLegal, { H2 } from '../components/PaginaLegal';

export const metadata = {
  title: 'Términos de servicio',
  description: 'Reglas para pedir, entregar y usar TuraFood en Buenaventura.',
};

export default function Terminos() {
  return (
    <PaginaLegal titulo="Términos de servicio" actualizado="11 de octubre de 2026">
      <p>
        Al usar TuraFood aceptas estas reglas. Son cortas a propósito: queremos que las leas.
      </p>

      <H2>Qué es TuraFood</H2>
      <p>
        Una plataforma que conecta a clientes, negocios y repartidores de Buenaventura. Los productos los prepara y
        vende cada negocio; TuraFood facilita el pedido, el pago, el seguimiento y el soporte.
      </p>

      <H2>Cobertura</H2>
      <p>
        Entregamos solo dentro de la zona de cobertura de Buenaventura. Si tu dirección queda fuera, no podremos
        aceptar el pedido.
      </p>

      <H2>Tu pedido</H2>
      <ul>
        <li>Puedes pedir sin cuenta; para guardar tus datos verificamos tu celular con un código.</li>
        <li>Debes dar una dirección y un celular reales para que el repartidor pueda encontrarte.</li>
        <li>El precio final incluye los productos, el domicilio y cualquier cargo que veas antes de confirmar.</li>
        <li>Cuando el negocio acepta tu pedido, empieza a prepararlo; por eso la cancelación puede no ser posible o tener costo.</li>
      </ul>

      <H2>Pagos</H2>
      <p>
        Puedes pagar con los métodos que veas disponibles al confirmar el pedido (según el negocio). Verifica siempre el valor y el nombre del destinatario antes de pagar.
      </p>

      <H2>Entrega</H2>
      <p>
        Los tiempos son estimados y pueden variar por clima, tráfico o carga del negocio. Al recibir tu pedido, comparte
        el código de entrega solo con el repartidor que te lo lleva.
      </p>

      <H2>Problemas con tu pedido</H2>
      <p>
        Si faltó algo, llegó en mal estado o se demoró demasiado, repórtalo desde la sección Ayuda de la app. Revisamos
        cada caso y, según corresponda, reponemos el pedido, abonamos a tu billetera o devolvemos el dinero.
      </p>

      <H2>Uso correcto</H2>
      <ul>
        <li>No hagas pedidos falsos ni uses datos de otras personas sin permiso.</li>
        <li>Trata con respeto a los repartidores y negocios; el chat no es para insultos ni acoso.</li>
        <li>No intentes alterar, saturar ni vulnerar la plataforma.</li>
      </ul>
      <p>Podemos suspender cuentas que incumplan estas reglas.</p>

      <H2>Responsabilidad</H2>
      <p>
        Cada negocio responde por la calidad, el contenido y la información de sus productos (incluidos alérgenos).
        TuraFood responde por el correcto funcionamiento de la plataforma dentro de los límites que permite la ley.
      </p>

      <H2>Tus datos</H2>
      <p>
        Tratamos tus datos como explicamos en la <a href="/privacidad" style={{ color: 'var(--primary)', fontWeight: 700 }}>Política de privacidad</a>.
      </p>

      <H2>Cambios</H2>
      <p>Podemos actualizar estos términos; la versión vigente es la publicada aquí, con su fecha.</p>
    </PaginaLegal>
  );
}
