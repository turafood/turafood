// ============================================================
// TURAFOOD — Sincronización con MailerLite
//
// Drena `marketing_events`: por cada fila pendiente mete al contacto
// en el grupo que le toca. MailerLite dispara desde ahí la secuencia
// de correos que el dueño arma en su panel.
//
// Por qué una cola y no una llamada directa desde la base:
//   - si MailerLite está caído, la activación del plan no se cae con él;
//   - si el token venció, queda el error escrito y se reintenta;
//   - la misma fila procesada dos veces no duplica nada, porque
//     MailerLite trata POST /subscribers como "crear o actualizar".
//
// Los grupos se resuelven POR NOMBRE y se crean si no existen. Así el
// dueño no tiene que copiar identificadores cada vez que inventa un
// plan: crea la automatización sobre el grupo y ya.
//
// Secrets requeridos (se ponen con `supabase secrets set`, nunca en
// el repositorio):
//   MAILERLITE_TOKEN     token de API de MailerLite
//   SYNC_SECRET          clave propia para poder llamar esta función
//
// Se invoca de dos formas:
//   - por cron cada pocos minutos (pg_cron o el scheduler de Supabase);
//   - a mano desde el panel de administración, botón "Reintentar".
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const MAILERLITE_API = "https://connect.mailerlite.com/api";

/** Cuántas filas se procesan por invocación. Suficiente para no pasarse
 *  del límite de peticiones de MailerLite (120 por minuto). */
const BATCH = 40;

/** Después de esto damos la fila por perdida y dejamos de reintentar */
const MAX_ATTEMPTS = 5;

interface MarketingEvent {
  id: number;
  user_id: string;
  kind: string;
  group_name: string;
  payload: Record<string, unknown>;
  attempts: number;
}

interface Contact {
  email: string;
  full_name: string | null;
  phone: string | null;
  provider_id: string | null;
  unsubscribed: boolean;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Llamada a MailerLite con el error legible, no un "500" pelado */
async function ml(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${MAILERLITE_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = { message: await res.text().catch(() => "") };
  }

  return { ok: res.ok, status: res.status, data };
}

/**
 * Busca el grupo por nombre; si no existe lo crea.
 *
 * Se cachea en memoria durante la invocación porque un lote de 40
 * eventos suele repartirse entre tres o cuatro grupos: sin el caché
 * serían 40 búsquedas para nada.
 */
async function resolveGroup(
  token: string,
  name: string,
  cache: Map<string, string>,
): Promise<string> {
  const hit = cache.get(name);
  if (hit) return hit;

  const found = await ml(token, `/groups?filter[name]=${encodeURIComponent(name)}&limit=50`);
  if (found.ok) {
    // El filtro de MailerLite es "contiene", no "igual": hay que
    // comparar a mano o "…· Activo" traería también "…· Activo Pro".
    const exact = (found.data?.data ?? []).find(
      (g: any) => String(g.name).trim() === name.trim(),
    );
    if (exact) {
      cache.set(name, String(exact.id));
      return String(exact.id);
    }
  }

  const created = await ml(token, "/groups", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

  if (!created.ok) {
    throw new Error(
      `No se pudo crear el grupo "${name}" en MailerLite (${created.status}): ` +
        (created.data?.message ?? JSON.stringify(created.data)),
    );
  }

  const id = String(created.data?.data?.id);
  cache.set(name, id);
  return id;
}

/**
 * Crea o actualiza el suscriptor y lo mete en el grupo.
 *
 * POST /subscribers en MailerLite es "upsert": si el correo ya existe
 * lo actualiza en vez de fallar. Por eso reprocesar una fila es seguro.
 */
async function upsertSubscriber(
  token: string,
  contact: Contact,
  groupId: string,
  fields: Record<string, unknown>,
) {
  const res = await ml(token, "/subscribers", {
    method: "POST",
    body: JSON.stringify({
      email: contact.email,
      fields: {
        name: contact.full_name ?? undefined,
        phone: contact.phone ?? undefined,
        ...fields,
      },
      groups: [groupId],
      // Que MailerLite reactive a quien se había dado de baja NO es lo
      // que queremos: si se fue, se fue.
      resubscribe: false,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `MailerLite rechazó a ${contact.email} (${res.status}): ` +
        (res.data?.message ?? JSON.stringify(res.data?.errors ?? res.data)),
    );
  }

  return String(res.data?.data?.id ?? "");
}

Deno.serve(async (req: Request) => {
  // ---- Autenticación propia -------------------------------------
  // Esta función tiene la llave del service_role: no puede quedar
  // abierta a internet.
  const secret = Deno.env.get("SYNC_SECRET");
  const given = req.headers.get("x-sync-secret");

  if (!secret) {
    return json({ error: "Falta el secret SYNC_SECRET en el proyecto." }, 500);
  }
  if (given !== secret) {
    return json({ error: "No autorizado." }, 401);
  }

  const token = Deno.env.get("MAILERLITE_TOKEN");
  if (!token) {
    return json({ error: "Falta el secret MAILERLITE_TOKEN en el proyecto." }, 500);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ---- Lote pendiente -------------------------------------------
  const { data: events, error } = await supabase
    .from("marketing_events")
    .select("id, user_id, kind, group_name, payload, attempts")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    return json({ error: `No se pudo leer la cola: ${error.message}` }, 500);
  }
  if (!events?.length) {
    return json({ processed: 0, sent: 0, failed: 0, message: "Nada pendiente." });
  }

  const groupCache = new Map<string, string>();
  let sent = 0;
  let failed = 0;

  for (const event of events as MarketingEvent[]) {
    try {
      const { data: contact } = await supabase
        .from("marketing_contacts")
        .select("email, full_name, phone, provider_id, unsubscribed")
        .eq("user_id", event.user_id)
        .maybeSingle();

      if (!contact?.email) {
        await supabase
          .from("marketing_events")
          .update({
            status: "skipped",
            last_error: "El contacto no tiene correo registrado.",
            attempts: event.attempts + 1,
          })
          .eq("id", event.id);
        continue;
      }

      if ((contact as Contact).unsubscribed) {
        await supabase
          .from("marketing_events")
          .update({
            status: "skipped",
            last_error: "El contacto se dio de baja de los correos.",
            attempts: event.attempts + 1,
          })
          .eq("id", event.id);
        continue;
      }

      const groupId = await resolveGroup(token, event.group_name, groupCache);
      const providerId = await upsertSubscriber(
        token,
        contact as Contact,
        groupId,
        event.payload ?? {},
      );

      await supabase
        .from("marketing_events")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          attempts: event.attempts + 1,
          last_error: null,
        })
        .eq("id", event.id);

      if (providerId) {
        await supabase
          .from("marketing_contacts")
          .update({ provider_id: providerId, synced_at: new Date().toISOString() })
          .eq("user_id", event.user_id);
      }

      sent += 1;
    } catch (err) {
      const attempts = event.attempts + 1;
      const message = err instanceof Error ? err.message : String(err);

      // Se queda 'pending' mientras queden intentos: el próximo pase la
      // vuelve a tomar. Al llegar al tope se marca 'failed' y aparece en
      // el panel de administración para mirarla a mano.
      await supabase
        .from("marketing_events")
        .update({
          attempts,
          last_error: message,
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        })
        .eq("id", event.id);

      failed += 1;
    }
  }

  return json({ processed: events.length, sent, failed });
});
