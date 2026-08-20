'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { getBusiness } from '@/lib/data';
import { quote } from '@/lib/pricing';
import { cop } from '@/lib/format';

export default function DesktopCart() {
  const router = useRouter();

  const items = useCartStore((s) => s.items);
  const businessId = useCartStore((s) => s.businessId);
  const businessName = useCartStore((s) => s.businessName);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const updateQty = useCartStore((s) => s.updateQty);
  const removeLine = useCartStore((s) => s.removeLine);

  const [store, setStore] = useState(null);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    (async () => {
      try {
        const biz = await getBusiness(businessId);
        if (alive) setStore(biz);
      } catch {}
    })();
    return () => { alive = false; };
  }, [businessId]);

  if (items.length === 0) {
    return (
      <div style={S.empty}>
        <span className="ms" style={{ fontSize: 36, color: 'var(--faint)' }}>shopping_bag</span>
        <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16, marginTop: 10 }}>
          Tu canasta está vacía
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, textAlign: 'center', lineHeight: 1.4 }}>
          Explora los sitios abiertos y arma tu pedido.
        </div>
      </div>
    );
  }

  const t = quote({
    subtotal,
    deliveryFee: store?.delivery_fee ?? 0,
    mode: 'delivery',
    tip: 0,
  });

  return (
    <div style={S.cart}>
      <div style={S.header}>
        <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18 }}>
          Tu canasta
        </div>
        <div style={S.badge}>{items.length}</div>
      </div>

      <div className="sc" style={S.body}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 16 }}>
          {businessName}
        </div>
        {items.map((it) => (
          <div key={it.id} style={S.itemRow}>
            <div style={S.itemMain}>
              <div style={S.itemName}>{it.productName}</div>
              <div style={S.itemPrice}>{cop(it.price * it.qty)}</div>
            </div>
            <div style={S.qtyWrap}>
              <button onClick={() => (it.qty === 1 ? removeLine(it.id) : updateQty(it.id, it.qty - 1))} style={S.qtyBtn}>
                <span className="ms" style={{ fontSize: 16 }}>{it.qty === 1 ? 'delete' : 'remove'}</span>
              </button>
              <span style={S.qtyVal}>{it.qty}</span>
              <button onClick={() => updateQty(it.id, it.qty + 1)} style={S.qtyBtn}>
                <span className="ms" style={{ fontSize: 16 }}>add</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={S.footer}>
        <div style={S.receiptRow}>
          <span>Subtotal</span>
          <span>{cop(t.subtotal)}</span>
        </div>
        <div style={S.receiptRow}>
          <span>Envío</span>
          <span>{cop(t.deliveryFee)}</span>
        </div>
        <div style={{ ...S.receiptRow, color: 'var(--text)', fontWeight: 800, fontSize: 15, marginTop: 12 }}>
          <span>Total</span>
          <span>{cop(t.total)}</span>
        </div>

        <button onClick={() => router.push('/checkout')} style={S.payBtn}>
          Ir a pagar
        </button>
        <button onClick={() => router.push('/cart')} style={S.payBtnSecondary}>
          Ver canasta completa
        </button>
      </div>
    </div>
  );
}

const S = {
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', padding: 24, background: 'var(--surface)', borderLeft: '1px solid var(--border)', width: 320, flex: 'none'
  },
  cart: {
    display: 'flex', flexDirection: 'column', height: '100%', width: 320, flex: 'none',
    background: 'var(--surface)', borderLeft: '1px solid var(--border)'
  },
  header: {
    padding: '24px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)', flex: 'none'
  },
  badge: {
    background: 'var(--surface2)', color: 'var(--text)', padding: '2px 8px', borderRadius: 99,
    fontSize: 12, fontWeight: 700
  },
  body: {
    flex: 1, padding: 24, overflowY: 'auto'
  },
  itemRow: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20
  },
  itemMain: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 },
  itemPrice: { fontSize: 13, color: 'var(--muted)', marginTop: 4 },
  qtyWrap: {
    display: 'flex', alignItems: 'center', background: 'var(--surface2)', borderRadius: 99, padding: '2px 4px', flex: 'none'
  },
  qtyBtn: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' },
  qtyVal: { width: 20, textAlign: 'center', fontSize: 13, fontWeight: 800 },
  footer: {
    padding: 24, borderTop: '1px solid var(--border)', background: 'var(--bg)', flex: 'none'
  },
  receiptRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text)', marginBottom: 6 },
  payBtn: {
    width: '100%', height: 48, borderRadius: 16, background: 'var(--primary)', color: '#fff',
    fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer', marginTop: 16,
    boxShadow: '0 8px 20px rgba(255,68,31,0.25)'
  },
  payBtnSecondary: {
    width: '100%', height: 48, borderRadius: 16, background: 'var(--surface)', color: 'var(--text)',
    fontSize: 14, fontWeight: 700, border: '1px solid var(--border)', cursor: 'pointer', marginTop: 12,
  }
};
