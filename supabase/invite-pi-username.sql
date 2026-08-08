-- Code d'invitation = username Pi
-- Exécuter dans Supabase → SQL Editor

-- 1) Nouveaux comptes : invite_code = pi_username (ou username)
create or replace function public.dcs_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  base text;
  n int := 0;
  icode text;
  i int := 0;
  meta jsonb;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base := lower(regexp_replace(
    coalesce(nullif(meta->>'pi_username', ''), nullif(meta->>'username', ''), split_part(new.email, '@', 1)),
    '[^a-z0-9._-]',
    '.',
    'g'
  ));
  base := trim(both '.' from regexp_replace(base, '\.+', '.', 'g'));
  if length(base) < 3 then base := 'membre'; end if;
  uname := base;
  while exists(select 1 from public.profiles where username = uname) loop
    n := n + 1;
    uname := base || n::text;
  end loop;

  icode := coalesce(
    nullif(meta->>'invite_code', ''),
    nullif(meta->>'pi_username', ''),
    uname
  );
  while exists(select 1 from public.profiles where invite_code = icode) loop
    i := i + 1;
    icode := uname || i::text;
  end loop;

  insert into public.profiles (
    id, username, email, display_name, first_name, last_name,
    phone, country, invite_code, referred_by, phone_linked,
    pi_uid, pi_username
  ) values (
    new.id,
    uname,
    new.email,
    coalesce(nullif(meta->>'pi_username', ''), nullif(meta->>'username', ''), uname),
    coalesce(meta->>'first_name', ''),
    coalesce(meta->>'last_name', ''),
    coalesce(meta->>'phone', ''),
    coalesce(meta->>'country', ''),
    icode,
    coalesce(meta->>'referred_by', ''),
    coalesce(meta->>'phone', '') <> '',
    nullif(meta->>'pi_uid', ''),
    nullif(meta->>'pi_username', '')
  );

  perform public.dcs_seed_wallets(new.id);
  return new;
end;
$$;

-- 2) Résoudre un parrain par invite_code OU pi_username OU username
create or replace function public.dcs_find_referrer(p_code text)
returns table (id uuid, invite_code text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.invite_code
  from public.profiles p
  where p_code is not null and trim(p_code) <> ''
    and (
      p.invite_code = p_code
      or lower(coalesce(p.pi_username, '')) = lower(p_code)
      or lower(p.username) = lower(p_code)
    )
  order by
    case when p.invite_code = p_code then 0 else 1 end
  limit 1;
$$;

-- 3) Commissions : accepter username Pi comme referred_by
create or replace function public.dcs_distribute_referral_fees(
  p_from_user uuid,
  p_fee_pi numeric,
  p_kind text default 'fee'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fee numeric := coalesce(p_fee_pi, 0);
  n1 uuid;
  n2 uuid;
  n3 uuid;
  code1 text;
  code2 text;
  c1 numeric;
  c2 numeric;
  c3 numeric;
  from_code text;
begin
  if fee <= 0 or p_from_user is null then return; end if;

  select referred_by into from_code from profiles where id = p_from_user;
  if from_code is null or from_code = '' then return; end if;

  select f.id, f.invite_code into n1, code1 from public.dcs_find_referrer(from_code) f;
  if n1 is null then return; end if;
  c1 := round(fee * 0.05, 8);
  if c1 > 0 then
    update wallets set amount = amount + c1 where user_id = n1 and symbol = 'PI';
    insert into referral_commissions (beneficiary_id, from_user_id, level, fee_pi, commission_pi, kind)
    values (n1, p_from_user, 1, fee, c1, p_kind);
    insert into transactions (user_id, type, detail, amount, status)
    values (n1, 'Parrainage', 'Commission N1 · ' || p_kind, '+' || trim(to_char(c1, '9999999999990.########')) || ' PI', 'Reçu');
    perform dcs_notify(n1, 'Commission parrainage N1', '+' || c1::text || ' PI', 'referral');
  end if;

  select referred_by into code2 from profiles where id = n1;
  if code2 is null or code2 = '' then return; end if;
  select f.id into n2 from public.dcs_find_referrer(code2) f;
  if n2 is null then return; end if;
  c2 := round(fee * 0.03, 8);
  if c2 > 0 then
    update wallets set amount = amount + c2 where user_id = n2 and symbol = 'PI';
    insert into referral_commissions (beneficiary_id, from_user_id, level, fee_pi, commission_pi, kind)
    values (n2, p_from_user, 2, fee, c2, p_kind);
    insert into transactions (user_id, type, detail, amount, status)
    values (n2, 'Parrainage', 'Commission N2 · ' || p_kind, '+' || trim(to_char(c2, '9999999999990.########')) || ' PI', 'Reçu');
    perform dcs_notify(n2, 'Commission parrainage N2', '+' || c2::text || ' PI', 'referral');
  end if;

  select referred_by into code2 from profiles where id = n2;
  if code2 is null or code2 = '' then return; end if;
  select f.id into n3 from public.dcs_find_referrer(code2) f;
  if n3 is null then return; end if;
  c3 := round(fee * 0.01, 8);
  if c3 > 0 then
    update wallets set amount = amount + c3 where user_id = n3 and symbol = 'PI';
    insert into referral_commissions (beneficiary_id, from_user_id, level, fee_pi, commission_pi, kind)
    values (n3, p_from_user, 3, fee, c3, p_kind);
    insert into transactions (user_id, type, detail, amount, status)
    values (n3, 'Parrainage', 'Commission N3 · ' || p_kind, '+' || trim(to_char(c3, '9999999999990.########')) || ' PI', 'Reçu');
    perform dcs_notify(n3, 'Commission parrainage N3', '+' || c3::text || ' PI', 'referral');
  end if;
end;
$$;

-- 4) Migrer les profils existants : invite_code → pi_username (si libre)
do $$
declare
  r record;
  new_code text;
begin
  for r in
    select id, invite_code, pi_username, username
    from public.profiles
    where coalesce(nullif(pi_username, ''), nullif(username, '')) is not null
      and invite_code is distinct from coalesce(nullif(pi_username, ''), username)
  loop
    new_code := coalesce(nullif(r.pi_username, ''), r.username);
    if exists (
      select 1 from public.profiles p
      where p.invite_code = new_code and p.id <> r.id
    ) then
      continue;
    end if;
    update public.profiles
      set referred_by = new_code
      where referred_by = r.invite_code;
    update public.profiles
      set invite_code = new_code
      where id = r.id;
  end loop;
end $$;
