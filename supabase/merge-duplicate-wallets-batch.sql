-- Fusion batch (tous utilisateurs) : soldes restés sur profils doublons
-- Critères : même pi_uid, même pi_uid_testnet, OU même stem de pseudo
--   (lettres sans chiffres finaux : amie10000 ≈ amie100002).
-- ATTENTION : Damie10000 (stem damie) ≠ amie* (stem amie) — ce batch
--   ne les fusionne PAS. Pour Damienne : fix-damienne-wallet-now.sql
-- SQL Editor → Run section 1 (diag), puis section 2 (fusion).
-- Après : supabase functions deploy pi-auth --no-verify-jwt
-- Puis chaque user Allow → fusion auto aussi à chaque login.

-- ========== 1) DIAGNOSTIC : profils avec PI > 0 et doublons potentiels ==========
with norm as (
  select
    p.id,
    p.username,
    p.pi_username,
    p.display_name,
    p.pi_uid,
    p.pi_uid_testnet,
    p.pi_last_auth_network,
    p.created_at,
    coalesce(w.amount, 0) as pi_balance,
    lower(regexp_replace(coalesce(p.pi_username, p.username, ''), '[^a-z0-9]', '', 'g')) as name_key,
    regexp_replace(
      lower(regexp_replace(coalesce(p.pi_username, p.username, ''), '[^a-z0-9]', '', 'g')),
      '[0-9]+$',
      ''
    ) as name_stem
  from profiles p
  left join wallets w on w.user_id = p.id and w.symbol = 'PI'
)
select
  n.*,
  (
    select count(*)
    from norm o
    where o.id <> n.id
      and (
        (n.pi_uid is not null and n.pi_uid <> '' and (o.pi_uid = n.pi_uid or o.pi_uid_testnet = n.pi_uid))
        or (n.pi_uid_testnet is not null and n.pi_uid_testnet <> '' and (o.pi_uid = n.pi_uid_testnet or o.pi_uid_testnet = n.pi_uid_testnet))
        or (length(n.name_stem) >= 4 and o.name_stem = n.name_stem)
        or (length(n.name_key) >= 5 and (o.name_key = n.name_key or o.name_key like n.name_key || '%' or n.name_key like o.name_key || '%'))
      )
  ) as sibling_count
from norm n
where coalesce(n.pi_balance, 0) > 0
   or n.pi_uid is not null
   or n.pi_uid_testnet is not null
order by n.name_stem, n.pi_balance desc, n.created_at;

-- ========== 2) FUSION BATCH vers le « profil actif » de chaque groupe ==========
-- Actif = profil avec pi_uid_testnet (Allow Testnet récent), sinon pi_uid,
-- sinon le plus riche en PI, sinon le plus ancien.
-- Décommente pour exécuter.

/*
do $$
declare
  grp record;
  target uuid;
  src record;
  sym text;
  add_amt numeric;
begin
  for grp in
    with norm as (
      select
        p.id,
        p.pi_uid,
        p.pi_uid_testnet,
        p.created_at,
        coalesce(w.amount, 0) as pi_balance,
        regexp_replace(
          lower(regexp_replace(coalesce(p.pi_username, p.username, ''), '[^a-z0-9]', '', 'g')),
          '[0-9]+$',
          ''
        ) as name_stem
      from profiles p
      left join wallets w on w.user_id = p.id and w.symbol = 'PI'
    ),
    groups as (
      select
        case
          when length(name_stem) >= 4 then 'stem:' || name_stem
          else 'id:' || id::text
        end as gkey,
        id,
        pi_uid,
        pi_uid_testnet,
        pi_balance,
        created_at
      from norm
      where length(name_stem) >= 4
         or coalesce(pi_uid, '') <> ''
         or coalesce(pi_uid_testnet, '') <> ''
    )
    select gkey
    from groups
    group by gkey
    having count(*) > 1
  loop
    select g.id into target
    from (
      with norm as (
        select
          p.id,
          p.pi_uid,
          p.pi_uid_testnet,
          p.created_at,
          coalesce(w.amount, 0) as pi_balance,
          regexp_replace(
            lower(regexp_replace(coalesce(p.pi_username, p.username, ''), '[^a-z0-9]', '', 'g')),
            '[0-9]+$',
            ''
          ) as name_stem
        from profiles p
        left join wallets w on w.user_id = p.id and w.symbol = 'PI'
      )
      select
        id,
        pi_uid,
        pi_uid_testnet,
        pi_balance,
        created_at,
        case
          when length(name_stem) >= 4 then 'stem:' || name_stem
          else 'id:' || id::text
        end as gkey
      from norm
    ) g
    where g.gkey = grp.gkey
    order by
      (g.pi_uid_testnet is not null and g.pi_uid_testnet <> '') desc,
      (g.pi_uid is not null and g.pi_uid <> '') desc,
      g.pi_balance desc,
      g.created_at asc
    limit 1;

    if target is null then
      continue;
    end if;

    for src in
      select p.id
      from profiles p
      where p.id <> target
        and regexp_replace(
          lower(regexp_replace(coalesce(p.pi_username, p.username, ''), '[^a-z0-9]', '', 'g')),
          '[0-9]+$',
          ''
        ) = regexp_replace(
          lower(regexp_replace(
            coalesce(
              (select pi_username from profiles where id = target),
              (select username from profiles where id = target),
              ''
            ),
            '[^a-z0-9]', '', 'g'
          )),
          '[0-9]+$',
          ''
        )
        and length(regexp_replace(
          lower(regexp_replace(coalesce(p.pi_username, p.username, ''), '[^a-z0-9]', '', 'g')),
          '[0-9]+$',
          ''
        )) >= 4
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
      end loop;
    end loop;
  end loop;
end $$;
*/

-- ========== 3) Vérifier soldes PI après ==========
-- select user_id, symbol, amount from wallets where symbol = 'PI' and amount > 0 order by amount desc;
