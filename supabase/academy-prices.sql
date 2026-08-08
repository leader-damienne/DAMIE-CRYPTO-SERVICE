-- Prix Academy (5 cours) en fractions de PI
-- Supabase → SQL Editor → Run

create or replace function public.dcs_sync_academy_prices()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.courses set price_pi = 0.00003
   where slug = 'intro-blockchain'
      or lower(title) = lower('Introduction à la blockchain');

  update public.courses set price_pi = 0.00008
   where slug = 'trading-debutants'
      or lower(title) = lower('Trading crypto pour débutants');

  update public.courses set price_pi = 0.00016
   where slug = 'analyse-technique'
      or lower(title) = lower('Analyse technique avancée');

  update public.courses set price_pi = 0.00006
   where slug = 'securite-actifs'
      or lower(title) = lower('Sécurité des actifs numériques');

  update public.courses set price_pi = 0.0001
   where slug = 'gestion-risques'
      or lower(title) = lower('Gestion des risques');

  -- Anciens prix entiers restants
  update public.courses
     set price_pi = case
       when price_pi >= 50 then 0.00016
       when price_pi >= 30 then 0.0001
       when price_pi >= 25 then 0.00008
       when price_pi >= 20 then 0.00006
       when price_pi >= 1 then 0.00003
       else price_pi
     end
   where price_pi >= 1;
end;
$$;

grant execute on function public.dcs_sync_academy_prices() to authenticated, anon;

select public.dcs_sync_academy_prices();
