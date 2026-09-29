-- ================================================
-- Migração 010 — Limite de caracteres e de frequência
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Até agora não existia nenhum limite de tamanho (nem de frequência de
-- postagem) para depoimentos, comentários, tópicos e respostas do
-- fórum — só bio/contato do perfil tinham limite. Esta migração fecha
-- essa lacuna com dois mecanismos independentes:
--
-- 1) Limite de caracteres, inspirado nos limites do LinkedIn: ~3000
--    para conteúdo "tipo post" (depoimento, corpo do tópico) e ~1250
--    para conteúdo "tipo comentário" (comentário em depoimento,
--    resposta de fórum). O título do tópico usa um limite próprio,
--    menor (200), por ser só um resumo curto.
--    Os mesmos números estão espelhados no front-end
--    (POST_LENGTH_LIMIT / COMMENT_LENGTH_LIMIT / TOPIC_TITLE_LENGTH_LIMIT
--    em community-section.tsx) — o navegador só dá feedback antecipado;
--    quem garante o limite de verdade é o banco.
--
-- 2) Limite de frequência: um usuário não pode ter mais de 30 registros
--    do mesmo tipo (depoimento, comentário, tópico ou resposta) nos
--    últimos 10 minutos. É um número generoso — não incomoda uso normal,
--    inclusive alguém participando ativamente de uma conversa — mas
--    barra flood automatizado. Implementado com um único trigger
--    genérico (usa TG_TABLE_NAME), reaplicado nas 4 tabelas.

-- ------------------------------------------------
-- PARTE 1 — Limites de caracteres
-- ------------------------------------------------

alter table public.experiences drop constraint if exists experiences_content_length;
alter table public.experiences
  add constraint experiences_content_length check (char_length(content) <= 3000);

alter table public.experience_comments drop constraint if exists experience_comments_content_length;
alter table public.experience_comments
  add constraint experience_comments_content_length check (char_length(content) <= 1250);

alter table public.forum_topics drop constraint if exists forum_topics_title_length;
alter table public.forum_topics
  add constraint forum_topics_title_length check (char_length(title) <= 200);

alter table public.forum_topics drop constraint if exists forum_topics_content_length;
alter table public.forum_topics
  add constraint forum_topics_content_length check (char_length(content) <= 3000);

alter table public.forum_replies drop constraint if exists forum_replies_content_length;
alter table public.forum_replies
  add constraint forum_replies_content_length check (char_length(content) <= 1250);

-- ------------------------------------------------
-- PARTE 2 — Limite de frequência (rate limit)
-- ------------------------------------------------
-- SECURITY DEFINER é necessário aqui: sem isso, a contagem rodaria sob
-- RLS do usuário comum, que não enxerga os próprios depoimentos ainda
-- pendentes nem os próprios comentários em depoimentos de terceiros —
-- o limite ficaria furado justamente pro conteúdo mais recente.

create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  recent_count integer;
begin
  execute format(
    'select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''10 minutes''',
    TG_TABLE_NAME
  ) into recent_count using new.user_id;

  if recent_count >= 30 then
    raise exception 'Você atingiu o limite de publicações por enquanto. Aguarde alguns minutos e tente novamente.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_rate_limit on public.experiences;
create trigger trg_rate_limit
  before insert on public.experiences
  for each row execute procedure public.enforce_rate_limit();

drop trigger if exists trg_rate_limit on public.experience_comments;
create trigger trg_rate_limit
  before insert on public.experience_comments
  for each row execute procedure public.enforce_rate_limit();

drop trigger if exists trg_rate_limit on public.forum_topics;
create trigger trg_rate_limit
  before insert on public.forum_topics
  for each row execute procedure public.enforce_rate_limit();

drop trigger if exists trg_rate_limit on public.forum_replies;
create trigger trg_rate_limit
  before insert on public.forum_replies
  for each row execute procedure public.enforce_rate_limit();
