import { redirect } from 'next/navigation';

/**
 * La raíz no tiene contenido propio: el proxy ya mandó a cada rol a su
 * entorno. Si se llega hasta acá es porque no hay sesión.
 */
export default function Root() {
  redirect('/auth');
}
