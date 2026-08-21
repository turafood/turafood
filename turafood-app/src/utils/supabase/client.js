import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente de Supabase para el navegador.
 *
 * Mientras el proyecto no esté conectado (fase final del plan), no hay
 * URL ni API key. En vez de reventar en cada pantalla que llame a
 * `createClient()`, devolvemos un stub que se comporta como una base de
 * datos vacía y sin sesión. Así todas las vistas se pueden desarrollar y
 * revisar, y al poner las variables en `.env.local` el stub desaparece
 * solo, sin tocar ni una línea de las pantallas.
 */

export function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

const NOT_CONNECTED = 'Supabase todavía no está conectado en este entorno.';

/** Respuesta con la forma que devuelve supabase-js, para no romper destructuring */
const ok = (data = null) => Promise.resolve({ data, error: null });
const fail = () => Promise.resolve({ data: null, error: { message: NOT_CONNECTED } });

/** Constructor de consultas encadenable que siempre resuelve vacío */
function stubQuery() {
  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    in: () => builder,
    is: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: () => ok(null),
    maybeSingle: () => ok(null),
    then: (resolve) => ok([]).then(resolve),
  };
  return builder;
}

function stubClient() {
  return {
    auth: {
      getUser: () => ok({ user: null }),
      getSession: () => ok({ session: null }),
      signInWithPassword: fail,
      signInWithOtp: fail,
      signUp: fail,
      signOut: () => ok(null),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: stubQuery,
    rpc: fail,
    channel: () => ({
      on() { return this; },
      subscribe() { return this; },
    }),
    removeChannel: () => {},
    storage: {
      from: () => ({
        upload: fail,
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
}

export function createClient() {
  if (!isConfigured()) {
    return stubClient();
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          if (typeof document === 'undefined') return '';
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
          return match ? match[2] : '';
        },
        set(name, value, options) {
          if (typeof document === 'undefined') return;
          // Cross-domain cookie configuration
          const domain = window.location.hostname.includes('turafood.com') ? '.turafood.com' : window.location.hostname;
          let cookie = `${name}=${value}; domain=${domain}; path=/; max-age=${options.maxAge ?? 31536000}; SameSite=Lax`;
          if (window.location.protocol === 'https:') cookie += '; Secure';
          document.cookie = cookie;
        },
        remove(name, options) {
          if (typeof document === 'undefined') return;
          const domain = window.location.hostname.includes('turafood.com') ? '.turafood.com' : window.location.hostname;
          document.cookie = `${name}=; domain=${domain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        },
      },
    }
  );
}
