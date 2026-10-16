// Genera muestras HTML de la secuencia de correos para mirarlas en el navegador.
//   node turafood-supabase/scripts/vista-secuencia.mjs [carpeta]
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { construirPaso } from '../supabase/functions/secuencia-emails/contenido.ts';

const carpeta = process.argv[2] ?? 'turafood-supabase/supabase/templates/vistas';
mkdirSync(carpeta, { recursive: true });
for (const rol of ['customer', 'business']) {
  for (let paso = 0; paso <= 3; paso++) {
    const c = construirPaso(paso, rol, { nombre: 'María Fernanda', email: 'maria@correo.com', bajaUrl: 'https://turafood.com' });
    writeFileSync(path.join(carpeta, `${rol}-${paso}.html`), c.html);
    console.log(`${rol} paso ${paso}: ${c.asunto}`);
  }
}
