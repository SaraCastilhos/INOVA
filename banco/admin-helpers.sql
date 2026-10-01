-- ================================================
-- Helpers administrativos — INOVA
-- NÃO é uma migração (não roda uma vez só). São consultas prontas
-- pra copiar/colar no SQL Editor do Supabase sempre que precisar
-- moderar conteúdo manualmente, enquanto não existe painel admin.
-- ================================================

-- ------------------------------------------------
-- 1) Criar contas de teste (admin e usuário comum)
-- ------------------------------------------------
-- Não dá pra criar usuário de auth só com SQL (o Supabase gerencia
-- hash de senha, confirmação etc. por fora da tabela auth.users).
-- Caminho certo, direto no Dashboard do Supabase:
--   Authentication → Users → Add user
--   - Email: pode ser qualquer formato válido, não precisa existir de
--     verdade (ex: admin@inova.test, usuario@inova.test)
--   - Marque "Auto Confirm User" para não precisar de e-mail de
--     confirmação
--   - Defina uma senha
-- Ao criar, o trigger on_auth_user_created já cria a linha
-- correspondente em public.profiles automaticamente.

-- Depois de criar a conta pelo Dashboard, promova a admin com:
update public.profiles
set is_admin = true
where email = 'admin@teste.com'; -- troque pelo e-mail que você usou

-- Pra conferir quem é admin hoje:
select id, display_name, email, is_admin from public.profiles where is_admin = true;

-- ------------------------------------------------
-- 2) Moderar depoimentos (pós-moderação — migração 014)
-- ------------------------------------------------
-- Depoimentos agora são publicados na hora. A moderação é reativa:
-- esconder ('rejected') ou apagar quando algo indevido for denunciado
-- ou visto. 'rejected' some da listagem mas mantém a linha no banco.

-- esconder um depoimento sem apagar (troque o id)
update public.experiences set status = 'rejected' where id = '<uuid-do-depoimento>';

-- voltar a exibir
update public.experiences set status = 'approved' where id = '<uuid-do-depoimento>';

-- depoimentos que ficaram 'pending' de antes da pós-moderação
select id, author_name, profession, content, created_at
from public.experiences
where status = 'pending'
order by created_at desc;

-- ------------------------------------------------
-- 2b) Fila de denúncias (content_reports — migração 014)
-- ------------------------------------------------
-- denúncias abertas, mais recentes primeiro
select
  r.id,
  r.content_type,
  r.content_id,
  r.reason,
  r.created_at,
  rep.display_name as denunciante
from public.content_reports r
join public.profiles rep on rep.id = r.reporter_id
where r.status = 'open'
order by r.created_at desc;

-- ver o conteúdo denunciado (rode a linha do tipo certo, com o content_id)
-- select * from public.experiences        where id = '<content_id>';
-- select * from public.experience_comments where id = '<content_id>';
-- select * from public.forum_topics       where id = '<content_id>';
-- select * from public.forum_replies      where id = '<content_id>';

-- depois de tratar: marca a denúncia (troque o id da denúncia)
update public.content_reports set status = 'reviewed'  where id = '<uuid-da-denuncia>';
update public.content_reports set status = 'dismissed' where id = '<uuid-da-denuncia>';

-- ------------------------------------------------
-- 2c) Lista de termos bloqueados (blocked_terms — migração 014)
-- ------------------------------------------------
select term from public.blocked_terms order by term;

-- adicionar / remover (texto simples, minúsculas, palavra inteira)
insert into public.blocked_terms (term) values ('<termo>') on conflict do nothing;
delete from public.blocked_terms where term = '<termo>';

-- ------------------------------------------------
-- 3) Aprovar solicitação de especialista
-- ------------------------------------------------
-- Mesma lógica: sem isso, quem pede verificação em "Especialistas"
-- fica travado em specialist_status = 'pending' pra sempre.

-- ver quem está pedindo
select id, display_name, email, specialist_area, specialist_status
from public.profiles
where specialist_status = 'pending';

-- aprovar (troque o e-mail)
update public.profiles
set is_specialist = true, specialist_status = 'approved'
where email = '<email-da-conta>';

-- ------------------------------------------------
-- 4) Tópicos do fórum
-- ------------------------------------------------
-- Não precisam de aprovação — aparecem assim que criados
-- ("Anyone can view forum topics" já é policy aberta). Se um tópico
-- criado pelo app não estiver aparecendo, o problema não é moderação;
-- vale conferir se a conta usada pra criar está realmente logada.
