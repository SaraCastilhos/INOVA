-- ================================================
-- INOVA Platform - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ================================================
-- OCUPAÇÕES DA CBO — migração 017
-- ================================================
-- Lista oficial (MTE). Carga em banco/dados/cbo-ocupacoes.sql, gerada por
-- scripts/build-cbo.mjs. Leitura pública, escrita só pelo SQL Editor.
create table if not exists public.cbo_ocupacoes (
  codigo text primary key check (codigo ~ '^[0-9]{6}$'),
  titulo text not null
);

alter table public.cbo_ocupacoes enable row level security;

create policy "Anyone can read CBO" on public.cbo_ocupacoes
  for select using (true);

-- ================================================
-- PROFILES TABLE
-- ================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  email text,
  birth_date date,
  -- OBSOLETOS desde 12/11/2026 (user_type e last_type_change): o tipo de
  -- conta foi substituído pelo perfil profissional (profession_status) e o
  -- app não lê nem grava mais. Ficam no banco por compatibilidade.
  user_type text not null default 'estudante' check (user_type in ('estudante', 'profissional', 'ambos')),
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  contact text check (char_length(contact) <= 200),
  is_specialist boolean not null default false,
  specialist_status text not null default 'none' check (specialist_status in ('none', 'pending', 'approved', 'rejected')),
  specialist_area text,
  is_admin boolean not null default false,
  lgpd_consent boolean not null default false,
  lgpd_consent_date timestamptz,
  last_type_change timestamptz,
  -- Perfil profissional (migração 017). profession_title é cópia do título
  -- da CBO, preenchida pelo banco (enforce_profile_rules).
  profession_cbo text references public.cbo_ocupacoes(codigo) on delete set null,
  profession_title text,
  profession_status text check (profession_status in ('atuo', 'estudo', 'atuei')),
  experience_range text check (experience_range in ('ate-1', '1-4', '5-9', '10-mais')),
  education_level text check (education_level in ('fundamental', 'medio', 'tecnico', 'graduacao', 'especializacao', 'mestrado', 'doutorado')),
  education_course text check (char_length(education_course) <= 120),
  education_in_progress boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_profession_pair check ((profession_cbo is null) = (profession_status is null)),
  constraint profiles_experience_range_status check (experience_range is null or profession_status in ('atuo', 'atuei'))
);

-- RLS for profiles
alter table public.profiles enable row level security;

-- Todos veem todos os perfis, mas só as colunas públicas — ver
-- "PERFIL PROFISSIONAL E PRIVACIDADE" no fim do arquivo (grant select).
create policy "Users can view all profiles" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Impede que o próprio usuário se promova (is_admin/is_specialist) ou
-- se auto-aprove como especialista.
create or replace function public.protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  is_privileged boolean;
begin
  -- auth.uid() nulo = acesso direto ao banco (SQL Editor, migrações),
  -- sem contexto de usuário autenticado via app. Tratado como confiável,
  -- pois é o fluxo usado para criar/promover o admin manualmente.
  -- inova.specialist_sync: ligada (só na transação) pelas funções de pedido
  -- de especialista (migração 018) — ver "PEDIDOS DE ESPECIALISTA".
  is_privileged := auth.uid() is null
    or coalesce(auth.role(), '') = 'service_role'
    or coalesce(current_setting('inova.specialist_sync', true), '') = 'on'
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    );

  if is_privileged then
    return new;
  end if;

  -- Status e área do selo só mudam pelas funções da migração 018 (a área
  -- fica congelada depois da aprovação).
  new.is_admin := old.is_admin;
  new.is_specialist := old.is_specialist;
  new.specialist_status := old.specialist_status;
  new.specialist_area := old.specialist_area;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_columns on public.profiles;
create trigger trg_protect_profile_privileged_columns
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileged_columns();

-- Permite que um admin atualize o perfil de qualquer usuário
-- (necessário para o futuro painel administrativo aprovar especialistas).
create policy "Admins can update any profile" on public.profiles
  for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Auto-create profile on signup (birth_date vem dos metadados do signUp)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, birth_date, user_type, lgpd_consent, lgpd_consent_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    case
      when new.raw_user_meta_data->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$'
        then (new.raw_user_meta_data->>'birth_date')::date
      else null
    end,
    coalesce(new.raw_user_meta_data->>'user_type', 'estudante'),
    coalesce((new.raw_user_meta_data->>'lgpd_consent')::boolean, false),
    case when (new.raw_user_meta_data->>'lgpd_consent')::boolean then now() else null end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================
-- TEST RESULTS TABLE
-- ================================================
create table if not exists public.test_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  scores jsonb not null,
  primary_type text not null,
  secondary_type text,
  tertiary_type text,
  answers integer[],
  -- Qual instrumento/versão gerou este resultado (migração 015). O app grava
  -- 'onet-mini-ip' / a versão do JSON versionado. Resultados anteriores à
  -- adaptação do O*NET Mini-IP ficam como 'riasec-legacy-24' / '0' e não são
  -- comparáveis com os novos (escala e nº de itens diferentes).
  instrument_slug text not null default 'riasec-legacy-24',
  instrument_version text not null default '0',
  created_at timestamptz not null default now()
);

alter table public.test_results enable row level security;

create policy "Users can view own test results" on public.test_results
  for select using (auth.uid() = user_id);

create policy "Users can insert own test results" on public.test_results
  for insert with check (auth.uid() = user_id);

-- ================================================
-- EXPERIENCES TABLE
-- ================================================
create table if not exists public.experiences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null, -- null = autor excluiu a conta (migração 016)
  author_name text not null,
  -- Cópia da profissão do perfil na publicação (migração 017,
  -- set_experience_profession). Antigos: só texto livre, sem código.
  profession text not null,
  profession_cbo text references public.cbo_ocupacoes(codigo) on delete set null,
  profession_status text check (profession_status in ('atuo', 'estudo', 'atuei')),
  riasec_type text,
  content text not null check (char_length(content) <= 3000),
  video_url text,
  -- default 'approved': depoimento é publicado na hora (pós-moderação,
  -- migração 014). O admin pode marcar 'rejected' para esconder sem apagar.
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  is_featured boolean not null default false,
  is_closed boolean not null default false,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.experiences enable row level security;

create policy "Anyone can view approved experiences" on public.experiences
  for select using (status = 'approved');

-- status = 'approved': publica na hora (pós-moderação). is_featured = false
-- continua travado — destacar é ato editorial de admin.
create policy "Users can insert own experiences" on public.experiences
  for insert with check (
    auth.uid() = user_id
    and status = 'approved'
    and is_featured = false
  );

create policy "Users can delete own experiences" on public.experiences
  for delete using (auth.uid() = user_id);

create policy "Admins can delete any experience" on public.experiences
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Autor edita o próprio depoimento já aprovado (só o texto — a profissão
-- fica congelada por set_experience_profession, migração 017) e
-- encerra/reabre os comentários (is_closed). O with check congela
-- status='approved' e is_featured=false — sem UI para mudá-los e sem
-- outro valor aceito, o autor não se auto-aprova nem se destaca.
create policy "Users can update own experiences" on public.experiences
  for update
  using (auth.uid() = user_id and status = 'approved')
  with check (
    auth.uid() = user_id
    and status = 'approved'
    and is_featured = false
  );

create policy "Admins can update any experience" on public.experiences
  for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Preenche author_name a partir do perfil autenticado; impede que o
-- cliente informe um nome arbitrário na requisição de insert.
create or replace function public.set_experience_author_name()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.author_name := (
    select display_name
    from public.profiles
    where id = auth.uid()
  );
  return new;
end;
$$;

drop trigger if exists trg_set_experience_author on public.experiences;
create trigger trg_set_experience_author
  before insert on public.experiences
  for each row execute procedure public.set_experience_author_name();

-- ================================================
-- EXPERIENCE LIKES TABLE
-- ================================================
create table if not exists public.experience_likes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  experience_id uuid references public.experiences(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, experience_id)
);

alter table public.experience_likes enable row level security;

create policy "Users can manage own likes" on public.experience_likes
  for all using (auth.uid() = user_id);

-- Update likes count trigger
-- security definer: sem isso, a atualização do contador roda sob RLS
-- do usuário comum e é bloqueada silenciosamente (0 linhas afetadas).
create or replace function update_experience_likes_count()
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

drop trigger if exists update_likes_count on public.experience_likes;
create trigger update_likes_count
  after insert or delete on public.experience_likes
  for each row execute procedure update_experience_likes_count();

-- ================================================
-- EXPERIENCE COMMENTS TABLE
-- ================================================
create table if not exists public.experience_comments (
  id uuid primary key default uuid_generate_v4(),
  experience_id uuid references public.experiences(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null, -- null = autor excluiu a conta (migração 016)
  content text not null check (char_length(content) <= 1250),
  created_at timestamptz not null default now()
);

alter table public.experience_comments enable row level security;

create policy "Anyone can view comments on approved experiences" on public.experience_comments
  for select using (
    exists (select 1 from public.experiences e where e.id = experience_id and e.status = 'approved')
  );

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

create policy "Users can delete own comments" on public.experience_comments
  for delete using (auth.uid() = user_id);

create policy "Admins can delete any comment" on public.experience_comments
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- security definer pelo mesmo motivo do trigger de likes acima.
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

drop trigger if exists update_comments_count on public.experience_comments;
create trigger update_comments_count
  after insert or delete on public.experience_comments
  for each row execute procedure public.update_experience_comments_count();

-- ================================================
-- FORUM TOPICS TABLE
-- ================================================
create table if not exists public.forum_topics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null, -- null = autor excluiu a conta (migração 016)
  title text not null check (char_length(title) <= 200),
  content text not null check (char_length(content) <= 3000),
  riasec_type text,
  is_pinned boolean not null default false,
  is_closed boolean not null default false,
  views_count integer not null default 0,
  replies_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forum_topics enable row level security;

create policy "Anyone can view forum topics" on public.forum_topics
  for select using (true);

create policy "Authenticated users can create topics" on public.forum_topics
  for insert with check (
    auth.uid() = user_id
    and is_pinned = false
    and is_closed = false
  );

-- with check mantém a trava de is_pinned: fixar é exclusivo de admin
-- ("Admins can update any topic"). O autor pode editar título/conteúdo e
-- fechar/reabrir o próprio tópico.
create policy "Users can update own topics" on public.forum_topics
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and is_pinned = false
  );

create policy "Users can delete own topics" on public.forum_topics
  for delete using (auth.uid() = user_id);

create policy "Admins can delete any topic" on public.forum_topics
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Admin pode editar/fixar/fechar qualquer tópico. Fixar (is_pinned) é
-- exclusivo daqui: a policy do autor acima trava is_pinned = false.
create policy "Admins can update any topic" on public.forum_topics
  for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create or replace function public.increment_topic_views(topic_id uuid)
returns void language sql security definer set search_path = public
as $$
  update public.forum_topics
  set views_count = views_count + 1
  where id = topic_id;
$$;

-- ================================================
-- FORUM REPLIES TABLE
-- ================================================
create table if not exists public.forum_replies (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid references public.forum_topics(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null, -- null = autor excluiu a conta (migração 016)
  content text not null check (char_length(content) <= 1250),
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forum_replies enable row level security;

create policy "Anyone can view replies" on public.forum_replies
  for select using (true);

create policy "Authenticated users can create replies" on public.forum_replies
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own replies" on public.forum_replies
  for delete using (auth.uid() = user_id);

create policy "Admins can delete any reply" on public.forum_replies
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Update replies count trigger (security definer pelo mesmo motivo do
-- trigger de likes/comentários acima)
create or replace function update_topic_replies_count()
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

drop trigger if exists update_replies_count on public.forum_replies;
create trigger update_replies_count
  after insert or delete on public.forum_replies
  for each row execute procedure update_topic_replies_count();

-- ================================================
-- LIMITE DE FREQUÊNCIA DE PUBLICAÇÃO (anti-flood)
-- ================================================
-- Máximo de 30 registros do mesmo usuário, na mesma tabela, a cada 10
-- minutos. Aplicado em experiences, experience_comments, forum_topics
-- e forum_replies. security definer: a contagem precisa enxergar todas
-- as linhas do usuário (inclusive experiências pendentes), não só o
-- que a RLS comum deixaria ver.
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

-- ================================================
-- FILTRO DE CONTEÚDO (termos ofensivos / spam óbvio) — migração 014
-- ================================================
-- Rede de segurança da pós-moderação: bloqueia o insert de conteúdo com
-- termo da lista blocked_terms ou com spam óbvio. Aplicado nas 4 tabelas
-- de conteúdo, igual ao enforce_rate_limit.
create table if not exists public.blocked_terms (
  term text primary key,
  created_at timestamptz not null default now()
);

alter table public.blocked_terms enable row level security;

create policy "Admins manage blocked terms" on public.blocked_terms
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Lista inicial curta e conservadora. Curadoria manual via SQL:
--   insert into public.blocked_terms (term) values ('termo');
--   delete from public.blocked_terms where term = 'termo';
-- Texto simples, minúsculas; casa por palavra inteira, ignora caixa,
-- NÃO ignora acento.
insert into public.blocked_terms (term) values
  ('caralho'), ('porra'), ('buceta'), ('viado'), ('viadinho'),
  ('bicha'), ('puta que pariu'), ('vai se foder'), ('vai tomar no cu'),
  ('arrombado'), ('fdp'), ('filho da puta'), ('retardado'),
  ('mongoloide'), ('crioulo'), ('macaco de senzala'), ('sapatao'),
  ('traveco'), ('viadagem')
on conflict (term) do nothing;

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

  if v_text ~ '(.)\1{19,}' then
    raise exception 'Conteúdo não permitido: parece spam.';
  end if;

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

-- ================================================
-- DENÚNCIAS DE CONTEÚDO — migração 014
-- ================================================
-- Fila para o admin triar (enquanto não há painel, ver
-- banco/admin-helpers.sql).
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
  unique (reporter_id, content_type, content_id)
);

alter table public.content_reports enable row level security;

create policy "Users can create reports" on public.content_reports
  for insert with check (auth.uid() = reporter_id);

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

-- ================================================
-- BADGES TABLE
-- ================================================
create table if not exists public.badges (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  description text not null,
  icon text not null default '🏆',
  category text not null default 'onboarding' check (category in ('onboarding', 'test', 'community', 'engagement')),
  points integer not null default 10,
  created_at timestamptz not null default now()
);

alter table public.badges enable row level security;

create policy "Anyone can view badges" on public.badges
  for select using (true);

-- Insert default badges
insert into public.badges (code, name, description, icon, category, points) values
  ('first_test', 'Primeiro Teste', 'Completou o teste RIASEC pela primeira vez', '🎯', 'test', 20),
  ('test_master', 'Mestre dos Testes', 'Completou o teste RIASEC 3 vezes', '🏆', 'test', 50),
  ('first_experience', 'Compartilhador', 'Compartilhou sua primeira experiência profissional', '💬', 'community', 30),
  ('first_topic', 'Curioso', 'Criou seu primeiro tópico no fórum', '❓', 'community', 20),
  ('first_reply', 'Colaborador', 'Respondeu pela primeira vez no fórum', '💡', 'community', 20),
  ('first_comment', 'Participativo', 'Comentou em um depoimento pela primeira vez', '💭', 'community', 15)
on conflict (code) do nothing;

-- ================================================
-- USER BADGES TABLE
-- ================================================
create table if not exists public.user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_id uuid references public.badges(id) on delete cascade not null,
  earned_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "Users can view own badges" on public.user_badges
  for select using (auth.uid() = user_id);

create policy "System can insert badges" on public.user_badges
  for insert with check (auth.uid() = user_id);

-- ================================================
-- STORAGE — Fotos de perfil
-- ================================================
-- Bucket público de leitura; cada usuário só pode enviar/trocar/apagar
-- a própria foto, salva em "<user_id>/...".

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ================================================
-- EXCLUSÃO DE CONTA — migração 016
-- ================================================
-- A pessoa exclui a própria conta pelo app (Perfil > Excluir conta).
-- Dados pessoais somem em cascata (perfil, testes, badges, curtidas,
-- denúncias feitas); depoimentos, comentários, tópicos e respostas ficam,
-- com user_id = null ("Usuário removido"). A foto no Storage é apagada
-- pelo app antes de chamar a função.

-- Antes de o perfil sumir, troca a cópia do nome guardada nos depoimentos.
-- Vale também para a exclusão manual pelo painel do Supabase.
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

-- security definer: o cliente não tem permissão em auth.users. Só apaga
-- o id de auth.uid(), nunca outro.
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

-- ================================================
-- PERFIL PROFISSIONAL E PRIVACIDADE — migração 017
-- ================================================
-- profession_title é cópia do título oficial — o cliente não escolhe o
-- texto, só o código. Contato some para menores de 18 anos. Bio e curso
-- passam pelo filtro de termos (blocked_terms, migração 014).
create or replace function public.enforce_profile_rules()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_text text;
  v_hit  text;
begin
  if new.profession_cbo is null then
    new.profession_title := null;
  else
    select titulo into new.profession_title
    from public.cbo_ocupacoes
    where codigo = new.profession_cbo;
  end if;

  if new.profession_status = 'estudo' then
    new.experience_range := null;
  end if;

  if new.education_level is null or new.education_level in ('fundamental', 'medio') then
    new.education_course := null;
  end if;

  if new.birth_date is not null and new.birth_date > current_date - interval '18 years' then
    new.contact := null;
  end if;

  -- Só checa o texto que mudou: uma bio antiga não trava a troca de foto,
  -- e esta migração não falha por causa de perfis já existentes.
  if tg_op = 'INSERT'
     or new.bio is distinct from old.bio
     or new.education_course is distinct from old.education_course then
    v_text := coalesce(new.bio, '') || ' ' || coalesce(new.education_course, '');
    select term into v_hit
    from public.blocked_terms
    where v_text ~* ('\y' || term || '\y')
    limit 1;
    if v_hit is not null then
      raise exception 'Conteúdo não permitido: contém linguagem ofensiva.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_profile_rules on public.profiles;
create trigger trg_enforce_profile_rules
  before insert or update on public.profiles
  for each row execute procedure public.enforce_profile_rules();

-- No insert: copia profissão + situação do perfil de quem publica (ignora
-- o que o cliente mandar). Sem profissão no perfil, não publica.
-- No update: a profissão do depoimento fica congelada — o autor edita só
-- o texto. Depoimentos antigos (texto livre, sem código) continuam como
-- estão.
-- auth.uid() nulo = SQL Editor (admin): passa sem mexer.
create or replace function public.set_experience_profession()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_cbo    text;
  v_title  text;
  v_status text;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.profession := old.profession;
    new.profession_cbo := old.profession_cbo;
    new.profession_status := old.profession_status;
    return new;
  end if;

  select profession_cbo, profession_title, profession_status
    into v_cbo, v_title, v_status
  from public.profiles
  where id = auth.uid();

  if v_cbo is null or v_title is null then
    raise exception 'Informe sua profissão no perfil antes de publicar um depoimento.';
  end if;

  new.profession := v_title;
  new.profession_cbo := v_cbo;
  new.profession_status := v_status;
  return new;
end;
$$;

drop trigger if exists trg_set_experience_profession on public.experiences;
create trigger trg_set_experience_profession
  before insert or update on public.experiences
  for each row execute procedure public.set_experience_profession();

-- A policy de linha continua "todos veem todos os perfis", mas só as
-- colunas públicas abaixo. Ficam de fora: email, birth_date,
-- lgpd_consent, lgpd_consent_date, last_type_change.
-- id e is_admin precisam continuar legíveis: as policies das outras
-- tabelas consultam profiles.is_admin com os direitos de quem acessa.
--
-- ATENÇÃO para migrações futuras: coluna nova em profiles NÃO fica
-- legível automaticamente — se for pública, incluir num "grant select".
revoke select on public.profiles from anon, authenticated;
grant select (
  id, display_name, avatar_url, bio, contact, user_type,
  is_specialist, specialist_status, specialist_area, is_admin,
  profession_cbo, profession_title, profession_status, experience_range,
  education_level, education_course, education_in_progress,
  created_at, updated_at
) on public.profiles to anon, authenticated;

-- Perfil completo (com e-mail e data de nascimento) só da própria pessoa.
create or replace function public.get_my_profile()
returns setof public.profiles language sql stable security definer set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- ================================================
-- PEDIDOS DE ESPECIALISTA — migração 018
-- ================================================
-- Pedido do selo com comprovação e histórico. Só a própria pessoa e o
-- admin leem; a escrita passa pelas funções abaixo, que mantêm
-- profiles.specialist_status / is_specialist / specialist_area em
-- sincronia (ligando inova.specialist_sync para o gatilho de profiles).
-- Pode pedir quem atua ou já atuou na profissão do perfil (CBO); a área
-- do selo é congelada na aprovação.
create table if not exists public.specialist_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Cópia da profissão do perfil no momento do pedido (preenchida pela função).
  profession_cbo text references public.cbo_ocupacoes(codigo) on delete set null,
  profession_title text,
  profession_status text check (profession_status in ('atuo', 'atuei')),
  -- Link ou número de registro. Nulo só nos pedidos anteriores a esta
  -- migração; a função exige o campo em pedidos novos.
  evidence text check (char_length(evidence) <= 300),
  message text check (char_length(message) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'canceled', 'revoked')),
  decision_reason text check (char_length(decision_reason) <= 500),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- No máximo um pedido em análise por pessoa.
create unique index if not exists specialist_requests_one_pending
  on public.specialist_requests (user_id) where status = 'pending';

create index if not exists specialist_requests_user_created
  on public.specialist_requests (user_id, created_at desc);

alter table public.specialist_requests enable row level security;

drop policy if exists "Users read own specialist requests" on public.specialist_requests;
create policy "Users read own specialist requests" on public.specialist_requests
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
-- Sem policy de insert/update/delete: escrita só pelas funções abaixo
-- (security definer).

-- Funções do usuário
create or replace function public.solicitar_especialista(p_evidencia text, p_mensagem text default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_perfil    public.profiles%rowtype;
  v_evidencia text := nullif(btrim(coalesce(p_evidencia, '')), '');
  v_mensagem  text := nullif(btrim(coalesce(p_mensagem, '')), '');
  v_hit       text;
  v_recentes  integer;
  v_id        uuid;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para pedir o selo de especialista.';
  end if;

  select * into v_perfil from public.profiles where id = v_uid;

  if v_perfil.is_specialist then
    raise exception 'Você já é especialista verificado.';
  end if;

  if v_perfil.profession_cbo is null or v_perfil.profession_status not in ('atuo', 'atuei') then
    raise exception 'Para pedir o selo, informe no seu perfil uma profissão em que você atua ou já atuou.';
  end if;

  if v_evidencia is null or char_length(v_evidencia) < 5 then
    raise exception 'Informe um link ou número de registro profissional para comprovação.';
  end if;
  if char_length(v_evidencia) > 300 then
    raise exception 'A comprovação pode ter no máximo 300 caracteres.';
  end if;
  if char_length(coalesce(v_mensagem, '')) > 500 then
    raise exception 'A mensagem pode ter no máximo 500 caracteres.';
  end if;

  if exists (select 1 from public.specialist_requests where user_id = v_uid and status = 'pending') then
    raise exception 'Você já tem um pedido em análise.';
  end if;

  -- Anti-spam: pedir, cancelar e pedir de novo várias vezes.
  select count(*) into v_recentes
  from public.specialist_requests
  where user_id = v_uid and status <> 'revoked' and created_at > now() - interval '30 days';
  if v_recentes >= 3 then
    raise exception 'Você já fez 3 pedidos nos últimos 30 dias. Tente novamente mais tarde.';
  end if;

  -- Mesmo filtro de termos dos depoimentos (migração 014).
  select term into v_hit
  from public.blocked_terms
  where (v_evidencia || ' ' || coalesce(v_mensagem, '')) ~* ('\y' || term || '\y')
  limit 1;
  if v_hit is not null then
    raise exception 'Conteúdo não permitido: contém linguagem ofensiva.';
  end if;

  insert into public.specialist_requests
    (user_id, profession_cbo, profession_title, profession_status, evidence, message)
  values
    (v_uid, v_perfil.profession_cbo, v_perfil.profession_title, v_perfil.profession_status, v_evidencia, v_mensagem)
  returning id into v_id;

  perform set_config('inova.specialist_sync', 'on', true);
  update public.profiles
    set specialist_status = 'pending',
        specialist_area = v_perfil.profession_title,
        updated_at = now()
    where id = v_uid;
  perform set_config('inova.specialist_sync', 'off', true);

  return v_id;
end;
$$;

create or replace function public.cancelar_pedido_especialista()
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Entre na sua conta.';
  end if;

  update public.specialist_requests
    set status = 'canceled', decided_at = now()
    where user_id = v_uid and status = 'pending';

  if not found then
    raise exception 'Você não tem pedido em análise.';
  end if;

  perform set_config('inova.specialist_sync', 'on', true);
  update public.profiles
    set specialist_status = 'none', specialist_area = null, updated_at = now()
    where id = v_uid and is_specialist = false;
  perform set_config('inova.specialist_sync', 'off', true);
end;
$$;

-- Funções do admin
-- auth.uid() nulo = SQL Editor, tratado como admin (mesma convenção do
-- gatilho de profiles). decided_by fica nulo nesse caso.
create or replace function public.decidir_pedido_especialista(
  p_pedido uuid,
  p_aprovar boolean,
  p_motivo text default null
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_pedido public.specialist_requests%rowtype;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if v_uid is not null and not exists (
    select 1 from public.profiles where id = v_uid and is_admin = true
  ) then
    raise exception 'Apenas administradores podem decidir pedidos de especialista.';
  end if;

  select * into v_pedido from public.specialist_requests where id = p_pedido for update;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
  if v_pedido.status <> 'pending' then
    raise exception 'Este pedido não está mais em análise (status: %).', v_pedido.status;
  end if;
  if not p_aprovar and v_motivo is null then
    raise exception 'Informe o motivo da recusa — ele aparece para a pessoa.';
  end if;

  update public.specialist_requests
    set status = case when p_aprovar then 'approved' else 'rejected' end,
        decision_reason = v_motivo,
        decided_at = now(),
        decided_by = v_uid
    where id = p_pedido;

  perform set_config('inova.specialist_sync', 'on', true);
  if p_aprovar then
    -- Área congelada: título da CBO do pedido (pedidos antigos, sem CBO,
    -- mantêm a área em texto livre que já estava no perfil).
    update public.profiles
      set is_specialist = true,
          specialist_status = 'approved',
          specialist_area = coalesce(v_pedido.profession_title, specialist_area),
          updated_at = now()
      where id = v_pedido.user_id;
  else
    update public.profiles
      set is_specialist = false, specialist_status = 'rejected', specialist_area = null, updated_at = now()
      where id = v_pedido.user_id;
  end if;
  perform set_config('inova.specialist_sync', 'off', true);
end;
$$;

-- Retira o selo de quem já é especialista. O motivo aparece para a pessoa.
create or replace function public.revogar_especialista(p_usuario uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_area   text;
begin
  if v_uid is not null and not exists (
    select 1 from public.profiles where id = v_uid and is_admin = true
  ) then
    raise exception 'Apenas administradores podem revogar o selo.';
  end if;
  if v_motivo is null then
    raise exception 'Informe o motivo — ele aparece para a pessoa.';
  end if;

  select specialist_area into v_area
  from public.profiles where id = p_usuario and is_specialist = true;
  if not found then
    raise exception 'Este usuário não é especialista.';
  end if;

  -- Registro da revogação no histórico (status final 'revoked').
  insert into public.specialist_requests
    (user_id, profession_title, status, decision_reason, decided_at, decided_by)
  values
    (p_usuario, v_area, 'revoked', v_motivo, now(), v_uid);

  perform set_config('inova.specialist_sync', 'on', true);
  update public.profiles
    set is_specialist = false, specialist_status = 'rejected', specialist_area = null, updated_at = now()
    where id = p_usuario;
  perform set_config('inova.specialist_sync', 'off', true);
end;
$$;

revoke all on function public.solicitar_especialista(text, text) from public, anon;
revoke all on function public.cancelar_pedido_especialista() from public, anon;
revoke all on function public.decidir_pedido_especialista(uuid, boolean, text) from public, anon;
revoke all on function public.revogar_especialista(uuid, text) from public, anon;
grant execute on function public.solicitar_especialista(text, text) to authenticated;
grant execute on function public.cancelar_pedido_especialista() to authenticated;
grant execute on function public.decidir_pedido_especialista(uuid, boolean, text) to authenticated;
grant execute on function public.revogar_especialista(uuid, text) to authenticated;

