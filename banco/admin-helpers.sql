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
-- 3) Pedidos do selo de especialista (migração 018)
-- ------------------------------------------------
-- Sem isso, quem pede o selo em "Especialistas" fica em análise pra
-- sempre. A decisão passa SEMPRE pelas funções abaixo (não dar update
-- direto em profiles): elas registram o histórico, gravam o motivo que a
-- pessoa vê na tela e congelam a área do selo.

-- ver pedidos em análise (comprovação = link ou registro para conferir)
select r.id as pedido, p.display_name, p.email,
       r.profession_title as area, r.profession_status as situacao,
       r.evidence as comprovacao, r.message as mensagem, r.created_at
from public.specialist_requests r
join public.profiles p on p.id = r.user_id
where r.status = 'pending'
order by r.created_at;

-- aprovar (troque o id do pedido)
select public.decidir_pedido_especialista('<id-do-pedido>', true);

-- recusar (troque o id; o motivo é obrigatório e aparece para a pessoa)
select public.decidir_pedido_especialista('<id-do-pedido>', false, '<motivo>');

-- retirar o selo de quem já é especialista (motivo obrigatório, aparece
-- para a pessoa). O selo some na hora em depoimentos, comentários e
-- respostas (é lido ao vivo de profiles.is_specialist).
select public.revogar_especialista(
  (select id from public.profiles where email = '<email-da-conta>'),
  '<motivo>'
);

-- histórico de uma pessoa
select r.status, r.profession_title, r.evidence, r.decision_reason, r.created_at, r.decided_at
from public.specialist_requests r
join public.profiles p on p.id = r.user_id
where p.email = '<email-da-conta>'
order by r.created_at desc;

-- ------------------------------------------------
-- 4) Tópicos do fórum
-- ------------------------------------------------
-- Não precisam de aprovação — aparecem assim que criados
-- ("Anyone can view forum topics" já é policy aberta). Se um tópico
-- criado pelo app não estiver aparecendo, o problema não é moderação;
-- vale conferir se a conta usada pra criar está realmente logada.

-- ------------------------------------------------
-- 5) Excluir uma conta a pedido (LGPD)
-- ------------------------------------------------
-- Desde a migração 016 a própria pessoa exclui a conta pelo app
-- (Perfil > Excluir minha conta): apaga a foto, os dados pessoais e
-- anonimiza as publicações, sem passar por aqui. Use este roteiro só
-- quando o pedido chegar por e-mail (ex.: a pessoa perdeu o acesso).
--
-- O pedido chega por e-mail (contat3.inova@gmail.com), enviado do endereço
-- cadastrado. IRREVERSÍVEL: apagar o usuário remove o perfil e, em cascata,
-- resultados do teste, badges, curtidas e denúncias feitas pela conta.
-- Depoimentos, comentários, tópicos e respostas FICAM, sem autor
-- (user_id = null), e aparecem como "Usuário removido" (migração 016).
-- Se a pessoa pedir que alguma publicação suma, apague-a antes.
--
-- Passo 1 — conferir quem é e quantas publicações ficarão anônimas (troque o e-mail)
select p.id, p.email, p.display_name,
  (select count(*) from public.test_results        where user_id = p.id) as testes,
  (select count(*) from public.experiences         where user_id = p.id) as depoimentos,
  (select count(*) from public.experience_comments where user_id = p.id) as comentarios,
  (select count(*) from public.forum_topics        where user_id = p.id) as topicos,
  (select count(*) from public.forum_replies       where user_id = p.id) as respostas
from public.profiles p
where p.email = '<email-da-conta>';

-- Passo 2 — apagar a conta (use o id do passo 1). Se preferir, faça pelo
-- painel: Authentication > Users > ... > Delete user (mesmo efeito).
delete from auth.users where id = '<id-da-conta>';

-- Passo 3 — a foto de perfil NÃO é apagada junto (fica no Storage). Apague pelo
-- painel: Storage > avatars > pasta com o id da conta. Evite "delete from
-- storage.objects" por SQL: remove o registro mas pode deixar o arquivo.
