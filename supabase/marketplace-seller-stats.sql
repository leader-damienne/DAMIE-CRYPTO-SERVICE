-- Stats publiques vendeurs Marketplace (style P2P)
-- Supabase → SQL Editor → Run (une fois)

create or replace function public.dcs_marketplace_seller_stats()
returns table (
  seller_id uuid,
  listings_count bigint,
  sales_count bigint,
  min_price numeric,
  max_price numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select
    l.seller_id,
    count(*) filter (where l.active = true)::bigint as listings_count,
    (
      select count(*)::bigint
      from marketplace_purchases p
      join marketplace_listings lx on lx.id = p.listing_id
      where lx.seller_id = l.seller_id
    ) as sales_count,
    min(l.price_pi) filter (where l.active = true) as min_price,
    max(l.price_pi) filter (where l.active = true) as max_price
  from marketplace_listings l
  where l.seller_id is not null
  group by l.seller_id;
$$;

grant execute on function public.dcs_marketplace_seller_stats() to anon, authenticated;
