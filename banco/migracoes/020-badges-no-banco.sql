-- ================================================
-- Migração 020 — Badges concedidas pelo banco
-- Rodar manualmente no SQL Editor do Supabase, DEPOIS da 019.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Até aqui as badges eram concedidas pelo navegador: depois de publicar, o
-- app contava as publicações da pessoa e inseria a badge em user_badges. A
-- policy só conferia se a badge era para a própria conta, então qualquer
-- usuário conseguia se dar qualquer badge pelo console. Além disso, a badge
-- só era concedida quando a contagem era EXATAMENTE 1 (ou 3) naquele
-- momento: se essa chamada falhasse uma vez, a pessoa nunca mais a recebia.
--
-- Agora:
--   - um gatilho em cada tabela-fonte concede as badges que a pessoa já
--     merece, a cada teste ou publicação nova (contagem >= limite, então
--     uma falha antiga se corrige sozinha na próxima publicação);
--   - ninguém insere em user_badges pelo app (sem policy de insert e sem
--     permissão de insert para anon/authenticated); só o gatilho insere;
--   - uma conferência única no fim desta migração dá a cada pessoa as badges
--     que ela já merecia e não recebeu.
--
-- O que NÃO muda: as badges continuam visíveis só para a própria pessoa
-- (RN06) e os critérios são os mesmos de antes.
--
-- Não remove badges já concedidas. Para conferir se alguém se deu badges
-- sem ter feito nada, ver banco/admin-helpers.sql, seção 6.
--
-- Compatível com a versão anterior do app: se esta migração entrar antes
-- do código novo, o navegador antigo tenta inserir, o banco recusa (o app
-- ignora o erro em silêncio) e o gatilho concede a badge do mesmo jeito.

-- ------------------------------------------------
-- 1) Concessão
-- ------------------------------------------------
-- Critérios (os mesmos de antes, agora com "pelo menos"):
--   first_test       1+ resultado do teste
--   test_master      3+ resultados do teste
--   first_experience 1+ depoimento
--   first_topic      1+ tópico no fórum
--   first_reply      1+ resposta no fórum
--   first_comment    1+ comentário em depoimento
-- Conta todas as linhas da pessoa (inclusive depoimento escondido): a
-- badge marca que ela participou, não que o conteúdo segue no ar.
create or replace function public.conceder_badges(p_usuario uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_testes integer;
begin
  if p_usuario is null then
    return;
  end if;

  select count(*) into v_testes from public.test_results where user_id = p_usuario;

  insert into public.user_badges (user_id, badge_id)
  select p_usuario, b.id
  from public.badges b
  where (b.code = 'first_test' and v_testes >= 1)
     or (b.code = 'test_master' and v_testes >= 3)
     or (b.code = 'first_experience'
         and exists (select 1 from public.experiences where user_id = p_usuario))
     or (b.code = 'first_topic'
         and exists (select 1 from public.forum_topics where user_id = p_usuario))
     or (b.code = 'first_reply'
         and exists (select 1 from public.forum_replies where user_id = p_usuario))
     or (b.code = 'first_comment'
         and exists (select 1 from public.experience_comments where user_id = p_usuario))
  on conflict (user_id, badge_id) do nothing;
end;
$$;

-- Só o banco chama (gatilho e a conferência abaixo).
revoke all on function public.conceder_badges(uuid) from public, anon, authenticated;

-- Gatilho genérico das tabelas-fonte. Uma falha na badge nunca pode impedir
-- a publicação ou o teste de serem gravados: o erro vira só um aviso.
create or replace function public.trg_conceder_badges()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  begin
    perform public.conceder_badges(new.user_id);
  exception when others then
    raise warning 'Badges não concedidas para %: %', new.user_id, sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.trg_conceder_badges() from public, anon, authenticated;

drop trigger if exists trg_conceder_badges on public.test_results;
create trigger trg_conceder_badges
  after insert on public.test_results
  for each row execute procedure public.trg_conceder_badges();

drop trigger if exists trg_conceder_badges on public.experiences;
create trigger trg_conceder_badges
  after insert on public.experiences
  for each row execute procedure public.trg_conceder_badges();

drop trigger if exists trg_conceder_badges on public.forum_topics;
create trigger trg_conceder_badges
  after insert on public.forum_topics
  for each row execute procedure public.trg_conceder_badges();

drop trigger if exists trg_conceder_badges on public.forum_replies;
create trigger trg_conceder_badges
  after insert on public.forum_replies
  for each row execute procedure public.trg_conceder_badges();

drop trigger if exists trg_conceder_badges on public.experience_comments;
create trigger trg_conceder_badges
  after insert on public.experience_comments
  for each row execute procedure public.trg_conceder_badges();

-- ------------------------------------------------
-- 2) Fecha a inserção pelo app
-- ------------------------------------------------
drop policy if exists "System can insert badges" on public.user_badges;
revoke insert, update, delete on public.user_badges from anon, authenticated;

-- ------------------------------------------------
-- 3) Conferência única: badges que já eram merecidas
-- ------------------------------------------------
select public.conceder_badges(id) from public.profiles;

-- ------------------------------------------------
-- Conferência (opcional)
-- ------------------------------------------------
-- 1. A policy de insert saiu (deve listar só "Users can view own badges"):
--    select policyname from pg_policies where tablename = 'user_badges';
-- 2. Quantas badges cada código tem agora:
--    select b.code, count(ub.id) from public.badges b
--    left join public.user_badges ub on ub.badge_id = b.id group by b.code order by b.code;
