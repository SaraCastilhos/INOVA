-- ================================================
-- Migração 013 — Autor pode editar e fechar as próprias postagens
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente. Não destrutivo: adiciona uma coluna com default e reescreve
-- policies (sempre com "drop policy if exists" antes).
-- ================================================
--
-- Decisão (08/09/2026): o autor pode EDITAR (título/conteúdo/profissão) e
-- FECHAR (encerrar respostas / comentários) os próprios tópicos e
-- depoimentos. Continua SEM poder FIXAR — isso é exclusivo de admin.
-- Admin pode tudo (editar, fechar e fixar qualquer postagem).

-- --- FÓRUM -------------------------------------------------------------
-- Afrouxa a policy do autor: sai a trava de is_closed (o autor passa a
-- poder fechar/reabrir o próprio tópico); fica a trava de is_pinned
-- (fixar continua só via "Admins can update any topic", da migração 011).
drop policy if exists "Users can update own topics" on public.forum_topics;
create policy "Users can update own topics" on public.forum_topics
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and is_pinned = false
  );

-- --- DEPOIMENTOS -----------------------------------------------------
-- Nova coluna: is_closed encerra os COMENTÁRIOS do depoimento.
alter table public.experiences
  add column if not exists is_closed boolean not null default false;

-- Autor pode atualizar o próprio depoimento JÁ APROVADO. O with check
-- congela status = 'approved' e is_featured = false: como não há UI para
-- alterar esses campos e qualquer outro valor é recusado pela policy, o
-- autor não consegue se auto-aprovar nem se destacar (mesma proteção que
-- o INSERT já tinha).
drop policy if exists "Users can update own experiences" on public.experiences;
create policy "Users can update own experiences" on public.experiences
  for update
  using (auth.uid() = user_id and status = 'approved')
  with check (
    auth.uid() = user_id
    and status = 'approved'
    and is_featured = false
  );

drop policy if exists "Admins can update any experience" on public.experiences;
create policy "Admins can update any experience" on public.experiences
  for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Comentar passa a exigir depoimento aprovado E aberto. Antes a policy
-- só checava auth.uid() = user_id — nem validava o status do depoimento.
drop policy if exists "Authenticated users can comment" on public.experience_comments;
create policy "Authenticated users can comment" on public.experience_comments
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.experiences e
      where e.id = experience_id
        and e.status = 'approved'
        and e.is_closed = false
    )
  );
