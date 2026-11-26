-- Retrait PI → wallet Pi (A2U) — exécuter dans SQL Editor une fois
-- Débite le solde DCS de façon idempotente (lié au payment_id Pi)

create or replace function public.dcs_debit_pi_for_withdraw(
  p_user uuid,
  p_amount numeric,
  p_payment_id text,
  p_txid text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bal numeric;
begin
  if p_user is null or coalesce(p_amount, 0) <= 0 or coalesce(p_payment_id, '') = '' then
    raise exception 'Paramètres invalides';
  end if;

  if exists (
    select 1 from transactions
    where user_id = p_user
      and meta->>'payment_id' = p_payment_id
      and meta->>'kind' = 'withdraw_pi'
  ) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  select amount into bal
  from wallets
  where user_id = p_user and symbol = 'PI'
  for update;

  if bal is null or bal < p_amount then
    raise exception 'Solde PI insuffisant (disponible: %)', coalesce(bal, 0);
  end if;

  update wallets
  set amount = amount - p_amount
  where user_id = p_user and symbol = 'PI';

  insert into transactions (user_id, type, detail, amount, status, meta)
  values (
    p_user,
    'Retrait Pi',
    'Retrait vers wallet Pi · ' || p_payment_id,
    '-' || trim(to_char(p_amount, '9999999999990.########')) || ' PI',
    'Confirmé',
    jsonb_build_object(
      'payment_id', p_payment_id,
      'txid', coalesce(p_txid, ''),
      'kind', 'withdraw_pi',
      'direction', 'app_to_user'
    )
  );

  begin
    insert into notifications (user_id, title, body, kind)
    values (
      p_user,
      'Retrait Pi envoyé',
      trim(to_char(p_amount, '9999999999990.########')) || ' PI vers votre wallet Pi',
      'withdraw'
    );
  exception
    when undefined_table then null;
  end;

  return jsonb_build_object('ok', true, 'amount', p_amount, 'balance', bal - p_amount);
end;
$$;

revoke all on function public.dcs_debit_pi_for_withdraw(uuid, numeric, text, text) from public;
revoke all on function public.dcs_debit_pi_for_withdraw(uuid, numeric, text, text) from anon;
revoke all on function public.dcs_debit_pi_for_withdraw(uuid, numeric, text, text) from authenticated;
grant execute on function public.dcs_debit_pi_for_withdraw(uuid, numeric, text, text) to service_role;
