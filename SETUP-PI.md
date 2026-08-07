# Brancher DAMIE CRYPTO SERVICE au Pi Network SDK

Le front est prêt (`js/pi.js` + bouton wallet). Il reste **votre** configuration Developer Portal + déploiement de l’Edge Function.

## 1. SQL

Supabase → **SQL Editor** → exécuter :

`supabase/pi-payments.sql`

## 2. Créer l’app Pi

1. Ouvrez le **Pi Browser**
2. Allez sur `pi://develop.pinet.com` (Developer Portal)
3. Créez une app **DAMIE CRYPTO SERVICE**
4. Ajoutez l’URL de développement / production :
   - `https://damie-crypto-service.netlify.app`
   - (optionnel) votre domaine custom
5. Activez le **Sandbox** pour les tests
6. Copiez la **API Key** (Server API Key) — **ne jamais la mettre dans le front**

## 3. Déployer l’Edge Function `pi-payment`

### Option A — CLI Supabase

```bash
# une fois
npm i -g supabase
supabase login
supabase link --project-ref ednllwrfxkoouqparqjx

# secret API Pi
supabase secrets set PI_API_KEY="VOTRE_CLE_PI_SANDBOX"

# déployer
supabase functions deploy pi-payment
```

### Option B — Dashboard

1. Supabase → **Edge Functions** → Create function `pi-payment`
2. Collez le code de `supabase/functions/pi-payment/index.ts`
3. **Secrets** : `PI_API_KEY` = clé Server du Developer Portal

Vérifiez que `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont bien injectés (automatique sur Supabase Hosted).

## 4. Config front

Dans `js/config.js` :

```js
piSandbox: true   // tests Sandbox
// piSandbox: false  // Mainnet après validation Pi
```

## 5. Tester

1. Ouvrez le site **dans le Pi Browser** (pas Chrome seul pour le paiement)
2. Connectez-vous à DCS (Supabase)
3. Wallet → montant → **Déposer via Pi Browser**
4. Approuvez le paiement Pi
5. Le solde PI DCS doit augmenter + historique « Dépôt Pi »

## Flux technique

```
Pi Browser (SDK)
  → createPayment
  → Edge Function approve  (API Pi /approve)
  → user signe
  → Edge Function complete (API Pi /complete)
  → dcs_credit_pi_from_payment (crédite wallets)
```

## Dépannage

| Problème | Cause probable |
|----------|----------------|
| « Pi Browser requis » | Ouvert hors Pi Browser / SDK non chargé |
| Approve 401 / 500 | `PI_API_KEY` absente ou mauvaise (sandbox vs prod) |
| Complete OK mais pas de solde | `pi-payments.sql` non exécuté |
| CORS / 401 DCS | Session Supabase expirée — reconnectez-vous |

## Sécurité

- La clé Pi reste **uniquement** en secret Edge Function
- Le crédit wallet passe par `service_role` + RPC idempotente
- Ne passez jamais `user_id` seul pour créditer sans vérifier le paiement côté API Pi (déjà fait dans `complete`)
