-- Supprimer TOUTES les annonces marketplace fictives (seed démo)
-- Critère : seller_id IS NULL (pas de vrai compte vendeur)
-- Exécuter dans Supabase → SQL Editor → Run

-- 1) Achats liés aux annonces fictives
delete from public.marketplace_purchases
where listing_id in (
  select id from public.marketplace_listings
  where seller_id is null
);

-- 2) Signalements liés
delete from public.seller_reports
where listing_id in (
  select id from public.marketplace_listings
  where seller_id is null
);

-- 3) Messages liés (si table présente)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'marketplace_messages'
  ) then
    delete from public.marketplace_messages
    where listing_id in (
      select id from public.marketplace_listings where seller_id is null
    );
  end if;
end $$;

-- 4) Annonces sans vrai vendeur (seed Amina K., Jean-Marc D., Fatou S., Omar B., etc.)
delete from public.marketplace_listings
where seller_id is null;

-- 5) Posts communauté fictifs (mêmes noms démo)
delete from public.community_posts
where author_id is null
  and author_name in ('Amina K.', 'Jean-Marc D.', 'Fatou S.', 'Omar B.');

-- Contrôle : doit renvoyer 0
select count(*) as listings_sans_vendeur
from public.marketplace_listings
where seller_id is null;
