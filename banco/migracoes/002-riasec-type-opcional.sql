-- ================================================
-- Migração 002 — Torna riasec_type opcional em experiences
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Contexto: o filtro/classificação por tipo RIASEC foi removido dos
-- Depoimentos e do Fórum (tanto na navegação quanto no envio), porque
-- a maioria dos usuários não conhece a teoria o suficiente para se
-- autoclassificar corretamente. A coluna riasec_type em "experiences"
-- era NOT NULL, então o formulário de depoimento pararia de funcionar
-- sem esta migração.
--
-- Nada é apagado: depoimentos já enviados mantêm o riasec_type que
-- tiverem; só deixa de ser exigido a partir de agora.

alter table public.experiences
  alter column riasec_type drop not null;
