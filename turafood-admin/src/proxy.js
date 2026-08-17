import { updateSession } from '@/utils/supabase/proxy';

/**
 * dash.turafood.com — solo administradores.
 *
 * En Next 16 esto se llama `proxy.js`; `middleware.js` quedó obsoleto.
 */
export async function proxy(request) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
