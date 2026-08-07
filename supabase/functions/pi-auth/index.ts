// Supabase Edge Function — login DCS via Pi Authentication SDK
// Deploy: supabase functions deploy pi-auth --no-verify-jwt
// Secrets: PI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL (auto)
// Optional: PI_AUTH_SECRET (sinon SERVICE_ROLE_KEY)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const PI_API_BASE = Deno.env.get("PI_API_BASE") || "https://api.minepi.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

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

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

async function derivePassword(piUid: string): Promise<string> {
  const secret = Deno.env.get("PI_AUTH_SECRET") || SERVICE_KEY || "dcs-pi-auth";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("dcs-pi:" + piUid)
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "Pi!" + hex.slice(0, 48);
}

function piEmail(piUid: string) {
  const safe = String(piUid || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 48);
  return `pi.${safe || "user"}@auth.dcs.app`;
}

async function verifyPiUser(accessToken: string) {
  const res = await fetch(`${PI_API_BASE}/v2/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      (data as { error?: string; message?: string }).error ||
        (data as { message?: string }).message ||
        `Pi /me ${res.status}`
    );
  }
  const uid = String(
    (data as { uid?: string }).uid ||
      (data as { user?: { uid?: string } }).user?.uid ||
      ""
  );
  const username = String(
    (data as { username?: string }).username ||
      (data as { user?: { username?: string } }).user?.username ||
      ""
  );
  if (!uid) throw new Error("Réponse Pi /me sans uid.");
  return { uid, username: username || ("pi_" + uid.slice(0, 8)) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ ok: false, error: "Supabase mal configuré." }, 500);
    }

    const payload = await req.json();
    const accessToken = String(payload.accessToken || payload.access_token || "");
    if (!accessToken) {
      return json({ ok: false, error: "accessToken Pi manquant." }, 400);
    }

    const piUser = await verifyPiUser(accessToken);
    const email = piEmail(piUser.uid);
    const password = await derivePassword(piUser.uid);
    const db = admin();

    /* 1) Compte déjà lié à ce Pi uid */
    let existing = await db
      .from("profiles")
      .select("id, email, username, pi_uid")
      .eq("pi_uid", piUser.uid)
      .maybeSingle();

    /* 2) Sinon : réutiliser un profil existant (même username Pi) pour ne PAS perdre les soldes */
    if (!existing.data?.id && piUser.username) {
      const byName = await db
        .from("profiles")
        .select("id, email, username, pi_uid")
        .ilike("username", piUser.username)
        .maybeSingle();
      if (byName.data?.id && !byName.data.pi_uid) {
        existing = byName;
      } else if (!byName.data?.id) {
        const byDisplay = await db
          .from("profiles")
          .select("id, email, username, pi_uid")
          .ilike("display_name", piUser.username)
          .maybeSingle();
        if (byDisplay.data?.id && !byDisplay.data.pi_uid) {
          existing = byDisplay;
        }
      }
    }

    let authUserId = existing.data?.id as string | undefined;
    let loginEmail = (existing.data?.email as string) || email;

    if (authUserId) {
      const upd = await db.auth.admin.updateUserById(authUserId, {
        password,
        /* Garder l’e-mail existant s’il n’est pas synthétique — sinon e-mail Pi */
        email: loginEmail && !/@auth\.dcs\.app$/i.test(loginEmail) ? loginEmail : email,
        user_metadata: {
          pi_uid: piUser.uid,
          pi_username: piUser.username,
          username: existing.data?.username || piUser.username,
          auth_provider: "pi",
        },
      });
      if (upd.error) throw new Error(upd.error.message);
      if (!loginEmail || /@auth\.dcs\.app$/i.test(loginEmail)) {
        loginEmail = email;
      }
    } else {
      const created = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          pi_uid: piUser.uid,
          pi_username: piUser.username,
          username: piUser.username,
          auth_provider: "pi",
        },
      });
      if (created.error) {
        if (/already|registered|exists/i.test(created.error.message)) {
          const authClientTry = createClient(SUPABASE_URL, ANON_KEY || SERVICE_KEY);
          const retry = await authClientTry.auth.signInWithPassword({
            email,
            password,
          });
          if (retry.error || !retry.data.user) {
            throw new Error(created.error.message);
          }
          authUserId = retry.data.user.id;
          loginEmail = email;
        } else {
          throw new Error(created.error.message);
        }
      } else {
        authUserId = created.data.user?.id;
        loginEmail = email;
      }
    }

    if (!authUserId) throw new Error("Impossible de créer la session DCS.");

    /* Attendre le trigger profil si besoin */
    for (let i = 0; i < 6; i++) {
      const { data: prof } = await db
        .from("profiles")
        .select("id")
        .eq("id", authUserId)
        .maybeSingle();
      if (prof?.id) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    await db
      .from("profiles")
      .update({
        pi_uid: piUser.uid,
        pi_username: piUser.username,
        display_name: piUser.username,
      })
      .eq("id", authUserId);

    const authClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_KEY);
    const signed = await authClient.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    if (signed.error || !signed.data.session) {
      throw new Error(signed.error?.message || "Session Supabase impossible.");
    }

    const session = signed.data.session;
    return json({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: {
        id: authUserId,
        pi_uid: piUser.uid,
        username: piUser.username,
      },
    });
  } catch (e) {
    return json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      400
    );
  }
});
