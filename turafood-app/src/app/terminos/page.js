'use client';

import Link from 'next/link';

export default function TerminosPage() {
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

          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.08em' }}>
            TURAFOOD AI SAAS
          </span>
        </div>

        <div style={{
          background: 'linear-gradient(145deg, rgba(28,26,30,0.92) 0%, rgba(13,12,15,0.98) 100%)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(232,199,102,0.18)',
          borderRadius: 24, padding: '32px 28px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
          lineHeight: 1.65,
        }}>
          <h1 style={{ fontFamily: 'var(--font-bricolage)', fontSize: 26, fontWeight: 800, marginBottom: 8, color: '#fff' }}>
            Términos y Condiciones de Uso
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
            Última actualización: Agosto 2026 · Buenaventura, Colombia
          </p>

          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#E8C766', marginBottom: 6 }}>
              1. Naturaleza del Servicio (Software SaaS)
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>
              TuraFood AI es una plataforma tecnológica como servicio (SaaS) que provee herramientas de software para la digitalización, recepción de pedidos, catálogos interactivos, marketing con inteligencia artificial y gestión de pedidos para negocios locales y restaurantes en Buenaventura y el territorio nacional.
            </p>
          </section>

          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#E8C766', marginBottom: 6 }}>
              2. Modelo 0% Comisiones en Ventas Directas
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>
              TuraFood AI no cobra comisión porcentual sobre las ventas directas que el Negocio procese a través de sus canales propios (WhatsApp, transferencias directas a Nequi, Daviplata o Bancolombia). El 100% del valor de cada venta pertenece íntegramente al Comercio.
            </p>
          </section>

          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#E8C766', marginBottom: 6 }}>
              3. Responsabilidad del Negocio
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>
              Cada Negocio es el único responsable de la veracidad de su menú, precios, calidad e inocuidad de los alimentos o productos comercializados, así como del cumplimiento y atención brindada a sus clientes.
            </p>
          </section>

          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#E8C766', marginBottom: 6 }}>
              4. Disponibilidad y Seguridad
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>
              TuraFood AI implementa estándares de alta disponibilidad, cifrado de datos y autenticación segura para garantizar que el panel operativo del comercio esté siempre activo y protegido.
            </p>
          </section>

          <section style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#E8C766', marginBottom: 6 }}>
              5. Contacto y Soporte Oficial
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>
              Para soporte técnico, dudas comerciales o asistencia en Buenaventura, los comercios pueden comunicarse directamente a través de los canales oficiales de TuraFood AI o mediante la asistencia en vivo en su panel de control.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
