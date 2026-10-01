-- ================================================
-- Migração 006 — Impede que o próprio usuário fixe/feche seu tópico
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Problema: a policy de INSERT em forum_topics já exige is_pinned = false
-- e is_closed = false na criação (migração 001), mas a policy de UPDATE
-- só checava "auth.uid() = user_id", sem repetir essa restrição. Como o
-- app usa a anon key direto no browser, qualquer usuário autenticado
-- conseguia, via console/devtools, chamar o client Supabase diretamente
-- e fixar ou fechar o próprio tópico:
--   supabase.from('forum_topics').update({ is_pinned: true }).eq('id', 'meu-topico')
--
-- Hoje o app não tem nenhuma tela de "editar tópico", então a policy de
-- UPDATE não é usada por nenhum fluxo legítimo além dessa brecha — mas
-- ela já existe no schema, então fechamos a mesma forma que o INSERT.

drop policy if exists "Users can update own topics" on public.forum_topics;
create policy "Users can update own topics" on public.forum_topics
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and is_pinned = false
    and is_closed = false
  );
