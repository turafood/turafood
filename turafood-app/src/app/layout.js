import { Bricolage_Grotesque, Plus_Jakarta_Sans, Instrument_Serif } from 'next/font/google';
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

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400'],
  style: ['normal', 'italic'],
});

export const metadata = {
  title: 'TuraFood | Negocios y repartidores',
  description:
    'Panel de negocios y app de repartidores de TuraFood en Buenaventura: pedidos en vivo, catálogo, entregas y liquidaciones.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#FF441F',
  width: 'device-width',
  initialScale: 1,
};

/**
 * EL TEMA, ANTES DE PINTAR
 *
 * Se corría en un `useEffect`, o sea DESPUÉS del primer render. En un
 * celular con el sistema en oscuro eso dejaba un instante sin
 * `data-theme`: las pantallas que leen las variables salían claras y
 * las que tienen algún color fijo salían oscuras. Eso es lo que se
 * veía "entremezclado" al cambiar de tema.
 *
 * Este script va en el <head> y corre antes del primer pixel, así que
 * no hay un solo frame sin tema.
 *
 * Y el valor por defecto es CLARO, no el del sistema. La app se usa a
 * plena luz en el puerto, con el celular en la mano y una parrilla al
 * lado; el claro se lee mejor ahí. Quien prefiera oscuro lo prende con
 * el botón de la barra y se le recuerda para siempre.
 */
const TEMA_INICIAL = `(function(){try{
  var t = localStorage.getItem('turafood-theme');
  var ok = ['light','dark','puerto'];
  document.documentElement.setAttribute('data-theme', ok.indexOf(t) >= 0 ? t : 'light');
}catch(e){
  document.documentElement.setAttribute('data-theme','light');
}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${jakarta.variable} ${bricolage.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_INICIAL }} />
        {/* Iconos: subconjunto propio alojado aquí (35 KB). Antes venían de
            Google en una hoja de estilos que bloqueaba el primer pintado. */}
        <link rel="preload" href="/fonts/material-symbols-rounded.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
