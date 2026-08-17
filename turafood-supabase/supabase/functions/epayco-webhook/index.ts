// ============================================================
// TURAFOOD — Confirmación de pago de ePayco
//
// Esta función es la ÚNICA autoridad sobre el estado de un pago.
// Ni el navegador ni la pantalla de "éxito" deciden nada.
//
// Garantías que implementa:
//   1. valida la firma con el mecanismo oficial de ePayco;
//   2. valida que el monto cobrado sea el del pedido en la BD;
//   3. es idempotente: la misma notificación dos veces no duplica nada;
//   4. registra todo en payment_events para poder auditar;
//   5. traduce los estados de ePayco a los internos de TuraFood.
//
// Secrets requeridos:
//   EPAYCO_P_CUST_ID_CLIENTE, EPAYCO_P_KEY
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

/** Estados de ePayco → estados internos. No usamos los suyos fuera de aquí. */
function normalizeStatus(xResponse: string, xCodResponse?: string): string {
  const r = (xResponse ?? "").trim().toLowerCase();

  // x_cod_response: 1 aceptada, 2 rechazada, 3 pendiente, 4 fallida, 6 reversada
  switch (xCodResponse) {
    case "1": return "paid";
    case "2": return "failed";
    case "3": return "processing";
    case "4": return "failed";
    case "6": return "refunded";
    case "11": return "cancelled";
  }

  if (r === "aceptada") return "paid";
  if (r === "rechazada" || r === "fallida") return "failed";
  if (r === "pendiente") return "processing";
  if (r === "cancelada") return "cancelled";
  if (r === "reversada") return "refunded";
  return "processing";
}

async function sha256(message: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Quita cualquier dato sensible antes de guardar la respuesta */
function sanitize(body: Record<string, unknown>) {
  const blocked = [
    "x_card_number", "cc_number", "card", "cvv", "cvc",
    "x_customer_doc", "x_customer_email", "x_customer_phone",
  ];
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!blocked.some((b) => k.toLowerCase().includes(b))) clean[k] = v;
  }
  return clean;
}

/** ePayco manda "110335.00"; comparamos con tolerancia de 1 peso */
const sameAmount = (a: number, b: number) => Math.abs(a - b) < 1;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // ePayco puede mandar JSON o form-urlencoded
    let body: Record<string, string> = {};
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const form = await req.formData();
      form.forEach((value, key) => { body[key] = String(value); });
    }

    const custId = Deno.env.get("EPAYCO_P_CUST_ID_CLIENTE");
    const pKey = Deno.env.get("EPAYCO_P_KEY");
    if (!custId || !pKey) {
      console.error("Faltan los secrets de ePayco");
      return new Response("Config error", { status: 500 });
    }

    const {
      x_ref_payco,
      x_transaction_id,
      x_amount,
      x_currency_code,
      x_signature,
      x_response,
      x_cod_response,
      x_response_reason_text,
      x_extra1: refId,      // id del pedido o del usuario
      x_extra2: kind,       // ORDER | PLUS | BUSINESS_PRO | RIDER_PRO
      x_extra3: paymentId,  // id de nuestro registro en payments
    } = body as Record<string, string>;

    // ---- 1. Firma ----
    const expected = await sha256(
      `${custId}^${pKey}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`,
    );

    if (expected !== x_signature) {
      console.error("Firma inválida, ref:", x_ref_payco);
      await supabase.from("payment_events").insert({
        payment_id: paymentId ?? null,
        event_type: "invalid_signature",
        provider: "epayco",
        payload: sanitize(body),
      });
      return new Response("Invalid signature", { status: 401 });
    }

    const status = normalizeStatus(x_response, x_cod_response);
    const paidAmount = Number(x_amount);

    // ---- 2. Suscripciones ----
    if (kind && kind !== "ORDER") {
      if (status !== "paid") {
        return Response.json({ status: "not_approved" });
      }
      const expiresAt = new Date(Date.now() + 30 * 864e5).toISOString();

      if (kind === "PLUS") {
        await supabase.from("profiles")
          .update({ tura_plus: true, tura_plus_expires_at: expiresAt })
          .eq("id", refId);
      } else if (kind === "BUSINESS_PRO") {
        await supabase.from("business_profiles")
          .update({ pro_plan: true, pro_plan_expires_at: expiresAt })
          .eq("id", refId);
      } else if (kind === "RIDER_PRO") {
        await supabase.from("courier_profiles")
          .update({ pro_plan: true, pro_plan_expires_at: expiresAt })
          .eq("id", refId);
      }

      await supabase.from("payment_events").insert({
        event_type: "subscription_activated",
        provider: "epayco",
        payload: sanitize(body),
      });
      return Response.json({ status: "activated" });
    }

    // ---- 3. Pedido: localizar el intento de pago ----
    let payment = null;

    if (paymentId) {
      const { data } = await supabase
        .from("payments").select("*").eq("id", paymentId).maybeSingle();
      payment = data;
    }
    if (!payment && x_ref_payco) {
      const { data } = await supabase
        .from("payments").select("*").eq("provider_reference", x_ref_payco).maybeSingle();
      payment = data;
    }
    if (!payment && refId) {
      const { data } = await supabase
        .from("payments").select("*")
        .eq("order_id", refId).in("status", ["pending", "processing"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      payment = data;
    }

    if (!payment) {
      console.error("No se encontró el pago. order:", refId, "ref:", x_ref_payco);
      await supabase.from("payment_events").insert({
        order_id: refId ?? null,
        event_type: "payment_not_found",
        provider: "epayco",
        payload: sanitize(body),
      });
      return new Response("Payment not found", { status: 404 });
    }

    await supabase.from("payment_events").insert({
      payment_id: payment.id,
      order_id: payment.order_id,
      event_type: "webhook_received",
      provider: "epayco",
      payload: sanitize(body),
    });

    // ---- 4. Idempotencia ----
    if (payment.status === "paid") {
      await supabase.from("payment_events").insert({
        payment_id: payment.id,
        order_id: payment.order_id,
        event_type: "duplicate_ignored",
        provider: "epayco",
        payload: { ref: x_ref_payco },
      });
      return Response.json({ status: "already_processed" });
    }

    // ---- 5. El monto debe coincidir con el del pedido ----
    const { data: order } = await supabase
      .from("orders").select("id, total, payment_status").eq("id", payment.order_id).maybeSingle();

    if (!order) {
      return new Response("Order not found", { status: 404 });
    }

    if (status === "paid" && !sameAmount(paidAmount, Number(order.total))) {
      console.error(`Monto alterado en ${order.id}: cobrado ${paidAmount}, esperado ${order.total}`);

      await supabase.from("payments").update({
        status: "failed",
        provider_reference: x_ref_payco,
        provider_transaction_id: x_transaction_id,
        failure_reason: `Monto inconsistente: cobrado ${paidAmount}, esperado ${order.total}`,
        provider_response: sanitize(body),
      }).eq("id", payment.id);

      await supabase.from("payment_events").insert({
        payment_id: payment.id,
        order_id: order.id,
        event_type: "amount_mismatch",
        provider: "epayco",
        payload: { charged: paidAmount, expected: order.total },
      });

      await supabase.from("orders").update({
        payment_status: "failed",
        status: "cancelled",
        cancel_reason: "Monto de pago inconsistente",
      }).eq("id", order.id);

      return new Response("Amount mismatch", { status: 409 });
    }

    // ---- 6. Registrar el resultado ----
    await supabase.from("payments").update({
      status,
      provider_reference: x_ref_payco,
      provider_transaction_id: x_transaction_id,
      failure_reason: status === "failed" ? (x_response_reason_text ?? x_response) : null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      provider_response: sanitize(body),
    }).eq("id", payment.id);

    // El pedido solo refleja el pago. Que el negocio lo acepte es
    // otra cosa: por eso el status sigue en 'pending' tras pagar.
    const orderPatch: Record<string, unknown> = {
      payment_status: status === "paid" ? "paid"
        : status === "refunded" ? "refunded"
        : status === "failed" ? "failed"
        : "pending",
      epayco_ref: x_ref_payco,
    };

    if (status === "failed" || status === "cancelled") {
      orderPatch.cancel_reason = x_response_reason_text ?? `Pago ${x_response}`;
    }

    await supabase.from("orders").update(orderPatch).eq("id", order.id);

    await supabase.from("payment_events").insert({
      payment_id: payment.id,
      order_id: order.id,
      event_type: status === "paid" ? "approved" : status,
      provider: "epayco",
      payload: { ref: x_ref_payco, amount: paidAmount },
    });

    return Response.json({ status });
  } catch (err) {
    console.error("Error en webhook ePayco:", err);
    await supabase.from("payment_events").insert({
      event_type: "webhook_error",
      provider: "epayco",
      payload: { error: err instanceof Error ? err.message : "unknown" },
    });
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
