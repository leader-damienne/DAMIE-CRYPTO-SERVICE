/**
 * Création d'un jeton Pi Testnet (Issuer + Distributor).
 *
 * Prérequis :
 * 1) 2 wallets Testnet dans Pi Wallet (Issuer + Distributor), activés
 * 2) Clés secrètes S… (jamais committer)
 * 3) npm i @stellar/stellar-sdk
 *
 * Usage (PowerShell) :
 *   $env:PI_ISSUER_SECRET="S..."
 *   $env:PI_DISTRIBUTOR_SECRET="S..."
 *   $env:PI_TOKEN_CODE="DCS"
 *   $env:PI_MINT_AMOUNT="100000"
 *   $env:PI_HOME_DOMAIN="damie-crypto-service.netlify.app"
 *   node scripts/pi-testnet-create-token.mjs
 *
 * Puis mettez à jour .well-known/pi.toml avec la clé publique Issuer (G…).
 */
import StellarSDK from "@stellar/stellar-sdk";

const server = new StellarSDK.Horizon.Server("https://api.testnet.minepi.com");
const NETWORK_PASSPHRASE = "Pi Testnet";

const issuerSecret = process.env.PI_ISSUER_SECRET || "";
const distributorSecret = process.env.PI_DISTRIBUTOR_SECRET || "";
const tokenCode = (process.env.PI_TOKEN_CODE || "DCS").trim();
const mintAmount = String(process.env.PI_MINT_AMOUNT || "100000");
const homeDomain = (process.env.PI_HOME_DOMAIN || "damie-crypto-service.netlify.app")
  .trim()
  .replace(/^https?:\/\//i, "")
  .replace(/\/+$/, "");
const skipHomeDomain = process.env.PI_SKIP_HOME_DOMAIN === "1";

if (!issuerSecret || !distributorSecret) {
  console.error("Manque PI_ISSUER_SECRET ou PI_DISTRIBUTOR_SECRET.");
  process.exit(1);
}
if (!/^[A-Za-z0-9]{1,12}$/.test(tokenCode)) {
  console.error("PI_TOKEN_CODE invalide (1–12 caractères alphanumériques).");
  process.exit(1);
}

const issuerKeypair = StellarSDK.Keypair.fromSecret(issuerSecret);
const distributorKeypair = StellarSDK.Keypair.fromSecret(distributorSecret);
const customToken = new StellarSDK.Asset(tokenCode, issuerKeypair.publicKey());

async function baseFee() {
  const response = await server.ledgers().order("desc").limit(1).call();
  return response.records[0].base_fee_in_stroops;
}

async function main() {
  const fee = await baseFee();
  console.log("Issuer (G):", issuerKeypair.publicKey());
  console.log("Distributor (G):", distributorKeypair.publicKey());
  console.log("Token:", tokenCode);
  console.log("Home domain:", homeDomain);

  // 1) Trustline depuis Distributor
  const distributorAccount = await server.loadAccount(distributorKeypair.publicKey());
  const trustTx = new StellarSDK.TransactionBuilder(distributorAccount, {
    fee,
    networkPassphrase: NETWORK_PASSPHRASE,
    timebounds: await server.fetchTimebounds(90)
  })
    .addOperation(StellarSDK.Operation.changeTrust({ asset: customToken }))
    .build();
  trustTx.sign(distributorKeypair);
  await server.submitTransaction(trustTx);
  console.log("OK — trustline créée");

  // 2) Mint : paiement Issuer → Distributor
  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
  const mintTx = new StellarSDK.TransactionBuilder(issuerAccount, {
    fee,
    networkPassphrase: NETWORK_PASSPHRASE,
    timebounds: await server.fetchTimebounds(90)
  })
    .addOperation(
      StellarSDK.Operation.payment({
        destination: distributorKeypair.publicKey(),
        asset: customToken,
        amount: mintAmount
      })
    )
    .build();
  mintTx.sign(issuerKeypair);
  await server.submitTransaction(mintTx);
  console.log("OK — mint", mintAmount, tokenCode);

  // 3) Home domain (pour listing Pi Wallet + pi.toml)
  if (!skipHomeDomain) {
    const issuerAgain = await server.loadAccount(issuerKeypair.publicKey());
    const optTx = new StellarSDK.TransactionBuilder(issuerAgain, {
      fee,
      networkPassphrase: NETWORK_PASSPHRASE,
      timebounds: await server.fetchTimebounds(90)
    })
      .addOperation(StellarSDK.Operation.setOptions({ homeDomain }))
      .build();
    optTx.sign(issuerKeypair);
    await server.submitTransaction(optTx);
    console.log("OK — home_domain =", homeDomain);
  }

  const updated = await server.loadAccount(distributorKeypair.publicKey());
  updated.balances.forEach((b) => {
    if (b.asset_type === "native") console.log("Test-Pi:", b.balance);
    else console.log(b.asset_code + ":", b.balance);
  });

  console.log("\nÀ faire ensuite :");
  console.log("1) Dans .well-known/pi.toml, mettre issuer=\"" + issuerKeypair.publicKey() + "\"");
  console.log("2) Commit / push, vérifier https://" + homeDomain + "/.well-known/pi.toml");
  console.log(
    "3) Asset API: https://api.testnet.minepi.com/assets?asset_code=" +
      tokenCode +
      "&asset_issuer=" +
      issuerKeypair.publicKey()
  );
}

main().catch((err) => {
  console.error("Échec:", err.response?.data || err.message || err);
  process.exit(1);
});
