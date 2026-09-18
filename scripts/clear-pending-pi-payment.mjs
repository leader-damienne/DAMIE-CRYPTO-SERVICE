/**
 * Annule un paiement U2A Pi bloqué (« Pending Payment Found »).
 *
 * PowerShell :
 *   $env:PI_API_KEY="SERVER_API_KEY_MAINNET"
 *   node scripts/clear-pending-pi-payment.mjs
 *   node scripts/clear-pending-pi-payment.mjs --id PAYMENT_ID
 */
const API_KEY = process.env.PI_API_KEY || process.env.PI_A2U_API_KEY || "";
const BASE = (process.env.PI_API_BASE || "https://api.minepi.com").replace(/\/$/, "");

function argId() {
  const i = process.argv.indexOf("--id");
  return i >= 0 ? String(process.argv[i + 1] || "").trim() : "";
}

async function pi(path, method = "GET", body) {
  const res = await fetch(`${BASE}/v2${path}`, {
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
    const err = new Error(msg);
    err.data = data;
    throw err;
  }
  return data;
}

async function main() {
  if (!API_KEY) {
    console.error("Manque PI_API_KEY (Server API Key Mainnet de l’app Develop).");
    process.exit(1);
  }

  const forced = argId();
  if (forced) {
    console.log("Cancel", forced);
    console.log(await pi(`/payments/${forced}/cancel`, "POST"));
    return;
  }

  /* Liste incomplets serveur (A2U) + aide U2A */
  try {
    const incomplete = await pi("/payments/incomplete_server_payments");
    const list = incomplete.incomplete_server_payments || [];
    console.log("Incomplets serveur (A2U):", list.length);
    for (const p of list) {
      console.log("-", p.identifier, p.direction, p.amount);
      try {
        await pi(`/payments/${p.identifier}/cancel`, "POST");
        console.log("  → cancelled");
      } catch (e) {
        console.log("  →", e.message);
      }
    }
  } catch (e) {
    console.log("incomplete_server_payments:", e.message);
  }

  console.log(`
Pour un dépôt User→App bloqué (« Pending Payment Found ») :
1) Develop → Mainnet → Server API Key dans PI_API_KEY
2) Ouvre wallet.html?force_pi_auth=1 (Allow) pour déclencher cancel auto
3) Ou : node scripts/clear-pending-pi-payment.mjs --id <payment_id>
`);
}

main().catch((e) => {
  console.error(e.message || e);
  if (e.data) console.error(JSON.stringify(e.data, null, 2));
  process.exit(1);
});
