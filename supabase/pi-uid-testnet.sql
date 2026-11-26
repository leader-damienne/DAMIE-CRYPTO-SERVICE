-- A2U Testnet : conserver l’uid Testnet sans écraser l’uid Mainnet
-- Supabase → SQL Editor → Run (une fois)
-- Puis redéployer : pi-auth, pi-a2u

alter table public.profiles
  add column if not exists pi_uid_testnet text;

alter table public.profiles
  add column if not exists pi_last_auth_network text;

create index if not exists profiles_pi_uid_testnet_idx
  on public.profiles (pi_uid_testnet)
  where pi_uid_testnet is not null;

-- Empêcher un client de falsifier pi_uid_testnet (service_role OK)
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
  new.pi_uid_testnet := old.pi_uid_testnet;
  new.pi_last_auth_network := old.pi_last_auth_network;
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
