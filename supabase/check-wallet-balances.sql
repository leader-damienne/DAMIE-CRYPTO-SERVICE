-- Vérifier / retrouver les soldes PI après App Studio (appdcs.com)
-- À exécuter dans Supabase → SQL Editor
-- Remplacez VOTRE_PSEUDO_PI par votre username Pi (sans @)

-- 1) Profils liés à ce pseudo Pi
select id, username, display_name, pi_uid, pi_username, email, created_at
from profiles
where pi_username ilike 'VOTRE_PSEUDO_PI'
   or username ilike 'VOTRE_PSEUDO_PI'
   or display_name ilike 'VOTRE_PSEUDO_PI'
order by created_at;

-- 2) Soldes PI de chaque profil trouvé
select w.user_id, p.username, p.pi_username, w.symbol, w.amount
from wallets w
left join profiles p on p.id = w.user_id
where w.symbol = 'PI'
  and w.user_id in (
    select id from profiles
    where pi_username ilike 'VOTRE_PSEUDO_PI'
       or username ilike 'VOTRE_PSEUDO_PI'
       or display_name ilike 'VOTRE_PSEUDO_PI'
  );

-- 3) Tous les wallets PI non nuls (aperçu)
select w.user_id, p.username, p.pi_username, w.amount, p.created_at
from wallets w
join profiles p on p.id = w.user_id
where w.symbol = 'PI' and w.amount > 0
order by w.amount desc
limit 50;
