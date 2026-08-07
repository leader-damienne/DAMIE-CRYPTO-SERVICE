-- Adresse de dépôt PI unique par utilisateur (ID DCS custodial)
-- Exécuter dans Supabase → SQL Editor

alter table public.profiles
  add column if not exists deposit_pi_address text unique;

update public.profiles
set deposit_pi_address = 'DCS-PI-' || upper(substr(replace(id::text, '-', ''), 1, 16))
where deposit_pi_address is null or deposit_pi_address = '';

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
  dep text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9._-]', '.', 'g'));
  base := trim(both '.' from regexp_replace(base, '\.+', '.', 'g'));
  if length(base) < 3 then base := 'membre'; end if;
  uname := coalesce(nullif(meta->>'username', ''), base);
  while exists(select 1 from public.profiles where username = uname) loop
    n := n + 1;
    uname := base || n::text;
  end loop;
  icode := coalesce(nullif(meta->>'invite_code', ''), 'DCS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));
  while exists(select 1 from public.profiles where invite_code = icode) loop
    icode := 'DCS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end loop;
  dep := 'DCS-PI-' || upper(substr(replace(new.id::text, '-', ''), 1, 16));

  insert into public.profiles (
    id, username, email, display_name, first_name, last_name,
    phone, country, invite_code, referred_by, phone_linked, deposit_pi_address
  ) values (
    new.id,
    uname,
    new.email,
    coalesce(nullif(trim(coalesce(meta->>'first_name','') || ' ' || coalesce(meta->>'last_name','')), ''), uname),
    coalesce(meta->>'first_name', ''),
    coalesce(meta->>'last_name', ''),
    coalesce(meta->>'phone', ''),
    coalesce(meta->>'country', ''),
    icode,
    coalesce(meta->>'referred_by', ''),
    coalesce(meta->>'phone', '') <> '',
    dep
  );

  perform public.dcs_seed_wallets(new.id);
  return new;
end;
$$;
