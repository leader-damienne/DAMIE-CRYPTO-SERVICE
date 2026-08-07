# Activer DCS en production (Supabase)

DCS n’est plus une démo locale : les comptes, soldes et modules passent par **Supabase**.

## 1. Créer le projet

1. Allez sur [https://supabase.com](https://supabase.com) et créez un projet.
2. Attendez que la base soit prête.

## 2. Exécuter les SQL (dans l’ordre)

Dans **SQL Editor** → **New query** → **Run** :

1. `supabase/schema.sql` — profils, wallets, txs, tickets, swap/transfer
2. `supabase/deposit-addresses.sql` — ID de dépôt unique
3. `supabase/storage-avatars.sql` — photos de profil
4. **`supabase/features.sql`** — marketplace, community, academy, learning, KYC storage, notifications, parrainage, payouts

## 3. Auth e-mail

1. **Authentication** → **Providers** → **Email** : activé
2. **Confirm email** : ON
3. Templates + Redirect URLs (Netlify + localhost)

## 4. Clés dans le site

Renseignez `js/config.js` (Project URL + anon key), commit + push Netlify.

## 5. Créditer un wallet (admin)

Les comptes démarrent à **0**. Pour tester marketplace / academy :

```sql
update public.wallets
set amount = 100
where user_id = (select id from public.profiles where email = 'client@email.com')
  and symbol = 'PI';
```

Valider une demande de dépôt :

```sql
select * from public.deposit_requests where status = 'pending';

update public.wallets
set amount = amount + 10
where user_id = '<uuid>' and symbol = 'PI';

update public.deposit_requests set status = 'credited' where id = '<request-uuid>';
```

Valider un KYC :

```sql
update public.profiles set kyc = 'verified' where id = '<uuid>';
update public.kyc_submissions set status = 'verified' where user_id = '<uuid>';
```

## 6. Ce qui est fonctionnel après `features.sql`

| Module | Comportement |
|--------|----------------|
| Marketplace | Publier / acheter en PI (débit acheteur, crédit vendeur) |
| Academy | Acheter un cours en PI, contenu débloqué |
| Learning | Lire les articles |
| Community | Publier et lire le fil |
| Parrainage | Vrai arbre N1–N3 + commissions sur frais swap/transfer |
| Transfer | P2P instantané si destinataire DCS, sinon file payout ops |
| Dépôt | ID unique + demande de crédit |
| KYC | Upload pièce + selfie (Storage privé) |
| Support / Contact | Tickets en base |
| Notifications | Feed wallet |

## Limites externes (hors scope SQL)

- **Pi Mainnet** réel (SDK Pi Browser) — pas encore branché
- **Mobile Money** API opérateur — file d’attente `payout_requests` pour traitement manuel
- **SMS OTP téléphone** — nécessite un fournisseur SMS Supabase
- **Cours des cryptos live** — board marchés encore sur tarifs DCS / indicatifs

## Notes

- La **anon key** est publique ; la sécurité repose sur le **RLS**.
- Ne publiez jamais la clé **service_role**.
