-- ================================================
-- Migração 001 — Fecha brechas de RLS
-- Rodar manualmente no SQL Editor do Supabase (projeto já em produção).
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Problema: as policies originais de UPDATE/INSERT só checam o dono da
-- linha (auth.uid() = user_id), mas não restringem QUAIS colunas podem
-- ser alteradas. Como o app usa a anon key direto no browser, qualquer
-- usuário autenticado consegue, via console/devtools, chamar o client
-- Supabase diretamente e:
--   - setar is_admin = true ou is_specialist = true no próprio perfil
--   - aprovar a própria solicitação de especialista (specialist_status)
--   - inserir um depoimento já com status = 'approved' (pula moderação)
--   - inserir um tópico de fórum já com is_pinned = true
--
-- Esta migração fecha essas três brechas sem quebrar nenhum fluxo hoje
-- usado pelo app (cadastro, teste, depoimentos, fórum, solicitar
-- verificação de especialista).

-- ================================================
-- 1) PROFILES — impedir auto-promoção
-- ================================================
--
-- Regra: o próprio usuário pode editar seu perfil livremente, EXCETO:
--   - is_admin: nunca pode ser alterado por ele mesmo
--   - is_specialist: só um admin pode ligar
--   - specialist_status: o usuário pode pedir verificação (-> 'pending'),
--     mas não pode se auto-aprovar ('approved') nem se rejeitar
-- Um admin (is_admin = true) continua podendo alterar qualquer perfil,
-- inclusive os desses campos — necessário para o futuro painel
-- administrativo (aprovar/recusar especialistas).

create or replace function public.protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  is_privileged boolean;
begin
  is_privileged := coalesce(auth.role(), '') = 'service_role'
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    );

  if is_privileged then
    return new;
  end if;

  -- is_admin: imutável fora do painel admin
  new.is_admin := old.is_admin;

  -- is_specialist: só é ligado por aprovação de admin
  new.is_specialist := old.is_specialist;

  -- specialist_status: usuário comum só pode mover para 'pending'
  -- (solicitar verificação); qualquer outra transição é revertida
  if new.specialist_status is distinct from old.specialist_status
     and new.specialist_status <> 'pending' then
    new.specialist_status := old.specialist_status;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_columns on public.profiles;
create trigger trg_protect_profile_privileged_columns
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileged_columns();

-- Policy extra: permite que um admin atualize o perfil de QUALQUER
-- usuário (hoje só existe policy para o dono atualizar o próprio).
-- Sem isso, um futuro painel administrativo não teria como aprovar
-- especialistas via RLS normal.
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile" on public.profiles
  for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ================================================
-- 2) EXPERIENCES — impedir publicar sem moderação
-- ================================================
--
-- O insert do app sempre manda status = 'pending', mas a policy antiga
-- não obrigava isso — um insert manual poderia mandar 'approved' e
-- pular a fila de revisão. Passa a exigir status = 'pending' e
-- is_featured = false na criação; aprovação/destaque passam a ser
-- ações administrativas (feitas com service_role, que já bypassa RLS).

drop policy if exists "Users can insert own experiences" on public.experiences;
create policy "Users can insert own experiences" on public.experiences
  for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and is_featured = false
  );

-- ================================================
-- 3) FORUM_TOPICS — impedir fixar tópico na criação
-- ================================================

drop policy if exists "Authenticated users can create topics" on public.forum_topics;
create policy "Authenticated users can create topics" on public.forum_topics
  for insert
  with check (
    auth.uid() = user_id
    and is_pinned = false
    and is_closed = false
  );
