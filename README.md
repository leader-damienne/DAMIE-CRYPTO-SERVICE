# Damie Crypto Service (DCS)

Plateforme web — wallet PI COIN, swap, transferts, marketplace, academy et parrainage.

## Lien

**https://damie-crypto-service.netlify.app/**  
Dépôt : https://github.com/leader-damienne/DAMIE-CRYPTO-SERVICE

## Mode production

DCS utilise **Supabase** (auth e-mail + base de données) :

- Comptes réels (inscription + OTP e-mail + connexion)
- Soldes wallet persistés
- Swap / transfert enregistrés en base
- Tickets support en base

**Configuration obligatoire** : suivez [`SETUP-SUPABASE.md`](SETUP-SUPABASE.md)  
Puis renseignez `js/config.js` avec l’URL et la clé anon du projet.

Sans cette config, les pages Connexion / Inscription affichent un message d’installation (plus de compte démo).

## Pages

| Public | Membres |
|--------|---------|
| `signup.html`, `signin.html`, `join.html`, `contact.html` | wallet, swap, transfer, marketplace, academy, learning, community, parrainage, profil, accueil |

## Republier (Netlify)

Connectez le dépôt GitHub au site Netlify : chaque push redéploie.

Ou : [Netlify Drop](https://app.netlify.com/drop) — déposer le dossier **racine** (`index.html`, `js/`, `css/`, …).

## Parrainage

`https://damie-crypto-service.netlify.app/join.html?ref=VOTRE_CODE&u=pseudo`

## En local

```bash
npx --yes serve .
```

Ouvrez l’URL indiquée, après avoir rempli `js/config.js`.
