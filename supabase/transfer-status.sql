-- Statuts Transfer : Confirmé (P2P) / En attente (Mobile Money)
-- Exécuter dans Supabase → SQL Editor (sûr à rejouer)

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
    values (uid, 'Frais', p_detail, '-' || trim(to_char(fee, '9999999999990.########')) || ' PI', 'Confirmé');
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
  perform dcs_notify(uid, 'Transfert P2P confirmé', dest_label, 'transfer');
  perform dcs_notify(dest_id, 'Fonds reçus', trim(to_char(p_amount, '9999999999990.########')) || ' ' || p_symbol, 'transfer');

  return jsonb_build_object('ok', true, 'p2p', true, 'dest', dest_label);
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
  res := dcs_transfer_p2p(p_symbol, p_amount, p_fee_pi, p_destination, p_detail);
  if (res->>'ok')::boolean and coalesce((res->>'p2p')::boolean, false) then
    return res;
  end if;

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

grant execute on function public.dcs_transfer_p2p to authenticated;
grant execute on function public.dcs_create_payout to authenticated;
