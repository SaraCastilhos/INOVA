-- ================================================
-- Migração 016 — Exclusão de conta pelo app + anonimização
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Contexto (RNF07 / RN05): até aqui a exclusão era por pedido via e-mail,
-- feita à mão por SQL, e apagava junto as publicações da pessoa (todas as
-- FKs eram "on delete cascade"). O requisito pede que os dados pessoais
-- sumam, mas que as publicações fiquem com o autor "Usuário removido".
--
-- Esta migração:
--   1. Troca o cascade por "set null" nas 4 tabelas de publicação
--      (depoimentos, comentários, tópicos e respostas): a publicação fica,
--      sem autor. Resultados do teste, badges, curtidas e denúncias feitas
--      pela pessoa continuam sendo apagados (cascade) — são dados pessoais.
--   2. Antes de o perfil ser apagado, troca o author_name dos depoimentos
--      (cópia do nome, guardada na própria linha) por "Usuário removido".
--      Fica num trigger em profiles, então vale tanto para o botão do app
--      quanto para a exclusão manual pelo painel do Supabase.
--   3. Cria delete_own_account(): a pessoa logada apaga a PRÓPRIA conta.
--      security definer porque o cliente não tem permissão em auth.users;
--      só apaga o id de auth.uid(), nunca outro.
--
-- A foto de perfil (Storage) não é apagada aqui — o app apaga a pasta
-- avatars/<id> antes de chamar a função (policy de delete já permite).

-- ------------------------------------------------
-- 1) Publicações: on delete set null + user_id opcional
-- ------------------------------------------------
do $$
declare
  t text;
  c text;
begin
  foreach t in array array['experiences', 'experience_comments', 'forum_topics', 'forum_replies'] loop
    -- Remove a FK atual de user_id, qualquer que seja o nome dela.
    for c in
      select con.conname
      from pg_constraint con
      join pg_attribute a
        on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
      where con.conrelid = format('public.%I', t)::regclass
        and con.contype = 'f'
        and a.attname = 'user_id'
    loop
      execute format('alter table public.%I drop constraint %I', t, c);
    end loop;

    execute format('alter table public.%I alter column user_id drop not null', t);
    execute format(
      'alter table public.%I add constraint %I foreign key (user_id) references public.profiles(id) on delete set null',
      t, t || '_user_id_fkey'
    );
  end loop;
end $$;

-- ------------------------------------------------
-- 2) Nome do autor nos depoimentos vira "Usuário removido"
-- ------------------------------------------------
create or replace function public.anonymize_profile_content()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.experiences
    set author_name = 'Usuário removido'
    where user_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_anonymize_profile_content on public.profiles;
create trigger trg_anonymize_profile_content
  before delete on public.profiles
  for each row execute procedure public.anonymize_profile_content();

-- ------------------------------------------------
-- 3) Excluir a própria conta
-- ------------------------------------------------
-- Apagar de auth.users dispara, em cascata: profiles (→ trigger acima e
-- "set null" nas publicações), test_results, user_badges, experience_likes
-- e content_reports feitos pela pessoa.
create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Você precisa estar logado para excluir a conta.';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ------------------------------------------------
-- Conferência (opcional): as 4 FKs devem aparecer com confdeltype = 'n'
-- (set null).
-- ------------------------------------------------
-- select conrelid::regclass as tabela, conname, confdeltype
-- from pg_constraint
-- where contype = 'f'
--   and conname in ('experiences_user_id_fkey', 'experience_comments_user_id_fkey',
--                   'forum_topics_user_id_fkey', 'forum_replies_user_id_fkey');
