-- Diagnostic soldes DCS — exécuter dans Supabase → SQL Editor
-- Ne modifie rien : lecture seule

-- 1) Soldes non nuls
select
  p.username,
  p.display_name,
  p.pi_username,
  p.pi_uid,
  p.email,
  w.symbol,
  w.amount,
  p.id as user_id
from public.wallets w
join public.profiles p on p.id = w.user_id
where w.amount > 0
order by w.amount desc, p.username, w.symbol;

-- 2) Totaux PI par compte
select
  p.username,
  p.pi_username,
  coalesce(p.pi_uid, '(pas de Pi)') as pi_uid,
  coalesce(sum(case when w.symbol = 'PI' then w.amount else 0 end), 0) as pi_balance,
  p.id as user_id
from public.profiles p
left join public.wallets w on w.user_id = p.id
group by p.id, p.username, p.pi_username, p.pi_uid
having coalesce(sum(case when w.symbol = 'PI' then w.amount else 0 end), 0) > 0
   or p.pi_uid is not null
order by pi_balance desc;

-- 3) Doublons potentiels (même username / display, comptes différents)
select
  lower(coalesce(nullif(p.pi_username, ''), p.username)) as key_name,
  count(*) as comptes,
  array_agg(p.id) as user_ids,
  array_agg(p.email) as emails,
  array_agg(coalesce(p.pi_uid, '-')) as pi_uids
from public.profiles p
group by 1
having count(*) > 1;
