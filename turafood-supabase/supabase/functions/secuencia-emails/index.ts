// ============================================================
// TURAFOOD — Secuencia de correos (bienvenida + 3 días)
//
// Quien verifica su correo recibe la bienvenida AL INSTANTE (paso 0) y un
// correo por día durante 3 días (pasos 1 a 3). La base prepara las filas
// (tabla email_secuencia, trigger al confirmar el correo) y esta función las envía:
//
//   POST {modo:'inmediato', user_id}  → manda ya el paso 0 de esa persona
//   POST {modo:'procesar'}            → manda lo que ya toca (lo llama pg_cron cada 10 min)
//   GET  ?e=correo&t=firma            → "dejar de recibir estos consejos" (enlace del pie)
//   POST ?e=correo&t=firma            → lo mismo, para el botón de baja de Gmail (one-click)
//
// Los POST internos se protegen con el header x-push-secret (como send-push).
// La baja se firma con HMAC para que nadie pueda dar de baja a otra persona.
// Los códigos de verificación y los recibos NO pasan por aquí ni se pueden "dar de baja":
// son transaccionales.
//
// Secrets: PUSH_SECRET, RESEND_API_KEY, SYNC_SECRET (firma de la baja; si falta se usa
// PUSH_SECRET), RESEND_FROM_SECUENCIA (opcional). verify_jwt = false (config.toml).
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { construirPaso, type Rol } from "./contenido.ts";
import { T, envoltura, encabezado, parrafo, boton, aire } from "../_shared/correo-base.ts";

const FROM = Deno.env.get("RESEND_FROM_SECUENCIA") ?? "TuraFood <hola@turafood.com>";
const REPLY_TO = "turafood.com@gmail.com";
const MAX_INTENTOS = 5;

const respuesta = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

const html = (cuerpo: string, status = 200) =>
  new Response(cuerpo, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function firma(email: string): Promise<string> {
  const clave = Deno.env.get("SYNC_SECRET") ?? Deno.env.get("PUSH_SECRET") ?? "";
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const f = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(email.toLowerCase()));
  return [...new Uint8Array(f)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function urlBaja(email: string): Promise<string> {
  const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/secuencia-emails`;
  return `${base}?e=${encodeURIComponent(email)}&t=${await firma(email)}`;
}

const db = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

interface Fila { id: number; user_id: string; email: string; rol: string; paso: number; intentos: number }

async function enviarFila(cliente: ReturnType<typeof db>, f: Fila): Promise<"enviado" | "baja" | "error"> {
  const { data: baja } = await cliente.from("email_bajas").select("email").eq("email", f.email.toLowerCase()).maybeSingle();
  if (baja) {
    await cliente.from("email_secuencia").update({ enviado_en: new Date().toISOString(), ultimo_error: "baja" }).eq("id", f.id);
    return "baja";
  }

  const { data: perfil } = await cliente.from("profiles").select("full_name").eq("id", f.user_id).maybeSingle();
  const rol: Rol = f.rol === "business" ? "business" : "customer";
  const bajaUrl = await urlBaja(f.email);
  const correo = construirPaso(f.paso, rol, { nombre: perfil?.full_name, email: f.email, bajaUrl });
  if (!correo) {
    await cliente.from("email_secuencia").update({ enviado_en: new Date().toISOString(), ultimo_error: "sin contenido" }).eq("id", f.id);
    return "error";
  }

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `seq-${f.user_id}-${f.paso}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: [f.email],
      reply_to: REPLY_TO,
      subject: correo.asunto,
      html: correo.html,
      text: correo.texto,
      headers: {
        "List-Unsubscribe": `<${bajaUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [{ name: "tipo", value: `secuencia-${rol}-${f.paso}` }],
    }),
  });

  if (r.ok) {
    await cliente.from("email_secuencia").update({ enviado_en: new Date().toISOString(), ultimo_error: null }).eq("id", f.id);
    return "enviado";
  }
  const cuerpo = await r.json().catch(() => ({}));
  await cliente.from("email_secuencia").update({ intentos: f.intentos + 1, ultimo_error: String(cuerpo?.message ?? r.status).slice(0, 300) }).eq("id", f.id);
  console.error("Resend rechazó", f.paso, r.status, cuerpo?.message);
  return "error";
}

function paginaBaja(ok: boolean): string {
  return envoltura({
    titulo: "Baja de consejos",
    preheader: ok ? "Listo, no recibirás más estos consejos." : "No pudimos procesar tu solicitud.",
    filas:
      encabezado(ok ? "✅" : "⚠️", ok ? "Listo, ya no te escribimos" : "Enlace no válido",
        ok ? "No recibirás más estos consejos de TuraFood. Seguirás recibiendo lo importante de tus pedidos, como los códigos y los recibos."
          : "El enlace está incompleto o venció. Si quieres dejar de recibir correos, escríbenos por WhatsApp.") +
      boton("Volver a TuraFood", T.sitio) + aire,
  });
}

async function darDeBaja(email: string, token: string): Promise<boolean> {
  if (!email || !token) return false;
  if (!iguales(token, await firma(email))) return false;
  await db().from("email_bajas").upsert({ email: email.toLowerCase() }, { onConflict: "email" });
  return true;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Baja pública (enlace del pie y botón "dar de baja" de Gmail)
  if (url.searchParams.has("e")) {
    const ok = await darDeBaja(url.searchParams.get("e") ?? "", url.searchParams.get("t") ?? "");
    return req.method === "GET" ? html(paginaBaja(ok), ok ? 200 : 400) : respuesta({ ok }, ok ? 200 : 400);
  }

  if (req.method !== "POST") return respuesta({ error: "Método no permitido" }, 405);

  const secreto = Deno.env.get("PUSH_SECRET");
  if (!secreto || !iguales(req.headers.get("x-push-secret") ?? "", secreto)) return respuesta({ error: "No autorizado" }, 401);
  if (!Deno.env.get("RESEND_API_KEY")) return respuesta({ error: "Falta RESEND_API_KEY" }, 500);

  let cuerpo: { modo?: string; user_id?: string } = {};
  try { cuerpo = await req.json(); } catch { /* vacío */ }
  const cliente = db();

  let consulta = cliente.from("email_secuencia").select("id, user_id, email, rol, paso, intentos").is("enviado_en", null).lt("intentos", MAX_INTENTOS);
  if (cuerpo.modo === "inmediato") {
    if (!cuerpo.user_id) return respuesta({ error: "user_id requerido" }, 400);
    consulta = consulta.eq("user_id", cuerpo.user_id).eq("paso", 0);
  } else {
    consulta = consulta.lte("enviar_en", new Date().toISOString()).order("enviar_en").limit(40);
  }

  const { data: filas, error } = await consulta;
  if (error) return respuesta({ error: error.message }, 500);

  const resumen = { enviados: 0, bajas: 0, errores: 0 };
  for (const f of (filas ?? []) as Fila[]) {
    const r = await enviarFila(cliente, f);
    if (r === "enviado") resumen.enviados++; else if (r === "baja") resumen.bajas++; else resumen.errores++;
  }
  return respuesta(resumen);
});
