import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata = {
  title: 'TuraFood | Consola de administración',
  description:
    'Consola de TuraFood en Buenaventura: aprobaciones, operación en vivo, flota, soporte y finanzas.',
  // Que no se indexe: es una puerta interna, no una página de la marca.
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: '#FF441F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${jakarta.variable} ${bricolage.variable}`}>
      <head>
        {/* Iconos: subconjunto propio alojado aquí (35 KB). Antes venían de
            Google en una hoja de estilos que bloqueaba el primer pintado. */}
        <link rel="preload" href="/fonts/material-symbols-rounded.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
