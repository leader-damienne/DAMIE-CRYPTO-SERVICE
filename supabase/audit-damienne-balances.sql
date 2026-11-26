-- Audit Damienne : 14.79 actuel vs ~14.7M rappelé — perte ou confusion ?
-- SQL Editor → Run.

-- 1) Tous les wallets PI des profils amie/damie (y compris amount = 0)
select
  p.id,
  p.username,
  p.pi_username,
  left(coalesce(p.pi_uid_testnet, ''), 16) as pi_uid_testnet,
  w.symbol,
  w.amount as pi_or_asset_amount,
  case
    when coalesce(w.amount, 0) >= 1000000 then 'GROS (>=1M) encore présent'
    when coalesce(w.amount, 0) between 10 and 100 then 'petit (~14) — peut être le solde réel actuel'
    when coalesce(w.amount, 0) = 0 then 'à zéro (fusionné ailleurs ?)'
    else 'autre'
  end as lecture
from profiles p
left join wallets w on w.user_id = p.id
where
  coalesce(p.username, '') ilike '%amie%'
  or coalesce(p.username, '') ilike '%damie%'
  or coalesce(p.pi_username, '') ilike '%amie%'
  or coalesce(p.pi_username, '') ilike '%damie%'
  or coalesce(p.display_name, '') ilike '%amie%'
  or coalesce(p.display_name, '') ilike '%damie%'
order by coalesce(w.amount, 0) desc nulls last;

-- 2) Historique txs PI (si table transactions) — chercher d’anciens gros montants
select
  t.user_id,
  p.username,
  t.type,
  t.detail,
  t.amount,
  t.status,
  t.created_at
from transactions t
left join profiles p on p.id = t.user_id
where
  p.username ilike '%amie%'
  or p.username ilike '%damie%'
  or p.pi_username ilike '%amie%'
  or p.pi_username ilike '%damie%'
  or coalesce(t.detail, '') ilike '%amie%'
  or coalesce(t.detail, '') ilike '%PI%'
order by t.created_at desc
limit 80;

-- 3) Y a-t-il ENCORE un wallet >= 1 000 000 PI quelque part (tous users) ?
select p.username, p.pi_username, w.user_id, w.amount
from wallets w
join profiles p on p.id = w.user_id
where w.symbol = 'PI' and w.amount >= 1000000
order by w.amount desc
limit 20;

-- Lecture : si (3) vide et (1) max ~14.79 → pas de 14.7M en base maintenant.
-- Le batch ne divise pas : il additionne puis met la source à 0.
-- 14.7M absent = jamais stocké ainsi, ou déjà consommé/retiré avant, ou confusion USD/affichage.
