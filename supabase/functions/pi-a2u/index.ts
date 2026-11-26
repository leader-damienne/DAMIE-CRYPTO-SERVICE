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
const HAS_DEDICATED_A2U_KEY = !!String(Deno.env.get("PI_A2U_API_KEY") || "").trim();
/* Toujours préférer PI_A2U_API_KEY (Testnet). Fallback PI_API_KEY = risque Mainnet. */
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
const SIGNIN_TESTNET_URL = "https://appdcs.com/signin-testnet.html";
const USER_NOT_FOUND_FR =
  "user_not_found : ce pi_uid n’existe pas sur l’app Testnet (souvent un uid Mainnet). " +
  "Le destinataire doit ouvrir " +
  SIGNIN_TESTNET_URL +
  " dans le Pi Browser → Continuer avec Pi → Allow, puis réessayez avec l’uid Testnet (badge vert dans la liste).";

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

type ProfileRow = {
  id: string;
  pi_uid?: string | null;
  pi_uid_testnet?: string | null;
  pi_username?: string | null;
  username?: string | null;
  pi_last_auth_network?: string | null;
};

async function resolveRecipient(
  db: ReturnType<typeof adminDb>,
  uid: string,
  usernameHint: string
) {
  const explicitUid = String(uid || "").trim();
  let profileId: string | null = null;
  let username = String(usernameHint || "").trim();
  let row: ProfileRow | null = null;
  const selectCols =
    "id, pi_uid, pi_uid_testnet, pi_username, username, pi_last_auth_network";

  if (explicitUid) {
    const byTestnet = await db
      .from("profiles")
      .select(selectCols)
      .eq("pi_uid_testnet", explicitUid)
      .maybeSingle();
    if (byTestnet.data) row = byTestnet.data as ProfileRow;
    if (!row) {
      const byMain = await db
        .from("profiles")
        .select(selectCols)
        .eq("pi_uid", explicitUid)
        .maybeSingle();
      if (byMain.data) row = byMain.data as ProfileRow;
    }
  }

  if (!row && username) {
    const needle = username.replace(/^@+/, "");
    const { data: byPi } = await db
      .from("profiles")
      .select(selectCols)
      .ilike("pi_username", needle)
      .limit(1)
      .maybeSingle();
    row =
      (byPi as ProfileRow | null) ||
      (
        (
          await db
            .from("profiles")
            .select(selectCols)
            .ilike("username", needle)
            .limit(1)
            .maybeSingle()
        ).data as ProfileRow | null
      );
  }

  if (row) {
    profileId = row.id;
    username = row.pi_username || row.username || username;
  }

  const testnetUid = String(row?.pi_uid_testnet || "").trim();
  const mainnetUid = String(row?.pi_uid || "").trim();

  if (testnetUid && (!explicitUid || explicitUid === testnetUid)) {
    return { piUid: testnetUid, profileId, username, network: "testnet" };
  }

  if (explicitUid && mainnetUid && explicitUid === mainnetUid && !testnetUid) {
    throw new Error(
      "Destinataire Mainnet uniquement (uid Mainnet collé). @" +
        (username || "?") +
        " doit ouvrir " +
        SIGNIN_TESTNET_URL +
        " → Allow, puis rechargez la liste (badge Testnet)."
    );
  }

  if (explicitUid && testnetUid && explicitUid === mainnetUid) {
    throw new Error(
      "Vous avez collé l’uid Mainnet. Utilisez l’uid Testnet de @" +
        (username || "?") +
        " (chip vert) : " +
        testnetUid.slice(0, 8) +
        "…"
    );
  }

  if (!testnetUid && mainnetUid && !explicitUid) {
    throw new Error(
      "Profil @" +
        (username || "?") +
        " n’a que l’uid Mainnet. Auth Testnet requis : " +
        SIGNIN_TESTNET_URL
    );
  }

  if (explicitUid && !row) {
    /* uid inconnu en base : tentative brute (script / uid collé) */
    return { piUid: explicitUid, profileId, username, network: "unknown" };
  }

  if (!testnetUid && !explicitUid) {
    throw new Error(
      "Destinataire introuvable : username déjà Allow en Testnet (" +
        SIGNIN_TESTNET_URL +
        ") ou pi_uid_testnet."
    );
  }

  return {
    piUid: testnetUid || explicitUid,
    profileId,
    username,
    network: testnetUid ? "testnet" : "unknown",
  };
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
      let schemaReady = true;
      let testnetProfiles = 0;
      let schemaError: string | null = null;
      try {
        const probe = await db
          .from("profiles")
          .select("id, pi_uid_testnet")
          .not("pi_uid_testnet", "is", null)
          .neq("pi_uid_testnet", "")
          .limit(50);
        if (probe.error) {
          schemaReady = false;
          schemaError = probe.error.message;
        } else {
          testnetProfiles = (probe.data || []).length;
        }
      } catch (eProbe) {
        schemaReady = false;
        schemaError = eProbe instanceof Error ? eProbe.message : String(eProbe);
      }
      return json({
        ok: true,
        action: "status",
        hasApiKey: !!PI_API_KEY,
        hasWalletSeed: keypairOk,
        walletPublicKey: pub || null,
        adminUsersRestricted: ADMIN_USERS.length > 0,
        networkHint: "testnet",
        usingDedicatedA2uKey: HAS_DEDICATED_A2U_KEY,
        schemaReady,
        testnetProfiles,
        schemaError,
        warning: !schemaReady
          ? "Schéma incomplet (pi_uid_testnet). Exécutez supabase/pi-uid-testnet.sql puis redéployez pi-auth + pi-a2u. Les Allow Testnet ne peuvent pas apparaître dans la liste."
          : !HAS_DEDICATED_A2U_KEY
            ? "PI_A2U_API_KEY absent : fallback sur PI_API_KEY (souvent Mainnet) → user_not_found. Ajoutez PI_A2U_API_KEY = Server API Key Testnet."
            : testnetProfiles === 0
              ? "Aucun pi_uid_testnet en base. Les testeurs doivent Allow sur signin-testnet.html APRÈS deploy de pi-auth à jour."
              : null,
        signinTestnetUrl: SIGNIN_TESTNET_URL,
      });
    }

    if (action === "progress") {
      const { data, error } = await db
        .from("pi_payments")
        .select("payment_id, pi_username, txid, amount, meta, completed_at, status")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);
      const a2u = (data || []).filter((row) => {
        const meta = (row as { meta?: { kind?: string; direction?: string } }).meta;
        return meta && meta.kind === "a2u" && meta.direction === "app_to_user";
      });
      const seen: Record<string, true> = {};
      const unique: Array<{
        uid: string;
        username: string | null;
        paymentId: string;
        txid: string | null;
        completedAt: string | null;
      }> = [];
      for (let i = 0; i < a2u.length; i++) {
        const row = a2u[i] as {
          payment_id: string;
          pi_username?: string | null;
          txid?: string | null;
          completed_at?: string | null;
          meta?: { recipient_uid?: string };
        };
        const uid = String(row.meta?.recipient_uid || "").trim();
        if (!uid || seen[uid]) continue;
        seen[uid] = true;
        unique.push({
          uid,
          username: row.pi_username || null,
          paymentId: row.payment_id,
          txid: row.txid || null,
          completedAt: row.completed_at || null,
        });
      }
      const target = 5;
      return json({
        ok: true,
        action: "progress",
        uniqueCount: unique.length,
        target,
        remaining: Math.max(0, target - unique.length),
        ready: unique.length >= target,
        recipients: unique,
      });
    }

    if (action === "list_recipients") {
      const filter = String(payload.filter || "all").toLowerCase();
      let q = db
        .from("profiles")
        .select(
          "id, username, pi_username, pi_uid, pi_uid_testnet, pi_last_auth_network, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(80);
      const { data, error } = await q;
      if (error) {
        if (/pi_uid_testnet|column/i.test(error.message)) {
          const legacy = await db
            .from("profiles")
            .select("id, username, pi_username, pi_uid, created_at")
            .not("pi_uid", "is", null)
            .neq("pi_uid", "")
            .order("created_at", { ascending: false })
            .limit(40);
          if (legacy.error) throw new Error(legacy.error.message);
          return json({
            ok: true,
            action: "list_recipients",
            schemaReady: false,
            warning:
              "Exécutez supabase/pi-uid-testnet.sql puis redéployez pi-auth/pi-a2u. En attendant, tous les uids listés sont traités comme Mainnet (risque user_not_found).",
            signinTestnetUrl: SIGNIN_TESTNET_URL,
            recipients: (legacy.data || []).map((r) => ({
              ...r,
              pi_uid_testnet: null,
              network: "mainnet_only",
              testnetReady: false,
              a2uUid: null,
            })),
          });
        }
        throw new Error(error.message);
      }
      let recipients = (data || [])
        .map((r) => {
          const testnetUid = String(r.pi_uid_testnet || "").trim();
          const mainnetUid = String(r.pi_uid || "").trim();
          if (!testnetUid && !mainnetUid) return null;
          const testnetReady = !!testnetUid;
          return {
            id: r.id,
            username: r.username,
            pi_username: r.pi_username,
            pi_uid: mainnetUid || null,
            pi_uid_testnet: testnetUid || null,
            pi_last_auth_network: r.pi_last_auth_network || null,
            created_at: r.created_at,
            network: testnetReady ? "testnet" : "mainnet_only",
            testnetReady,
            a2uUid: testnetUid || null,
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      if (filter === "testnet") {
        recipients = recipients.filter((r) => r.testnetReady);
      } else if (filter === "mainnet") {
        recipients = recipients.filter((r) => !r.testnetReady);
      }

      recipients.sort((a, b) => Number(b.testnetReady) - Number(a.testnetReady));

      return json({
        ok: true,
        action: "list_recipients",
        schemaReady: true,
        filter,
        signinTestnetUrl: SIGNIN_TESTNET_URL,
        testnetCount: recipients.filter((r) => r.testnetReady).length,
        mainnetOnlyCount: recipients.filter((r) => !r.testnetReady).length,
        recipients,
      });
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
        error:
          "action inconnue (status|progress|list_recipients|incomplete|cancel|resume|send)",
      },
      400
    );
  } catch (err) {
    let message = err instanceof Error ? err.message : String(err);
    const detail =
      err && typeof err === "object" && "payload" in err
        ? (err as { payload?: Record<string, unknown> }).payload
        : undefined;
    if (/user_not_found/i.test(message)) {
      message = USER_NOT_FOUND_FR;
    }
    if (/pi_uid_testnet|column/i.test(message)) {
      message =
        "Schéma incomplet : exécutez supabase/pi-uid-testnet.sql dans le SQL Editor, redéployez pi-auth + pi-a2u.";
    }
    return json(
      {
        ok: false,
        error: message,
        detail: detail || null,
        signinTestnetUrl: SIGNIN_TESTNET_URL,
      },
      500
    );
  }
});
