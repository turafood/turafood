import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Rutas públicas: no exigen sesión.
 *
 * `/entrar` es la primera que ve quien llega sin cuenta: dos botones
 * —negocio o repartidor— que abren una sesión anónima y lo dejan
 * adentro. No es una pantalla de registro, es la puerta abierta.
 */
const PUBLIC = ['/auth', '/registro', '/entrar', '/terminos', '/privacidad', '/actualizar-clave'];

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

  // Archivos estáticos o multimedia nunca requieren sesión
  if (pathname.includes('.') || pathname.startsWith('/_next') || pathname.startsWith('/images/')) {
    return response;
  }

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

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      user = data?.user ?? null;
    }
  } catch {
    user = null;
  }

  const redirect = (to) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = '';
    return NextResponse.redirect(url);
  };

  if (!user) {
    // A /entrar, no a /auth: quien llega por primera vez no viene a
    // registrarse, viene a ver si esto le sirve.
    return isPublic(pathname) ? response : redirect('/entrar');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role;
  const home = HOME_BY_ROLE[role];

  // Sesión válida pero sin rol de este dominio. Puede ser alguien que
  // acaba de entrar con Google para registrar su negocio y todavía no
  // tiene la ficha creada, así que le dejamos terminar el alta.
  if (!home) {
    if (pathname === '/registro/completar' || pathname === '/sin-acceso') return response;
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
