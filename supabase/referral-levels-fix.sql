-- Corrige le listing filleuls : match case-insensitive + jamais soi-même
-- À exécuter dans Supabase → SQL Editor

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
declare
  normalized text[];
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;
  if p_codes is null or array_length(p_codes, 1) is null then
    return;
  end if;

  select array_agg(distinct lower(trim(c)))
    into normalized
  from unnest(p_codes) as c
  where trim(c) <> '';

  if normalized is null or array_length(normalized, 1) is null then
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
    where p.id <> auth.uid()
      and lower(trim(coalesce(p.referred_by, ''))) = any (normalized)
    order by p.created_at desc;
end;
$$;

revoke all on function public.dcs_list_referrals_by_codes(text[]) from public;
grant execute on function public.dcs_list_referrals_by_codes(text[]) to authenticated;
