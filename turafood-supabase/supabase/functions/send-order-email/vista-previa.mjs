// Genera ejemplo.html con datos de muestra para ver el correo en el navegador.
//   node turafood-supabase/supabase/functions/send-order-email/vista-previa.mjs
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirCorreo } from './plantilla.ts';

const aqui = path.dirname(fileURLToPath(import.meta.url));

const { asunto, html } = construirCorreo({
  id: '00000000-0000-4000-8000-000000000000',
  numero: 'TS-4858',
  negocio: 'Asadero El Puerto',
  negocioCover: '/images/steak-ribeye.jpg',
  cliente: 'María Fernanda Valencia',
  items: [
    { nombre: 'Picada del Pacífico para 2', cantidad: 1, subtotal: 48900, imagen: '/images/fried-steak.jpg', extras: [{ name: 'Patacón extra', price: 0 }], notas: 'Sin ají, por favor' },
    { nombre: 'Churrasco 350 g', cantidad: 2, subtotal: 82000, imagen: '/images/steak-ribeye.jpg' },
    { nombre: 'Gaseosa 400 ml', cantidad: 2, subtotal: 8000, imagen: null },
  ],
  subtotal: 138900, domicilio: 3900, servicio: 1500, propina: 2000, descuento: 5000, total: 141300,
  pago: 'nequi', modo: 'delivery',
  direccion: 'Calle 5 # 3-20, Centro, Buenaventura', detalleDireccion: 'Casa blanca, segundo piso',
  entregadoEn: '2026-10-11T21:58:00Z', repartidor: 'Carlos Mosquera',
});

writeFileSync(path.join(aqui, 'ejemplo.html'), html);
console.log('Asunto:', asunto);
console.log('Escrito:', path.join(aqui, 'ejemplo.html'), `(${Math.round(html.length / 1024)} KB)`);
