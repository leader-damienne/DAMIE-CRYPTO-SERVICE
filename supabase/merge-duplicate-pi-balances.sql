Le -- Fusion auto des soldes : mêmes username / pi_username, comptes en double
-- Cible = profil avec pi_uid (connexion Pi actuelle), sinon le plus récent
-- Les soldes des autres profils sont ajoutés à la cible, puis mis à 0
--
-- 1) D'abord PREVIEW (lecture seule) — section A
-- 2) Puis exécuter section B (fusion)
-- 3) Puis section C (vérification)

-- ========== A) PREVIEW doublons ==========
select
  lower(coalesce(nullif(p.pi_username, ''), p.username)) as cle,
  p.id as user_id,
  p.username,
  p.pi_username,
  p.pi_uid,
  p.email,
  coalesce(w.amount, 0) as pi_amount,
  p.created_at,
  case
    when p.pi_uid is not null then 'cible probable (a pi_uid)'
    else 'source probable'
  end as role_estime
from public.profiles p
left join public.wallets w on w.user_id = p.id and w.symbol = 'PI'
where lower(coalesce(nullif(p.pi_username, ''), p.username)) in (
  select lower(coalesce(nullif(pi_username, ''), username))
  from public.profiles
  where coalesce(nullif(pi_username, ''), username) is not null
  group by 1
  having count(*) > 1
)
order by 1, (p.pi_uid is not null) desc, p.created_at desc;

-- ========== B) FUSION (exécuter après avoir vérifié le preview) ==========
do $$
declare
  dup record;
  target_id uuid;
  source_id uuid;
  r record;
begin
  for dup in
    select lower(coalesce(nullif(pi_username, ''), username)) as k
    from public.profiles
    where coalesce(nullif(pi_username, ''), username) is not null
      and length(trim(coalesce(nullif(pi_username, ''), username))) > 0
    group by 1
    having count(*) > 1
  loop
    select id into target_id
    from public.profiles
    where lower(coalesce(nullif(pi_username, ''), username)) = dup.k
    order by (pi_uid is not null) desc, created_at desc
    limit 1;

    if target_id is null then
      continue;
    end if;

    for source_id in
      select id
      from public.profiles
      where lower(coalesce(nullif(pi_username, ''), username)) = dup.k
        and id <> target_id
    loop
      for r in
        select symbol, amount
        from public.wallets
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

      update public.profiles t
      set
        pi_uid = coalesce(t.pi_uid, s.pi_uid),
        pi_username = coalesce(nullif(t.pi_username, ''), s.pi_username, s.username),
        display_name = coalesce(nullif(t.display_name, ''), s.display_name, s.username)
      from public.profiles s
      where t.id = target_id and s.id = source_id;
    end loop;
  end loop;
end $$;

-- ========== C) VÉRIFICATION ==========
select
  p.username,
  p.pi_username,
  p.pi_uid,
  w.amount as pi_amount,
  p.id as user_id
from public.wallets w
join public.profiles p on p.id = w.user_id
where w.symbol = 'PI' and w.amount > 0
order by w.amount desc;
