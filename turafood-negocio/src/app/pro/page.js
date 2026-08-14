'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useState } from 'react';

export default function BizProOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const plans = [
    { id: 'monthly', title: 'Plan Mensual', price: '$49.900', desc: 'Facturación mes a mes. Cancela en cualquier momento.', rawPrice: 49900 },
    { id: 'yearly', title: 'Plan Anual', price: '$499.000', desc: 'Ahorra un 17% (2 meses gratis).', badge: 'Recomendado', rawPrice: 499000 }
  ];

  const handleSubscribe = () => {
    setLoading(true);
    
    // Initialize ePayco Checkout
    const handler = window.ePayco.checkout.configure({
      key: '2a3096dcf0c981790a3e8aea8995674d', // PUBLIC_KEY
      test: true // Modo pruebas
    });

    const selected = plans.find(p => p.id === selectedPlan);

    const data = {
      name: `Suscripción Biz Pro - ${selected.title}`,
      description: `Suscripción ${selected.title} a Biz Pro para Negocios`,
      invoice: `BIZ-SUB-${Date.now()}`,
      currency: 'cop',
      amount: selected.rawPrice,
      tax_base: '0',
      tax: '0',
      country: 'co',
      lang: 'es',
      external: 'false',
      confirmation: 'http://localhost:3002/api/epayco/webhook',
      response: 'http://localhost:3002/pro/success',
      name_billing: 'Representante Legal',
      address_billing: 'Local 4, Centro',
      type_doc_billing: 'CC',
      mobilephone_billing: '3000000000',
      number_doc_billing: '100000000'
    };

    handler.open(data);
    
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Script src="https://checkout.epayco.co/checkout.js" strategy="lazyOnload" />
      
      {/* Header */}
      <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.back()} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '20px' }}>Biz Pro</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '40px 32px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }} className="md:flex-row">
          
          {/* Left: Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FFF1EC', padding: '6px 14px', borderRadius: '999px', marginBottom: '24px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>storefront</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>TuraFood para Negocios</span>
            </div>
            
            <h1 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '48px', lineHeight: 1.1, marginBottom: '24px' }}>
              Impulsa tus ventas<br />al siguiente nivel.
            </h1>
            
            <p style={{ fontSize: '16px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '40px', maxWidth: '400px' }}>
              Al suscribirte a Biz Pro, reduces las comisiones de la plataforma al 0% en pedidos para recoger y destacas tu restaurante en el inicio.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[
                { icon: 'trending_up', title: 'Posicionamiento Premium', desc: 'Aparece en los primeros resultados de búsqueda y en la sección "Recomendados".' },
                { icon: 'payments', title: 'Comisiones Reducidas', desc: '0% de comisión en pedidos para recoger (Pickup) y reducción del 2% en domicilio.' },
                { icon: 'campaign', title: 'Herramientas de Marketing', desc: 'Crea cupones personalizados y ofertas relámpago para atraer más clientes.' }
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: 'var(--shadowSm)' }}>
                    <span className="material-symbols-rounded" style={{ color: 'var(--primary)' }}>{b.icon}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>{b.title}</div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Pricing Card */}
          <div style={{ width: '100%', maxWidth: '400px', flex: 'none' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '32px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px' }}>Elige tu plan</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {plans.map(p => {
                  const isSelected = selectedPlan === p.id;
                  return (
                    <button 
                      key={p.id} 
                      onClick={() => setSelectedPlan(p.id)}
                      style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: '20px', background: isSelected ? '#FFF1EC' : 'var(--bg)', border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)', borderRadius: '16px', textAlign: 'left', transition: 'all 0.2s' }}
                    >
                      {p.badge && (
                        <span style={{ position: 'absolute', top: '-10px', right: '20px', background: 'var(--primary)', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderRadius: '99px' }}>
                          {p.badge}
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '16px', color: isSelected ? 'var(--primary)' : 'var(--text)' }}>{p.title}</span>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: isSelected ? '6px solid var(--primary)' : '2px solid var(--muted)' }}></div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '24px', marginBottom: '8px' }}>{p.price}</div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{p.desc}</div>
                    </button>
                  )
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <button 
                  onClick={handleSubscribe}
                  disabled={loading}
                  style={{ width: '100%', height: '56px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(255,68,31,0.25)', border: 'none', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Procesando...' : 'Mejorar a Biz Pro'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px', color: 'var(--muted)', fontSize: '12px', fontWeight: 600 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>lock</span>
                  Pagos seguros con ePayco
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
