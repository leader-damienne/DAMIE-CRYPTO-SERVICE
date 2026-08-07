# Héberger DCS sur Cloudflare Pages

Le site est **statique** : pas de build Node obligatoire. Supabase + Edge Functions Pi restent inchangés.

## 1. Préparer (déjà dans le repo)

- `_redirects` — URLs courtes (`/signin` → `signin.html`)
- `validation-key.txt` — à la racine (validation domaine Pi)

## 2. Créer le projet Cloudflare

1. Va sur [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages**
2. **Connect to Git** → repo `leader-damienne/DAMIE-CRYPTO-SERVICE`
3. Réglages build :
   - **Framework preset** : `None`
   - **Build command** : *(vide)*
   - **Build output directory** : `/` ou `.`
   - **Root directory** : `/` (racine du repo)
4. **Save and Deploy**

Tu obtiens une URL du type :
`https://damie-crypto-service.pages.dev`
(ou le nom que tu as choisi)

## 3. Domaine custom (optionnel)

Pages → ton projet → **Custom domains** → ajoute ton domaine → suis les DNS Cloudflare.

## 4. Mettre à jour Pi Developer Portal (obligatoire)

1. Pi Browser → Developer Portal
2. App **DAMIE CRYPTO SERVICE**
3. Remplace l’URL Netlify par la nouvelle URL Cloudflare (`.pages.dev` ou ton domaine)
4. Revalide le domaine si demandé (`https://TON-DOMAINE/validation-key.txt` doit s’ouvrir)

## 5. Supabase Auth (si tu as des redirect URLs)

Dashboard Supabase → **Authentication** → **URL Configuration** :
- Site URL = nouvelle URL
- Redirect URLs = ajoute `https://TON-DOMAINE/**`

## 6. Ancienne URL Netlify

Tu peux :
- garder Netlify en parallèle un moment, ou
- désactiver le site Netlify une fois Pi + Cloudflare OK

## Checklist rapide

- [ ] Deploy Cloudflare Pages OK
- [ ] `https://…/validation-key.txt` visible
- [ ] `https://…/signin.html` + login Pi OK
- [ ] Wallet + dépôt Pi OK dans Pi Browser
- [ ] URL mise à jour dans le Developer Portal Pi
