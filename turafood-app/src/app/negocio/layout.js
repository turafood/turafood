import BizShell from './BizShell';

/**
 * Todas las pantallas del negocio comparten armazón. Al vivir en el
 * layout, cambiar de sección no vuelve a montar la barra lateral ni
 * pierde la suscripción a pedidos en vivo.
 */
export default function NegocioLayout({ children }) {
  return <BizShell>{children}</BizShell>;
}
