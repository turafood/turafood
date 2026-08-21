'use client';

import Link from 'next/link';

export default function PrivacidadPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(100% 60% at 50% 10%, #171519 0%, #0E0D10 50%, #080709 100%)',
      color: '#fff',
      padding: '32px 20px',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 680 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <Link href="/auth" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none',
            fontSize: 13, fontWeight: 700,
          }}>
            <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
            Volver
          </Link>

          <span style={{ fontSize: 11, fontWeight: 800, color: '#11B26A', letterSpacing: '.08em' }}>
            HABEAS DATA & PRIVACIDAD
          </span>
        </div>

        <div style={{
          background: 'linear-gradient(145deg, rgba(28,26,30,0.92) 0%, rgba(13,12,15,0.98) 100%)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(17,178,106,0.25)',
          borderRadius: 24, padding: '32px 28px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
          lineHeight: 1.65,
        }}>
          <h1 style={{ fontFamily: 'var(--font-bricolage)', fontSize: 26, fontWeight: 800, marginBottom: 8, color: '#fff' }}>
            Política de Privacidad y Tratamiento de Datos
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
            Conforme a la Ley 1581 de 2012 de la República de Colombia · Buenaventura
          </p>

          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#11B26A', marginBottom: 6 }}>
              1. Protección de Datos del Negocio
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>
              En TuraFood AI protegemos con estricta confidencialidad los datos comerciales, inventarios, catálogos, cifras de ventas e información de clientes de cada establecimiento. Jamás vendemos ni compartimos sus bases de datos con terceros.
            </p>
          </section>

          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#11B26A', marginBottom: 6 }}>
              2. Finalidad del Tratamiento
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>
              Los datos recolectados (nombre del negocio, teléfono de WhatsApp, catálogo y ubicación) se utilizan exclusivamente para: (a) habilitar el funcionamiento del panel de comandas y tienda digital, (b) procesar notificaciones operativas vía SMS o WhatsApp, y (c) ofrecer recomendaciones inteligentes de marketing mediante IA.
            </p>
          </section>

          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#11B26A', marginBottom: 6 }}>
              3. Seguridad y Cifrado
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>
              Toda la información se transmite bajo protocolos SSL/TLS cifrados y se almacena en infraestructura segura en la nube con políticas de aislamiento de datos a nivel de fila (Row Level Security).
            </p>
          </section>

          <section style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#11B26A', marginBottom: 6 }}>
              4. Derechos del Titular (Habeas Data)
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>
              El comerciante puede en cualquier momento conocer, actualizar, rectificar o solicitar la supresión de sus datos personales y comerciales directamente desde el panel de ajustes o contactando al equipo de TuraFood AI.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
