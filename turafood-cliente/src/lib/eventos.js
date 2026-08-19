'use client';

/**
 * CONTAR QUÉ PASA CON CADA PRODUCTO
 *
 * El negocio quiere saber cuánta gente miró un plato y no lo compró.
 * Para responder eso hay que anotarlo, y acá es donde se anota.
 *
 * LO QUE NO SE GUARDA
 *
 * Ni quién es, ni su cuenta, ni su IP. Solo una huella de navegador
 * que sirve para no contar diez veces a la misma persona haciendo
 * scroll. Al dueño del restaurante le sirve el número, no el nombre.
 *
 * NUNCA FRENA NADA
 *
 * Todo va sin `await` y con el error tragado. Si la red está mala o
 * la función falla, la persona igual ve el producto y lo compra: una
 * métrica perdida no vale un pedido perdido.
 */

import { createClient, isConfigured } from '@/utils/supabase/client';

const CLAVE = 'turafood:huella';

/**
 * Una huella por navegador. Se genera sola la primera vez y se
 * guarda; no viene de ningún dato de la persona.
 */
function huella() {
  if (typeof window === 'undefined') return null;
  try {
    let h = localStorage.getItem(CLAVE);
    if (!h) {
      h = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 20);
      localStorage.setItem(CLAVE, h);
    }
    return h;
  } catch {
    return null;   // modo privado: se cuenta sin deduplicar
  }
}

/**
 * En la misma carga de página, el mismo evento no se manda dos veces.
 * React monta y desmonta componentes; sin esto, abrir un producto
 * dispara la vista varias veces antes de llegar al servidor.
 */
const yaEnviado = new Set();

/**
 * @param {string} productId
 * @param {'view'|'add'|'checkout'|'purchase'} kind
 */
export function anotar(productId, kind) {
  if (!productId || !isConfigured()) return;

  const llave = `${productId}:${kind}`;
  if (yaEnviado.has(llave)) return;
  yaEnviado.add(llave);

  try {
    createClient()
      .rpc('anotar_evento_producto', {
        p_product_id: productId,
        p_kind: kind,
        p_huella: huella(),
      })
      .then(() => {}, () => {});   // sin ruido: no es del usuario
  } catch {
    /* nunca frena la compra */
  }
}

/** Varios de una, para el checkout y el pedido terminado */
export function anotarVarios(productIds, kind) {
  for (const id of new Set(productIds ?? [])) anotar(id, kind);
}
