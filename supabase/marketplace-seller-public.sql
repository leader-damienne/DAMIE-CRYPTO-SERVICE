-- Drapeaux vendeurs visibles par TOUS (anon + connectés)
-- Exécuter dans Supabase → SQL Editor → Run
-- 1) RPC profils publics  2) pays/ville dénormalisés sur les annonces

-- ——— RPC profils publics (contourne RLS own-only) ———
create or replace function public.dcs_seller_public_profiles(p_ids uuid[])
returns table (
  id uuid,
  username text,
  display_name text,
  first_name text,
  last_name text,
  pi_username text,
  bio text,
  city text,
  country text,
  address text,
  phone text,
  avatar text,
  kyc text,
  created_at timestamptz,
  phone_linked boolean,
  gmail_linked boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return;
  end if;
  return query
    select
      p.id,
      p.username,
      p.display_name,
      p.first_name,
      p.last_name,
      p.pi_username,
      p.bio,
      p.city,
      p.country,
      case when auth.uid() is null then null::text else p.address end,
      case when auth.uid() is null then null::text else p.phone end,
      p.avatar,
      p.kyc,
      p.created_at,
      coalesce(p.phone_linked, false),
      coalesce(p.gmail_linked, false)
    from public.profiles p
    where p.id = any (p_ids);
end;
$$;

revoke all on function public.dcs_seller_public_profiles(uuid[]) from public;
grant execute on function public.dcs_seller_public_profiles(uuid[]) to anon, authenticated;

-- ——— Colonnes pays/ville sur les annonces (SELECT public via RLS listings) ———
alter table public.marketplace_listings
  add column if not exists seller_country text default '';

alter table public.marketplace_listings
  add column if not exists seller_city text default '';

-- Remplir depuis les profils vendeurs existants
update public.marketplace_listings l
set
  seller_country = coalesce(nullif(trim(l.seller_country), ''), nullif(trim(p.country), ''), ''),
  seller_city = coalesce(nullif(trim(l.seller_city), ''), nullif(trim(p.city), ''), '')
from public.profiles p
where l.seller_id = p.id
  and (
    coalesce(trim(l.seller_country), '') = ''
    or coalesce(trim(l.seller_city), '') = ''
  );

-- Index utile pour filtres futurs
create index if not exists marketplace_listings_seller_country_idx
  on public.marketplace_listings (seller_country)
  where active = true;
