/**
 * Génère un 2ᵉ wallet Pi Testnet (+ option pour l'activer).
 *
 * 1) Génération seule :
 *    node scripts/pi-testnet-new-wallet.mjs
 *
 * 2) Génération + activation (envoie Test-Pi depuis VOTRE wallet) :
 *    $env:PI_FUNDER_SECRET="S...votre_wallet_actuel..."
 *    $env:PI_FUND_AMOUNT="5"
 *    node scripts/pi-testnet-new-wallet.mjs
 *
 * Ne committez jamais les clés S… Ne les collez pas dans le chat.
 */
import fs from "fs";
import path from "path";
import * as StellarSDK from "@stellar/stellar-sdk";

const server = new StellarSDK.Horizon.Server("https://api.testnet.minepi.com");
const NETWORK_PASSPHRASE = "Pi Testnet";
const outDir = path.join(process.cwd(), "scripts", ".local");
const outFile = path.join(outDir, "pi-testnet-second-wallet.json");

async function baseFee() {
  const response = await server.ledgers().order("desc").limit(1).call();
  return response.records[0].base_fee_in_stroops;
}

async function main() {
  const kp = StellarSDK.Keypair.random();
  const publicKey = kp.publicKey();
  const secret = kp.secret();

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        network: "Pi Testnet",
        role: "second-wallet (Issuer recommandé)",
        publicKey,
        secret,
        createdAt: new Date().toISOString()
      },
      null,
      2
    ),
    { mode: 0o600 }
  );

  console.log("=== Nouveau wallet Testnet ===");
  console.log("Clé publique (G…) :", publicKey);
  console.log("Clé secrète (S…)  :", secret);
  console.log("Sauvegardé localement :", outFile);
  console.log("(ce fichier est ignoré par Git)\n");

  const funderSecret = process.env.PI_FUNDER_SECRET || "";
  if (!funderSecret) {
    console.log("Activation manuelle :");
    console.log("1) Pi Wallet → Testnet Pi → Pay");
    console.log("2) Destinataire = la clé G… ci-dessus");
    console.log("3) Envoyez environ 5 à 10 Test-Pi");
    console.log("4) Ensuite on créera le jeton DCS");
    return;
  }

  const amount = String(process.env.PI_FUND_AMOUNT || "5");
  const funder = StellarSDK.Keypair.fromSecret(funderSecret);
  const fee = await baseFee();
  const funderAccount = await server.loadAccount(funder.publicKey());

  console.log("Activation depuis :", funder.publicKey());
  console.log("Montant :", amount, "Test-Pi");

  const tx = new StellarSDK.TransactionBuilder(funderAccount, {
    fee,
    networkPassphrase: NETWORK_PASSPHRASE,
    timebounds: await server.fetchTimebounds(90)
  })
    .addOperation(
      StellarSDK.Operation.createAccount({
        destination: publicKey,
        startingBalance: amount
      })
    )
    .build();
  tx.sign(funder);
  await server.submitTransaction(tx);

  console.log("OK — wallet activé sur Testnet.");
  console.log("Vérif : https://api.testnet.minepi.com/accounts/" + publicKey);
}

main().catch((err) => {
  console.error("Échec:", err.response?.data || err.message || err);
  process.exit(1);
});
