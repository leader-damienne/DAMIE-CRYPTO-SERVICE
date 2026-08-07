-- Supprimer les annonces / posts marketplace fictifs (seed démo)
-- Exécuter dans Supabase → SQL Editor

delete from public.marketplace_purchases
where listing_id in (
  select id from public.marketplace_listings
  where seller_id is null
    and seller_name in ('Amina K.', 'Jean-Marc D.', 'Fatou S.', 'Omar B.')
);

delete from public.seller_reports
where listing_id in (
  select id from public.marketplace_listings
  where seller_id is null
    and seller_name in ('Amina K.', 'Jean-Marc D.', 'Fatou S.', 'Omar B.')
);

delete from public.marketplace_listings
where seller_id is null
  and seller_name in ('Amina K.', 'Jean-Marc D.', 'Fatou S.', 'Omar B.');

delete from public.community_posts
where author_id is null
  and author_name in ('Amina K.', 'Jean-Marc D.', 'Fatou S.', 'Omar B.');
