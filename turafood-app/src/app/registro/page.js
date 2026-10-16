import { redirect } from 'next/navigation';

/** El alta de un negocio es /empezar: nombre, celular y correo con código. */
export default function Registro() {
  redirect('/empezar');
}
