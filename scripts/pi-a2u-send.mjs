/**
 * A2U Testnet — envoi App → User (hors Edge Function).
 *
 * Prérequis :
 *   npm i @stellar/stellar-sdk
 *   Secrets en variables d’environnement (jamais committer) :
 *     PI_A2U_API_KEY   = Server API Key app Testnet
 *     PI_APP_WALLET_SEED = seed S… du wallet app Testnet
 *
 * Usage (PowerShell) :
 *   $env:PI_A2U_API_KEY="..."
 *   $env:PI_APP_WALLET_SEED="S..."
 *   node scripts/pi-a2u-send.mjs --uid <PI_UID> --amount 0.0000001
 *   node scripts/pi-a2u-send.mjs --incomplete
 *   node scripts/pi-a2u-send.mjs --resume <PAYMENT_ID>
 *   node scripts/pi-a2u-send.mjs --cancel <PAYMENT_ID>
 */
import * as StellarSdk from "@stellar/stellar-sdk";

const PI_API_BASE = (process.env.PI_API_BASE || "https://api.minepi.com").replace(/\/$/, "");
const API_KEY = process.env.PI_A2U_API_KEY || process.env.PI_API_KEY || "";
const SEED = process.env.PI_APP_WALLET_SEED || "";

function args() {
  const out = { uid: "", amount: 0.0000001, memo: "DCS A2U Testnet", incomplete: false, resume: "", cancel: "" };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--uid") out.uid = a[++i] || "";
    else if (a[i] === "--amount") out.amount = Number(a[++i]);
    else if (a[i] === "--memo") out.memo = a[++i] || out.memo;
    else if (a[i] === "--incomplete") out.incomplete = true;
    else if (a[i] === "--resume") out.resume = a[++i] || "";
    else if (a[i] === "--cancel") out.cancel = a[++i] || "";
  }
  return out;
}

async function piFetch(path, method = "GET", body) {
  const res = await fetch(`${PI_API_BASE}/v2${path}`, {
    method,
    headers: {
      Authorization: `Key ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error_message || data.error || data.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function horizon(network) {
  const main = /Pi Network/i.test(network) && !/Testnet/i.test(network);
  return new StellarSdk.Horizon.Server(main ? "https://api.mainnet.minepi.com" : "https://api.testnet.minepi.com");
}

async function submitOnChain(payment) {
  const keypair = StellarSdk.Keypair.fromSecret(SEED);
  if (payment.from_address !== keypair.publicKey()) {
    throw new Error(
      `Seed mismatch: app wallet ${payment.from_address} ≠ seed ${keypair.publicKey()}`
    );
  }
  if (payment.transaction?.txid) {
    return payment.transaction.txid;
  }
  const server = horizon(payment.network);
  const account = await server.loadAccount(keypair.publicKey());
  const fee = await server.fetchBaseFee();
  const timebounds = await server.fetchTimebounds(180);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: String(fee),
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
  const submitted = await server.submitTransaction(tx);
  if (!submitted.id) throw new Error("txid manquant");
  return submitted.id;
}

async function send(uid, amount, memo) {
  const created = await piFetch("/payments", "POST", {
    payment: {
      amount,
      memo: String(memo).slice(0, 32),
      metadata: { kind: "a2u", app: "DCS", purpose: "testnet_unique_wallets" },
      uid,
    },
  });
  console.log("created", created.identifier, "→", created.to_address, created.network);
  const txid = await submitOnChain(created);
  console.log("txid", txid);
  const done = await piFetch(`/payments/${created.identifier}/complete`, "POST", { txid });
  console.log("completed", done.status || "ok");
  return done;
}

async function main() {
  if (!API_KEY) {
    console.error("Manque PI_A2U_API_KEY (Server API Key Testnet).");
    process.exit(1);
  }
  const opt = args();

  if (opt.incomplete) {
    const data = await piFetch("/payments/incomplete_server_payments");
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (opt.cancel) {
    console.log(await piFetch(`/payments/${opt.cancel}/cancel`, "POST"));
    return;
  }
  if (opt.resume) {
    const payment = await piFetch(`/payments/${opt.resume}`);
    const txid = await submitOnChain(payment);
    console.log("txid", txid);
    console.log(await piFetch(`/payments/${opt.resume}/complete`, "POST", { txid }));
    return;
  }
  if (!SEED) {
    console.error("Manque PI_APP_WALLET_SEED.");
    process.exit(1);
  }
  if (!opt.uid) {
    console.error("Usage: node scripts/pi-a2u-send.mjs --uid <PI_UID> [--amount 0.0000001]");
    process.exit(1);
  }
  await send(opt.uid, opt.amount, opt.memo);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
