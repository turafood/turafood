import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Sin credenciales de Supabase no hay sesión que validar: dejamos pasar
  // para poder trabajar las pantallas antes de conectar la base de datos.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
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
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const {
      data,
      error,
    } = await supabase.auth.getUser();
    if (!error) {
      user = data?.user ?? null;
    }
  } catch {
    // Si la cookie expiró o no se encuentra el refresh token (guest o sesión antigua),
    // user se mantiene en null de forma segura sin romper la respuesta del middleware.
    user = null;
  }

  // Navegación libre para invitados: no bloqueamos ninguna pantalla con login forzoso.
  // El usuario puede navegar, ver tiendas, llenar carrito y pedir sin registrarse.
  return supabaseResponse;
}
