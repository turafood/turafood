import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Rutas públicas: no exigen sesión.
 */
const PUBLIC = ['/auth', '/registro'];

/**
 * Prefijo que le corresponde a cada rol. Es lo que convierte
 * app.turafood.com en dos aplicaciones dentro de un solo despliegue.
 */
const HOME_BY_ROLE = {
  business: '/negocio',
  courier: '/repartidor',
};

const isPublic = (path) => PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));

/**
 * Refresca la sesión de Supabase y decide a qué entorno pertenece quien entra.
 *
 * El rol vive en `profiles.role` y lo lee el servidor: el navegador no puede
 * mentir sobre él. Aun así esto es solo enrutado — quién ve qué datos lo
 * deciden las políticas RLS de la base.
 */
export async function updateSession(request) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Sin credenciales dejamos pasar: así se pueden revisar las pantallas
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

  const role = profile?.role;
  const home = HOME_BY_ROLE[role];

  // Cliente o admin entrando aquí: este dominio no es el suyo.
  if (!home) {
    if (pathname === '/sin-acceso') return response;
    return redirect('/sin-acceso');
  }

  // Ya autenticado: /auth y la raíz llevan a su entorno.
  if (pathname === '/' || isPublic(pathname)) return redirect(home);

  // Un negocio no entra al entorno del repartidor, ni al revés.
  const otherHome = Object.values(HOME_BY_ROLE).find((h) => h !== home);
  if (pathname === otherHome || pathname.startsWith(`${otherHome}/`)) {
    return redirect(home);
  }

  return response;
}
