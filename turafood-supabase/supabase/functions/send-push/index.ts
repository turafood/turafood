// ============================================================
// TURAFOOD — Envío de notificaciones push (Web Push)
//
// La llama la base de datos (trigger notifications_push vía pg_net) cada
// vez que se inserta una fila en `notifications`. Busca los dispositivos
// del usuario y les manda el aviso.
//
// Secrets del proyecto (supabase secrets set ...):
//   PUSH_SECRET          mismo valor que internal_config.push_secret
//   VAPID_PUBLIC_KEY     clave pública VAPID (base64url, 65 bytes)
//   VAPID_PRIVATE_KEY    clave privada VAPID (base64url, 32 bytes)
//   VAPID_SUBJECT        mailto:... o https://... de contacto
// Los siguientes los inyecta Supabase solo:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// verify_jwt = false (config.toml): quien llama es la base, no un usuario.
// Se protege con el header x-push-secret.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const secret = Deno.env.get("PUSH_SECRET");
  const given = req.headers.get("x-push-secret") ?? "";
  if (!secret) return json({ error: "Falta el secret PUSH_SECRET." }, 500);
  if (!iguales(given, secret)) return json({ error: "No autorizado." }, 401);

  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:turafood.com@gmail.com";
  if (!pub || !priv) return json({ error: "Faltan las claves VAPID." }, 500);
  webpush.setVapidDetails(subject, pub, priv);

  let n: {
    user_id?: string; title?: string; body?: string; link?: string; kind?: string;
    notification_id?: string;
  };
  try {
    n = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  if (!n.user_id || !n.title) return json({ error: "Faltan user_id o title" }, 400);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: subs, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", n.user_id);
  if (error) return json({ error: error.message }, 500);
  if (!subs || subs.length === 0) return json({ sent: 0, motivo: "sin dispositivos" });

  const payload = JSON.stringify({
    title: n.title,
    body: n.body ?? "",
    url: n.link ?? "/",
    // Misma etiqueta = el aviso nuevo reemplaza al anterior del mismo pedido
    tag: n.notification_id ?? n.kind ?? "turafood",
    kind: n.kind ?? null,
  });

  let sent = 0;
  const caducadas: string[] = [];

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 * 60, urgency: "high" },
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      // 404/410: el dispositivo se desinstaló o revocó el permiso
      if (code === 404 || code === 410) caducadas.push(s.id);
    }
  }));

  if (caducadas.length > 0) {
    await db.from("push_subscriptions").delete().in("id", caducadas);
  }

  return json({ sent, caducadas: caducadas.length });
});
