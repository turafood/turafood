// ============================================================
// TURAFOOD — Sistema de diseño de correos
//
// Un solo lugar define cómo se ve TODO correo de TuraFood (código de
// verificación, bienvenida, secuencia de 3 días, recibo): colores, tipografía,
// tarjeta, botón, caja de código, listas y pie. Así todos se ven de la misma
// familia y cambiar la marca es tocar este archivo.
//
// Es HTML "de correo": tablas y estilos en línea, sin JavaScript, sin SVG y sin
// fuentes externas, porque Gmail, Outlook y los celulares ignoran casi todo lo
// demás. Lo que escribe una persona pasa por `esc()` antes de entrar al HTML.
//
// Sirve tanto para las plantillas de Supabase Auth (con etiquetas {{ .Token }})
// como para los correos que arma una función de borde al enviarlos.
// ============================================================

/** Tokens de diseño (equivalen a las variables del diseño en Figma) */
export const T = {
  marca: '#FF441F',
  marcaOscura: '#E02E0B',
  ambar: '#FFB020',
  tinta: '#1B1712',
  texto: '#4A433A',
  suave: '#7A7268',
  linea: '#EFEAE4',
  fondo: '#F6F2EC',
  tarjeta: '#FFFFFF',
  papel: '#FAF7F3',
  verde: '#11B26A',
  verdeFondo: '#E6F6EE',
  verdeTexto: '#0B7A48',
  fuente: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
  sitio: 'https://turafood.com',
  soporteWa: '573137594713',
};

export function esc(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------- bloques ----------

/** Título grande + subtítulo, centrados */
export function encabezado(icono: string, titulo: string, subtitulo = ''): string {
  return `
              <tr>
                <td align="center" style="padding:34px 28px 6px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td align="center" style="width:64px;height:64px;background:${T.papel};border:1px solid ${T.linea};border-radius:20px;font-size:30px;line-height:64px;">${icono}</td>
                  </tr></table>
                  <h1 style="margin:18px 0 8px;font-family:${T.fuente};font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-.02em;color:${T.tinta};">${titulo}</h1>
                  ${subtitulo ? `<p style="margin:0;font-family:${T.fuente};font-size:15.5px;line-height:1.55;color:${T.texto};">${subtitulo}</p>` : ''}
                </td>
              </tr>`;
}

/** Párrafo de cuerpo */
export function parrafo(html: string, opciones: { centrado?: boolean; suave?: boolean } = {}): string {
  return `
              <tr>
                <td ${opciones.centrado ? 'align="center" ' : ''}style="padding:10px 32px 0;font-family:${T.fuente};font-size:${opciones.suave ? 13.5 : 15.5}px;line-height:1.6;color:${opciones.suave ? T.suave : T.texto};">${html}</td>
              </tr>`;
}

/** La caja del código de verificación (lo más importante del correo) */
export function cajaCodigo(codigo: string, nota = 'Vence en 10 minutos'): string {
  return `
              <tr>
                <td align="center" style="padding:22px 32px 4px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:340px;">
                    <tr>
                      <td align="center" style="background:${T.papel};border:2px dashed #E5DCD0;border-radius:18px;padding:20px 12px 16px;">
                        <div style="font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:42px;line-height:1;font-weight:800;letter-spacing:12px;color:${T.tinta};padding-left:12px;">${codigo}</div>
                        <div style="font-family:${T.fuente};font-size:12.5px;font-weight:700;color:${T.suave};margin-top:12px;">${nota}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;
}

/** Botón principal (a prueba de Outlook: va dentro de una celda con color de fondo) */
export function boton(texto: string, url: string, secundario = false): string {
  const fondo = secundario ? T.tarjeta : T.marca;
  const color = secundario ? T.tinta : '#FFFFFF';
  const borde = secundario ? `border:1.5px solid ${T.linea};` : '';
  return `
              <tr>
                <td align="center" style="padding:22px 32px 4px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td align="center" bgcolor="${fondo}" style="background:${fondo};border-radius:14px;${borde}">
                      <a href="${esc(url)}" style="display:inline-block;padding:15px 32px;font-family:${T.fuente};font-size:16px;font-weight:800;color:${color};text-decoration:none;">${texto}</a>
                    </td>
                  </tr></table>
                </td>
              </tr>`;
}

/** Lista de pasos o beneficios con icono (estilo "tarjeta de funciones") */
export function pasos(items: { icono: string; titulo: string; texto: string }[]): string {
  const filas = items.map((i) => `
                    <tr>
                      <td valign="top" style="width:46px;padding:12px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                          <td align="center" style="width:38px;height:38px;background:${T.papel};border:1px solid ${T.linea};border-radius:12px;font-size:19px;line-height:38px;">${i.icono}</td>
                        </tr></table>
                      </td>
                      <td valign="top" style="padding:12px 0 12px 4px;border-bottom:1px solid ${T.linea};font-family:${T.fuente};">
                        <div style="font-size:15px;font-weight:800;color:${T.tinta};line-height:1.3;">${i.titulo}</div>
                        <div style="font-size:13.5px;color:${T.suave};line-height:1.5;margin-top:2px;">${i.texto}</div>
                      </td>
                    </tr>`).join('');
  return `
              <tr>
                <td style="padding:14px 32px 2px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${filas}
                  </table>
                </td>
              </tr>`;
}

/** Aviso resaltado (seguridad, ayuda…) */
export function aviso(icono: string, html: string): string {
  return `
              <tr>
                <td style="padding:20px 32px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.papel};border-radius:14px;">
                    <tr>
                      <td valign="top" style="width:44px;padding:14px 0 14px 16px;font-size:20px;">${icono}</td>
                      <td style="padding:14px 16px 14px 6px;font-family:${T.fuente};font-size:13.5px;line-height:1.55;color:${T.texto};">${html}</td>
                    </tr>
                  </table>
                </td>
              </tr>`;
}

/** Separador de aire al final de la tarjeta */
export const aire = `
              <tr><td style="height:30px;line-height:30px;font-size:1px;">&nbsp;</td></tr>`;

export interface OpcionesEnvoltura {
  /** Texto que se ve junto al asunto en la bandeja de entrada */
  preheader: string;
  /** Filas (<tr>) de la tarjeta, armadas con los bloques de arriba */
  filas: string;
  /** Enlace para dejar de recibir estos correos (solo secuencias, no los códigos) */
  bajaUrl?: string;
  /** Correo al que se envió (se muestra en el pie) */
  destinatario?: string;
  titulo?: string;
}

/** Marco común: fondo, marca, tarjeta con franja de color y pie legal */
export function envoltura(o: OpcionesEnvoltura): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(o.titulo ?? 'TuraFood')}</title>
</head>
<body style="margin:0;padding:0;background:${T.fondo};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${o.preheader}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.fondo};">
  <tr>
    <td align="center" style="padding:28px 12px 36px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <tr>
          <td style="padding:2px 6px 18px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center" bgcolor="${T.marca}" style="width:38px;height:38px;background:${T.marca};border-radius:12px;color:#FFFFFF;font-family:${T.fuente};font-size:23px;font-weight:800;line-height:38px;">t</td>
              <td style="padding-left:10px;font-family:${T.fuente};font-size:20px;font-weight:800;letter-spacing:-.02em;color:${T.tinta};">TuraFood</td>
            </tr></table>
          </td>
        </tr>

        <tr>
          <td style="background:${T.tarjeta};border:1px solid #EAE3DA;border-radius:24px;overflow:hidden;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:6px;line-height:6px;font-size:1px;background:${T.marca};background-image:linear-gradient(90deg,${T.marca},${T.ambar});">&nbsp;</td></tr>${o.filas}
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:22px 14px 6px;font-family:${T.fuente};font-size:12px;line-height:1.7;color:#8C857B;">
            ${o.destinatario ? `Enviado a ${esc(o.destinatario)}.<br>` : ''}
            <a href="${T.sitio}/terminos" style="color:#8C857B;">Términos</a> &nbsp;·&nbsp;
            <a href="${T.sitio}/privacidad" style="color:#8C857B;">Privacidad</a> &nbsp;·&nbsp;
            <a href="https://wa.me/${T.soporteWa}" style="color:#8C857B;">Soporte por WhatsApp</a><br>
            ${o.bajaUrl ? `<a href="${esc(o.bajaUrl)}" style="color:#8C857B;text-decoration:underline;">Dejar de recibir estos consejos</a><br>` : ''}
            TuraFood · Buenaventura, Colombia
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
