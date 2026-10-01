-- ================================================
-- Migração 003 — Corrige trigger de profiles + adiciona exclusão
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================

-- ------------------------------------------------
-- PARTE 1 — Corrige protect_profile_privileged_columns
-- ------------------------------------------------
-- Bug: rodar um UPDATE direto no SQL Editor (fora do app, sem usuário
-- autenticado) faz auth.uid() retornar nulo. O trigger tratava isso
-- como "não privilegiado" e revertia silenciosamente qualquer
-- alteração em is_admin/is_specialist/specialist_status — inclusive
-- quando é você mesma, manualmente, promovendo uma conta a admin pelo
-- SQL Editor (o fluxo que o projeto pressupõe, já que não há painel
-- administrativo). Acesso direto ao banco sem contexto de usuário
-- autenticado passa a ser tratado como confiável.

create or replace function public.protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  is_privileged boolean;
begin
  is_privileged := auth.uid() is null
    or coalesce(auth.role(), '') = 'service_role'
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    );

  if is_privileged then
    return new;
  end if;

  new.is_admin := old.is_admin;
  new.is_specialist := old.is_specialist;

  if new.specialist_status is distinct from old.specialist_status
     and new.specialist_status <> 'pending' then
    new.specialist_status := old.specialist_status;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------
-- PARTE 2 — Exclusão de depoimentos e tópicos
-- ------------------------------------------------
-- Hoje não existe nenhuma policy de DELETE nessas tabelas (nem o
-- próprio autor conseguia apagar o que publicou). Adiciona: o autor
-- pode apagar o que é dele; um admin pode apagar de qualquer um.
-- Respostas do fórum são removidas automaticamente junto com o tópico
-- (a foreign key já tem "on delete cascade").

drop policy if exists "Users can delete own experiences" on public.experiences;
create policy "Users can delete own experiences" on public.experiences
  for delete using (auth.uid() = user_id);

drop policy if exists "Admins can delete any experience" on public.experiences;
create policy "Admins can delete any experience" on public.experiences
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "Users can delete own topics" on public.forum_topics;
create policy "Users can delete own topics" on public.forum_topics
  for delete using (auth.uid() = user_id);

drop policy if exists "Admins can delete any topic" on public.forum_topics;
create policy "Admins can delete any topic" on public.forum_topics
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
