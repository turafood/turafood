import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['600', '700', '800'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
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
        {/* Los iconos vienen de Google en dos saltos: googleapis
            entrega la hoja y gstatic el archivo de la fuente. Sin
            preconnect el navegador descubre el segundo solo cuando ya
            leyó el primero, y son dos apretones de manos TLS en serie
            antes de que se vea un solo icono. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
