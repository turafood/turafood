'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useState } from 'react';

export default function RiderProOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('weekly');

  const plans = [
    { id: 'weekly', title: 'Pase Semanal', price: '$8.900', desc: 'Ideal para probar. Cancela cuando quieras.', rawPrice: 8900 },
    { id: 'monthly', title: 'Pase Mensual', price: '$29.900', desc: 'Ahorra un 15% con el plan mensual.', badge: 'Más popular', rawPrice: 29900 }
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
      name: `Suscripción Rider Pro - ${selected.title}`,
      description: `Pase ${selected.title} a Rider Pro para Repartidores`,
      invoice: `RIDER-SUB-${Date.now()}`,
      currency: 'cop',
      amount: selected.rawPrice,
      tax_base: '0',
      tax: '0',
      country: 'co',
      lang: 'es',
      external: 'false',
      confirmation: 'http://localhost:3004/api/epayco/webhook',
      response: 'http://localhost:3004/pro/success',
      name_billing: 'Repartidor VIP',
      address_billing: 'Buenaventura',
      type_doc_billing: 'CC',
      mobilephone_billing: '3000000000',
      number_doc_billing: '100000000'
    };

    handler.open(data);
    
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #1A1A1A 0%, #0A0A0A 100%)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Script src="https://checkout.epayco.co/checkout.js" strategy="lazyOnload" />
      
      {/* Header */}
      <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFB020', letterSpacing: '0.05em' }}>RIDER PRO</span>
      </div>

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#FFB020', marginBottom: '16px' }}>electric_moped</span>
          <h1 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '36px', lineHeight: 1.1, marginBottom: '16px' }}>
            Gana más por cada viaje.
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, maxWidth: '300px', margin: '0 auto' }}>
            Obtén acceso a zonas de alta demanda, soporte VIP y reduce tu comisión de plataforma al suscribirte.
          </p>
        </div>

        {/* Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
          {[
            { icon: 'payments', title: 'Comisión Reducida', desc: 'Pagas solo el 10% por entrega (vs 15%).' },
            { icon: 'priority_high', title: 'Prioridad de Pedidos', desc: 'Recibe notificaciones de pedidos grandes 5s antes.' },
            { icon: 'support_agent', title: 'Soporte Inmediato', desc: 'Chat VIP sin tiempos de espera.' }
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,176,32,0.1)', color: '#FFB020', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>{b.icon}</span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>{b.title}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {plans.map(p => {
            const isSelected = selectedPlan === p.id;
            return (
              <button 
                key={p.id} 
                onClick={() => setSelectedPlan(p.id)}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: isSelected ? 'rgba(255,176,32,0.1)' : 'rgba(255,255,255,0.03)', border: isSelected ? '2px solid #FFB020' : '2px solid transparent', borderRadius: '20px', textAlign: 'left', transition: 'all 0.2s' }}
              >
                {p.badge && (
                  <span style={{ position: 'absolute', top: '-10px', left: '20px', background: '#FFB020', color: '#000', fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '99px' }}>
                    {p.badge}
                  </span>
                )}
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: isSelected ? '#FFB020' : '#fff', marginBottom: '4px' }}>{p.title}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{p.desc}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '20px' }}>
                  {p.price}
                </div>
              </button>
            )
          })}
        </div>

        {/* Checkout Button */}
        <div style={{ marginTop: 'auto', paddingBottom: '20px' }}>
          <button 
            onClick={handleSubscribe}
            disabled={loading}
            style={{ width: '100%', height: '60px', borderRadius: '16px', background: '#FFB020', color: '#000', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(255,176,32,0.2)', border: 'none', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Cargando ePayco...' : 'Activar Rider Pro'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600 }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>verified_user</span>
            Transacción segura
          </div>
        </div>

      </div>
    </div>
  );
}
