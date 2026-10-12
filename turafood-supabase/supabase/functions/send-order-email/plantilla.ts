// ============================================================
// TURAFOOD — Correo de pedido entregado (recibo tipo Rappi / Uber Eats PRO)
//
// Genera un recibo visual de alta gama con:
// - Encabezado y logotipo oficial de TuraFood
// - Banner de éxito con avatar del restaurante
// - Desglose visual de productos CON FOTOS / miniaturas
// - Tarjeta de entrega (dirección y repartidor)
// - Resumen financiero detallado (subtotal, domicilio, servicio, total y método de pago)
// - Botón de calificación interactivo estilo Rappi/Uber
// - Canal directo de soporte por WhatsApp para incidencias
//
// El HTML usa tablas compatibles con clientes de correo (Gmail, Outlook, Apple Mail).
// ============================================================

export interface ItemRecibo {
  nombre: string;
  cantidad: number;
  subtotal: number;
  imagen?: string | null;
  extras?: { name?: string; price?: number }[];
  notas?: string | null;
}

export interface DatosRecibo {
  id: string;
  numero: string;
  negocio: string;
  negocioLogo?: string | null;
  negocioCover?: string | null;
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
  repartidorFoto?: string | null;
}

const SITIO = "https://turafood.com";
const WHATSAPP_SOPORTE = "573137594713";
const NARANJA = "#FF441F";
const VERDE = "#10B981";

const PAGO: Record<string, string> = {
  cash: "Efectivo contraentrega",
  nequi: "Nequi Directo",
  daviplata: "Daviplata",
  card: "Tarjeta de crédito / débito",
};

/** Escapa caracteres HTML peligrosos */
export function esc(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Formato moneda colombiana: $ 95.700 */
export function cop(n: number): string {
  const v = Math.round(Number(n) || 0);
  return "$ " + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Convierte rutas relativas a absolutas HTTPS para que carguen en el correo */
export function urlAbsoluta(url?: string | null): string | null {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `${SITIO}${s.startsWith("/") ? "" : "/"}${s}`;
}

function fechaLarga(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const fecha = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric",
  }).format(d);
  const hora = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota", hour: "numeric", minute: "2-digit", hour12: true,
  }).format(d).replace(/\s/g, " ");
  return `${fecha} · ${hora}`;
}

function primerNombre(nombre?: string | null): string {
  return String(nombre ?? "").trim().split(/\s+/)[0] ?? "";
}

export function construirCorreo(d: DatosRecibo): { asunto: string; html: string; texto: string } {
  const nombre = primerNombre(d.cliente);
  const entregaDomicilio = d.modo !== "pickup";
  const cuando = fechaLarga(d.entregadoEn);
  const pagoTexto = d.pago ? (PAGO[d.pago] ?? d.pago) : "Contraentrega";
  const linkCalificar = `${SITIO}/rate?order=${encodeURIComponent(d.id)}`;
  const linkDetalle = `${SITIO}/tracking?order=${encodeURIComponent(d.id)}`;
  const linkSoporte = `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(`Hola TuraFood, tengo una consulta sobre mi pedido ${d.numero}`)}`;

  const asunto = `✓ Pedido ${d.numero} entregado · Tu recibo de TuraFood`;
  const saludo = nombre ? `¡Gracias por tu pedido, ${esc(nombre)}!` : "¡Gracias por tu pedido!";
  const pre = `${d.negocio} · ${d.items.reduce((a, i) => a + i.cantidad, 0)} producto(s) · Total ${cop(d.total)}`;

  const fotoRestaurante = urlAbsoluta(d.negocioCover || d.negocioLogo) || `${SITIO}/images/steak-ribeye.jpg`;

  // Filas de productos con miniaturas fotográficas (estilo Rappi / Uber)
  const filasItems = d.items.map((i) => {
    const extras = (i.extras ?? []).filter((e) => e?.name)
      .map((e) => esc(e.name)).join(", ");
    const fotoProducto = urlAbsoluta(i.imagen);

    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #F0ECE6;vertical-align:top;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <!-- Miniatura fotográfica -->
              <td valign="top" style="width:56px;padding-right:12px;">
                ${fotoProducto ? `
                  <img src="${esc(fotoProducto)}" alt="${esc(i.nombre)}" width="56" height="56" style="width:56px;height:56px;border-radius:12px;object-fit:cover;display:block;border:1px solid #EAE3DA;background:#FAF7F3;" />
                ` : `
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:56px;height:56px;background:#FAF6F0;border-radius:12px;border:1px solid #EAE3DA;text-align:center;">
                    <tr>
                      <td align="center" valign="middle" style="font-size:24px;line-height:1;">🍽️</td>
                    </tr>
                  </table>
                `}
              </td>

              <!-- Detalle del producto -->
              <td valign="top" style="vertical-align:top;">
                <div style="font-size:14.5px;font-weight:700;color:#18181B;line-height:1.35;">
                  <span style="display:inline-block;background:#FFF0ED;color:${NARANJA};font-weight:800;font-size:11.5px;padding:2px 7px;border-radius:6px;margin-right:6px;vertical-align:1px;">
                    ${esc(i.cantidad)}×
                  </span>
                  ${esc(i.nombre)}
                </div>
                ${extras ? `<div style="font-size:12px;color:#71717A;margin-top:3px;">↳ ${extras}</div>` : ""}
                ${i.notas ? `<div style="font-size:12px;color:#B45309;margin-top:3px;font-style:italic;">Nota: “${esc(i.notas)}”</div>` : ""}
              </td>

              <!-- Subtotal del ítem -->
              <td valign="top" align="right" style="padding-left:12px;font-size:14.5px;font-weight:800;color:#18181B;white-space:nowrap;vertical-align:top;">
                ${cop(i.subtotal)}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join("");

  const filaMonto = (etiqueta: string, valor: string, color = "#52525B", negrita = false) => `
    <tr>
      <td style="padding:5px 0;font-size:13.5px;color:${color};${negrita ? "font-weight:700;" : ""}">${etiqueta}</td>
      <td align="right" style="padding:5px 0;font-size:13.5px;color:${color};${negrita ? "font-weight:700;" : ""}white-space:nowrap;">${valor}</td>
    </tr>`;

  const montos = [
    filaMonto("Subtotal productos", cop(d.subtotal)),
    entregaDomicilio
      ? filaMonto("Tarifa de entrega", d.domicilio > 0 ? cop(d.domicilio) : "Gratis ⚡", d.domicilio > 0 ? "#52525B" : VERDE, d.domicilio === 0)
      : "",
    d.servicio > 0 ? filaMonto("Tarifa de servicio", cop(d.servicio)) : "",
    d.propina > 0 ? filaMonto("Propina para el repartidor", cop(d.propina)) : "",
    d.descuento > 0 ? filaMonto("Descuento aplicado", `− ${cop(d.descuento)}`, VERDE, true) : "",
  ].join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(asunto)}</title>
</head>
<body style="margin:0;padding:0;background:#F5F3EF;-webkit-text-size-adjust:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(pre)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F3EF;">
  <tr>
    <td align="center" style="padding:28px 12px 36px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

        <!-- 1. Cabecera con Logo Oficial -->
        <tr>
          <td style="padding:0 8px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width:36px;height:36px;background:${NARANJA};border-radius:11px;text-align:center;color:#ffffff;font-size:20px;font-weight:900;line-height:36px;">
                        t
                      </td>
                      <td style="padding-left:10px;font-size:21px;font-weight:900;color:#18181B;letter-spacing:-0.03em;">
                        TuraFood
                      </td>
                    </tr>
                  </table>
                </td>
                <td align="right" valign="middle">
                  <span style="display:inline-block;background:#E6F6EE;color:${VERDE};font-size:11.5px;font-weight:800;letter-spacing:0.04em;padding:4px 10px;border-radius:99px;border:1px solid rgba(16,185,129,0.2);">
                    ✓ ENTREGADO
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- 2. Tarjeta Principal Estilo Uber Eats / Rappi -->
        <tr>
          <td style="background:#ffffff;border-radius:24px;border:1px solid #EAE3DA;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.04);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

              <!-- Hero: Confirmación de entrega -->
              <tr>
                <td align="center" style="padding:32px 24px 20px;background:linear-gradient(180deg, rgba(255,68,31,0.04) 0%, transparent 100%);border-bottom:1px solid #F5F1EB;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width:58px;height:58px;background:#E6F6EE;border-radius:50%;text-align:center;color:${VERDE};font-size:30px;font-weight:900;line-height:58px;box-shadow:0 4px 12px rgba(16,185,129,0.15);">
                        ✓
                      </td>
                    </tr>
                  </table>
                  <h1 style="margin:16px 0 4px;font-size:24px;font-weight:900;color:#18181B;letter-spacing:-0.02em;line-height:1.2;">
                    ¡Tu pedido ha sido entregado!
                  </h1>
                  <p style="margin:0;font-size:14.5px;color:#71717A;line-height:1.45;max-width:440px;">
                    ${saludo} Esperamos que disfrutes cada sabor del puerto de Buenaventura.
                  </p>
                </td>
              </tr>

              <!-- Ficha del Restaurante con Foto -->
              <tr>
                <td style="padding:18px 24px 14px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF8F5;border-radius:16px;border:1px solid #EFEAE3;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="middle" style="width:52px;padding-right:14px;">
                              <img src="${esc(fotoRestaurante)}" alt="${esc(d.negocio)}" width="52" height="52" style="width:52px;height:52px;border-radius:12px;object-fit:cover;display:block;border:1px solid #EAE3DA;" />
                            </td>
                            <td valign="middle">
                              <div style="font-size:11px;font-weight:800;letter-spacing:0.06em;color:#A1A1AA;text-transform:uppercase;">
                                Pedido #${esc(d.numero)}
                              </div>
                              <div style="font-size:17px;font-weight:900;color:#18181B;margin-top:2px;letter-spacing:-0.01em;">
                                ${esc(d.negocio)}
                              </div>
                              ${cuando ? `<div style="font-size:12.5px;color:#71717A;margin-top:2px;">${esc(cuando)}</div>` : ""}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Lista de Productos con Fotos -->
              <tr>
                <td style="padding:6px 24px 0;">
                  <div style="font-size:11px;font-weight:800;letter-spacing:0.06em;color:#A1A1AA;text-transform:uppercase;margin-bottom:6px;">
                    🍽️ DETALLE DE TU ORDEN
                  </div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${filasItems}
                  </table>
                </td>
              </tr>

              <!-- Desglose de Pago / Facturación -->
              <tr>
                <td style="padding:16px 24px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF9;border-radius:14px;padding:14px 16px;">
                    <tr>
                      <td>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          ${montos}
                          <tr>
                            <td style="padding:10px 0 2px;border-top:2px dashed #E4E4E7;font-size:16px;font-weight:900;color:#18181B;">
                              TOTAL PAGADO
                            </td>
                            <td align="right" style="padding:10px 0 2px;border-top:2px dashed #E4E4E7;font-size:19px;font-weight:900;color:#18181B;white-space:nowrap;">
                              ${cop(d.total)}
                            </td>
                          </tr>
                          <tr>
                            <td colspan="2" style="padding:3px 0 0;font-size:12px;color:#71717A;">
                              Método de pago: <b>${esc(pagoTexto)}</b>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Bloque de Entrega & Repartidor -->
              <tr>
                <td style="padding:18px 24px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #F0ECE6;padding-top:16px;">
                    <tr>
                      <td valign="top" style="padding-bottom:12px;">
                        <div style="font-size:11px;font-weight:800;letter-spacing:0.06em;color:#A1A1AA;text-transform:uppercase;">
                          ${entregaDomicilio ? "📍 Dirección de entrega" : "🏪 Punto de recogida"}
                        </div>
                        <div style="font-size:14px;font-weight:700;color:#18181B;margin-top:3px;line-height:1.4;">
                          ${esc(entregaDomicilio ? (d.direccion || "Buenaventura") : d.negocio)}
                        </div>
                        ${d.detalleDireccion ? `<div style="font-size:12.5px;color:#71717A;margin-top:2px;">${esc(d.detalleDireccion)}</div>` : ""}
                      </td>
                    </tr>
                    ${d.repartidor && entregaDomicilio ? `
                    <tr>
                      <td valign="top" style="padding-bottom:4px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#FAF8F5;padding:8px 14px;border-radius:10px;border:1px solid #EFEAE3;">
                          <tr>
                            <td style="font-size:18px;padding-right:8px;">🛵</td>
                            <td style="font-size:13px;color:#18181B;">
                              Entregado por <b>${esc(d.repartidor)}</b>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>` : ""}
                  </table>
                </td>
              </tr>

              <!-- Botones de Acción Estilo Uber Eats / Rappi -->
              <tr>
                <td align="center" style="padding:22px 24px 10px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:340px;">
                          <tr>
                            <td align="center" style="background:${NARANJA};border-radius:14px;box-shadow:0 6px 20px rgba(255,68,31,0.28);">
                              <a href="${esc(linkCalificar)}" style="display:block;padding:15px 24px;font-size:15px;font-weight:900;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                                ⭐ Calificar entrega y comida
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-top:12px;">
                        <a href="${esc(linkDetalle)}" style="display:inline-block;font-size:13px;font-weight:700;color:#71717A;text-decoration:none;">
                          Ver comanda completa en la app →
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Asistencia y Soporte Directo -->
              <tr>
                <td style="padding:16px 24px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF8F5;border-radius:14px;border:1px solid #EFEAE3;padding:14px 16px;">
                    <tr>
                      <td>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="middle" style="font-size:13px;color:#52525B;line-height:1.45;">
                              ¿Algo no salió como esperabas con tu comida?
                            </td>
                            <td align="right" valign="middle" style="white-space:nowrap;padding-left:12px;">
                              <a href="${esc(linkSoporte)}" style="display:inline-block;background:#25D366;color:#ffffff;font-size:12px;font-weight:800;padding:7px 14px;border-radius:8px;text-decoration:none;box-shadow:0 2px 8px rgba(37,211,102,0.2);">
                                WhatsApp Soporte
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- 3. Pie de Página Institucional -->
        <tr>
          <td align="center" style="padding:24px 16px 8px;font-size:12px;line-height:1.6;color:#A1A1AA;">
            Recibes este correo porque hiciste un pedido a través de TuraFood.<br>
            <a href="${SITIO}/terminos" style="color:#71717A;text-decoration:none;">Términos de servicio</a> ·
            <a href="${SITIO}/privacidad" style="color:#71717A;text-decoration:none;">Política de privacidad</a><br>
            <b>TuraFood</b> · Buenaventura, Valle del Cauca, Colombia
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
    `✓ Pedido entregado — #${d.numero}`,
    saludo,
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
    `TOTAL PAGADO: ${cop(d.total)}`,
    `Método de pago: ${pagoTexto}`,
    "",
    entregaDomicilio ? `Entregado en: ${d.direccion ?? "Tu dirección"}` : `Recogido en: ${d.negocio}`,
    d.repartidor ? `Repartidor: ${d.repartidor}` : "",
    "",
    `Califica tu pedido: ${linkCalificar}`,
    `¿Dudas con tu entrega? Soporte WhatsApp: ${linkSoporte}`,
    "",
    "TuraFood · Buenaventura, Colombia",
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");

  return { asunto, html, texto };
}
