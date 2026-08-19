import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * CARRITO
 *
 * Cada línea guarda el producto Y sus opciones (tamaño, acompañamientos,
 * nota), porque el mismo plato con distintos extras son líneas distintas
 * —así lo muestra el mockup del carrito ("Picada Pacífico para 2 /
 * Sin cebolla").
 *
 * `unitPrice` es el precio base + los deltas de los extras. Se guarda
 * solo para PINTAR la pantalla: el precio que vale es el que calcula
 * `place_order()` en el servidor al confirmar el pedido.
 */

/** Identifica una línea por producto + combinación de extras + nota */
function lineKey(productId, extraIds = [], notes = '') {
  return [productId, [...extraIds].sort().join('+'), notes.trim()].join('|');
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      businessId: null,
      businessName: null,
      businessImage: null,

      /**
       * Agrega una línea. Si ya existe una idéntica (mismo producto,
       * mismos extras, misma nota) solo sube la cantidad.
       *
       * Cambiar de negocio vacía el carrito: el mockup solo permite
       * pedir de un sitio a la vez.
       */
      addLine: (line, business) => set((state) => {
        const key = lineKey(line.productId, line.extraIds, line.notes);
        const switching = state.businessId && state.businessId !== business.id;

        const base = {
          businessId: business.id,
          businessName: business.name,
          businessImage: business.image ?? null,
        };

        if (switching || state.items.length === 0) {
          return { ...base, items: [{ ...line, lineId: key, qty: line.qty ?? 1 }] };
        }

        const existing = state.items.find((i) => i.lineId === key);
        if (existing) {
          return {
            ...base,
            items: state.items.map((i) =>
              i.lineId === key ? { ...i, qty: i.qty + (line.qty ?? 1) } : i,
            ),
          };
        }

        return { ...base, items: [...state.items, { ...line, lineId: key, qty: line.qty ?? 1 }] };
      }),

      removeLine: (lineId) => set((state) => {
        const items = state.items.filter((i) => i.lineId !== lineId);
        if (items.length > 0) return { items };
        return { items, businessId: null, businessName: null, businessImage: null };
      }),

      updateQty: (lineId, qty) => {
        if (qty <= 0) {
          get().removeLine(lineId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.lineId === lineId ? { ...i, qty } : i)),
        }));
      },

      clearCart: () => set({
        items: [], businessId: null, businessName: null, businessImage: null,
      }),

      getTotalItems: () => get().items.reduce((n, i) => n + i.qty, 0),

      getSubtotal: () => get().items.reduce((n, i) => n + Number(i.unitPrice) * i.qty, 0),

      /** Convierte el carrito al formato que espera `place_order()` */
      toOrderItems: () => get().items.map((i) => ({
        product_id: i.productId,
        quantity: i.qty,
        extra_ids: i.extraIds ?? [],
        notes: i.notes || null,
      })),
    }),
    {
      name: 'turafood-cart',
      version: 2,

      // El servidor no puede leer el localStorage de nadie, así que
      // pinta el carrito vacío. Sin esto, zustand lo rellena desde el
      // navegador ANTES del primer render y React encuentra dos HTML
      // distintos: falla la hidratación y vuelve a pintar la página
      // entera desde cero. Justo lo que no queremos.
      //
      // Con `skipHydration` el primer render coincide con el del
      // servidor y el carrito entra un instante después, desde
      // `RehidratarCarrito`. Se ve igual y no se repinta nada.
      skipHydration: true,
    },
  ),
);
