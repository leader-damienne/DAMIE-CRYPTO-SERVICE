-- =============================================================================
-- DCS — Durcissement sécurité (à exécuter dans Supabase SQL Editor)
-- =============================================================================
-- 1) Plus de mint de solde via API directe (wallets)
-- 2) RPC commissions / notify cross-user réservées au serveur
-- 3) Swap / transfer : frais + montant reçu recalculés côté SQL
-- 4) Colonnes sensibles du profil protégées (kyc, pi_uid, referred_by…)
-- 5) Lecture publique des profils limitée (RPC filleuls)
-- =============================================================================

-- ---------- 1) Wallets : SELECT only pour les users ----------
drop policy if exists "wallets_update_own" on public.wallets;
drop policy if exists "wallets_insert_own" on public.wallets;

revoke insert, update, delete on public.wallets from authenticated;
revoke insert, update, delete on public.wallets from anon;
grant select on public.wallets to authenticated;

-- Historique : lecture seule (écritures via RPC security definer)
drop policy if exists "tx_insert_own" on public.transactions;
revoke insert, update, delete on public.transactions from authenticated;
revoke insert, update, delete on public.transactions from anon;
grant select on public.transactions to authenticated;

-- ---------- 2) RPC dangereuses : plus d'appel client ----------
revoke all on function public.dcs_distribute_referral_fees(uuid, numeric, text) from public;
revoke all on function public.dcs_distribute_referral_fees(uuid, numeric, text) from anon;
revoke all on function public.dcs_distribute_referral_fees(uuid, numeric, text) from authenticated;
grant execute on function public.dcs_distribute_referral_fees(uuid, numeric, text) to service_role;
grant execute on function public.dcs_distribute_referral_fees(uuid, numeric, text) to postgres;
-- Les autres RPC security definer (dcs_swap, dcs_transfer…) appellent encore
-- dcs_distribute_referral_fees en interne (même owner) — OK.

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'dcs_notify'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, text, text, text'
  ) then
    execute 'revoke all on function public.dcs_notify(uuid, text, text, text) from public';
    execute 'revoke all on function public.dcs_notify(uuid, text, text, text) from anon';
    execute 'revoke all on function public.dcs_notify(uuid, text, text, text) from authenticated';
    execute 'grant execute on function public.dcs_notify(uuid, text, text, text) to service_role';
    execute 'grant execute on function public.dcs_notify(uuid, text, text, text) to postgres';
  end if;
end $$;

-- ---------- 3) Prix / frais serveur (alignés js/data.js) ----------
create or replace function public.dcs_asset_usd_price(p_symbol text)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s text := upper(trim(coalesce(p_symbol, '')));
begin
  if s = 'PI' then return 314159::numeric; end if;
  if s = 'XOF' or s = 'XAF' then return (1::numeric / 600::numeric); end if;
  raise exception 'Actif non supporté pour le calcul serveur: %', s;
end;
$$;

revoke all on function public.dcs_asset_usd_price(text) from public;
grant execute on function public.dcs_asset_usd_price(text) to authenticated, service_role;

create or replace function public.dcs_calc_fee_pi(p_symbol text, p_amount numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  usd numeric;
  fee_usd numeric;
begin
  if p_amount is null or p_amount <= 0 then return 0; end if;
  usd := p_amount * public.dcs_asset_usd_price(p_symbol);
  fee_usd := usd * 0.01; -- 1 %
  return round(fee_usd / 314159::numeric, 8);
end;
$$;

revoke all on function public.dcs_calc_fee_pi(text, numeric) from public;
grant execute on function public.dcs_calc_fee_pi(text, numeric) to authenticated, service_role;

-- Swap : ignore p_to_amt / p_fee_pi client — recalcule tout
create or replace function public.dcs_swap(
  p_from text,
  p_to text,
  p_from_amt numeric,
  p_to_amt numeric,
  p_fee_pi numeric,
  p_detail text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal_from numeric;
  bal_to numeric;
  bal_pi numeric;
  from_px numeric;
  to_px numeric;
  to_amt numeric;
  fee numeric;
  detail text := coalesce(nullif(trim(p_detail), ''), 'Swap');
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  if p_from_amt is null or p_from_amt <= 0 then raise exception 'Montant invalide'; end if;
  if upper(trim(p_from)) = upper(trim(p_to)) then raise exception 'Actifs identiques'; end if;

  from_px := public.dcs_asset_usd_price(p_from);
  to_px := public.dcs_asset_usd_price(p_to);
  to_amt := (p_from_amt * from_px) / to_px;
  if upper(trim(p_to)) in ('XOF', 'XAF') then
    to_amt := round(to_amt, 0);
  else
    to_amt := round(to_amt, 8);
  end if;
  if to_amt <= 0 then raise exception 'Montant reçu invalide'; end if;

  fee := public.dcs_calc_fee_pi(p_from, p_from_amt);

  select amount into bal_from from wallets where user_id = uid and symbol = upper(trim(p_from)) for update;
  select amount into bal_to from wallets where user_id = uid and symbol = upper(trim(p_to)) for update;
  select amount into bal_pi from wallets where user_id = uid and symbol = 'PI' for update;

  if bal_from is null or bal_to is null or bal_pi is null then
    raise exception 'Wallet incomplet';
  end if;
  if bal_from < p_from_amt then raise exception 'Solde % insuffisant', upper(trim(p_from)); end if;
  if fee > 0 and upper(trim(p_from)) <> 'PI' and bal_pi < fee then
    raise exception 'Solde PI insuffisant pour les frais';
  end if;
  if upper(trim(p_from)) = 'PI' and bal_from < (p_from_amt + fee) then
    raise exception 'Solde PI insuffisant';
  end if;

  update wallets set amount = amount - p_from_amt
    where user_id = uid and symbol = upper(trim(p_from));
  update wallets set amount = amount + to_amt
    where user_id = uid and symbol = upper(trim(p_to));
  if fee > 0 then
    update wallets set amount = amount - fee where user_id = uid and symbol = 'PI';
    insert into transactions (user_id, type, detail, amount, status)
    values (
      uid, 'Frais', detail,
      '-' || trim(to_char(fee, '9999999999990.########')) || ' PI',
      'Prélevé'
    );
    perform public.dcs_distribute_referral_fees(uid, fee, 'Swap');
  end if;

  insert into transactions (user_id, type, detail, amount, status, meta)
  values (
    uid, 'Swap', detail,
    trim(to_char(p_from_amt, '9999999999990.########')) || ' ' || upper(trim(p_from)),
    'Confirmé',
    jsonb_build_object(
      'from', upper(trim(p_from)),
      'to', upper(trim(p_to)),
      'out', to_amt,
      'fee_pi', fee
    )
  );
  perform public.dcs_notify(uid, 'Swap confirmé', detail, 'swap');

  return jsonb_build_object('ok', true, 'to_amt', to_amt, 'fee_pi', fee);
end;
$$;

-- Transfer : frais recalculés serveur (ignore p_fee_pi client)
create or replace function public.dcs_transfer(
  p_symbol text,
  p_amount numeric,
  p_fee_pi numeric,
  p_detail text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal numeric;
  bal_pi numeric;
  fee numeric;
  sym text := upper(trim(p_symbol));
  detail text := coalesce(nullif(trim(p_detail), ''), 'Transfer');
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Montant invalide'; end if;

  fee := public.dcs_calc_fee_pi(sym, p_amount);

  select amount into bal from wallets where user_id = uid and symbol = sym for update;
  select amount into bal_pi from wallets where user_id = uid and symbol = 'PI' for update;
  if bal is null then raise exception 'Actif introuvable'; end if;
  if bal < p_amount then raise exception 'Solde insuffisant'; end if;
  if fee > 0 and sym <> 'PI' and bal_pi < fee then
    raise exception 'Solde PI insuffisant pour les frais';
  end if;
  if sym = 'PI' and bal < (p_amount + fee) then
    raise exception 'Solde PI insuffisant';
  end if;

  update wallets set amount = amount - p_amount where user_id = uid and symbol = sym;
  if fee > 0 then
    update wallets set amount = amount - fee where user_id = uid and symbol = 'PI';
    insert into transactions (user_id, type, detail, amount, status)
    values (
      uid, 'Frais', detail,
      '-' || trim(to_char(fee, '9999999999990.########')) || ' PI',
      'Prélevé'
    );
    perform public.dcs_distribute_referral_fees(uid, fee, 'Transfer');
  end if;

  insert into transactions (user_id, type, detail, amount, status)
  values (
    uid, 'Transfer', detail,
    trim(to_char(p_amount, '9999999999990.########')) || ' ' || sym,
    'Envoyé'
  );
  perform public.dcs_notify(uid, 'Transfert envoyé', detail, 'transfer');

  return jsonb_build_object('ok', true, 'fee_pi', fee);
end;
$$;

-- P2P : mêmes frais serveur
create or replace function public.dcs_transfer_p2p(
  p_symbol text,
  p_amount numeric,
  p_fee_pi numeric,
  p_dest text,
  p_detail text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  dest_id uuid;
  dest_label text;
  bal numeric;
  bal_pi numeric;
  fee numeric;
  sym text := upper(trim(p_symbol));
  needle text := lower(trim(coalesce(p_dest, '')));
  detail text := coalesce(nullif(trim(p_detail), ''), 'Transfer P2P');
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Montant invalide'; end if;
  if needle = '' then raise exception 'Destinataire requis'; end if;

  select id, coalesce(nullif(display_name, ''), username)
    into dest_id, dest_label
  from profiles
  where lower(username) = needle
     or lower(coalesce(pi_username, '')) = needle
     or lower(email) = needle
     or upper(invite_code) = upper(needle)
  limit 1;

  if dest_id is null then
    return jsonb_build_object('ok', false, 'p2p', false, 'error', 'Destinataire introuvable');
  end if;
  if dest_id = uid then raise exception 'Impossible de vous envoyer à vous-même'; end if;

  fee := public.dcs_calc_fee_pi(sym, p_amount);

  select amount into bal from wallets where user_id = uid and symbol = sym for update;
  select amount into bal_pi from wallets where user_id = uid and symbol = 'PI' for update;
  if bal is null or bal < p_amount then raise exception 'Solde insuffisant'; end if;
  if fee > 0 and sym <> 'PI' and (bal_pi is null or bal_pi < fee) then
    raise exception 'Solde PI insuffisant pour les frais';
  end if;
  if sym = 'PI' and bal < (p_amount + fee) then
    raise exception 'Solde PI insuffisant';
  end if;

  update wallets set amount = amount - p_amount where user_id = uid and symbol = sym;
  if fee > 0 then
    update wallets set amount = amount - fee where user_id = uid and symbol = 'PI';
    insert into transactions (user_id, type, detail, amount, status)
    values (
      uid, 'Frais', detail,
      '-' || trim(to_char(fee, '9999999999990.########')) || ' PI',
      'Prélevé'
    );
    perform public.dcs_distribute_referral_fees(uid, fee, 'Transfer');
  end if;

  insert into wallets (user_id, symbol, amount)
  values (dest_id, sym, p_amount)
  on conflict (user_id, symbol) do update
    set amount = wallets.amount + excluded.amount;

  insert into transactions (user_id, type, detail, amount, status)
  values (
    uid, 'Transfer', '→ ' || dest_label || ' · ' || detail,
    trim(to_char(p_amount, '9999999999990.########')) || ' ' || sym,
    'Envoyé'
  );
  insert into transactions (user_id, type, detail, amount, status)
  values (
    dest_id, 'Transfer', '← reçu · ' || detail,
    '+' || trim(to_char(p_amount, '9999999999990.########')) || ' ' || sym,
    'Reçu'
  );
  perform public.dcs_notify(uid, 'Transfert P2P envoyé', dest_label, 'transfer');
  perform public.dcs_notify(dest_id, 'Transfert reçu', trim(to_char(p_amount, '9999999999990.########')) || ' ' || sym, 'transfer');

  return jsonb_build_object('ok', true, 'p2p', true, 'dest', dest_label, 'fee_pi', fee);
end;
$$;

grant execute on function public.dcs_swap(text, text, numeric, numeric, numeric, text) to authenticated;
grant execute on function public.dcs_transfer(text, numeric, numeric, text) to authenticated;
grant execute on function public.dcs_transfer_p2p(text, numeric, numeric, text, text) to authenticated;

-- ---------- 4) Profil : colonnes protégées ----------
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
  -- service_role / jobs serveur : pas de restriction
  if jwt_role = 'service_role' then return new; end if;
  if auth.uid() is null then return new; end if;

  new.referred_by := old.referred_by;
  new.invite_code := old.invite_code;
  new.pi_uid := old.pi_uid;
  new.pi_username := old.pi_username;
  new.email := old.email;
  -- KYC : le user peut seulement passer none → pending (jamais verified)
  if new.kyc is distinct from old.kyc then
    if coalesce(old.kyc, 'none') in ('none', '') and new.kyc = 'pending' then
      null; -- autorisé
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

-- ---------- 5) Profils : fermer le SELECT total, RPC filleuls ----------
drop policy if exists "profiles_select_public_codes" on public.profiles;

create or replace function public.dcs_list_referrals_by_codes(p_codes text[])
returns table (
  id uuid,
  username text,
  pi_username text,
  display_name text,
  invite_code text,
  referred_by text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;
  if p_codes is null or array_length(p_codes, 1) is null then
    return;
  end if;
  return query
    select
      p.id,
      p.username,
      p.pi_username,
      p.display_name,
      p.invite_code,
      p.referred_by,
      p.created_at
    from public.profiles p
    where p.referred_by = any (p_codes)
    order by p.created_at desc;
end;
$$;

revoke all on function public.dcs_list_referrals_by_codes(text[]) from public;
grant execute on function public.dcs_list_referrals_by_codes(text[]) to authenticated;

create or replace function public.dcs_public_handles(p_ids uuid[])
returns table (
  id uuid,
  username text,
  pi_username text,
  display_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;
  if p_ids is null or array_length(p_ids, 1) is null then
    return;
  end if;
  return query
    select p.id, p.username, p.pi_username, p.display_name
    from public.profiles p
    where p.id = any (p_ids);
end;
$$;

revoke all on function public.dcs_public_handles(uuid[]) from public;
grant execute on function public.dcs_public_handles(uuid[]) to authenticated;

-- Lookup P2P léger (sans email / téléphone)
create or replace function public.dcs_lookup_handle(p_needle text)
returns table (
  id uuid,
  username text,
  pi_username text,
  display_name text,
  invite_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  n text := lower(trim(coalesce(p_needle, '')));
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if n = '' then return; end if;
  return query
    select p.id, p.username, p.pi_username, p.display_name, p.invite_code
    from public.profiles p
    where lower(p.username) = n
       or lower(coalesce(p.pi_username, '')) = n
       or upper(p.invite_code) = upper(n)
    limit 1;
end;
$$;

revoke all on function public.dcs_lookup_handle(text) from public;
grant execute on function public.dcs_lookup_handle(text) to authenticated;
