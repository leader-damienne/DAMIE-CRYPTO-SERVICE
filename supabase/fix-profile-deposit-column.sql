-- Fix : photo de profil bloquée
-- Erreur : record "old" has no field "deposit_pi_address"
-- Cause : trigger profil lit une colonne absente de public.profiles
-- Supabase → SQL Editor → Run (une fois)

alter table public.profiles
  add column if not exists deposit_pi_address text;

alter table public.profiles
  add column if not exists pi_uid text;

alter table public.profiles
  add column if not exists pi_username text;

create or replace function public.dcs_protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if tg_op <> 'UPDATE' then return new; end if;
  if jwt_role = 'service_role' then return new; end if;
  if auth.uid() is null then return new; end if;

  new.referred_by := old.referred_by;
  new.invite_code := old.invite_code;
  new.pi_uid := old.pi_uid;
  new.pi_username := old.pi_username;
  new.email := old.email;

  if new.kyc is distinct from old.kyc then
    if coalesce(old.kyc, 'none') in ('none', '') and new.kyc = 'pending' then
      null;
    else
      new.kyc := old.kyc;
    end if;
  end if;

  if coalesce(old.deposit_pi_address, '') <> '' then
    new.deposit_pi_address := old.deposit_pi_address;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile
  before update on public.profiles
  for each row execute function public.dcs_protect_profile_columns();

update public.profiles
set deposit_pi_address = 'DCS-PI-' || upper(substr(replace(id::text, '-', ''), 1, 16))
where deposit_pi_address is null or deposit_pi_address = '';
