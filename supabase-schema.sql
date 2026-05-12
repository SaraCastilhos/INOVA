-- ================================================
-- INOVA Platform - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ================================================
-- PROFILES TABLE
-- ================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  email text,
  birth_date date,
  user_type text not null default 'estudante' check (user_type in ('estudante', 'profissional', 'ambos')),
  avatar_url text,
  is_specialist boolean not null default false,
  specialist_status text not null default 'none' check (specialist_status in ('none', 'pending', 'approved', 'rejected')),
  specialist_area text,
  is_admin boolean not null default false,
  lgpd_consent boolean not null default false,
  lgpd_consent_date timestamptz,
  last_type_change timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can view all profiles" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, user_type, lgpd_consent, lgpd_consent_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
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
  user_id uuid references public.profiles(id) on delete cascade not null,
  author_name text not null,
  profession text not null,
  riasec_type text not null,
  content text not null,
  video_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_featured boolean not null default false,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.experiences enable row level security;

create policy "Anyone can view approved experiences" on public.experiences
  for select using (status = 'approved');

create policy "Users can insert own experiences" on public.experiences
  for insert with check (auth.uid() = user_id);

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
create or replace function update_experience_likes_count()
returns trigger language plpgsql as $$
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
-- FORUM TOPICS TABLE
-- ================================================
create table if not exists public.forum_topics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
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
  for insert with check (auth.uid() = user_id);

create policy "Users can update own topics" on public.forum_topics
  for update using (auth.uid() = user_id);

-- ================================================
-- FORUM REPLIES TABLE
-- ================================================
create table if not exists public.forum_replies (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid references public.forum_topics(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_specialist_answer boolean not null default false,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forum_replies enable row level security;

create policy "Anyone can view replies" on public.forum_replies
  for select using (true);

create policy "Authenticated users can create replies" on public.forum_replies
  for insert with check (auth.uid() = user_id);

-- Update replies count trigger
create or replace function update_topic_replies_count()
returns trigger language plpgsql as $$
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
  ('first_reply', 'Colaborador', 'Respondeu pela primeira vez no fórum', '💡', 'community', 20)
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