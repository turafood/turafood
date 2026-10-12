// ============================================================
// TURAFOOD — Envío del recibo por correo (Resend)
//
// La llama la base de datos (trigger orders_recibo vía pg_net) cuando un
// pedido pasa a "entregado", y la función pedir_recibo_por_correo() si el
// pedido ya estaba entregado. Arma el correo, lo manda y deja marcado el
// envío para que no se repita.
//
// A quién se le manda, en este orden:
//   1. el correo que la persona dejó para este pedido (order_receipts),
//   2. el correo de su cuenta (profiles.email).
// Quien pidió como invitado y no dejó correo no recibe nada: no se inventa.
//
// Secrets del proyecto (supabase secrets set ...):
//   PUSH_SECRET      el mismo secreto interno que usa send-push (x-push-secret)
//   RESEND_API_KEY   llave de Resend (basta con permiso de envío)
//   RESEND_FROM      opcional. Por defecto "TuraFood <pedidos@turafood.com>"
//                    (el dominio debe estar verificado en Resend)
// Los siguientes los inyecta Supabase solo:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// verify_jwt = false (config.toml): quien llama es la base, no un usuario.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { construirCorreo, type DatosRecibo } from "./plantilla.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Comparación en tiempo constante para no filtrar el secreto por tiempos. */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const secret = Deno.env.get("PUSH_SECRET");
  const recibido = req.headers.get("x-push-secret") ?? "";
  if (!secret || !iguales(recibido, secret)) return json({ error: "No autorizado" }, 401);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ error: "Falta RESEND_API_KEY" }, 500);

  let orderId = "";
  try {
    orderId = String((await req.json())?.order_id ?? "");
  } catch { /* cuerpo vacío */ }
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "order_id inválido" }, 400);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: pedido, error } = await db
    .from("orders")
    .select(`
      id, order_number, status, mode, customer_id, courier_id,
      subtotal, delivery_fee, service_fee, tip, discount, total, payment_method,
      delivery_address, delivery_detail, delivered_at,
      business:business_profiles(name, cover_url, logo_url),
      items:order_items(name, quantity, subtotal, extras, notes, product:products(image_url))
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !pedido) return json({ error: "Pedido no encontrado" }, 404);
  if (pedido.status !== "delivered") return json({ skipped: "El pedido aún no está entregado" });

  const { data: recibo } = await db
    .from("order_receipts")
    .select("email, sent_at")
    .eq("order_id", orderId)
    .maybeSingle();
  if (recibo?.sent_at) return json({ skipped: "Ya se envió" });

  const { data: cliente } = await db
    .from("profiles")
    .select("full_name, email")
    .eq("id", pedido.customer_id)
    .maybeSingle();

  const destino = String(recibo?.email || cliente?.email || "").trim().toLowerCase();
  if (!CORREO.test(destino)) return json({ skipped: "Sin correo para este pedido" });

  let repartidor: string | null = null;
  if (pedido.courier_id) {
    const { data: r } = await db.from("profiles").select("full_name").eq("id", pedido.courier_id).maybeSingle();
    repartidor = r?.full_name ?? null;
  }

  const biz = pedido.business as { name?: string; cover_url?: string; logo_url?: string } | null;

  const datos: DatosRecibo = {
    id: pedido.id,
    numero: pedido.order_number,
    negocio: biz?.name ?? "Tu negocio",
    negocioLogo: biz?.logo_url ?? null,
    negocioCover: biz?.cover_url ?? null,
    cliente: cliente?.full_name,
    items: (pedido.items ?? []).map((i: Record<string, unknown>) => {
      const prod = i.product as { image_url?: string } | null;
      return {
        nombre: String(i.name ?? ""),
        cantidad: Number(i.quantity ?? 1),
        subtotal: Number(i.subtotal ?? 0),
        imagen: prod?.image_url ?? null,
        extras: Array.isArray(i.extras) ? i.extras : [],
        notas: (i.notes as string | null) ?? null,
      };
    }),
    subtotal: Number(pedido.subtotal),
    domicilio: Number(pedido.delivery_fee),
    servicio: Number(pedido.service_fee),
    propina: Number(pedido.tip),
    descuento: Number(pedido.discount),
    total: Number(pedido.total),
    pago: pedido.payment_method,
    modo: pedido.mode,
    direccion: pedido.delivery_address,
    detalleDireccion: pedido.delivery_detail,
    entregadoEn: pedido.delivered_at,
    repartidor,
  };

  const { asunto, html, texto } = construirCorreo(datos);

  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Si la base reintenta, Resend no manda el mismo recibo dos veces
      "Idempotency-Key": `recibo-${orderId}-${destino}`,
    },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM") ?? "TuraFood <pedidos@turafood.com>",
      to: [destino],
      subject: asunto,
      html,
      text: texto,
      tags: [{ name: "tipo", value: "recibo" }],
    }),
  });

  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    console.error("Resend rechazó el correo", respuesta.status, cuerpo?.name, cuerpo?.message);
    return json({ error: "No se pudo enviar", detalle: cuerpo?.message ?? respuesta.status }, 502);
  }

  await db.from("order_receipts").upsert(
    { order_id: orderId, email: destino, sent_at: new Date().toISOString() },
    { onConflict: "order_id" },
  );

  return json({ ok: true, id: cuerpo?.id });
});
