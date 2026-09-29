-- ================================================
-- Migração 004 — Foto de perfil (upload real), bio e contato
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================

-- ------------------------------------------------
-- PARTE 1 — Novas colunas em profiles
-- ------------------------------------------------
-- avatar_url já existia desde o schema original (só não tinha UI).
-- bio e contact são novas, com limite de tamanho pra evitar abuso.

alter table public.profiles
  add column if not exists bio text;

alter table public.profiles
  drop constraint if exists profiles_bio_length;
alter table public.profiles
  add constraint profiles_bio_length check (char_length(bio) <= 500);

alter table public.profiles
  add column if not exists contact text;

alter table public.profiles
  drop constraint if exists profiles_contact_length;
alter table public.profiles
  add constraint profiles_contact_length check (char_length(contact) <= 200);

-- ------------------------------------------------
-- PARTE 2 — Bucket de Storage para fotos de perfil
-- ------------------------------------------------
-- Bucket público de leitura (a foto aparece publicamente em
-- depoimentos, fórum e na lista de especialistas). Só o dono pode
-- enviar/trocar/apagar a própria foto — cada arquivo fica salvo em
-- "<user_id>/..." e as policies abaixo usam esse caminho para
-- restringir. RLS em storage.objects já vem habilitado pelo Supabase
-- por padrão, não precisa habilitar de novo.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
