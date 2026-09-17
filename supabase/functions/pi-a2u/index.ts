// Supabase Edge Function — paiements A2U (App → User) Pi Network
// Deploy: supabase functions deploy pi-a2u --no-verify-jwt
// Secrets:
//   PI_API_KEY ou PI_A2U_API_KEY  (clé Server de l’app Testnet pour le seuil 5 wallets)
//   PI_APP_WALLET_SEED            (seed S… du wallet app Testnet — jamais dans le front)
//   DCS_ADMIN_SECRET              (mot de passe admin A2U)
// Optionnel: DCS_ADMIN_USERNAMES (liste séparée par virgules de pi_username autorisés)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as StellarSdk from "npm:@stellar/stellar-sdk@13.3.0";

const PI_API_BASE = Deno.env.get("PI_API_BASE") || "https://api.minepi.com";
const PI_API_KEY =
  Deno.env.get("PI_A2U_API_KEY") ||
  Deno.env.get("PI_API_KEY") ||
  Deno.env.get("PI_NETWORK_API_KEY") ||
  "";
const WALLET_SEED = Deno.env.get("PI_APP_WALLET_SEED") || "";
const ADMIN_SECRET = Deno.env.get("DCS_ADMIN_SECRET") || "";
const ADMIN_USERS = String(Deno.env.get("DCS_ADMIN_USERNAMES") || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const HORIZON_TESTNET = "https://api.testnet.minepi.com";
const HORIZON_MAINNET = "https://api.mainnet.minepi.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-dcs-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function adminDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

async function getUser(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

function assertAdmin(req: Request, profile: { pi_username?: string | null; username?: string | null }) {
  if (!ADMIN_SECRET) {
    throw new Error(
      "DCS_ADMIN_SECRET manquant. Ajoutez-le dans Supabase → Edge Functions → Secrets."
    );
  }
  const provided = (req.headers.get("x-dcs-admin-secret") || "").trim();
  if (!provided || provided !== ADMIN_SECRET) {
    throw new Error("Secret admin invalide.");
  }
  if (ADMIN_USERS.length) {
    const name = String(profile.pi_username || profile.username || "")
      .trim()
      .toLowerCase();
    if (!name || !ADMIN_USERS.includes(name)) {
      throw new Error("Compte non autorisé pour A2U (DCS_ADMIN_USERNAMES).");
    }
  }
}

async function piFetch(path: string, method = "GET", body?: Record<string, unknown>) {
  if (!PI_API_KEY) {
    throw new Error(
      "PI_A2U_API_KEY / PI_API_KEY manquant. Utilisez la Server API Key de l’app Testnet."
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
      (data as { error_message?: string; error?: string; message?: string }).error_message ||
      (data as { error?: string }).error ||
      (data as { message?: string }).message ||
      `Pi API ${res.status}`;
    const err = new Error(String(apiMsg)) as Error & { payload?: Record<string, unknown> };
    err.payload = data;
    throw err;
  }
  return data;
}

type PaymentDTO = {
  identifier: string;
  user_uid?: string;
  amount: number;
  memo?: string;
  from_address: string;
  to_address: string;
  network: string;
  transaction?: { txid?: string } | null;
  status?: Record<string, boolean>;
};

function isMainnetNetwork(network: string) {
  return /Pi Network/i.test(network) && !/Testnet/i.test(network);
}

function horizonFor(network: string) {
  const url = isMainnetNetwork(network) ? HORIZON_MAINNET : HORIZON_TESTNET;
  return new StellarSdk.Horizon.Server(url);
}

function requireWalletSeed() {
  if (!WALLET_SEED) {
    throw new Error(
      "PI_APP_WALLET_SEED manquant (seed S… du wallet app Testnet, Develop → App Wallet)."
    );
  }
  if (!WALLET_SEED.startsWith("S") || WALLET_SEED.length !== 56) {
    throw new Error("PI_APP_WALLET_SEED invalide (doit commencer par S, 56 caractères).");
  }
  if (!StellarSdk.StrKey.isValidEd25519SecretSeed(WALLET_SEED)) {
    throw new Error("PI_APP_WALLET_SEED : seed Ed25519 invalide.");
  }
  return StellarSdk.Keypair.fromSecret(WALLET_SEED);
}

async function submitOnChain(payment: PaymentDTO) {
  const keypair = requireWalletSeed();
  if (payment.from_address !== keypair.publicKey()) {
    throw new Error(
      "private_seed_mismatch : PI_APP_WALLET_SEED ≠ wallet de l’app Pi (from_address " +
        payment.from_address +
        ", seed → " +
        keypair.publicKey() +
        ")."
    );
  }
  if (payment.transaction?.txid) {
    throw new Error("Paiement déjà lié à un txid : " + payment.transaction.txid);
  }

  const horizon = horizonFor(payment.network);
  const account = await horizon.loadAccount(keypair.publicKey());
  const baseFee = await horizon.fetchBaseFee();
  const timebounds = await horizon.fetchTimebounds(180);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: String(baseFee),
    networkPassphrase: payment.network,
    timebounds,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: payment.to_address,
        asset: StellarSdk.Asset.native(),
        amount: String(payment.amount),
      })
    )
    .addMemo(StellarSdk.Memo.text(payment.identifier))
    .build();

  tx.sign(keypair);
  const submitted = await horizon.submitTransaction(tx);
  const txid = (submitted as { id?: string }).id;
  if (!txid) throw new Error("Soumission Horizon OK mais txid manquant.");
  return txid;
}

async function resolveRecipient(
  db: ReturnType<typeof adminDb>,
  uid: string,
  usernameHint: string
) {
  let piUid = String(uid || "").trim();
  let profileId: string | null = null;
  let username = String(usernameHint || "").trim();

  if (piUid) {
    const { data } = await db
      .from("profiles")
      .select("id, pi_uid, pi_username, username")
      .eq("pi_uid", piUid)
      .maybeSingle();
    if (data) {
      profileId = data.id;
      username = data.pi_username || data.username || username;
      piUid = data.pi_uid || piUid;
    }
  }

  if (!piUid && username) {
    const needle = username.replace(/^@+/, "");
    const { data: byPi } = await db
      .from("profiles")
      .select("id, pi_uid, pi_username, username")
      .ilike("pi_username", needle)
      .limit(1)
      .maybeSingle();
    const row =
      byPi ||
      (
        await db
          .from("profiles")
          .select("id, pi_uid, pi_username, username")
          .ilike("username", needle)
          .limit(1)
          .maybeSingle()
      ).data;
    if (row?.pi_uid) {
      profileId = row.id;
      piUid = row.pi_uid;
      username = row.pi_username || row.username || needle;
    }
  }

  if (!piUid) {
    throw new Error(
      "Destinataire introuvable : indiquez le Pi uid (profiles.pi_uid) ou un username déjà connecté via Pi sur DCS."
    );
  }

  return { piUid, profileId, username };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  try {
    const user = await getUser(req);
    if (!user) return json({ ok: false, error: "Non authentifié DCS." }, 401);

    const db = adminDb();
    const { data: profile } = await db
      .from("profiles")
      .select("id, pi_uid, pi_username, username")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) return json({ ok: false, error: "Profil DCS introuvable." }, 403);

    assertAdmin(req, profile);

    const payload = await req.json();
    const action = String(payload.action || "send");

    if (action === "status") {
      const keypairOk = !!WALLET_SEED;
      let pub = "";
      try {
        if (keypairOk) pub = StellarSdk.Keypair.fromSecret(WALLET_SEED).publicKey();
      } catch {
        pub = "";
      }
      return json({
        ok: true,
        action: "status",
        hasApiKey: !!PI_API_KEY,
        hasWalletSeed: keypairOk,
        walletPublicKey: pub || null,
        adminUsersRestricted: ADMIN_USERS.length > 0,
      });
    }

    if (action === "list_recipients") {
      const { data, error } = await db
        .from("profiles")
        .select("id, username, pi_username, pi_uid, created_at")
        .not("pi_uid", "is", null)
        .neq("pi_uid", "")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw new Error(error.message);
      return json({ ok: true, action: "list_recipients", recipients: data || [] });
    }

    if (action === "incomplete") {
      const data = await piFetch("/payments/incomplete_server_payments", "GET");
      return json({
        ok: true,
        action: "incomplete",
        payments:
          (data as { incomplete_server_payments?: PaymentDTO[] }).incomplete_server_payments ||
          [],
      });
    }

    if (action === "cancel") {
      const paymentId = String(payload.paymentId || "");
      if (!paymentId) return json({ ok: false, error: "paymentId requis." }, 400);
      const cancelled = await piFetch(`/payments/${paymentId}/cancel`, "POST");
      await db
        .from("pi_payments")
        .update({ status: "cancelled" })
        .eq("payment_id", paymentId);
      return json({ ok: true, action: "cancel", payment: cancelled });
    }

    if (action === "resume") {
      const paymentId = String(payload.paymentId || "");
      if (!paymentId) return json({ ok: false, error: "paymentId requis." }, 400);
      const payment = (await piFetch(`/payments/${paymentId}`, "GET")) as PaymentDTO;
      let txid = payment.transaction?.txid || "";
      if (!txid) {
        txid = await submitOnChain(payment);
      }
      const completed = await piFetch(`/payments/${paymentId}/complete`, "POST", { txid });
      await db.from("pi_payments").upsert(
        {
          payment_id: paymentId,
          user_id: user.id,
          amount: Number(payment.amount) || 0.00000001,
          memo: payment.memo || "DCS A2U",
          status: "completed",
          txid,
          pi_username: payment.user_uid || "",
          completed_at: new Date().toISOString(),
          meta: { kind: "a2u", direction: "app_to_user", payment: completed },
        },
        { onConflict: "payment_id" }
      );
      return json({
        ok: true,
        action: "resume",
        paymentId,
        txid,
        payment: completed,
      });
    }

    if (action === "send") {
      const amount = Number(payload.amount);
      if (!(amount > 0)) {
        return json({ ok: false, error: "Montant invalide (ex. 0.0000001)." }, 400);
      }
      const memo = String(payload.memo || "DCS A2U Testnet").slice(0, 32);
      const { piUid, profileId, username } = await resolveRecipient(
        db,
        String(payload.uid || ""),
        String(payload.username || "")
      );

      const created = (await piFetch("/payments", "POST", {
        payment: {
          amount,
          memo,
          metadata: {
            kind: "a2u",
            app: "DCS",
            purpose: "testnet_unique_wallets",
            to_username: username || null,
          },
          uid: piUid,
        },
      })) as PaymentDTO;

      const paymentId = created.identifier;
      if (!paymentId) throw new Error("Pi n’a pas renvoyé d’identifier.");

      await db.from("pi_payments").upsert(
        {
          payment_id: paymentId,
          user_id: profileId || user.id,
          amount,
          memo,
          status: "a2u_created",
          pi_username: username || piUid,
          meta: {
            kind: "a2u",
            direction: "app_to_user",
            recipient_uid: piUid,
            stage: "created",
          },
        },
        { onConflict: "payment_id" }
      );

      const txid = await submitOnChain(created);
      const completed = await piFetch(`/payments/${paymentId}/complete`, "POST", { txid });

      await db.from("pi_payments").upsert(
        {
          payment_id: paymentId,
          user_id: profileId || user.id,
          amount,
          memo,
          status: "completed",
          txid,
          pi_username: username || piUid,
          completed_at: new Date().toISOString(),
          meta: {
            kind: "a2u",
            direction: "app_to_user",
            recipient_uid: piUid,
            payment: completed,
          },
        },
        { onConflict: "payment_id" }
      );

      return json({
        ok: true,
        action: "send",
        paymentId,
        txid,
        amount,
        recipientUid: piUid,
        recipientUsername: username || null,
        toAddress: created.to_address,
        network: created.network,
        payment: completed,
      });
    }

    return json(
      {
        ok: false,
        error: "action inconnue (status|list_recipients|incomplete|cancel|resume|send)",
      },
      400
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const payload =
      err && typeof err === "object" && "payload" in err
        ? (err as { payload?: Record<string, unknown> }).payload
        : undefined;
    return json({ ok: false, error: message, detail: payload || null }, 500);
  }
});
