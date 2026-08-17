import AdminShell from '../AdminShell';

/**
 * Todo lo que está dentro de este grupo lleva la consola alrededor.
 * `/auth` y `/sin-acceso` quedan fuera a propósito: no tiene sentido
 * mostrar el menú de administración a quien todavía no entró.
 */
export default function ConsolaLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
