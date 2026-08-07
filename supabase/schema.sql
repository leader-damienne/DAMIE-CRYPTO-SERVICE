-- DAMIE CRYPTO SERVICE — schéma production (Supabase)
-- Exécuter dans : Supabase → SQL Editor → New query → Run

-- Profils
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  email text unique not null,
  display_name text,
  first_name text default '',
  last_name text default '',
  phone text default '',
  country text default '',
  city text default '',
  address text default '',
  bio text default '',
  birth_date text default '',
  gender text default '',
  invite_code text unique not null,
  referred_by text default '',
  avatar text default '',
  kyc text default 'none',
  gmail_linked boolean default false,
  phone_linked boolean default false,
  google_auth boolean default false,
  language text default 'fr',
  deposit_pi_address text unique,
  created_at timestamptz default now()
);

-- Soldes wallet
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  symbol text not null,
  amount numeric not null default 0 check (amount >= 0),
  unique (user_id, symbol)
);

-- Historique
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  detail text default '',
  amount text default '',
  status text default 'Confirmé',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists transactions_user_created_idx
  on public.transactions (user_id, created_at desc);

-- Tickets support
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  subject text not null,
  message text not null,
  status text default 'open',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.support_tickets enable row level security;

-- Policies profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Lecture username pour transferts P2P (username / invite_code publics)
drop policy if exists "profiles_select_public_codes" on public.profiles;
create policy "profiles_select_public_codes" on public.profiles
  for select using (true);

-- Policies wallets
drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own" on public.wallets
  for select using (auth.uid() = user_id);

drop policy if exists "wallets_update_own" on public.wallets;
create policy "wallets_update_own" on public.wallets
  for update using (auth.uid() = user_id);

drop policy if exists "wallets_insert_own" on public.wallets;
create policy "wallets_insert_own" on public.wallets
  for insert with check (auth.uid() = user_id);

-- Policies transactions
drop policy if exists "tx_select_own" on public.transactions;
create policy "tx_select_own" on public.transactions
  for select using (auth.uid() = user_id);

drop policy if exists "tx_insert_own" on public.transactions;
create policy "tx_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

-- Policies tickets
drop policy if exists "tickets_insert_own" on public.support_tickets;
create policy "tickets_insert_own" on public.support_tickets
  for insert with check (auth.uid() = user_id);

drop policy if exists "tickets_select_own" on public.support_tickets;
create policy "tickets_select_own" on public.support_tickets
  for select using (auth.uid() = user_id);

-- Actifs initiaux (soldes à 0 — dépôt réel ensuite)
create or replace function public.dcs_seed_wallets(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sym text;
  symbols text[] := array['PI','XOF','XAF','USDT','BTC','ETH','BNB','SOL','XRP','XLM','TRX'];
begin
  foreach sym in array symbols loop
    insert into public.wallets (user_id, symbol, amount)
    values (p_user, sym, 0)
    on conflict (user_id, symbol) do nothing;
  end loop;
end;
$$;

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

  insert into public.profiles (
    id, username, email, display_name, first_name, last_name,
    phone, country, invite_code, referred_by, phone_linked
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
    coalesce(meta->>'phone', '') <> ''
  );

  perform public.dcs_seed_wallets(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.dcs_handle_new_user();

-- Swap atomique (débit / crédit + frais PI + historique)
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
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  if p_from_amt is null or p_from_amt <= 0 then raise exception 'Montant invalide'; end if;
  if p_from = p_to then raise exception 'Actifs identiques'; end if;

  select amount into bal_from from wallets where user_id = uid and symbol = p_from for update;
  select amount into bal_to from wallets where user_id = uid and symbol = p_to for update;
  select amount into bal_pi from wallets where user_id = uid and symbol = 'PI' for update;

  if bal_from is null or bal_to is null or bal_pi is null then
    raise exception 'Wallet incomplet';
  end if;
  if bal_from < p_from_amt then raise exception 'Solde % insuffisant', p_from; end if;
  if coalesce(p_fee_pi, 0) > 0 and bal_pi < p_fee_pi then
    raise exception 'Solde PI insuffisant pour les frais';
  end if;
  if p_from = 'PI' and bal_from < (p_from_amt + coalesce(p_fee_pi, 0)) then
    raise exception 'Solde PI insuffisant';
  end if;

  update wallets set amount = amount - p_from_amt where user_id = uid and symbol = p_from;
  update wallets set amount = amount + p_to_amt where user_id = uid and symbol = p_to;
  if coalesce(p_fee_pi, 0) > 0 then
    update wallets set amount = amount - p_fee_pi where user_id = uid and symbol = 'PI';
    insert into transactions (user_id, type, detail, amount, status)
    values (uid, 'Frais', p_detail, '-' || trim(to_char(p_fee_pi, '9999999999990.########')) || ' PI', 'Prélevé');
  end if;

  insert into transactions (user_id, type, detail, amount, status, meta)
  values (
    uid, 'Swap', p_detail,
    trim(to_char(p_from_amt, '9999999999990.########')) || ' ' || p_from,
    'Confirmé',
    jsonb_build_object('from', p_from, 'to', p_to, 'out', p_to_amt, 'fee_pi', p_fee_pi)
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- Transfert sortant (débit + frais)
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
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Montant invalide'; end if;

  select amount into bal from wallets where user_id = uid and symbol = p_symbol for update;
  select amount into bal_pi from wallets where user_id = uid and symbol = 'PI' for update;
  if bal is null then raise exception 'Actif introuvable'; end if;
  if bal < p_amount then raise exception 'Solde insuffisant'; end if;
  if coalesce(p_fee_pi, 0) > 0 and p_symbol <> 'PI' and bal_pi < p_fee_pi then
    raise exception 'Solde PI insuffisant pour les frais';
  end if;
  if p_symbol = 'PI' and bal < (p_amount + coalesce(p_fee_pi, 0)) then
    raise exception 'Solde PI insuffisant';
  end if;

  update wallets set amount = amount - p_amount where user_id = uid and symbol = p_symbol;
  if coalesce(p_fee_pi, 0) > 0 then
    update wallets set amount = amount - p_fee_pi where user_id = uid and symbol = 'PI';
    insert into transactions (user_id, type, detail, amount, status)
    values (uid, 'Frais', p_detail, '-' || trim(to_char(p_fee_pi, '9999999999990.########')) || ' PI', 'Prélevé');
  end if;

  insert into transactions (user_id, type, detail, amount, status)
  values (
    uid, 'Transfer', p_detail,
    trim(to_char(p_amount, '9999999999990.########')) || ' ' || p_symbol,
    'Envoyé'
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.wallets to authenticated;
grant select, insert on public.transactions to authenticated;
grant select, insert on public.support_tickets to authenticated;
grant execute on function public.dcs_swap to authenticated;
grant execute on function public.dcs_transfer to authenticated;
