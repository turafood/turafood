import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AppShell from "./components/AppShell";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  metadataBase: new URL('https://turafood.com'),
  title: {
    default: 'TuraFood | Todo el puerto a un tap · Domicilios en Buenaventura',
    template: '%s | TuraFood Buenaventura',
  },
  description: 'Pide a domicilio de los mejores restaurantes, marisquerías, asaderos, hamburgueserías y tiendas de Buenaventura. Seguimiento GPS en tiempo real y pedidos directos por WhatsApp.',
  keywords: [
    'TuraFood',
    'domicilios Buenaventura',
    'restaurantes Buenaventura',
    'comida a domicilio Buenaventura',
    'marisquerías Buenaventura',
    'asaderos Buenaventura',
    'hamburguesas Buenaventura',
    'pescado frito Buenaventura',
    'encocado jaiba Buenaventura',
    'delivery Buenaventura',
  ],
  authors: [{ name: 'TuraFood AI' }],
  creator: 'TuraFood Inc.',
  publisher: 'TuraFood',
  formatDetection: {
    email: false,
    address: true,
    telephone: true,
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://turafood.com',
    siteName: 'TuraFood',
    title: 'TuraFood | Domicilios Rápidos en Buenaventura',
    description: 'Tus platos y restaurantes favoritos de Buenaventura directos a tu puerta con GPS en vivo y cero intermediarios.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop',
        width: 1200,
        height: 630,
        alt: 'TuraFood - Todo el puerto a un tap',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TuraFood | Todo el puerto a un tap',
    description: 'Pide de los mejores restaurantes y tiendas de Buenaventura con entrega rápida y seguimiento GPS.',
    images: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop'],
    creator: '@turafood',
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// En Next 16 `themeColor` va en el export `viewport`, no en `metadata`
export const viewport = {
  themeColor: '#FF441F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FoodEstablishment',
  name: 'TuraFood',
  image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop',
  '@id': 'https://turafood.com',
  url: 'https://turafood.com',
  telephone: '+573026886449',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Centro, Carrera 3',
    addressLocality: 'Buenaventura',
    addressRegion: 'Valle del Cauca',
    postalCode: '761001',
    addressCountry: 'CO',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 3.8812,
    longitude: -77.0312,
  },
  servesCuisine: ['Mariscos', 'Comida Tradicional Pacífica', 'Comida Rápida', 'Asados'],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '08:00',
      closes: '23:00',
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${jakarta.variable} ${bricolage.variable}`}>
      <head>
        <link rel="preconnect" href="https://btaddjjzpvyqltkchqki.supabase.co" />
        <link rel="dns-prefetch" href="https://btaddjjzpvyqltkchqki.supabase.co" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://app.turafood.com" />
        <link rel="dns-prefetch" href="https://app.turafood.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('turafood_theme');
                  var theme = 'light';
                  if (stored) {
                    var parsed = JSON.parse(stored);
                    if (parsed && parsed.state && parsed.state.theme) {
                      theme = parsed.state.theme;
                    }
                  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    theme = 'dark';
                  }
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body>
        {/* El chasis, la barra inferior, el buscador y las notificaciones
            viven aquí y NO se remontan al navegar. */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
