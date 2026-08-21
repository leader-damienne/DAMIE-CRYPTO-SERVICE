// Supabase Edge Function — handshake paiements Pi Network
// Deploy: supabase functions deploy pi-payment --no-verify-jwt
// Secrets: PI_API_KEY, SUPABASE_SERVICE_ROLE_KEY (auto), SUPABASE_URL (auto)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const PI_API_BASE = Deno.env.get("PI_API_BASE") || "https://api.minepi.com";
const PI_API_KEY = Deno.env.get("PI_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function piFetch(path: string, method = "GET", body?: Record<string, unknown>) {
  if (!PI_API_KEY) {
    throw new Error(
      "PI_API_KEY manquant. Dans Supabase → Edge Functions → Secrets, ajoutez la Server API Key de l’app App Studio."
    );
  }
  const res = await fetch(`${PI_API_BASE}/v2${path}`, {
    method,
    headers: {
      Authorization: `Key ${PI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const apiMsg =
      (data as { error?: string; message?: string }).error ||
      (data as { message?: string }).message ||
      `Pi API ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Clé Pi refusée (" +
          apiMsg +
          "). Mettez à jour PI_API_KEY avec la Server API Key de l’app App Studio (appdcs.com), puis redéployez pi-payment."
      );
    }
    if (/payment_not_found/i.test(String(apiMsg))) {
      throw new Error(
        "payment_not_found : la PI_API_KEY Supabase n’est pas celle de l’app App Studio (appdcs.com). Remplacez le secret PI_API_KEY puis redéployez pi-payment."
      );
    }
    throw new Error(apiMsg);
  }
  return data;
}

async function getUser(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || SERVICE_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  try {
    const user = await getUser(req);
    if (!user) return json({ ok: false, error: "Non authentifié DCS." }, 401);

    const payload = await req.json();
    const action = String(payload.action || "");
    const paymentId = String(payload.paymentId || "");
    const txid = String(payload.txid || "");
    const amountHint = Number(payload.amount || 0);

    if (!paymentId) return json({ ok: false, error: "paymentId requis." }, 400);

    const db = admin();

    if (action === "approve") {
      await piFetch(`/payments/${paymentId}/approve`, "POST");

      await db.from("pi_payments").upsert(
        {
          payment_id: paymentId,
          user_id: user.id,
          amount: amountHint > 0 ? amountHint : 0.00000001,
          memo: String(payload.memo || "DCS deposit"),
          status: "approved",
          meta: { stage: "approved" },
        },
        { onConflict: "payment_id" }
      );

      return json({ ok: true, action: "approve", paymentId });
    }

    if (action === "complete") {
      if (!txid) return json({ ok: false, error: "txid requis." }, 400);

      /* Le paiement doit déjà être lié à CE compte DCS (étape approve) */
      const { data: existingPay } = await db
        .from("pi_payments")
        .select("user_id, status, amount")
        .eq("payment_id", paymentId)
        .maybeSingle();
      if (existingPay && existingPay.user_id && existingPay.user_id !== user.id) {
        return json({ ok: false, error: "Paiement lié à un autre compte." }, 403);
      }
      if (existingPay && existingPay.status === "completed") {
        return json({ ok: true, action: "complete", already: true, amount: existingPay.amount });
      }

      const payment = await piFetch(`/payments/${paymentId}`, "GET");
      const amount = Number((payment as { amount?: number }).amount);
      if (!(amount > 0)) {
        return json({ ok: false, error: "Montant Pi invalide (API)." }, 400);
      }

      const piUid =
        ((payment as { user_uid?: string }).user_uid as string) ||
        ((payment as { from_uid?: string }).from_uid as string) ||
        "";
      const { data: profile } = await db
        .from("profiles")
        .select("pi_uid")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.pi_uid && piUid && String(profile.pi_uid) !== String(piUid)) {
        return json({ ok: false, error: "Paiement Pi ≠ compte DCS." }, 403);
      }

      await piFetch(`/payments/${paymentId}/complete`, "POST", { txid });

      await db.from("pi_payments").upsert(
        {
          payment_id: paymentId,
          user_id: user.id,
          amount,
          status: "completed",
          txid,
          pi_username: piUid,
          completed_at: new Date().toISOString(),
          meta: { payment },
        },
        { onConflict: "payment_id" }
      );

      const { data: credit, error: creditErr } = await db.rpc(
        "dcs_credit_pi_from_payment",
        {
          p_user: user.id,
          p_amount: amount,
          p_payment_id: paymentId,
          p_txid: txid,
        }
      );

      if (creditErr) {
        return json({
          ok: false,
          error: creditErr.message,
          paymentCompleted: true,
        }, 500);
      }

      return json({ ok: true, action: "complete", amount, credit });
    }

    if (action === "cancel" || action === "incomplete") {
      await db
        .from("pi_payments")
        .update({ status: action === "cancel" ? "cancelled" : "incomplete" })
        .eq("payment_id", paymentId)
        .eq("user_id", user.id);
      return json({ ok: true, action });
    }

    return json({ ok: false, error: "action inconnue (approve|complete|cancel)" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, 500);
  }
});
