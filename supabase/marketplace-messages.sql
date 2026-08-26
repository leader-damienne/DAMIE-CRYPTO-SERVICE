-- Messagerie Marketplace (acheteur ↔ vendeur) — rendez-vous livraison, etc.
-- À exécuter dans Supabase → SQL Editor (une fois).

create table if not exists public.marketplace_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.marketplace_listings (id) on delete set null,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  sender_label text,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint marketplace_messages_not_self check (sender_id <> recipient_id),
  constraint marketplace_messages_body_len check (
    char_length(trim(body)) > 0 and char_length(body) <= 2000
  )
);

create index if not exists marketplace_messages_inbox_idx
  on public.marketplace_messages (recipient_id, created_at desc);

create index if not exists marketplace_messages_sent_idx
  on public.marketplace_messages (sender_id, created_at desc);

create index if not exists marketplace_messages_thread_idx
  on public.marketplace_messages (listing_id, created_at asc);

alter table public.marketplace_messages enable row level security;

drop policy if exists "market_msg_select_participants" on public.marketplace_messages;
create policy "market_msg_select_participants" on public.marketplace_messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "market_msg_insert_sender" on public.marketplace_messages;
create policy "market_msg_insert_sender" on public.marketplace_messages
  for insert with check (auth.uid() = sender_id and auth.uid() <> recipient_id);

drop policy if exists "market_msg_update_recipient" on public.marketplace_messages;
create policy "market_msg_update_recipient" on public.marketplace_messages
  for update using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

grant select, insert, update on public.marketplace_messages to authenticated;

-- Envoi + notification destinataire
create or replace function public.dcs_send_marketplace_message(
  p_listing_id uuid,
  p_recipient_id uuid,
  p_body text,
  p_sender_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cleaned text := trim(coalesce(p_body, ''));
  label text;
  listing_title text;
  msg_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'Non authentifié');
  end if;
  if p_recipient_id is null then
    return jsonb_build_object('ok', false, 'error', 'Destinataire manquant');
  end if;
  if p_recipient_id = uid then
    return jsonb_build_object('ok', false, 'error', 'Impossible de vous écrire à vous-même');
  end if;
  if cleaned = '' or char_length(cleaned) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'Message invalide (1–2000 caractères)');
  end if;
  if not exists (select 1 from profiles where id = p_recipient_id) then
    return jsonb_build_object('ok', false, 'error', 'Destinataire introuvable');
  end if;

  if p_listing_id is not null then
    select title into listing_title from marketplace_listings where id = p_listing_id;
  end if;

  select coalesce(
    nullif(trim(p_sender_label), ''),
    nullif(display_name, ''),
    nullif(pi_username, ''),
    username,
    'Utilisateur DCS'
  )
  into label
  from profiles
  where id = uid;

  insert into marketplace_messages (listing_id, sender_id, recipient_id, sender_label, body)
  values (p_listing_id, uid, p_recipient_id, label, cleaned)
  returning id into msg_id;

  perform dcs_notify(
    p_recipient_id,
    'Message Marketplace',
    coalesce(label, 'Un utilisateur') ||
      case when listing_title is not null then ' · ' || listing_title else '' end ||
      ' : ' || left(cleaned, 120),
    'market'
  );

  return jsonb_build_object('ok', true, 'id', msg_id);
end;
$$;

grant execute on function public.dcs_send_marketplace_message(uuid, uuid, text, text) to authenticated;
