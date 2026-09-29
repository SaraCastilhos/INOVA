-- ================================================
-- Migração 014 — Pós-moderação de depoimentos + filtro de conteúdo + denúncias
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente. Não destrutivo (não altera dados existentes).
-- ================================================
--
-- Decisão C4 (08/09/2026): depoimento deixa de ter fila de aprovação e
-- passa a ser publicado na hora, como os tópicos. A "rede de segurança"
-- para o conteúdo passa a ser: (1) filtro automático de termos ofensivos /
-- spam óbvio no banco e (2) botão de denúncia que alimenta uma fila para
-- o admin. A coluna experiences.status continua existindo — o admin pode
-- marcar 'rejected' para esconder um depoimento sem apagá-lo.

-- ---------------------------------------------------------------------
-- 1. PÓS-MODERAÇÃO DE DEPOIMENTOS
-- ---------------------------------------------------------------------
alter table public.experiences alter column status set default 'approved';

-- O INSERT do autor passa a exigir status = 'approved' (antes exigia
-- 'pending'). is_featured = false continua travado.
drop policy if exists "Users can insert own experiences" on public.experiences;
create policy "Users can insert own experiences" on public.experiences
  for insert with check (
    auth.uid() = user_id
    and status = 'approved'
    and is_featured = false
  );

-- NOTA: depoimentos que já estão em 'pending' continuam invisíveis até um
-- admin resolvê-los (aprovar ou rejeitar). Esta migração não mexe neles
-- de propósito — são conteúdo que ninguém revisou ainda.
--   select * from public.experiences where status = 'pending';

-- ---------------------------------------------------------------------
-- 2. FILTRO DE CONTEÚDO (termos ofensivos / spam óbvio)
-- ---------------------------------------------------------------------
create table if not exists public.blocked_terms (
  term text primary key,
  created_at timestamptz not null default now()
);

alter table public.blocked_terms enable row level security;

-- A lista não precisa ser pública; só admin lê e escreve.
drop policy if exists "Admins manage blocked terms" on public.blocked_terms;
create policy "Admins manage blocked terms" on public.blocked_terms
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Lista inicial deliberadamente curta e conservadora — só termos
-- inequívocos, para minimizar falso positivo. CURADORIA É SUA:
--   insert into public.blocked_terms (term) values ('novotermo');
--   delete from public.blocked_terms where term = 'termo';
-- Regras: use texto simples (sem regex), em minúsculas. A checagem é
-- por palavra inteira e ignora maiúsc./minúsc., mas NÃO ignora acento —
-- cadastre as variações relevantes.
insert into public.blocked_terms (term) values
  ('caralho'),
  ('porra'),
  ('buceta'),
  ('viado'),
  ('viadinho'),
  ('bicha'),
  ('puta que pariu'),
  ('vai se foder'),
  ('vai tomar no cu'),
  ('arrombado'),
  ('fdp'),
  ('filho da puta'),
  ('retardado'),
  ('mongoloide'),
  ('crioulo'),
  ('macaco de senzala'),
  ('sapatao'),
  ('traveco'),
  ('viadagem')
on conflict (term) do nothing;

-- Trigger genérico (via TG_TABLE_NAME, mesmo padrão do enforce_rate_limit).
-- Roda em experiences, experience_comments, forum_topics e forum_replies.
-- security definer: precisa ler blocked_terms, que é fechada por RLS.
create or replace function public.enforce_content_filter()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_text text;
  v_hit  text;
begin
  v_text := coalesce(new.content, '');
  if TG_TABLE_NAME = 'forum_topics' then
    v_text := v_text || ' ' || coalesce(new.title, '');
  end if;

  -- spam óbvio: 20+ do mesmo caractere seguidos ("aaaaaaaaaaaaaaaaaaaa")
  if v_text ~ '(.)\1{19,}' then
    raise exception 'Conteúdo não permitido: parece spam.';
  end if;

  -- termo bloqueado (palavra inteira, ignora caixa)
  select term into v_hit
  from public.blocked_terms
  where v_text ~* ('\y' || term || '\y')
  limit 1;

  if v_hit is not null then
    raise exception 'Conteúdo não permitido: contém linguagem ofensiva.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_content_filter on public.experiences;
create trigger trg_content_filter
  before insert on public.experiences
  for each row execute procedure public.enforce_content_filter();

drop trigger if exists trg_content_filter on public.experience_comments;
create trigger trg_content_filter
  before insert on public.experience_comments
  for each row execute procedure public.enforce_content_filter();

drop trigger if exists trg_content_filter on public.forum_topics;
create trigger trg_content_filter
  before insert on public.forum_topics
  for each row execute procedure public.enforce_content_filter();

drop trigger if exists trg_content_filter on public.forum_replies;
create trigger trg_content_filter
  before insert on public.forum_replies
  for each row execute procedure public.enforce_content_filter();

-- ---------------------------------------------------------------------
-- 3. DENÚNCIAS (fila para o admin)
-- ---------------------------------------------------------------------
create table if not exists public.content_reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  content_type text not null check (content_type in (
    'experience', 'experience_comment', 'forum_topic', 'forum_reply'
  )),
  content_id uuid not null,
  reason text check (char_length(reason) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  -- um usuário só denuncia o mesmo conteúdo uma vez
  unique (reporter_id, content_type, content_id)
);

alter table public.content_reports enable row level security;

-- Qualquer usuário logado pode denunciar (em seu próprio nome).
create policy "Users can create reports" on public.content_reports
  for insert with check (auth.uid() = reporter_id);

-- Só admin lê / trata a fila.
create policy "Admins can view reports" on public.content_reports
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Admins can update reports" on public.content_reports
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Admins can delete reports" on public.content_reports
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
