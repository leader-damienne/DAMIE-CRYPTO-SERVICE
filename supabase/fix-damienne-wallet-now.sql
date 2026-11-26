-- ============================================================
-- Damienne : PROUVER + FORCER les soldes sur le profil de session
-- Cause prouvée : Damie10000 (stem=damie) ≠ amie10000/amie100002 (stem=amie)
--   → le batch PR#10 et pi-auth ne les regroupaient PAS.
-- SQL Editor → exécuter CHAQUE section dans l’ordre.
-- ============================================================

-- ========== A) PREUVE : tous les profils Damie / amie + soldes ==========
select
  p.id as profile_id,
  p.username,
  p.pi_username,
  p.display_name,
  left(coalesce(p.pi_uid, ''), 16) as pi_uid,
  left(coalesce(p.pi_uid_testnet, ''), 16) as pi_uid_testnet,
  p.pi_last_auth_network,
  p.email,
  p.created_at,
  coalesce(w.amount, 0) as pi_balance,
  regexp_replace(
    lower(regexp_replace(coalesce(p.pi_username, p.username, p.display_name, ''), '[^a-z0-9]', '', 'g')),
    '[0-9]+$',
    ''
  ) as name_stem
from profiles p
left join wallets w on w.user_id = p.id and w.symbol = 'PI'
where
  coalesce(p.username, '') ilike '%amie%'
  or coalesce(p.username, '') ilike '%damie%'
  or coalesce(p.pi_username, '') ilike '%amie%'
  or coalesce(p.pi_username, '') ilike '%damie%'
  or coalesce(p.display_name, '') ilike '%amie%'
  or coalesce(p.display_name, '') ilike '%damie%'
order by coalesce(w.amount, 0) desc, p.created_at asc;

-- ========== B) Quel profil est la SESSION active ? ==========
-- Priorité : a pi_uid_testnet (Allow Testnet) → sinon pi_uid → sinon plus riche PI
select
  p.id as suggested_target,
  p.username,
  p.pi_username,
  left(coalesce(p.pi_uid_testnet, ''), 16) as pi_uid_testnet,
  left(coalesce(p.pi_uid, ''), 16) as pi_uid,
  coalesce(w.amount, 0) as pi_balance,
  case
    when coalesce(p.pi_uid_testnet, '') <> '' then '1_session_testnet'
    when coalesce(p.pi_uid, '') <> '' then '2_session_mainnet'
    when coalesce(w.amount, 0) > 0 then '3_rich_wallet'
    else '4_other'
  end as why
from profiles p
left join wallets w on w.user_id = p.id and w.symbol = 'PI'
where
  coalesce(p.username, '') ilike '%amie%'
  or coalesce(p.username, '') ilike '%damie%'
  or coalesce(p.pi_username, '') ilike '%amie%'
  or coalesce(p.pi_username, '') ilike '%damie%'
  or coalesce(p.display_name, '') ilike '%amie%'
  or coalesce(p.display_name, '') ilike '%damie%'
order by
  (coalesce(p.pi_uid_testnet, '') <> '') desc,
  (coalesce(p.pi_uid, '') <> '') desc,
  coalesce(w.amount, 0) desc,
  p.created_at asc
limit 5;

-- ========== C) FUSION FORCÉE (Damie + amie → profil session) ==========
-- Copie l’id « suggested_target » de B (ligne 1) ci-dessous, puis Run.
-- Si tu préfères le wallet le plus riche comme session : mets SON id à la place,
-- puis Allow Testnet une fois pour rattacher pi_uid_testnet.

do $$
declare
  -- >>> COLLE ICI l’id de la section B (ligne 1) <<<
  target uuid := 'PASTE-TARGET-PROFILE-UUID-HERE';
  src record;
  sym text;
  add_amt numeric;
  moved numeric := 0;
begin
  if target = 'PASTE-TARGET-PROFILE-UUID-HERE'::uuid then
    raise exception 'Remplace PASTE-TARGET-PROFILE-UUID-HERE par l’id de la section B';
  end if;

  if not exists (select 1 from profiles where id = target) then
    raise exception 'Profil target introuvable: %', target;
  end if;

  for src in
    select p.id
    from profiles p
    where p.id <> target
      and (
        coalesce(p.username, '') ilike '%amie%'
        or coalesce(p.username, '') ilike '%damie%'
        or coalesce(p.pi_username, '') ilike '%amie%'
        or coalesce(p.pi_username, '') ilike '%damie%'
        or coalesce(p.display_name, '') ilike '%amie%'
        or coalesce(p.display_name, '') ilike '%damie%'
      )
  loop
    for sym, add_amt in
      select w.symbol, w.amount
      from wallets w
      where w.user_id = src.id and coalesce(w.amount, 0) > 0
    loop
      insert into wallets (user_id, symbol, amount)
      values (target, sym, add_amt)
      on conflict (user_id, symbol)
      do update set amount = wallets.amount + excluded.amount;

      update wallets set amount = 0
      where user_id = src.id and symbol = sym;

      if sym = 'PI' then
        moved := moved + add_amt;
      end if;
    end loop;
  end loop;

  raise notice 'PI déplacés vers % : %', target, moved;
end $$;

-- ========== D) VÉRIFIER : soldes sur le target ==========
-- Remplace l’uuid :
-- select symbol, amount from wallets where user_id = 'PASTE-TARGET-PROFILE-UUID-HERE' order by symbol;
