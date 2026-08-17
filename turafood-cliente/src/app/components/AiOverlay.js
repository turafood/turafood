'use client';

/**
 * TURA IA
 *
 * Hoja que sube sobre la pantalla actual, sin cambiar de ruta y sin voz.
 * Lo que la hace útil es que sabe DÓNDE está el usuario: el saludo, la
 * línea de contexto y las sugerencias cambian según la pantalla, tal
 * como define el mockup (`AI_HELLO`, `AI_CTX`, `AI_CHIPS`).
 *
 * Todavía no hay modelo detrás: las respuestas se arman con los datos
 * que ya tenemos (carrito, negocios, cupones). Está aislado en
 * `responder()` para que conectar un LLM sea cambiar una sola función.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { create } from 'zustand';
import { useCartStore } from '@/store/useCartStore';
import { getBusinesses, getCoupons } from '@/lib/data';
import { AI_CONTEXT } from '@/lib/seed';
import { cop, etaLabel } from '@/lib/format';

export const useAi = create((set) => ({
  open: false,
  openAi: () => set({ open: true }),
  closeAi: () => set({ open: false }),
}));

/** Traduce la ruta actual a la clave de contexto del mockup */
function contextKey(pathname) {
  if (pathname.startsWith('/store')) return 'store';
  if (pathname.startsWith('/product')) return 'product';
  if (pathname.startsWith('/cart')) return 'cart';
  if (pathname.startsWith('/checkout')) return 'checkout';
  if (pathname.startsWith('/tracking')) return 'tracking';
  if (pathname.startsWith('/offers')) return 'offers';
  if (pathname.startsWith('/favorites')) return 'favorites';
  if (pathname.startsWith('/account/orders')) return 'orders';
  if (pathname.startsWith('/account')) return 'account';
  if (pathname.startsWith('/list')) return 'list';
  return 'home';
}

export default function AiOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const open = useAi((s) => s.open);
  const close = useAi((s) => s.closeAi);

  const cartItems = useCartStore((s) => s.items);
  const cartSubtotal = useCartStore((s) => s.getSubtotal());

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const key = contextKey(pathname);
  const ctx = AI_CONTEXT[key] ?? AI_CONTEXT.home;

  // Al abrir, saluda con el mensaje de esta pantalla
  useEffect(() => {
    if (!open) return;
    setMessages([{ id: 'hello', from: 'ai', text: ctx.hello }]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, ctx.hello]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  /**
   * Genera la respuesta. Aquí es donde entraría el LLM: hoy resuelve
   * con los datos reales de la app en vez de inventar.
   */
  async function responder(pregunta) {
    const q = pregunta.toLowerCase();

    if (q.includes('total') || q.includes('cuánto') || q.includes('cuanto')) {
      if (cartItems.length === 0) {
        return { text: 'Tu canasta está vacía por ahora. Cuando agregues algo te digo el total con envío y tarifa de servicio.' };
      }
      return {
        text: `Llevas ${cartItems.length} ${cartItems.length === 1 ? 'producto' : 'productos'} por ${cop(cartSubtotal)}. Con envío y la tarifa de servicio de $1.900, el total sale en el checkout.`,
        action: { label: 'Ver mi canasta', href: '/cart' },
      };
    }

    if (q.includes('rápido') || q.includes('rapido')) {
      const stores = await getBusinesses();
      const fastest = [...stores].sort((a, b) => a.prep_time_min - b.prep_time_min)[0];
      return {
        text: fastest
          ? `Lo más rápido ahora es ${fastest.name}, con entrega en ${etaLabel(fastest.prep_time_min)}.`
          : 'No encuentro sitios abiertos en este momento.',
        action: fastest ? { label: `Ver ${fastest.name}`, href: `/store/${fastest.id}` } : null,
      };
    }

    if (q.includes('cupón') || q.includes('cupon') || q.includes('promo') || q.includes('ahorr')) {
      const coupons = await getCoupons();
      const best = coupons[0];
      return {
        text: best
          ? `El que más te sirve ahora es ${best.code}: ${best.description}. Aplícalo en el checkout.`
          : 'No hay cupones activos en este momento.',
        action: { label: 'Ver ofertas', href: '/offers' },
      };
    }

    if (q.includes('30.000') || q.includes('30000') || q.includes('presupuesto')) {
      const stores = await getBusinesses();
      const cheap = [...stores].sort((a, b) => a.delivery_fee - b.delivery_fee).slice(0, 2);
      return {
        text: cheap.length
          ? `Con $30.000 te alcanza bien en ${cheap.map((s) => s.name).join(' o ')}. Ambos tienen envío económico.`
          : 'Déjame ver qué hay abierto cerca de ti.',
        action: { label: 'Ver sitios', href: '/list?v=restaurant' },
      };
    }

    if (q.includes('favorito')) {
      return { text: 'Revisa tus guardados: ahí te muestro cuáles están abiertos ahora.', action: { label: 'Mis favoritos', href: '/favorites' } };
    }

    if (q.includes('pedido') || q.includes('dónde va') || q.includes('donde va')) {
      return { text: 'Puedo mostrarte el estado de tus pedidos y avisarte cuando el repartidor esté cerca.', action: { label: 'Mis pedidos', href: '/account/orders' } };
    }

    if (q.includes('plus')) {
      return {
        text: 'Tura Plus cuesta $9.990 los primeros 3 meses y luego $19.990. Si pides más de dos veces al mes, el envío gratis ya lo paga.',
        action: { label: 'Ver Tura Plus', href: '/plus' },
      };
    }

    return {
      text: 'Todavía estoy aprendiendo a responder eso. Por ahora te sirvo con precios, tiempos de entrega, cupones y el estado de tus pedidos.',
    };
  }

  const send = async (value) => {
    const text = (value ?? input).trim();
    if (!text || thinking) return;

    setMessages((p) => [...p, { id: `u${Date.now()}`, from: 'me', text }]);
    setInput('');
    setThinking(true);

    const res = await responder(text);
    setThinking(false);
    setMessages((p) => [...p, { id: `a${Date.now()}`, from: 'ai', ...res }]);
  };

  if (!open) return null;

  return (
    <div style={S.backdrop} onClick={close}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Tura IA">

        <div style={S.header}>
          <span style={S.avatar}>
            <span className="ms ms-fill" style={{ fontSize: 20, color: 'var(--amber)' }}>auto_awesome</span>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17 }}>
              Tura IA
            </span>
            <span className="tr1" style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
              {ctx.ctx}
            </span>
          </span>
          <button onClick={close} style={S.closeBtn} aria-label="Cerrar Tura IA">
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="sc" style={S.thread}>
          {messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...S.bubble, ...(m.from === 'me' ? S.bubbleMine : S.bubbleAi) }}>
                {m.text}
              </div>
              {m.action && (
                <button
                  onClick={() => { close(); router.push(m.action.href); }}
                  style={S.actionBtn}
                >
                  {m.action.label}
                  <span className="ms" style={{ fontSize: 16 }}>arrow_forward</span>
                </button>
              )}
            </div>
          ))}

          {thinking && (
            <div style={{ display: 'flex' }}>
              <div style={{ ...S.bubble, ...S.bubbleAi, display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ ...S.dot, animationDelay: '0s' }} />
                <span style={{ ...S.dot, animationDelay: '.2s' }} />
                <span style={{ ...S.dot, animationDelay: '.4s' }} />
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Sugerencias del contexto */}
        <div className="hs" style={S.chips}>
          {ctx.chips.map((c) => (
            <button key={c.label} onClick={() => send(c.label)} style={S.chip}>
              <span className="ms" style={{ fontSize: 15, color: 'var(--primary)' }}>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          style={S.composer}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregúntale algo a Tura IA"
            aria-label="Pregunta para Tura IA"
            style={S.input}
          />
          <button type="submit" disabled={!input.trim() || thinking} style={S.sendBtn} aria-label="Enviar">
            <span className="ms" style={{ fontSize: 20, color: '#fff' }}>arrow_upward</span>
          </button>
        </form>
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: 'absolute', inset: 0, zIndex: 320,
    background: 'rgba(20,16,10,.42)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'flex-end',
    animation: 'fade .16s ease both',
  },
  sheet: {
    width: '100%', maxHeight: '82%', display: 'flex', flexDirection: 'column',
    background: 'var(--bg)', borderRadius: '26px 26px 0 0',
    animation: 'slideup .26s cubic-bezier(.32,.72,0,1) both',
    boxShadow: '0 -14px 40px rgba(20,16,10,.2)',
  },
  header: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 11,
    padding: '16px 18px 14px', borderBottom: '1px solid var(--border)',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 13, flex: 'none',
    background: 'linear-gradient(135deg,#2A2620,#17140F)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  thread: {
    flex: 1, overflowY: 'auto', padding: '16px 18px 8px',
    display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0,
  },
  bubble: {
    maxWidth: '86%', padding: '11px 14px', fontSize: 13.5, lineHeight: 1.5,
  },
  bubbleAi: {
    background: '#E9F7EF', color: '#0B5137',
    borderRadius: '16px 16px 16px 5px',
  },
  bubbleMine: {
    background: 'var(--primary)', color: '#fff',
    borderRadius: '16px 16px 5px 16px',
  },
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: 6, marginTop: 7,
    height: 36, padding: '0 14px', borderRadius: 999,
    background: 'var(--surface)', border: '1px solid var(--border)',
    fontSize: 12.5, fontWeight: 800, color: 'var(--primary)',
  },
  dot: {
    width: 6, height: 6, borderRadius: '50%', background: '#0B5137',
    animation: 'blink 1.2s infinite',
  },
  chips: {
    flex: 'none', display: 'flex', gap: 8, padding: '8px 18px 12px',
  },
  chip: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 6,
    height: 36, padding: '0 13px', borderRadius: 999,
    background: 'var(--surface)', border: '1px solid var(--border)',
    fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
  },
  composer: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 9,
    padding: '12px 18px 22px', borderTop: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  input: {
    flex: 1, height: 46, borderRadius: 999, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 16px', fontSize: 14,
    outline: 'none', minWidth: 0,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: '50%', background: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
};
