# Brancher DAMIE CRYPTO SERVICE au Pi Network SDK

Le front est en **mode Ecosystem** (`piEcosystemMode: true`) : login Pi only + transactions Pi only.

## 1. SQL

Supabase → **SQL Editor** → exécuter dans l’ordre :

1. `supabase/pi-payments.sql`
2. `supabase/pi-auth.sql` ← **obligatoire pour le login Pi**

## 2. Créer l’app Pi

1. Ouvrez le **Pi Browser**
2. Allez sur `pi://develop.pinet.com` (Developer Portal)
3. Créez une app **DAMIE CRYPTO SERVICE**
4. URL : ton URL Cloudflare Pages (ex. `https://damie-crypto-service.pages.dev`) ou domaine custom  
   (voir `SETUP-CLOUDFLARE.md` — anciennement Netlify)
5. Sandbox pour les tests
6. Copiez la **API Key** (Server) — **jamais dans le front**

## 3. Déployer les Edge Functions

```bash
npm i -g supabase
supabase login
supabase link --project-ref ednllwrfxkoouqparqjx
supabase secrets set PI_API_KEY="VOTRE_CLE_PI_SANDBOX"

# JWT verify OFF (legacy) pour les deux fonctions dans le dashboard
supabase functions deploy pi-payment --no-verify-jwt
supabase functions deploy pi-auth --no-verify-jwt
```

## 4. Config front (`js/config.js`)

```js
piSandbox: true,          // tests Sandbox
piEcosystemMode: true     // listing Pi Apps : auth Pi + Pi only
```

## 5. Tester (Pi Browser)

1. Ton URL Cloudflare / domaine (`…/signin.html`) — voir `SETUP-CLOUDFLARE.md`
2. **Continuer avec Pi**
3. Wallet → **Déposer via Pi Browser**
4. Solde PI + historique « Dépôt Pi »

## Listing catalogue Pi Apps

Technique (fait côté code) :

- Auth **Pi SDK** uniquement
- Transactions **Pi only** (swap/fiat/MM masqués)
- Peu de collecte e-mail / téléphone

Reste **de votre côté** :

1. KYC développeur Pi validé
2. Soumettre l’app au listing Ecosystem dans le Developer Portal
3. Attendre la revue Pi (pas automatique)

## Flux

```
Pi Browser
  → Pi.authenticate  → Edge Function pi-auth → session Supabase
  → Pi.createPayment → pi-payment approve/complete → crédit PI
```

## Dépannage

| Problème | Cause probable |
|----------|----------------|
| Connexion Pi échoue | `pi-auth` non déployée / `pi-auth.sql` non exécuté |
| « Pi Browser requis » | Ouvert hors Pi Browser |
| Approve 401 | `PI_API_KEY` absente ou mauvaise |
| Pas de solde après paiement | `pi-payments.sql` manquant |

## Sécurité

- Clé Pi = secret Edge Function uniquement
- Comptes Pi liés via `profiles.pi_uid`
