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
  title: "TuraFood | Todo el puerto a un tap",
  description: "Pide a domicilio de restaurantes, supermercados, farmacias y tiendas en Buenaventura.",
  manifest: "/manifest.json",
};

// En Next 16 `themeColor` va en el export `viewport`, no en `metadata`
export const viewport = {
  themeColor: "#FF441F",
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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" />
      </head>
      <body>
        {/* El chasis, la barra inferior, el buscador y las notificaciones
            viven aquí y NO se remontan al navegar. */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
