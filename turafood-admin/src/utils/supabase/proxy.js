import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * dash.turafood.com no tiene registro. No hay forma de crearse una
 * cuenta de administrador desde afuera: el rol se pone a mano en la
 * base. Aquí solo se comprueba.
 */
const PUBLIC = ['/auth'];

const isPublic = (path) => PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));

/**
 * Deja entrar solo a `profiles.role = 'admin'`.
 *
 * El rol lo lee el servidor contra la base; el navegador no puede
 * mentir sobre él. Aun así esto es únicamente el portero de la puerta:
 * quién puede LEER o TOCAR cada tabla lo siguen decidiendo las
 * políticas RLS. Si mañana alguien se salta este archivo, la base no
 * le entrega nada igual.
 */
export async function updateSession(request) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Sin credenciales dejamos pasar, para poder revisar las pantallas
  // con los datos locales antes de conectar la base.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const redirect = (to) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = '';
    return NextResponse.redirect(url);
  };

  if (!user) {
    return isPublic(pathname) ? response : redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    // Sesión válida de negocio o repartidor entrando por la puerta
    // equivocada. No le decimos "no eres admin" — le decimos que este
    // dominio no es el suyo y dónde está el suyo.
    if (pathname === '/sin-acceso') return response;
    return redirect('/sin-acceso');
  }

  if (isPublic(pathname)) return redirect('/');

  return response;
}
