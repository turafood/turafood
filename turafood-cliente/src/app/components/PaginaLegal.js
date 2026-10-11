import Link from 'next/link';
import { linkSoporte } from '@/lib/contacto';

/**
 * Marco común de las páginas legales (términos y privacidad).
 * Es un componente de servidor: no envía JavaScript al navegador y carga al instante.
 */
export default function PaginaLegal({ titulo, actualizado, children }) {
  return (
    <main style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', padding: '20px 16px 64px' }}>
      <article style={{ maxWidth: 720, margin: '0 auto', lineHeight: 1.65, fontSize: 15 }}>
        <Link href="/" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          ← Volver a TuraFood
        </Link>
        <h1 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 30, margin: '18px 0 4px' }}>{titulo}</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 24px' }}>Última actualización: {actualizado}</p>
        {children}
        <p style={{ marginTop: 36, paddingTop: 18, borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 14 }}>
          ¿Dudas? Escríbenos por{' '}
          <a href={linkSoporte('Hola TuraFood, tengo una duda')} style={{ color: 'var(--primary)', fontWeight: 700 }}>WhatsApp</a>{' '}
          o a <a href="mailto:turafood.com@gmail.com" style={{ color: 'var(--primary)', fontWeight: 700 }}>turafood.com@gmail.com</a>.
        </p>
      </article>
    </main>
  );
}

export const H2 = ({ children }) => (
  <h2 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, margin: '28px 0 8px' }}>{children}</h2>
);
