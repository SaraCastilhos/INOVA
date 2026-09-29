-- ================================================
-- Migração 005 — Comentários em depoimentos
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================

-- ------------------------------------------------
-- PARTE 1 — Contador de comentários em experiences
-- ------------------------------------------------
alter table public.experiences
  add column if not exists comments_count integer not null default 0;

-- ------------------------------------------------
-- PARTE 2 — Tabela de comentários
-- ------------------------------------------------
-- Mesmo padrão de forum_replies: sem aninhamento, aparece na hora
-- (sem fila de aprovação — o depoimento em si já foi moderado).

create table if not exists public.experience_comments (
  id uuid primary key default uuid_generate_v4(),
  experience_id uuid references public.experiences(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.experience_comments enable row level security;

drop policy if exists "Anyone can view comments on approved experiences" on public.experience_comments;
create policy "Anyone can view comments on approved experiences" on public.experience_comments
  for select using (
    exists (select 1 from public.experiences e where e.id = experience_id and e.status = 'approved')
  );

drop policy if exists "Authenticated users can comment" on public.experience_comments;
create policy "Authenticated users can comment" on public.experience_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.experience_comments;
create policy "Users can delete own comments" on public.experience_comments
  for delete using (auth.uid() = user_id);

drop policy if exists "Admins can delete any comment" on public.experience_comments;
create policy "Admins can delete any comment" on public.experience_comments
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ------------------------------------------------
-- PARTE 3 — Mantém comments_count sincronizado
-- ------------------------------------------------
create or replace function public.update_experience_comments_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.experiences set comments_count = comments_count + 1 where id = new.experience_id;
  elsif TG_OP = 'DELETE' then
    update public.experiences set comments_count = comments_count - 1 where id = old.experience_id;
  end if;
  return null;
end;
$$;

drop trigger if exists update_comments_count on public.experience_comments;
create trigger update_comments_count
  after insert or delete on public.experience_comments
  for each row execute procedure public.update_experience_comments_count();

-- ------------------------------------------------
-- PARTE 4 — Badge "Primeiro comentário"
-- ------------------------------------------------
insert into public.badges (code, name, description, icon, category, points) values
  ('first_comment', 'Participativo', 'Comentou em um depoimento pela primeira vez', '💭', 'community', 15)
on conflict (code) do nothing;
