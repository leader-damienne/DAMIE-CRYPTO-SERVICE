-- Colonnes Pi Authentication + profils liés au SDK Pi
-- Exécuter dans Supabase → SQL Editor

alter table public.profiles
  add column if not exists pi_uid text;

alter table public.profiles
  add column if not exists pi_username text;

create unique index if not exists profiles_pi_uid_uidx
  on public.profiles (pi_uid)
  where pi_uid is not null;

-- Prefere le username Pi à la création de compte
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
  icode := coalesce(nullif(meta->>'invite_code', ''), 'DCS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));
  while exists(select 1 from public.profiles where invite_code = icode) loop
    icode := 'DCS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
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
