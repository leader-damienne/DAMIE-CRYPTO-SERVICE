-- Notifications DCS — une alerte pour chaque transaction
-- Exécuter dans Supabase → SQL Editor (sûr à rejouer)

-- 1) Helper notify avec anti-doublon (2 min)
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
  if p_user is null or coalesce(p_title, '') = '' then
    return;
  end if;
  if exists (
    select 1
    from public.notifications
    where user_id = p_user
      and title = p_title
      and coalesce(body, '') = coalesce(p_body, '')
      and created_at > now() - interval '2 minutes'
  ) then
    return;
  end if;
  insert into public.notifications (user_id, title, body, kind)
  values (p_user, p_title, coalesce(p_body, ''), coalesce(nullif(p_kind, ''), 'info'));
exception
  when undefined_table then
    null;
end;
$$;

-- 2) Notify pour l’utilisateur connecté (front)
create or replace function public.dcs_notify_me(
  p_title text,
  p_body text default '',
  p_kind text default 'info'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dcs_notify(auth.uid(), p_title, p_body, p_kind);
end;
$$;

revoke all on function public.dcs_notify_me(text, text, text) from public;
grant execute on function public.dcs_notify_me(text, text, text) to authenticated;
grant execute on function public.dcs_notify(uuid, text, text, text) to authenticated;
grant execute on function public.dcs_notify(uuid, text, text, text) to service_role;

-- 3) Trigger : toute ligne dans transactions → notification
create or replace function public.dcs_notify_on_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  body text;
  kind text;
begin
  body := trim(both ' ·' from (
    coalesce(NEW.detail, '') ||
    case
      when coalesce(NEW.amount, '') <> '' then ' · ' || NEW.amount
      else ''
    end ||
    case
      when coalesce(NEW.status, '') <> '' then ' · ' || NEW.status
      else ''
    end
  ));
  kind := lower(regexp_replace(coalesce(NEW.type, 'info'), '[^a-zA-Z0-9]+', '', 'g'));
  if kind = '' then kind := 'tx'; end if;
  perform public.dcs_notify(
    NEW.user_id,
    coalesce(nullif(NEW.type, ''), 'Transaction'),
    body,
    kind
  );
  return NEW;
end;
$$;

drop trigger if exists trg_dcs_notify_on_transaction on public.transactions;
create trigger trg_dcs_notify_on_transaction
  after insert on public.transactions
  for each row
  execute function public.dcs_notify_on_transaction();

-- 4) Demande de dépôt manuel (pas toujours une transaction immédiate)
create or replace function public.dcs_notify_on_deposit_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dcs_notify(
    NEW.user_id,
    'Demande de dépôt',
    trim(to_char(NEW.amount_pi, '9999999999990.########')) || ' PI · en attente de validation',
    'deposit'
  );
  return NEW;
end;
$$;

drop trigger if exists trg_dcs_notify_on_deposit_request on public.deposit_requests;
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'deposit_requests'
  ) then
    execute '
      create trigger trg_dcs_notify_on_deposit_request
        after insert on public.deposit_requests
        for each row
        execute function public.dcs_notify_on_deposit_request()
    ';
  end if;
end $$;

-- 5) Politique lecture / maj (inchangée) + insert optionnel pour le front
drop policy if exists "notif_select_own" on public.notifications;
create policy "notif_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own" on public.notifications
  for update using (auth.uid() = user_id);

drop policy if exists "notif_insert_own" on public.notifications;
create policy "notif_insert_own" on public.notifications
  for insert with check (auth.uid() = user_id);

grant select, insert, update on public.notifications to authenticated;
