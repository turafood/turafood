import { NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  if (host.startsWith('demo.turafood.com') || host.startsWith('demo.localhost')) {
    if (pathname === '/' || pathname === '') {
      return NextResponse.redirect(new URL('/demo-turamuebles.html', request.url));
    }
  }

  if (pathname === '/demo' || pathname === '/demo/turamuebles') {
    return NextResponse.redirect(new URL('/demo-turamuebles.html', request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
