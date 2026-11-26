-- Damienne : diagnostiquer + fusionner soldes (amie10000 / amie100002 / Damie10000)
-- SQL Editor → Run section 1 d’abord, puis section 2 si besoin.

-- ========== 1) DIAGNOSTIC ==========
select
  p.id,
  p.username,
  p.pi_username,
  p.display_name,
  left(coalesce(p.pi_uid, ''), 12) as pi_uid_prefix,
  left(coalesce(p.pi_uid_testnet, ''), 12) as pi_uid_testnet_prefix,
  p.pi_last_auth_network,
  p.email,
  p.created_at,
  coalesce(w.amount, 0) as pi_balance
from profiles p
left join wallets w
  on w.user_id = p.id and w.symbol = 'PI'
where
  p.username ilike '%amie%'
  or p.username ilike '%damie%'
  or p.pi_username ilike '%amie%'
  or p.pi_username ilike '%damie%'
  or p.display_name ilike '%amie%'
  or p.display_name ilike '%damie%'
order by coalesce(w.amount, 0) desc, p.created_at asc;

-- ========== 2) FUSION vers le profil ACTIF Testnet ==========
-- Remplace TARGET_ID par l’id du profil qui a pi_uid_testnet (session Allow),
-- OU par l’id du profil le plus riche si tu te reconnectes dessus.
--
-- Exemple : d’abord note l’id cible depuis la section 1, puis décommente et Run.

/*
do $$
declare
  target uuid := 'PASTE-TARGET-PROFILE-UUID-HERE';
  src record;
  sym text;
  add_amt numeric;
  tgt_amt numeric;
begin
  if target is null then
    raise exception 'Renseigne target uuid';
  end if;

  for src in
    select p.id
    from profiles p
    where p.id <> target
      and (
        p.username ilike '%amie%'
        or p.username ilike '%damie%'
        or p.pi_username ilike '%amie%'
        or p.pi_username ilike '%damie%'
        or p.display_name ilike '%amie%'
        or p.display_name ilike '%damie%'
      )
  loop
    for sym, add_amt in
      select w.symbol, w.amount
      from wallets w
      where w.user_id = src.id and coalesce(w.amount, 0) > 0
    loop
      select amount into tgt_amt
      from wallets
      where user_id = target and symbol = sym;

      insert into wallets (user_id, symbol, amount)
      values (target, sym, add_amt)
      on conflict (user_id, symbol)
      do update set amount = wallets.amount + excluded.amount;

      update wallets set amount = 0
      where user_id = src.id and symbol = sym;
    end loop;
  end loop;
end $$;
*/

-- ========== 3) Vérifier après fusion ==========
-- select user_id, symbol, amount from wallets
-- where user_id = 'PASTE-TARGET-PROFILE-UUID-HERE';
