-- ================================================
-- Migração 008 — Exclusão de respostas do fórum
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Hoje não existe nenhuma policy de DELETE em forum_replies — nem o
-- próprio autor consegue apagar a resposta que escreveu. Adiciona:
-- o autor pode apagar a própria resposta; um admin pode apagar
-- qualquer resposta (mesmo padrão já usado em experiences e
-- forum_topics, migração 003).
--
-- O contador replies_count do tópico já é mantido automaticamente pelo
-- trigger update_topic_replies_count (corrigido na migração 007) —
-- apagar uma resposta decrementa esse contador sozinho.

drop policy if exists "Users can delete own replies" on public.forum_replies;
create policy "Users can delete own replies" on public.forum_replies
  for delete using (auth.uid() = user_id);

drop policy if exists "Admins can delete any reply" on public.forum_replies;
create policy "Admins can delete any reply" on public.forum_replies
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
