-- ================================================
-- Migração 007 — Corrige contadores de likes/comentários/respostas
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Causa raiz do problema "a contagem de curtidas e comentários fica
-- errada": as funções de trigger que mantêm likes_count, comments_count
-- e replies_count faziam UPDATE em "experiences"/"forum_topics" sem
-- SECURITY DEFINER. Como RLS está habilitado nessas tabelas e NÃO existe
-- nenhuma policy de UPDATE liberando isso para o usuário comum (quem
-- realmente dispara o trigger ao curtir/comentar/responder), esse UPDATE
-- interno era bloqueado silenciosamente pelo RLS — 0 linhas afetadas,
-- sem erro nenhum. Ou seja: o contador no banco nunca era realmente
-- incrementado; o número que aparecia na tela era só o "chute" otimista
-- feito no navegador, que se perdia a cada recarregamento da página.
--
-- A correção segue o mesmo padrão já usado em outras funções deste
-- schema (handle_new_user, set_experience_author_name,
-- increment_topic_views): marcar a função como SECURITY DEFINER, para
-- que ela rode com o dono da função/tabela (que não é bloqueado por
-- RLS) em vez de rodar com o papel do usuário que disparou o trigger.

create or replace function public.update_experience_likes_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.experiences set likes_count = likes_count + 1 where id = new.experience_id;
  elsif TG_OP = 'DELETE' then
    update public.experiences set likes_count = likes_count - 1 where id = old.experience_id;
  end if;
  return null;
end;
$$;

create or replace function public.update_experience_comments_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.experiences set comments_count = comments_count + 1 where id = new.experience_id;
  elsif TG_OP = 'DELETE' then
    update public.experiences set comments_count = comments_count - 1 where id = old.experience_id;
  end if;
  return null;
end;
$$;

create or replace function public.update_topic_replies_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.forum_topics set replies_count = replies_count + 1 where id = new.topic_id;
  elsif TG_OP = 'DELETE' then
    update public.forum_topics set replies_count = replies_count - 1 where id = old.topic_id;
  end if;
  return null;
end;
$$;

-- ------------------------------------------------
-- Recalcula os contadores já existentes
-- ------------------------------------------------
-- O bug acima estava ativo desde o início, então os contadores salvos
-- hoje no banco estão desatualizados (provavelmente travados perto de 0
-- mesmo com likes/comentários/respostas reais existindo). Este passo
-- reconta a partir da fonte de verdade (as tabelas filhas) e corrige os
-- valores existentes. Seguro rodar de novo a qualquer momento.

update public.experiences e
set likes_count = coalesce(
  (select count(*) from public.experience_likes l where l.experience_id = e.id),
  0
);

update public.experiences e
set comments_count = coalesce(
  (select count(*) from public.experience_comments c where c.experience_id = e.id),
  0
);

update public.forum_topics t
set replies_count = coalesce(
  (select count(*) from public.forum_replies r where r.topic_id = t.id),
  0
);
