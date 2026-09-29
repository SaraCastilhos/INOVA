-- ================================================
-- Migração 012 — Remove a coluna morta forum_replies.is_specialist_answer
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: "drop column if exists" não falha se já tiver sido removida.
-- ================================================
--
-- Contexto: até a unificação do selo de especialista para o modelo "ao vivo"
-- (relatório 05/09, seção 3), cada resposta gravava uma "foto" do status do
-- autor nessa coluna. Desde então:
--   - respostas novas NÃO gravam mais o campo (fica no default false);
--   - a interface lê profiles.is_specialist ao vivo, nunca is_specialist_answer.
-- Nenhum código do app referencia a coluna (confirmado por busca no repositório).
--
-- Segurança: a remoção não pode quebrar o app porque nada lê nem escreve
-- essa coluna. É uma operação destrutiva só no sentido de que os valores
-- históricos guardados nela se perdem — valores que já não são usados para
-- nada. Se preferir preservar o histórico, basta NÃO rodar esta migração;
-- a coluna ociosa não atrapalha em nada.

alter table public.forum_replies drop column if exists is_specialist_answer;
