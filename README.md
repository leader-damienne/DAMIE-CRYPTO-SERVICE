# Damie Crypto Service (DCS)

Site statique (HTML / CSS / JS) — wallet PI COIN, swap, transferts, marketplace, academy et parrainage.

## Lien officiel

**https://damie-crypto-service.netlify.app/**

Dépôt : https://github.com/leader-damienne/DAMIE-CRYPTO-SERVICE

## Compte & OTP

- **Inscription** : `/signup.html` (e-mail + mot de passe → code OTP → compte créé)
- **Connexion** : `/signin.html` (e-mail + mot de passe)
- Contenu réservé aux membres : wallet, swap, transfer, marketplace, academy, learning, community, parrainage, profil

Compte démo : `demo@damiecrypto.service` / `DemoDCS2026`

### Envoi OTP par e-mail (EmailJS)

Par défaut le code s’affiche en mode démo. Pour un **vrai e-mail** :

1. Créez un compte sur [https://www.emailjs.com](https://www.emailjs.com)
2. Ajoutez un service e-mail (Gmail, etc.)
3. Créez un template avec les variables : `{{to_email}}`, `{{to_name}}`, `{{otp_code}}`, `{{app_name}}`
4. Dans `js/data.js`, section `DCS.emailConfig` :
   - `enabled: true`
   - `publicKey`, `serviceId`, `templateId` (vos clés EmailJS)

## Republier sur Netlify

1. [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Glissez-déposez le dossier du projet (fichiers à la **racine** : `index.html`, `js/`, `css/`, …)
3. Site : `https://damie-crypto-service.netlify.app/`

Ou connectez le dépôt GitHub au site Netlify pour un déploiement auto à chaque push.

## Parrainage

1. Ouvrez **Parrainage** (connecté)
2. Copiez **Lien du site DCS** ou **Lien d'invitation**
3. Invitation :  
   `https://damie-crypto-service.netlify.app/join.html?ref=VOTRE_CODE&u=pseudo`

## En local

```bash
npx --yes serve .
```

Puis ouvrez `http://localhost:3000` (ou le port indiqué).
