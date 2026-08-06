# Activer DCS en production (Supabase)

DCS n’est plus une démo locale : les comptes, soldes et transactions passent par **Supabase**.

## 1. Créer le projet

1. Allez sur [https://supabase.com](https://supabase.com) et créez un projet (région proche de l’Afrique de l’Ouest si possible).
2. Attendez que la base soit prête.

## 2. Exécuter le schéma SQL

1. Dans Supabase : **SQL Editor** → **New query**
2. Collez tout le fichier `supabase/schema.sql` du dépôt
3. Cliquez **Run**

Cela crée : `profiles`, `wallets`, `transactions`, `support_tickets`, les politiques de sécurité, le trigger d’inscription, et les fonctions `dcs_swap` / `dcs_transfer`.

## 3. Auth e-mail (OTP)

1. **Authentication** → **Providers** → **Email** : activé
2. **Confirm email** : **ON** (obligatoire pour l’OTP d’inscription)
3. **Authentication** → **Email Templates** → template **Confirm signup**  
   Utilisez le token OTP, par exemple :

```text
Votre code DAMIE CRYPTO SERVICE : {{ .Token }}
```

4. (Optionnel) **URL Configuration** → ajoutez  
   `https://damie-crypto-service.netlify.app`  
   et `http://localhost:3000` dans les Redirect URLs.

## 4. Clés dans le site

1. **Project Settings** → **API**
2. Copiez **Project URL** et **anon public** key
3. Ouvrez `js/config.js` et renseignez :

```js
window.DCS_CONFIG = {
  supabaseUrl: "https://XXXX.supabase.co",
  supabaseAnonKey: "eyJhbGciOi..."
};
```

4. Commit + push → Netlify redéploie automatiquement.

## 5. Créditer un wallet (admin)

Les nouveaux comptes démarrent à **0**. Pour créditer un membre (SQL Editor) :

```sql
update public.wallets
set amount = 100
where user_id = (select id from public.profiles where email = 'client@email.com')
  and symbol = 'PI';
```

## 6. Vérifier

1. Ouvrez `/signup.html` → créez un compte avec votre vrai e-mail
2. Recevez le code à 6 chiffres → validez
3. Connectez-vous → wallet à 0, historique vide
4. Après un crédit admin → testez un swap / transfert (soldes + historique en base)

## Notes

- La **anon key** est publique ; la sécurité repose sur le **Row Level Security** du schéma.
- Ne publiez jamais la clé **service_role**.
- Marketplace / communauté / KYC avancé peuvent venir ensuite sur les mêmes tables Supabase.
