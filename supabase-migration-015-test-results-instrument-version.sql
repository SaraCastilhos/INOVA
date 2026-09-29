-- ================================================
-- Migração 015 — versão do instrumento em test_results
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Contexto: o teste vocacional passa a usar um instrumento versionado — a
-- adaptação pt-BR do O*NET Mini Interest Profiler (Mini-IP): 30 itens, escala
-- de 5 pontos (0 a 4), soma de 0 a 20 por tipo RIASEC.
--
-- Os resultados antigos foram gerados por um questionário caseiro de 24 itens,
-- escala 1 a 5, soma de 4 a 20 por tipo. As colunas "scores" e "answers" não
-- mudam de formato (jsonb / integer[]), mas o SIGNIFICADO dos números é outro —
-- resultados antigos e novos não são comparáveis.
--
-- Estas duas colunas deixam essa distinção explícita e permitem filtrar/
-- comparar só o que é comparável. Nada é apagado: as linhas já existentes
-- recebem o rótulo de legado pelos defaults abaixo.

alter table public.test_results
  add column if not exists instrument_slug text not null default 'riasec-legacy-24',
  add column if not exists instrument_version text not null default '0';

-- A partir de agora o app grava o slug e a versão reais do instrumento
-- (ex.: 'onet-mini-ip' / 'mini-ip-ptbr-0.1') em cada novo resultado.
