import { updateSession } from '@/utils/supabase/proxy';

/**
 * app.turafood.com atiende a dos públicos distintos: el negocio y el
 * repartidor. Aquí se lee el rol de la sesión y se manda a cada quien
 * a su entorno.
 */
export async function proxy(request) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
