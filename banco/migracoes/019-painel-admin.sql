-- ================================================
-- Migração 019 — Funções do painel de administração (/admin)
-- Rodar manualmente no SQL Editor do Supabase, DEPOIS da 018.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- Não altera dados existentes.
-- ================================================
--
-- O painel reúne o que até aqui era feito por SQL (banco/admin-helpers.sql):
-- fila de denúncias, pedidos do selo de especialista, depoimentos
-- escondidos e lista de termos bloqueados.
--
-- Por que funções (e não consultas diretas do app):
--   - desde a 017 o e-mail em profiles é fechado para o app; o admin
--     precisa dele para conferir pedidos de especialista;
--   - a policy de leitura de experiences só mostra 'approved', então o
--     admin não enxergaria (nem conseguiria republicar ou apagar) um
--     depoimento escondido ou pendente;
--   - tratar uma denúncia mexe em duas tabelas (conteúdo + denúncias) e
--     precisa ser uma coisa só.
--
-- Todas checam se quem chama é admin (profiles.is_admin). Mesma convenção
-- da 018: auth.uid() nulo = SQL Editor, tratado como admin; por isso o
-- execute é retirado de anon (para quem não está logado, auth.uid() também
-- é nulo).
--
-- Fica DE FORA de propósito: tornar alguém admin. Continua só pelo banco
-- (admin-helpers.sql, seção 1) — decisão de 17/11/2026.

-- ------------------------------------------------
-- 1) Checagem de admin
-- ------------------------------------------------
create or replace function public.exigir_admin()
returns void language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Apenas administradores podem usar o painel.';
  end if;
end;
$$;

-- ------------------------------------------------
-- 2) Denúncias
-- ------------------------------------------------
-- Uma linha por denúncia, já com o conteúdo denunciado (o painel agrupa
-- as denúncias do mesmo conteúdo). conteudo_existe = false quando o
-- conteúdo já foi apagado (pelo autor ou por um admin).
-- p_abertas = true: só as abertas; false: as já tratadas (últimas 100).
create or replace function public.admin_listar_denuncias(p_abertas boolean default true)
returns table (
  denuncia_id uuid,
  content_type text,
  content_id uuid,
  motivo text,
  status text,
  criada_em timestamptz,
  denunciante text,
  conteudo_existe boolean,
  titulo text,
  texto text,
  autor_id uuid,
  autor_nome text,
  situacao text,
  publicado_em timestamptz,
  contexto text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.exigir_admin();

  return query
  select
    r.id,
    r.content_type,
    r.content_id,
    r.reason,
    r.status,
    r.created_at,
    rep.display_name,
    coalesce(e.id, c.id, t.id, fr.id) is not null,
    t.title,
    coalesce(e.content, c.content, t.content, fr.content),
    coalesce(e.user_id, c.user_id, t.user_id, fr.user_id),
    coalesce(e.author_name, a.display_name),
    e.status,
    coalesce(e.created_at, c.created_at, t.created_at, fr.created_at),
    -- onde o conteúdo está: tópico da resposta / autor do depoimento comentado
    coalesce(t2.title, e2.author_name)
  from public.content_reports r
  left join public.profiles rep on rep.id = r.reporter_id
  left join public.experiences e
    on r.content_type = 'experience' and e.id = r.content_id
  left join public.experience_comments c
    on r.content_type = 'experience_comment' and c.id = r.content_id
  left join public.forum_topics t
    on r.content_type = 'forum_topic' and t.id = r.content_id
  left join public.forum_replies fr
    on r.content_type = 'forum_reply' and fr.id = r.content_id
  left join public.forum_topics t2 on t2.id = fr.topic_id
  left join public.experiences e2 on e2.id = c.experience_id
  left join public.profiles a on a.id = coalesce(e.user_id, c.user_id, t.user_id, fr.user_id)
  where (p_abertas and r.status = 'open')
     or (not p_abertas and r.status <> 'open')
  order by r.created_at desc
  limit case when p_abertas then 500 else 100 end;
end;
$$;

-- Apaga um conteúdo (qualquer situação, inclusive depoimento escondido) e
-- dá como tratadas as denúncias abertas dele e dos filhos que somem junto
-- (comentários do depoimento, respostas do tópico).
create or replace function public.admin_apagar_conteudo(p_tipo text, p_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.exigir_admin();

  if p_tipo = 'experience' then
    update public.content_reports set status = 'reviewed'
      where status = 'open'
        and content_type = 'experience_comment'
        and content_id in (select id from public.experience_comments where experience_id = p_id);
    delete from public.experiences where id = p_id;
  elsif p_tipo = 'experience_comment' then
    delete from public.experience_comments where id = p_id;
  elsif p_tipo = 'forum_topic' then
    update public.content_reports set status = 'reviewed'
      where status = 'open'
        and content_type = 'forum_reply'
        and content_id in (select id from public.forum_replies where topic_id = p_id);
    delete from public.forum_topics where id = p_id;
  elsif p_tipo = 'forum_reply' then
    delete from public.forum_replies where id = p_id;
  else
    raise exception 'Tipo de conteúdo inválido.';
  end if;

  update public.content_reports set status = 'reviewed'
    where status = 'open' and content_type = p_tipo and content_id = p_id;
end;
$$;

-- Trata todas as denúncias abertas de um conteúdo de uma vez.
--   'descartar' → denúncia sem fundamento; o conteúdo fica (dismissed)
--   'resolver'  → dá como tratada sem mexer no conteúdo (ex.: já apagado)
--   'esconder'  → só depoimento: some do site, sem apagar (reviewed)
--   'apagar'    → apaga o conteúdo (reviewed)
create or replace function public.admin_tratar_denuncias(p_tipo text, p_conteudo uuid, p_acao text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.exigir_admin();

  if p_tipo not in ('experience', 'experience_comment', 'forum_topic', 'forum_reply') then
    raise exception 'Tipo de conteúdo inválido.';
  end if;

  if p_acao = 'apagar' then
    perform public.admin_apagar_conteudo(p_tipo, p_conteudo);
    return;
  end if;

  if p_acao = 'esconder' then
    if p_tipo <> 'experience' then
      raise exception 'Só depoimentos podem ser escondidos; os outros conteúdos são apagados.';
    end if;
    update public.experiences set status = 'rejected' where id = p_conteudo;
    if not found then
      raise exception 'Este depoimento já foi apagado.';
    end if;
  elsif p_acao not in ('descartar', 'resolver') then
    raise exception 'Ação inválida.';
  end if;

  update public.content_reports
    set status = case when p_acao = 'descartar' then 'dismissed' else 'reviewed' end
    where status = 'open' and content_type = p_tipo and content_id = p_conteudo;
end;
$$;

-- ------------------------------------------------
-- 3) Depoimentos escondidos ('rejected') e pendentes antigos ('pending')
-- ------------------------------------------------
create or replace function public.admin_listar_depoimentos_ocultos()
returns setof public.experiences
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.exigir_admin();

  return query
  select * from public.experiences
  where status in ('pending', 'rejected')
  order by created_at desc;
end;
$$;

-- Publica ('approved') ou esconde ('rejected') um depoimento.
create or replace function public.admin_definir_status_depoimento(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.exigir_admin();

  if p_status not in ('approved', 'rejected') then
    raise exception 'Situação inválida.';
  end if;

  update public.experiences set status = p_status where id = p_id;
  if not found then
    raise exception 'Este depoimento já foi apagado.';
  end if;
end;
$$;

-- ------------------------------------------------
-- 4) Especialistas
-- ------------------------------------------------
-- Pedidos em análise, com o e-mail da conta (fechado para o app desde a
-- 017). A decisão continua por decidir_pedido_especialista (018).
create or replace function public.admin_listar_pedidos_especialista()
returns table (
  pedido_id uuid,
  user_id uuid,
  display_name text,
  email text,
  avatar_url text,
  profession_title text,
  profession_status text,
  evidence text,
  message text,
  created_at timestamptz,
  pedidos_anteriores integer
)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.exigir_admin();

  return query
  select
    r.id,
    r.user_id,
    p.display_name,
    p.email,
    p.avatar_url,
    r.profession_title,
    r.profession_status,
    r.evidence,
    r.message,
    r.created_at,
    (select count(*)::integer from public.specialist_requests o
      where o.user_id = r.user_id and o.id <> r.id)
  from public.specialist_requests r
  join public.profiles p on p.id = r.user_id
  where r.status = 'pending'
  order by r.created_at;
end;
$$;

-- Quem tem o selo hoje, com a data da aprovação (nula para quem foi
-- aprovado antes da 018). A revogação continua por revogar_especialista.
create or replace function public.admin_listar_especialistas()
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  specialist_area text,
  aprovado_em timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.exigir_admin();

  return query
  select
    p.id,
    p.display_name,
    p.avatar_url,
    p.specialist_area,
    (select max(r.decided_at) from public.specialist_requests r
      where r.user_id = p.id and r.status = 'approved')
  from public.profiles p
  where p.is_specialist = true
  order by p.display_name;
end;
$$;

-- ------------------------------------------------
-- 5) Termos bloqueados: formato seguro
-- ------------------------------------------------
-- O filtro (014) monta uma expressão regular com cada termo. Um termo com
-- caractere especial ("(", "[", "\"...) quebraria a expressão e TODA
-- publicação passaria a dar erro. Agora que dá para cadastrar pelo painel,
-- o banco só aceita letras minúsculas (com acento), números, espaço e
-- hífen. "not valid": vale para termos novos, sem reprovar os já
-- cadastrados por SQL. A leitura e a escrita seguem pela policy da 014
-- (só admin).
alter table public.blocked_terms drop constraint if exists blocked_terms_formato;
alter table public.blocked_terms add constraint blocked_terms_formato check (
  char_length(term) between 2 and 60
  and term ~ '^[a-z0-9à-ÿ]+([ -][a-z0-9à-ÿ]+)*$'
) not valid;

-- ------------------------------------------------
-- 6) Permissões
-- ------------------------------------------------
revoke all on function public.exigir_admin() from public, anon;
revoke all on function public.admin_listar_denuncias(boolean) from public, anon;
revoke all on function public.admin_apagar_conteudo(text, uuid) from public, anon;
revoke all on function public.admin_tratar_denuncias(text, uuid, text) from public, anon;
revoke all on function public.admin_listar_depoimentos_ocultos() from public, anon;
revoke all on function public.admin_definir_status_depoimento(uuid, text) from public, anon;
revoke all on function public.admin_listar_pedidos_especialista() from public, anon;
revoke all on function public.admin_listar_especialistas() from public, anon;
grant execute on function public.exigir_admin() to authenticated;
grant execute on function public.admin_listar_denuncias(boolean) to authenticated;
grant execute on function public.admin_apagar_conteudo(text, uuid) to authenticated;
grant execute on function public.admin_tratar_denuncias(text, uuid, text) to authenticated;
grant execute on function public.admin_listar_depoimentos_ocultos() to authenticated;
grant execute on function public.admin_definir_status_depoimento(uuid, text) to authenticated;
grant execute on function public.admin_listar_pedidos_especialista() to authenticated;
grant execute on function public.admin_listar_especialistas() to authenticated;

-- ------------------------------------------------
-- Conferência (opcional)
-- ------------------------------------------------
-- 1. As 8 funções existem:
--    select proname from pg_proc
--    where proname in ('exigir_admin', 'admin_listar_denuncias', 'admin_apagar_conteudo',
--      'admin_tratar_denuncias', 'admin_listar_depoimentos_ocultos',
--      'admin_definir_status_depoimento', 'admin_listar_pedidos_especialista',
--      'admin_listar_especialistas');
-- 2. No SQL Editor (conta como admin), deve listar as denúncias abertas:
--    select * from public.admin_listar_denuncias();
