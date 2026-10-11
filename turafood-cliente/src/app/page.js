import HomeClient from './HomeClient';
import { negociosActivosServidor } from '@/lib/serverData';

// Cada visita pide los negocios en el servidor. La respuesta se guarda
// unos segundos en el borde de Cloudflare (ver serverData.js), pero la
// página NO se prerenderiza: sin caché incremental configurada, una página
// estática quedaría congelada con los datos del momento del build.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const initialStores = await negociosActivosServidor();
  return <HomeClient initialStores={initialStores} />;
}
