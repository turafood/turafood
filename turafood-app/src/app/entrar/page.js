import { redirect } from 'next/navigation';

/** La puerta abierta (sesión anónima) vive ahora en demo.turafood.com. Aquí solo entran negocios inscritos. */
export default function Entrar() {
  redirect('/auth');
}
