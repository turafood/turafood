import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

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
  themeColor: "#FF441F",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${jakarta.variable} ${bricolage.variable}`}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      </head>
      <body>{children}</body>
    </html>
  );
}
