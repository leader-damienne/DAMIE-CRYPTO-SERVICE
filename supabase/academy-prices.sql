-- Prix Academy en fractions de PI (peg $314,159)
-- Exécuter dans Supabase → SQL Editor

update public.courses set price_pi = 0.00003 where slug = 'intro-blockchain';
update public.courses set price_pi = 0.00008 where slug = 'trading-debutants';
update public.courses set price_pi = 0.00016 where slug = 'analyse-technique';
update public.courses set price_pi = 0.00006 where slug = 'securite-actifs';
update public.courses set price_pi = 0.0001 where slug = 'gestion-risques';

-- Si des cours existent sans slug, baisser les anciens prix entiers
update public.courses
   set price_pi = case
     when price_pi >= 50 then 0.00016
     when price_pi >= 30 then 0.0001
     when price_pi >= 25 then 0.00008
     when price_pi >= 20 then 0.00006
     when price_pi >= 10 then 0.00003
     else price_pi
   end
 where price_pi >= 1;
