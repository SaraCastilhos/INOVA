-- ================================================
-- Migração 011 — Admin pode fixar/fechar tópicos do fórum
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- Não destrutivo: só adiciona uma policy.
-- ================================================
--
-- Contexto: as colunas forum_topics.is_pinned e is_closed já existem e já
-- têm efeito na interface (ordenação dos fixados, selo "Fixado", caixa de
-- resposta escondida quando fechado), mas não havia nenhuma forma legítima
-- de alterá-las:
--   - a policy do autor ("Users can update own topics") tem
--     with check (is_pinned = false and is_closed = false), ou seja,
--     proíbe o próprio dono de fixar/fechar;
--   - não existia policy de UPDATE para admin.
-- Até aqui, a única forma de fixar/fechar era um UPDATE manual no SQL Editor.
--
-- Esta migração adiciona a policy de UPDATE para admin. As policies
-- permissivas de UPDATE passam a ser OR: um admin (mesmo sendo o autor)
-- consegue alterar qualquer coluna; um usuário comum continua limitado
-- pela policy do autor.

drop policy if exists "Admins can update any topic" on public.forum_topics;
create policy "Admins can update any topic" on public.forum_topics
  for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
