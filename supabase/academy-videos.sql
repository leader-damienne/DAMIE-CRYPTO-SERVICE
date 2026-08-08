-- Academy vidéos — exécuter dans Supabase → SQL Editor
-- 1) Colonne vidéo sur les cours
-- 2) Bucket Storage "academy" pour vos fichiers (téléphone / PC)

alter table public.courses
  add column if not exists video_path text default '';

comment on column public.courses.video_path is
  'Chemin Storage bucket academy, ex. intro-blockchain/cours.mp4 — vide si pas de vidéo';

-- Bucket privé : lecture pour utilisateurs connectés seulement
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academy',
  'academy',
  false,
  209715200, -- 200 Mo max par fichier
  array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lecture : membre connecté (l’app n’affiche la vidéo qu’après achat du cours)
drop policy if exists "academy_select_auth" on storage.objects;
create policy "academy_select_auth"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'academy');

-- Upload / update / delete : réservé service_role (dashboard / vous)
-- Pas de policy insert pour authenticated → upload via Dashboard Supabase uniquement

grant select on public.courses to authenticated, anon;
