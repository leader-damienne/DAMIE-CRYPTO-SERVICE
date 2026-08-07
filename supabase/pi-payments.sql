-- Paiements Pi Network (SDK) — exécuter dans SQL Editor

create table if not exists public.pi_payments (
  id uuid primary key default gen_random_uuid(),
  payment_id text unique not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null check (amount > 0),
  memo text default '',
  status text not null default 'pending',
  txid text default '',
  pi_username text default '',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists pi_payments_user_idx
  on public.pi_payments (user_id, created_at desc);

alter table public.pi_payments enable row level security;

drop policy if exists "pi_payments_select_own" on public.pi_payments;
create policy "pi_payments_select_own" on public.pi_payments
  for select using (auth.uid() = user_id);

create or replace function public.dcs_credit_pi_from_payment(
  p_user uuid,
  p_amount numeric,
  p_payment_id text,
  p_txid text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null or coalesce(p_amount, 0) <= 0 or coalesce(p_payment_id, '') = '' then
    raise exception 'Paramètres invalides';
  end if;

  if exists (
    select 1 from transactions
    where user_id = p_user
      and meta->>'payment_id' = p_payment_id
  ) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  insert into wallets (user_id, symbol, amount)
  values (p_user, 'PI', p_amount)
  on conflict (user_id, symbol)
  do update set amount = wallets.amount + excluded.amount;

  insert into transactions (user_id, type, detail, amount, status, meta)
  values (
    p_user,
    'Dépôt Pi',
    'Paiement Pi Network · ' || p_payment_id,
    '+' || trim(to_char(p_amount, '9999999999990.########')) || ' PI',
    'Confirmé',
    jsonb_build_object('payment_id', p_payment_id, 'txid', coalesce(p_txid, ''))
  );

  begin
    insert into notifications (user_id, title, body, kind)
    values (
      p_user,
      'Dépôt Pi reçu',
      trim(to_char(p_amount, '9999999999990.########')) || ' PI crédités',
      'deposit'
    );
  exception
    when undefined_table then null;
  end;

  return jsonb_build_object('ok', true, 'amount', p_amount);
end;
$$;

grant select on public.pi_payments to authenticated;
revoke all on function public.dcs_credit_pi_from_payment(uuid, numeric, text, text) from public;
revoke all on function public.dcs_credit_pi_from_payment(uuid, numeric, text, text) from anon;
revoke all on function public.dcs_credit_pi_from_payment(uuid, numeric, text, text) from authenticated;
grant execute on function public.dcs_credit_pi_from_payment(uuid, numeric, text, text) to service_role;
