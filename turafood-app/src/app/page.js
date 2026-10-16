import { redirect } from 'next/navigation';
import { ES_DEMO } from '@/lib/sitio';

/**
 * La raíz no tiene contenido propio: el proxy ya mandó a cada rol a su
 * entorno. Si se llega hasta acá es porque no hay sesión (o es el demo).
 */
export default function Root() {
  redirect(ES_DEMO ? '/negocio' : '/auth');
}
