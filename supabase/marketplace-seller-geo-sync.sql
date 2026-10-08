-- Pays / ville vendeur toujours à jour dans le catalogue (vendeurs actuels ET futurs)
-- Exécuter APRÈS marketplace-seller-public.sql — Supabase → SQL Editor → Run

-- 1) À chaque publication / modification d’annonce : compléter depuis le profil
create or replace function public.dcs_listing_fill_seller_geo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p_country text;
  p_city text;
begin
  if new.seller_id is null then
    return new;
  end if;
  select nullif(trim(country), ''), nullif(trim(city), '')
    into p_country, p_city
  from profiles
  where id = new.seller_id;

  new.seller_country := coalesce(nullif(trim(new.seller_country), ''), p_country, '');
  new.seller_city := coalesce(nullif(trim(new.seller_city), ''), p_city, '');
  return new;
end;
$$;

drop trigger if exists trg_listing_fill_seller_geo on public.marketplace_listings;
create trigger trg_listing_fill_seller_geo
  before insert or update of seller_id, seller_country, seller_city
  on public.marketplace_listings
  for each row execute function public.dcs_listing_fill_seller_geo();

-- 2) Quand un membre change pays / ville dans son profil : propager à ses annonces
create or replace function public.dcs_profile_sync_listing_geo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.country, '') is distinct from coalesce(old.country, '')
     or coalesce(new.city, '') is distinct from coalesce(old.city, '') then
    update marketplace_listings
    set
      seller_country = coalesce(nullif(trim(new.country), ''), seller_country, ''),
      seller_city = coalesce(nullif(trim(new.city), ''), seller_city, '')
    where seller_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_sync_listing_geo on public.profiles;
create trigger trg_profile_sync_listing_geo
  after update of country, city
  on public.profiles
  for each row execute function public.dcs_profile_sync_listing_geo();

-- 3) Rattrapage immédiat des annonces existantes sans pays
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

-- Vérification
select seller_name, seller_country, seller_city
from public.marketplace_listings
where seller_id is not null
order by created_at desc;
