'use client';

/**
 * BASE DE CONOCIMIENTO (BLOG) - ESTILO STRIPE/CAL.COM
 * Panel integrado en el dashboard de negocio.
 * Diseñado con estética PRO, tipografía clara y estructura de documentación técnica.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DOCS = [
  {
    id: 'd1', category: 'Crecimiento', title: 'Cómo aumentar tus ventas con promociones limitadas',
    readTime: '4 min', date: '20 Ago 2026',
    excerpt: 'Descubre por qué las ofertas flash generan un 40% más de conversiones y cómo configurarlas en tu catálogo.'
  },
  {
    id: 'd2', category: 'Operaciones', title: 'Optimiza tus tiempos de preparación',
    readTime: '6 min', date: '18 Ago 2026',
    excerpt: 'Estrategias de cocina oculta y organización de comandas para reducir el tiempo de entrega y subir de nivel.'
  },
  {
    id: 'd3', category: 'Growth Partner', title: 'Monetiza tu enlace de referido TuraFood',
    readTime: '3 min', date: '15 Ago 2026',
    excerpt: 'Gana comisiones pasivas compartiendo tu link exclusivo con otros restaurantes del puerto.'
  },
  {
    id: 'd4', category: 'Marketing', title: 'Fotografía gastronómica con tu celular',
    readTime: '5 min', date: '10 Ago 2026',
    excerpt: 'Los productos con fotos de alta calidad convierten un 60% más. Aprende a usar la luz natural a tu favor.'
  }
];

export default function ConocimientoPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Todos');
  const [search, setSearch] = useState('');

  const filteredDocs = DOCS.filter(d => 
    (activeTab === 'Todos' || d.category === activeTab) &&
    (d.title.toLowerCase().includes(search.toLowerCase()) || d.excerpt.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={S.page}>
      
      {/* Header Premium (Estilo Stripe Docs) */}
      <header style={S.header}>
        <div style={S.headerContent}>
          <div style={S.badge}>TuraFood Docs</div>
          <h1 style={S.title}>Base de Conocimiento</h1>
          <p style={S.subtitle}>Todo lo que necesitas para escalar tu negocio en Buenaventura.</p>
          
          <div style={S.searchBox}>
            <span className="ms" style={{ color: 'var(--muted)', fontSize: 20 }}>search</span>
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Busca guías, tutoriales o temas de crecimiento..."
              style={S.searchInput}
            />
          </div>
        </div>
      </header>

      {/* Navegación lateral y Contenido */}
      <div style={S.layout}>
        
        {/* Sidebar Nav */}
        <nav style={S.sidebar}>
          <div style={S.navGroupTitle}>Categorías</div>
          {['Todos', 'Crecimiento', 'Operaciones', 'Marketing', 'Growth Partner'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ ...S.navLink, ...(activeTab === tab ? S.navLinkActive : {}) }}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Grid de Artículos */}
        <main style={S.main}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {filteredDocs.map(doc => (
              <div key={doc.id} className="pro-card" style={S.docCard}>
                <div style={S.docMeta}>
                  <span style={S.docCategory}>{doc.category}</span>
                  <span style={S.docTime}>{doc.readTime} read</span>
                </div>
                <h3 style={S.docTitle}>{doc.title}</h3>
                <p style={S.docExcerpt}>{doc.excerpt}</p>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{doc.date}</span>
                  <button style={S.readBtn}>
                    Leer guía <span className="ms" style={{ fontSize: 16 }}>arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              No se encontraron artículos para "{search}"
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(135deg, rgba(20,20,20,0.8) 0%, rgba(10,10,10,1) 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    padding: '60px 40px',
  },
  headerContent: {
    maxWidth: 900,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 10px',
    borderRadius: 99, background: 'rgba(217, 154, 21, 0.1)', color: '#D99A15',
    border: '1px solid rgba(217, 154, 21, 0.2)', fontSize: 11, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 16,
  },
  title: {
    fontFamily: 'var(--font-bricolage)',
    fontSize: 42,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-.03em',
    lineHeight: 1.1,
    margin: 0,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
    marginBottom: 32,
    maxWidth: 500,
    lineHeight: 1.5,
  },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 600,
    height: 52, padding: '0 20px', borderRadius: 99,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
    transition: 'all .2s',
  },
  searchInput: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: '#fff', fontSize: 15,
  },
  layout: {
    display: 'flex',
    flex: 1,
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
    padding: '40px 20px',
    gap: 40,
  },
  sidebar: {
    width: 220,
    flex: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navGroupTitle: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    color: 'var(--muted)',
    marginBottom: 12,
    paddingLeft: 12,
  },
  navLink: {
    textAlign: 'left', padding: '10px 12px', borderRadius: 8,
    fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
    transition: 'all .2s', background: 'transparent', border: 'none', cursor: 'pointer',
  },
  navLinkActive: {
    color: '#fff', background: 'rgba(255,255,255,0.05)',
  },
  main: {
    flex: 1,
  },
  docCard: {
    padding: 24, display: 'flex', flexDirection: 'column',
    transition: 'transform .2s, border-color .2s',
    cursor: 'pointer',
  },
  docMeta: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  docCategory: {
    color: '#D99A15', fontSize: 12, fontWeight: 700,
  },
  docTime: {
    color: 'var(--faint)', fontSize: 12, fontWeight: 500,
  },
  docTitle: {
    fontFamily: 'var(--font-bricolage)', fontSize: 20, fontWeight: 800,
    color: '#fff', letterSpacing: '-.02em', lineHeight: 1.2, margin: '0 0 8px 0',
  },
  docExcerpt: {
    fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, flex: 1,
  },
  readBtn: {
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
    color: '#D99A15', padding: 0,
  },
};
