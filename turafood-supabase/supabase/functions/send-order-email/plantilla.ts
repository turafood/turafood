// ============================================================
// TURAFOOD — Correo de pedido entregado (recibo)
//
// Solo arma el texto: `construirCorreo(datos)` devuelve asunto, HTML y texto
// plano. No sabe nada de Supabase ni de Resend, así que se puede probar y
// mirar en el navegador (ver vista-previa.mjs).
//
// El HTML usa tablas y estilos en línea a propósito: Gmail, Outlook y los
// celulares ignoran casi todo lo demás. Todo lo que escribe una persona
// (nombres, direcciones, notas) pasa por `esc()` antes de entrar al HTML.
// ============================================================

export interface ItemRecibo {
  nombre: string;
  cantidad: number;
  subtotal: number;
  extras?: { name?: string; price?: number }[];
  notas?: string | null;
}

export interface DatosRecibo {
  id: string;
  numero: string;
  negocio: string;
  cliente?: string | null;
  items: ItemRecibo[];
  subtotal: number;
  domicilio: number;
  servicio: number;
  propina: number;
  descuento: number;
  total: number;
  pago?: string | null;
  modo: string;                      // 'delivery' | 'pickup'
  direccion?: string | null;
  detalleDireccion?: string | null;
  entregadoEn?: string | null;       // ISO
  repartidor?: string | null;
}

const SITIO = "https://turafood.com";
const WHATSAPP_SOPORTE = "573137594713";
const NARANJA = "#FF441F";

const PAGO: Record<string, string> = {
  cash: "Efectivo al recibir",
  nequi: "Nequi",
  daviplata: "Daviplata",
  card: "Tarjeta",
};

/** Escapa texto que escribió una persona antes de ponerlo en el HTML */
export function esc(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** $ 95.700 (pesos colombianos, sin decimales) */
export function cop(n: number): string {
  const v = Math.round(Number(n) || 0);
  return "$ " + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function fechaLarga(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const fecha = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric",
  }).format(d);
  const hora = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota", hour: "numeric", minute: "2-digit", hour12: true,
  }).format(d).replace(/\s/g, " ");
  return `${fecha}, ${hora}`;
}

function primerNombre(nombre?: string | null): string {
  return String(nombre ?? "").trim().split(/\s+/)[0] ?? "";
}

export function construirCorreo(d: DatosRecibo): { asunto: string; html: string; texto: string } {
  const nombre = primerNombre(d.cliente);
  const entregaDomicilio = d.modo !== "pickup";
  const cuando = fechaLarga(d.entregadoEn);
  const pago = d.pago ? (PAGO[d.pago] ?? d.pago) : "";
  const linkCalificar = `${SITIO}/rate?order=${encodeURIComponent(d.id)}`;
  const linkDetalle = `${SITIO}/tracking?order=${encodeURIComponent(d.id)}`;
  const linkSoporte = `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(`Hola TuraFood, tengo una duda con mi pedido ${d.numero}`)}`;

  const asunto = `Tu pedido ${d.numero} fue entregado · Recibo de TuraFood`;
  const saludo = nombre ? `¡Gracias, ${esc(nombre)}!` : "¡Gracias por tu pedido!";
  const pre = `${d.negocio} · ${d.items.reduce((a, i) => a + i.cantidad, 0)} producto(s) · Total ${cop(d.total)}`;

  const filasItems = d.items.map((i) => {
    const extras = (i.extras ?? []).filter((e) => e?.name)
      .map((e) => esc(e.name)).join(", ");
    return `
          <tr>
            <td valign="top" style="padding:12px 0;border-bottom:1px solid #EFEAE4;font-size:15px;color:#1B1712;">
              <span style="display:inline-block;min-width:26px;font-weight:800;color:${NARANJA};">${esc(i.cantidad)}×</span>${esc(i.nombre)}
              ${extras ? `<div style="font-size:12.5px;color:#7A7268;margin:3px 0 0 26px;">${extras}</div>` : ""}
              ${i.notas ? `<div style="font-size:12.5px;color:#7A7268;margin:3px 0 0 26px;font-style:italic;">“${esc(i.notas)}”</div>` : ""}
            </td>
            <td valign="top" align="right" style="padding:12px 0 12px 12px;border-bottom:1px solid #EFEAE4;font-size:15px;font-weight:700;color:#1B1712;white-space:nowrap;">${cop(i.subtotal)}</td>
          </tr>`;
  }).join("");

  const filaMonto = (etiqueta: string, valor: string, color = "#4A433A") => `
          <tr>
            <td style="padding:5px 0;font-size:14px;color:${color};">${etiqueta}</td>
            <td align="right" style="padding:5px 0;font-size:14px;color:${color};white-space:nowrap;">${valor}</td>
          </tr>`;

  const montos = [
    filaMonto("Subtotal", cop(d.subtotal)),
    entregaDomicilio ? filaMonto("Domicilio", d.domicilio > 0 ? cop(d.domicilio) : "Gratis") : "",
    d.servicio > 0 ? filaMonto("Tarifa de servicio", cop(d.servicio)) : "",
    d.propina > 0 ? filaMonto("Propina para el repartidor", cop(d.propina)) : "",
    d.descuento > 0 ? filaMonto("Descuento", `− ${cop(d.descuento)}`, "#0B7A48") : "",
  ].join("");

  const bloqueEntrega = entregaDomicilio
    ? `
        <tr><td style="padding:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.06em;color:#7A7268;text-transform:uppercase;">Entregado en</td></tr>
        <tr><td style="padding:0 0 14px;font-size:15px;color:#1B1712;line-height:1.45;">${esc(d.direccion || "Tu dirección")}${d.detalleDireccion ? `<br><span style="color:#7A7268;">${esc(d.detalleDireccion)}</span>` : ""}</td></tr>`
    : `
        <tr><td style="padding:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.06em;color:#7A7268;text-transform:uppercase;">Recogido en</td></tr>
        <tr><td style="padding:0 0 14px;font-size:15px;color:#1B1712;line-height:1.45;">${esc(d.negocio)}</td></tr>`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(asunto)}</title>
</head>
<body style="margin:0;padding:0;background:#F6F2EC;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F2EC;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

        <!-- Marca -->
        <tr>
          <td style="padding:4px 4px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="width:36px;height:36px;background:${NARANJA};border-radius:10px;text-align:center;color:#ffffff;font-size:22px;font-weight:800;line-height:36px;">t</td>
              <td style="padding-left:10px;font-size:20px;font-weight:800;color:#1B1712;letter-spacing:-.02em;">TuraFood</td>
            </tr></table>
          </td>
        </tr>

        <!-- Tarjeta -->
        <tr>
          <td style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #EAE3DA;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

              <!-- Encabezado -->
              <tr>
                <td align="center" style="padding:32px 24px 8px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="width:56px;height:56px;background:#E6F6EE;border-radius:28px;text-align:center;color:#0B7A48;font-size:30px;font-weight:800;line-height:56px;">✓</td>
                  </tr></table>
                  <h1 style="margin:16px 0 6px;font-size:26px;line-height:1.2;color:#1B1712;letter-spacing:-.02em;">Pedido entregado</h1>
                  <p style="margin:0;font-size:15px;line-height:1.5;color:#4A433A;">${saludo} Esperamos que lo disfrutes.</p>
                </td>
              </tr>

              <!-- Pedido -->
              <tr>
                <td style="padding:20px 24px 4px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF7F3;border-radius:14px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <div style="font-size:12px;font-weight:800;letter-spacing:.06em;color:#7A7268;text-transform:uppercase;">Pedido ${esc(d.numero)}</div>
                        <div style="font-size:17px;font-weight:800;color:#1B1712;margin-top:3px;">${esc(d.negocio)}</div>
                        ${cuando ? `<div style="font-size:13px;color:#7A7268;margin-top:3px;">${esc(cuando)}</div>` : ""}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Productos -->
              <tr>
                <td style="padding:8px 24px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${filasItems}
                  </table>
                </td>
              </tr>

              <!-- Montos -->
              <tr>
                <td style="padding:10px 24px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${montos}
                    <tr>
                      <td style="padding:12px 0 4px;border-top:2px solid #1B1712;font-size:18px;font-weight:800;color:#1B1712;">Total</td>
                      <td align="right" style="padding:12px 0 4px;border-top:2px solid #1B1712;font-size:20px;font-weight:800;color:#1B1712;white-space:nowrap;">${cop(d.total)}</td>
                    </tr>
                    ${pago ? `<tr><td colspan="2" style="padding:0 0 4px;font-size:13px;color:#7A7268;">Pago: ${esc(pago)}</td></tr>` : ""}
                  </table>
                </td>
              </tr>

              <!-- Entrega -->
              <tr>
                <td style="padding:18px 24px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${bloqueEntrega}
                    ${d.repartidor && entregaDomicilio ? `
                    <tr><td style="padding:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.06em;color:#7A7268;text-transform:uppercase;">Tu repartidor</td></tr>
                    <tr><td style="padding:0 0 4px;font-size:15px;color:#1B1712;">${esc(d.repartidor)}</td></tr>` : ""}
                  </table>
                </td>
              </tr>

              <!-- Botón -->
              <tr>
                <td align="center" style="padding:14px 24px 8px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td align="center" style="background:${NARANJA};border-radius:14px;">
                      <a href="${esc(linkCalificar)}" style="display:inline-block;padding:15px 32px;font-size:16px;font-weight:800;color:#ffffff;text-decoration:none;">Califica tu pedido</a>
                    </td>
                  </tr></table>
                  <p style="margin:12px 0 0;font-size:13px;color:#7A7268;">Tu opinión ayuda a los negocios del puerto a mejorar.</p>
                </td>
              </tr>

              <!-- Ayuda -->
              <tr>
                <td style="padding:20px 24px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #EFEAE4;">
                    <tr>
                      <td style="padding-top:16px;font-size:14px;line-height:1.55;color:#4A433A;">
                        ¿Algo salió mal con tu pedido? Escríbenos por
                        <a href="${esc(linkSoporte)}" style="color:${NARANJA};font-weight:700;text-decoration:none;">WhatsApp</a>
                        o revisa el
                        <a href="${esc(linkDetalle)}" style="color:${NARANJA};font-weight:700;text-decoration:none;">detalle de tu pedido</a>.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td align="center" style="padding:20px 12px 8px;font-size:12px;line-height:1.6;color:#8C857B;">
            Recibes este correo porque pediste en TuraFood.<br>
            <a href="${SITIO}/terminos" style="color:#8C857B;">Términos</a> ·
            <a href="${SITIO}/privacidad" style="color:#8C857B;">Privacidad</a><br>
            TuraFood · Buenaventura, Colombia
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const lineasItems = d.items.map((i) => {
    const extras = (i.extras ?? []).filter((e) => e?.name).map((e) => e.name).join(", ");
    return `  ${i.cantidad}× ${i.nombre}${extras ? ` (${extras})` : ""} — ${cop(i.subtotal)}`;
  }).join("\n");

  const texto = [
    `Pedido entregado — ${d.numero}`,
    nombre ? `¡Gracias, ${nombre}!` : "¡Gracias por tu pedido!",
    "",
    `${d.negocio}${cuando ? ` · ${cuando}` : ""}`,
    "",
    lineasItems,
    "",
    `Subtotal: ${cop(d.subtotal)}`,
    entregaDomicilio ? `Domicilio: ${d.domicilio > 0 ? cop(d.domicilio) : "Gratis"}` : "",
    d.servicio > 0 ? `Tarifa de servicio: ${cop(d.servicio)}` : "",
    d.propina > 0 ? `Propina: ${cop(d.propina)}` : "",
    d.descuento > 0 ? `Descuento: -${cop(d.descuento)}` : "",
    `TOTAL: ${cop(d.total)}`,
    pago ? `Pago: ${pago}` : "",
    "",
    entregaDomicilio ? `Entregado en: ${d.direccion ?? ""}` : `Recogido en: ${d.negocio}`,
    "",
    `Califica tu pedido: ${linkCalificar}`,
    `¿Dudas? WhatsApp: ${linkSoporte}`,
    "",
    "TuraFood · Buenaventura, Colombia",
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");

  return { asunto, html, texto };
}
