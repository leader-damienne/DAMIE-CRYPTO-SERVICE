-- DAMIE CRYPTO SERVICE — modules fonctionnels (marketplace, community, academy, etc.)
-- Exécuter APRÈS schema.sql (+ deposit-addresses / storage-avatars si déjà faits)
-- Supabase → SQL Editor → Run

-- ========== Tables ==========

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles (id) on delete set null,
  seller_name text not null,
  title text not null,
  price_pi numeric not null check (price_pi > 0),
  category text default 'Divers',
  excerpt text default '',
  content text default '',
  photos jsonb default '[]'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.marketplace_purchases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  price_pi numeric not null,
  created_at timestamptz default now(),
  unique (listing_id, buyer_id)
);

create table if not exists public.seller_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.marketplace_listings (id) on delete set null,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text not null,
  details text default '',
  created_at timestamptz default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  level text default 'Débutant',
  price_pi numeric not null check (price_pi >= 0),
  description text default '',
  content text default '',
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  price_pi numeric not null default 0,
  created_at timestamptz default now(),
  unique (course_id, user_id)
);

create table if not exists public.learning_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tag text default 'Guide',
  body text default '',
  published_at date default current_date,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text default '',
  kind text default 'info',
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_pi numeric not null check (amount_pi > 0),
  note text default '',
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  symbol text not null,
  amount numeric not null check (amount > 0),
  country text default '',
  method text default '',
  destination text not null,
  detail text default '',
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  doc_type text not null,
  id_path text default '',
  selfie_path text default '',
  address_path text default '',
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  beneficiary_id uuid not null references public.profiles (id) on delete cascade,
  from_user_id uuid references public.profiles (id) on delete set null,
  level int not null check (level between 1 and 3),
  fee_pi numeric not null,
  commission_pi numeric not null,
  kind text default 'fee',
  created_at timestamptz default now()
);

create index if not exists listings_active_idx on public.marketplace_listings (active, created_at desc);
create index if not exists community_created_idx on public.community_posts (created_at desc);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);

-- ========== RLS ==========

alter table public.marketplace_listings enable row level security;
alter table public.marketplace_purchases enable row level security;
alter table public.seller_reports enable row level security;
alter table public.community_posts enable row level security;
alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.learning_articles enable row level security;
alter table public.notifications enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.payout_requests enable row level security;
alter table public.kyc_submissions enable row level security;
alter table public.referral_commissions enable row level security;

drop policy if exists "listings_select_active" on public.marketplace_listings;
create policy "listings_select_active" on public.marketplace_listings
  for select using (active = true or auth.uid() = seller_id);

drop policy if exists "listings_insert_own" on public.marketplace_listings;
create policy "listings_insert_own" on public.marketplace_listings
  for insert with check (auth.uid() = seller_id);

drop policy if exists "listings_update_own" on public.marketplace_listings;
create policy "listings_update_own" on public.marketplace_listings
  for update using (auth.uid() = seller_id);

drop policy if exists "purchases_select_own" on public.marketplace_purchases;
create policy "purchases_select_own" on public.marketplace_purchases
  for select using (auth.uid() = buyer_id);

drop policy if exists "reports_insert_own" on public.seller_reports;
create policy "reports_insert_own" on public.seller_reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports_select_own" on public.seller_reports;
create policy "reports_select_own" on public.seller_reports
  for select using (auth.uid() = reporter_id);

drop policy if exists "posts_select_all" on public.community_posts;
create policy "posts_select_all" on public.community_posts for select using (true);

drop policy if exists "posts_insert_auth" on public.community_posts;
create policy "posts_insert_auth" on public.community_posts
  for insert with check (auth.uid() = author_id);

drop policy if exists "courses_select_active" on public.courses;
create policy "courses_select_active" on public.courses for select using (active = true);

drop policy if exists "enroll_select_own" on public.course_enrollments;
create policy "enroll_select_own" on public.course_enrollments
  for select using (auth.uid() = user_id);

drop policy if exists "articles_select_active" on public.learning_articles;
create policy "articles_select_active" on public.learning_articles for select using (active = true);

drop policy if exists "notif_select_own" on public.notifications;
create policy "notif_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own" on public.notifications
  for update using (auth.uid() = user_id);

drop policy if exists "deposit_req_own" on public.deposit_requests;
create policy "deposit_req_own" on public.deposit_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "payout_req_own" on public.payout_requests;
create policy "payout_req_own" on public.payout_requests
  for select using (auth.uid() = user_id);

drop policy if exists "kyc_own" on public.kyc_submissions;
create policy "kyc_own" on public.kyc_submissions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "commissions_own" on public.referral_commissions;
create policy "commissions_own" on public.referral_commissions
  for select using (auth.uid() = beneficiary_id);

-- ========== Helpers ==========

create or replace function public.dcs_notify(
  p_user uuid,
  p_title text,
  p_body text,
  p_kind text default 'info'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then return; end if;
  insert into notifications (user_id, title, body, kind)
  values (p_user, p_title, coalesce(p_body, ''), coalesce(p_kind, 'info'));
end;
$$;

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

  select id, invite_code into n1, code1 from profiles where invite_code = from_code limit 1;
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
  select id into n2 from profiles where invite_code = code2 limit 1;
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
  select id into n3 from profiles where invite_code = code2 limit 1;
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

-- Patch swap / transfer pour distribuer les commissions
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
  fee numeric := coalesce(p_fee_pi, 0);
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
  if fee > 0 and bal_pi < fee and p_from <> 'PI' then
    raise exception 'Solde PI insuffisant pour les frais';
  end if;
  if p_from = 'PI' and bal_from < (p_from_amt + fee) then
    raise exception 'Solde PI insuffisant';
  end if;

  update wallets set amount = amount - p_from_amt where user_id = uid and symbol = p_from;
  update wallets set amount = amount + p_to_amt where user_id = uid and symbol = p_to;
  if fee > 0 then
    update wallets set amount = amount - fee where user_id = uid and symbol = 'PI';
    insert into transactions (user_id, type, detail, amount, status)
    values (uid, 'Frais', p_detail, '-' || trim(to_char(fee, '9999999999990.########')) || ' PI', 'Prélevé');
    perform dcs_distribute_referral_fees(uid, fee, 'Swap');
  end if;

  insert into transactions (user_id, type, detail, amount, status, meta)
  values (
    uid, 'Swap', p_detail,
    trim(to_char(p_from_amt, '9999999999990.########')) || ' ' || p_from,
    'Confirmé',
    jsonb_build_object('from', p_from, 'to', p_to, 'out', p_to_amt, 'fee_pi', fee)
  );
  perform dcs_notify(uid, 'Swap confirmé', p_detail, 'swap');

  return jsonb_build_object('ok', true);
end;
$$;

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
  fee numeric := coalesce(p_fee_pi, 0);
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Montant invalide'; end if;

  select amount into bal from wallets where user_id = uid and symbol = p_symbol for update;
  select amount into bal_pi from wallets where user_id = uid and symbol = 'PI' for update;
  if bal is null then raise exception 'Actif introuvable'; end if;
  if bal < p_amount then raise exception 'Solde insuffisant'; end if;
  if fee > 0 and p_symbol <> 'PI' and bal_pi < fee then
    raise exception 'Solde PI insuffisant pour les frais';
  end if;
  if p_symbol = 'PI' and bal < (p_amount + fee) then
    raise exception 'Solde PI insuffisant';
  end if;

  update wallets set amount = amount - p_amount where user_id = uid and symbol = p_symbol;
  if fee > 0 then
    update wallets set amount = amount - fee where user_id = uid and symbol = 'PI';
    insert into transactions (user_id, type, detail, amount, status)
    values (uid, 'Frais', p_detail, '-' || trim(to_char(fee, '9999999999990.########')) || ' PI', 'Prélevé');
    perform dcs_distribute_referral_fees(uid, fee, 'Transfer');
  end if;

  insert into transactions (user_id, type, detail, amount, status)
  values (
    uid, 'Transfer', p_detail,
    trim(to_char(p_amount, '9999999999990.########')) || ' ' || p_symbol,
    'Envoyé'
  );
  perform dcs_notify(uid, 'Transfert envoyé', p_detail, 'transfer');

  return jsonb_build_object('ok', true);
end;
$$;

-- Transfert P2P interne (crédit destinataire DCS)
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
  fee numeric := coalesce(p_fee_pi, 0);
  needle text := lower(trim(coalesce(p_dest, '')));
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Montant invalide'; end if;
  if needle = '' then raise exception 'Destinataire requis'; end if;

  select id, coalesce(nullif(display_name, ''), username)
    into dest_id, dest_label
  from profiles
  where lower(username) = needle
     or lower(email) = needle
     or upper(invite_code) = upper(needle)
  limit 1;

  if dest_id is null then
    return jsonb_build_object('ok', false, 'error', 'Destinataire DCS introuvable', 'p2p', false);
  end if;
  if dest_id = uid then raise exception 'Impossible de vous transférer à vous-même'; end if;

  select amount into bal from wallets where user_id = uid and symbol = p_symbol for update;
  select amount into bal_pi from wallets where user_id = uid and symbol = 'PI' for update;
  if bal is null then raise exception 'Actif introuvable'; end if;
  if bal < p_amount then raise exception 'Solde insuffisant'; end if;
  if fee > 0 and p_symbol <> 'PI' and bal_pi < fee then
    raise exception 'Solde PI insuffisant pour les frais';
  end if;
  if p_symbol = 'PI' and bal < (p_amount + fee) then
    raise exception 'Solde PI insuffisant';
  end if;

  update wallets set amount = amount - p_amount where user_id = uid and symbol = p_symbol;
  update wallets set amount = amount + p_amount where user_id = dest_id and symbol = p_symbol;
  if fee > 0 then
    update wallets set amount = amount - fee where user_id = uid and symbol = 'PI';
    insert into transactions (user_id, type, detail, amount, status)
    values (uid, 'Frais', p_detail, '-' || trim(to_char(fee, '9999999999990.########')) || ' PI', 'Prélevé');
    perform dcs_distribute_referral_fees(uid, fee, 'Transfer');
  end if;

  insert into transactions (user_id, type, detail, amount, status)
  values (
    uid, 'Transfer', coalesce(p_detail, 'P2P → ' || dest_label),
    trim(to_char(p_amount, '9999999999990.########')) || ' ' || p_symbol,
    'Confirmé'
  );
  insert into transactions (user_id, type, detail, amount, status)
  values (
    dest_id, 'Réception', 'Reçu de membre DCS',
    '+' || trim(to_char(p_amount, '9999999999990.########')) || ' ' || p_symbol,
    'Confirmé'
  );
  perform dcs_notify(uid, 'Transfert P2P envoyé', dest_label, 'transfer');
  perform dcs_notify(dest_id, 'Fonds reçus', trim(to_char(p_amount, '9999999999990.########')) || ' ' || p_symbol, 'transfer');

  return jsonb_build_object('ok', true, 'p2p', true, 'dest', dest_label);
end;
$$;

create or replace function public.dcs_buy_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  listing record;
  bal numeric;
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  select * into listing from marketplace_listings where id = p_listing_id and active = true for update;
  if listing.id is null then raise exception 'Article introuvable'; end if;
  if listing.seller_id = uid then raise exception 'Vous ne pouvez pas acheter votre propre article'; end if;
  if exists(select 1 from marketplace_purchases where listing_id = p_listing_id and buyer_id = uid) then
    raise exception 'Déjà acheté';
  end if;

  select amount into bal from wallets where user_id = uid and symbol = 'PI' for update;
  if bal is null or bal < listing.price_pi then raise exception 'Solde PI insuffisant'; end if;

  update wallets set amount = amount - listing.price_pi where user_id = uid and symbol = 'PI';
  if listing.seller_id is not null then
    update wallets set amount = amount + listing.price_pi where user_id = listing.seller_id and symbol = 'PI';
    insert into transactions (user_id, type, detail, amount, status)
    values (listing.seller_id, 'Vente', listing.title, '+' || trim(to_char(listing.price_pi, '9999999999990.########')) || ' PI', 'Reçu');
    perform dcs_notify(listing.seller_id, 'Vente Marketplace', listing.title || ' · +' || listing.price_pi::text || ' PI', 'market');
  end if;

  insert into marketplace_purchases (listing_id, buyer_id, price_pi)
  values (listing.id, uid, listing.price_pi);

  insert into transactions (user_id, type, detail, amount, status)
  values (uid, 'Marketplace', listing.title, '-' || trim(to_char(listing.price_pi, '9999999999990.########')) || ' PI', 'Payé');
  perform dcs_notify(uid, 'Achat Marketplace', listing.title, 'market');

  return jsonb_build_object('ok', true, 'title', listing.title, 'price', listing.price_pi, 'seller', listing.seller_name);
end;
$$;

create or replace function public.dcs_enroll_course(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  course record;
  bal numeric;
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  select * into course from courses where id = p_course_id and active = true;
  if course.id is null then raise exception 'Cours introuvable'; end if;
  if exists(select 1 from course_enrollments where course_id = p_course_id and user_id = uid) then
    return jsonb_build_object('ok', true, 'already', true, 'title', course.title, 'content', course.content);
  end if;

  select amount into bal from wallets where user_id = uid and symbol = 'PI' for update;
  if bal is null or bal < course.price_pi then raise exception 'Solde PI insuffisant'; end if;

  if course.price_pi > 0 then
    update wallets set amount = amount - course.price_pi where user_id = uid and symbol = 'PI';
    insert into transactions (user_id, type, detail, amount, status)
    values (uid, 'Academy', course.title, '-' || trim(to_char(course.price_pi, '9999999999990.########')) || ' PI', 'Payé');
  end if;

  insert into course_enrollments (course_id, user_id, price_pi)
  values (course.id, uid, course.price_pi);
  perform dcs_notify(uid, 'Cours débloqué', course.title, 'academy');

  return jsonb_build_object('ok', true, 'title', course.title, 'content', course.content, 'price', course.price_pi);
end;
$$;

create or replace function public.dcs_create_payout(
  p_symbol text,
  p_amount numeric,
  p_fee_pi numeric,
  p_country text,
  p_method text,
  p_destination text,
  p_detail text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  res jsonb;
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  -- Essai P2P d'abord
  res := dcs_transfer_p2p(p_symbol, p_amount, p_fee_pi, p_destination, p_detail);
  if (res->>'ok')::boolean and coalesce((res->>'p2p')::boolean, false) then
    return res;
  end if;

  -- Sinon débit + file d'attente Mobile Money / banque
  res := dcs_transfer(p_symbol, p_amount, p_fee_pi, p_detail);
  update public.transactions
     set status = 'En attente'
   where id = (
     select id from public.transactions
      where user_id = uid and type = 'Transfer'
      order by created_at desc
      limit 1
   );
  insert into payout_requests (user_id, symbol, amount, country, method, destination, detail, status)
  values (uid, p_symbol, p_amount, coalesce(p_country, ''), coalesce(p_method, ''), p_destination, coalesce(p_detail, ''), 'pending');
  perform dcs_notify(uid, 'Transfert en attente', 'Votre payout Mobile Money / banque est en file d''attente DCS.', 'payout');
  return jsonb_build_object('ok', true, 'p2p', false, 'queued', true);
end;
$$;

-- ========== Seeds contenu ==========

insert into public.courses (slug, title, level, price_pi, description, content, sort_order)
values
  ('intro-blockchain', 'Introduction à la blockchain', 'Débutant', 0.00003,
   'Les bases de la blockchain et de l''écosystème Pi.',
   'Module 1 — Qu''est-ce qu''une blockchain ?\nModule 2 — Wallets et clés.\nModule 3 — PI COIN sur DCS ($314,159).\nModule 4 — Bonnes pratiques de sécurité.', 1),
  ('trading-debutants', 'Trading crypto pour débutants', 'Débutant', 0.00008,
   'Ordres, paires, lecture d''un carnet d''ordres.',
   'Module 1 — Marchés spot.\nModule 2 — Ordres market/limit.\nModule 3 — Gestion du risque.\nModule 4 — Utiliser PI COIN comme unité stable.', 2),
  ('analyse-technique', 'Analyse technique avancée', 'Avancé', 0.00016,
   'Indicateurs, tendances et gestion des positions.',
   'Tendances, supports/résistances, RSI, MACD, et plan de trade adapté aux corridors CFA.', 3),
  ('securite-actifs', 'Sécurité des actifs numériques', 'Intermédiaire', 0.00006,
   'Wallets, phishing, bonnes pratiques.',
   '2FA, anti-phishing, sauvegarde, et checklist Afrique pour PI / XOF / XAF.', 4),
  ('gestion-risques', 'Gestion des risques', 'Intermédiaire', 0.0001,
   'Money management et psychologie du trader.',
   'Taille de position, stop mental, discipline, et rôle de PI COIN stable sur DCS.', 5)
on conflict (slug) do update set price_pi = excluded.price_pi;

insert into public.learning_articles (title, tag, body, published_at)
select * from (values
  ('Pourquoi PI COIN est au cœur de DCS', 'Actualité',
   'PI COIN est l''unité de compte stable de DAMIE CRYPTO SERVICE, fixée à $314,159. Elle sert au wallet, au swap, au marketplace et à l''Academy.',
   '2026-08-05'::date),
  ('Guide : swap PI COIN → XOF / XAF', 'Tutoriel',
   '1) Ouvrez Swap. 2) Choisissez PI → XOF ou XAF. 3) Vérifiez le taux indicatif. 4) Confirmez. Les frais (1 %) sont prélevés en PI COIN.',
   '2026-08-02'::date),
  ('Transferts transfrontaliers UEMOA ↔ CEMAC', 'Guide',
   'Utilisez Transfer pour envoyer vers Mobile Money ou banque. Si le destinataire a un compte DCS (pseudo / e-mail / code), le crédit est instantané (P2P). Sinon la demande est mise en file ops.',
   '2026-07-28'::date),
  ('Vendre du contenu payable en PI COIN', 'Marketplace',
   'Publiez un article dans Marketplace → Devenir vendeur. Les acheteurs paient en PI COIN ; vous êtes crédité automatiquement.',
   '2026-07-25'::date)
) as v(title, tag, body, published_at)
where not exists (select 1 from public.learning_articles limit 1);

-- Seed marketplace désactivé (vendeurs fictifs retirés)
-- Les annonces viennent uniquement des vrais vendeurs connectés.

insert into public.community_posts (author_id, author_name, body)
select null, v.author, v.body
from (values
  ('DCS Officiel', 'Bienvenue sur DCS Community — partagez vos questions et expériences.')
) as v(author, body)
where not exists (select 1 from public.community_posts limit 1);

-- ========== Storage ==========

insert into storage.buckets (id, name, public)
values ('marketplace', 'marketplace', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', false)
on conflict (id) do update set public = false;

drop policy if exists "market_public_read" on storage.objects;
create policy "market_public_read" on storage.objects
  for select using (bucket_id = 'marketplace');

drop policy if exists "market_owner_write" on storage.objects;
create policy "market_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'marketplace' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "kyc_owner_all" on storage.objects;
create policy "kyc_owner_all" on storage.objects
  for all using (
    bucket_id = 'kyc' and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'kyc' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========== Grants ==========

grant select, insert, update on public.marketplace_listings to authenticated;
grant select on public.marketplace_listings to anon;
grant select on public.marketplace_purchases to authenticated;
grant insert on public.seller_reports to authenticated;
grant select on public.seller_reports to authenticated;
grant select, insert on public.community_posts to authenticated;
grant select on public.community_posts to anon;
grant select on public.courses to authenticated, anon;
grant select on public.course_enrollments to authenticated;
grant select on public.learning_articles to authenticated, anon;
grant select, update on public.notifications to authenticated;
grant select, insert on public.deposit_requests to authenticated;
grant select on public.payout_requests to authenticated;
grant select, insert on public.kyc_submissions to authenticated;
grant select on public.referral_commissions to authenticated;

grant execute on function public.dcs_swap to authenticated;
grant execute on function public.dcs_transfer to authenticated;
grant execute on function public.dcs_transfer_p2p to authenticated;
grant execute on function public.dcs_buy_listing to authenticated;
grant execute on function public.dcs_enroll_course to authenticated;
grant execute on function public.dcs_create_payout to authenticated;
grant execute on function public.dcs_distribute_referral_fees to authenticated;
grant execute on function public.dcs_notify to authenticated;
