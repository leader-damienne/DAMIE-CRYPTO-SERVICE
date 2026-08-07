-- Fusionner les soldes d'un ancien compte (source) vers le compte Pi actif (cible)
-- 1) Remplir SOURCE_ID et TARGET_ID après avoir lancé check-wallets.sql
-- 2) Exécuter CE script une fois par paire à fusionner

-- Exemple :
--   SOURCE = ancien compte e-mail avec soldes
--   TARGET = nouveau compte Pi (souvent pi.…@auth.dcs.app) avec 0

do $$
declare
  source_id uuid := null; -- <<< remplacer : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  target_id uuid := null; -- <<< remplacer : 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'
  r record;
begin
  if source_id is null or target_id is null then
    raise exception 'Renseigne source_id et target_id avant d''exécuter.';
  end if;
  if source_id = target_id then
    raise exception 'source et target identiques.';
  end if;

  for r in
    select symbol, amount from public.wallets
    where user_id = source_id and amount > 0
  loop
    insert into public.wallets (user_id, symbol, amount)
    values (target_id, r.symbol, r.amount)
    on conflict (user_id, symbol)
    do update set amount = public.wallets.amount + excluded.amount;

    update public.wallets
    set amount = 0
    where user_id = source_id and symbol = r.symbol;
  end loop;

  /* Lier le profil cible à Pi si source avait pi_uid / username utile */
  update public.profiles t
  set
    pi_uid = coalesce(t.pi_uid, s.pi_uid),
    pi_username = coalesce(nullif(t.pi_username, ''), s.pi_username, s.username),
    display_name = coalesce(nullif(t.display_name, ''), s.display_name, s.username)
  from public.profiles s
  where t.id = target_id and s.id = source_id;
end $$;

-- Vérification
-- select * from public.wallets where user_id in (source_id, target_id);
