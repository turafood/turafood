#!/usr/bin/env node
/**
 * TURAFOOD — Genera las plantillas de correo de Supabase Auth (código de verificación)
 *
 *   node turafood-supabase/scripts/generar-plantillas-auth.mjs
 *
 * Escribe en supabase/templates/ una plantilla por cada correo que manda Auth
 * y plantillas-auth.json con sus asuntos. Todas salen del sistema de diseño de
 * functions/_shared/correo-base.ts, y llevan el código con {{ .Token }}.
 * Después se aplican a Supabase con configurar-correo-auth.ps1.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { T, envoltura, encabezado, parrafo, cajaCodigo, boton, pasos, aviso, aire } from '../supabase/functions/_shared/correo-base.ts';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const salida = path.join(aqui, '..', 'supabase', 'templates');
mkdirSync(salida, { recursive: true });

const PASOS_BIENVENIDA = [
  { icono: '🛵', titulo: 'Sigue tu pedido en vivo', texto: 'Mira en el mapa dónde va tu repartidor.' },
  { icono: '🧾', titulo: 'Recibo en tu correo', texto: 'Al entregarte, te llega el detalle de lo que pediste.' },
  { icono: '📍', titulo: 'Tus direcciones, guardadas', texto: 'La próxima vez pides en dos toques.' },
];

const SEGURIDAD = aviso('🔒', '<strong style="color:' + T.tinta + ';">Si no fuiste tú, ignora este correo.</strong> Nadie de TuraFood te pedirá este código por llamada ni por WhatsApp.');

function codigoPlantilla({ icono, titulo, subtitulo, preheader, botonTexto, mostrarPasos = true }) {
  return envoltura({
    titulo,
    preheader,
    destinatario: '{{ .Email }}',
    filas:
      encabezado(icono, titulo, subtitulo) +
      cajaCodigo('{{ .Token }}', 'Vence en 10 minutos · solo se puede usar una vez') +
      (botonTexto ? boton(botonTexto, '{{ .ConfirmationURL }}', true) +
        parrafo('¿Prefieres no copiar el código? Toca el botón y entras directo.', { centrado: true, suave: true }) : '') +
      (mostrarPasos ? pasos(PASOS_BIENVENIDA) : '') +
      SEGURIDAD +
      aire,
  });
}

const plantillas = {
  // Correo nuevo (signInWithOtp a una dirección que no existía)
  confirmacion: {
    asunto: '{{ .Token }} es tu código de TuraFood',
    html: codigoPlantilla({
      icono: '👋', titulo: 'Bienvenido a TuraFood',
      subtitulo: 'Escribe este código donde estás pidiendo para confirmar tu correo.',
      preheader: 'Tu código es {{ .Token }}. Vence en 10 minutos.',
      botonTexto: 'Confirmar con un toque',
    }),
  },
  // Cuenta que ya existe (signInWithOtp)
  magic_link: {
    asunto: '{{ .Token }} es tu código para entrar a TuraFood',
    html: codigoPlantilla({
      icono: '🔑', titulo: 'Entra a tu cuenta',
      subtitulo: 'Con este código recuperas tus pedidos y tus direcciones.',
      preheader: 'Tu código es {{ .Token }}. Vence en 10 minutos.',
      botonTexto: 'Entrar con un toque', mostrarPasos: false,
    }),
  },
  // Quien pide como invitado y verifica su correo (updateUser)
  cambio_correo: {
    asunto: '{{ .Token }} es tu código para confirmar tu pedido',
    html: codigoPlantilla({
      icono: '✅', titulo: 'Confirma tu pedido',
      subtitulo: 'Escribe este código en la pantalla de tu pedido. Es solo la primera vez.',
      preheader: 'Tu código es {{ .Token }}. Escríbelo para confirmar tu pedido.',
      botonTexto: null,
    }),
  },
  recuperacion: {
    asunto: 'Restablece tu contraseña de TuraFood',
    html: envoltura({
      titulo: 'Restablece tu contraseña',
      preheader: 'Crea una contraseña nueva en un minuto.',
      destinatario: '{{ .Email }}',
      filas:
        encabezado('🔐', 'Crea una contraseña nueva', 'Toca el botón y elige tu nueva contraseña. El enlace vence en 1 hora.') +
        boton('Restablecer contraseña', '{{ .ConfirmationURL }}') +
        parrafo('Si el botón no abre, copia este enlace en tu navegador:<br><span style="word-break:break-all;color:' + T.suave + ';">{{ .ConfirmationURL }}</span>', { centrado: true, suave: true }) +
        SEGURIDAD + aire,
    }),
  },
  invitacion: {
    asunto: 'Te invitaron a TuraFood',
    html: envoltura({
      titulo: 'Te invitaron a TuraFood',
      preheader: 'Acepta la invitación y entra a tu cuenta.',
      destinatario: '{{ .Email }}',
      filas:
        encabezado('🎉', 'Te invitaron a TuraFood', 'Acepta la invitación para crear tu acceso.') +
        boton('Aceptar invitación', '{{ .ConfirmationURL }}') + aire,
    }),
  },
  reautenticacion: {
    asunto: '{{ .Token }} es tu código de seguridad de TuraFood',
    html: envoltura({
      titulo: 'Código de seguridad',
      preheader: 'Tu código de seguridad es {{ .Token }}.',
      destinatario: '{{ .Email }}',
      filas:
        encabezado('🛡️', 'Confirma que eres tú', 'Por seguridad, escribe este código para continuar.') +
        cajaCodigo('{{ .Token }}', 'Vence en 10 minutos') + SEGURIDAD + aire,
    }),
  },
};

const asuntos = {};
for (const [nombre, p] of Object.entries(plantillas)) {
  writeFileSync(path.join(salida, `otp_${nombre}.html`), p.html);
  asuntos[nombre] = p.asunto;
  console.log(`  otp_${nombre}.html  ${Math.round(p.html.length / 1024)} KB`);
}
writeFileSync(path.join(salida, 'plantillas-auth.json'), JSON.stringify(asuntos, null, 2));
console.log('Listo: supabase/templates/plantillas-auth.json');
