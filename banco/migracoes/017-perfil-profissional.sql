-- ================================================
-- Migração 017 — Perfil profissional (profissão pela CBO) + privacidade
-- Rodar manualmente no SQL Editor do Supabase e, EM SEGUIDA,
-- banco/dados/cbo-ocupacoes.sql (carga das ocupações).
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Contexto: a profissão do depoimento era um campo de texto livre — dava
-- para escrever errado ou trocar de profissão a cada post. Agora:
--   1. A profissão vem da CBO (tabela cbo_ocupacoes) e fica no PERFIL,
--      junto com a situação (atuo / estudo / já atuei), o tempo de
--      experiência e a formação.
--   2. O depoimento guarda uma CÓPIA da profissão do perfil no momento da
--      publicação (quem muda de carreira não "reescreve" depoimentos
--      antigos). Preenchida pelo banco; o cliente não escolhe.
--   3. Privacidade: e-mail, data de nascimento e dados de consentimento
--      deixam de ser legíveis por outras pessoas (antes, "select using
--      (true)" expunha todas as colunas de profiles, inclusive para quem
--      não está logado). O próprio usuário lê o perfil completo por
--      get_my_profile().
--   4. Menores de 18 anos não exibem contato no perfil.
--   5. Bio e curso passam pelo mesmo filtro de termos dos depoimentos.

-- ------------------------------------------------
-- 1) Ocupações da CBO
-- ------------------------------------------------
create table if not exists public.cbo_ocupacoes (
  codigo text primary key check (codigo ~ '^[0-9]{6}$'),
  titulo text not null
);

alter table public.cbo_ocupacoes enable row level security;

drop policy if exists "Anyone can read CBO" on public.cbo_ocupacoes;
create policy "Anyone can read CBO" on public.cbo_ocupacoes
  for select using (true);
-- Sem policy de escrita: carga só pelo SQL Editor (banco/dados/cbo-ocupacoes.sql).

-- ------------------------------------------------
-- 2) Novas colunas em profiles
-- ------------------------------------------------
alter table public.profiles
  add column if not exists profession_cbo text references public.cbo_ocupacoes(codigo) on delete set null,
  add column if not exists profession_title text,
  add column if not exists profession_status text,
  add column if not exists experience_range text,
  add column if not exists education_level text,
  add column if not exists education_course text,
  add column if not exists education_in_progress boolean not null default false;

alter table public.profiles drop constraint if exists profiles_profession_status_check;
alter table public.profiles add constraint profiles_profession_status_check
  check (profession_status in ('atuo', 'estudo', 'atuei'));

-- Profissão e situação andam juntas (as duas ou nenhuma).
alter table public.profiles drop constraint if exists profiles_profession_pair;
alter table public.profiles add constraint profiles_profession_pair
  check ((profession_cbo is null) = (profession_status is null));

alter table public.profiles drop constraint if exists profiles_experience_range_check;
alter table public.profiles add constraint profiles_experience_range_check
  check (experience_range in ('ate-1', '1-4', '5-9', '10-mais'));

-- Quem só estuda para a profissão não tem "tempo de experiência" nela.
alter table public.profiles drop constraint if exists profiles_experience_range_status;
alter table public.profiles add constraint profiles_experience_range_status
  check (experience_range is null or profession_status in ('atuo', 'atuei'));

alter table public.profiles drop constraint if exists profiles_education_level_check;
alter table public.profiles add constraint profiles_education_level_check
  check (education_level in ('fundamental', 'medio', 'tecnico', 'graduacao', 'especializacao', 'mestrado', 'doutorado'));

alter table public.profiles drop constraint if exists profiles_education_course_length;
alter table public.profiles add constraint profiles_education_course_length
  check (char_length(education_course) <= 120);

-- ------------------------------------------------
-- 3) Data de nascimento: guardar no perfil
-- ------------------------------------------------
-- O cadastro sempre mandou birth_date nos metadados do signUp, mas
-- handle_new_user() não copiava para profiles — a coluna ficava vazia.
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

-- Recupera a data de quem já se cadastrou.
update public.profiles p
  set birth_date = (u.raw_user_meta_data->>'birth_date')::date
  from auth.users u
  where u.id = p.id
    and p.birth_date is null
    and u.raw_user_meta_data->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$';

-- ------------------------------------------------
-- 4) Regras do perfil (título da profissão, contato de menor, filtro)
-- ------------------------------------------------
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

-- Menores que já tinham contato preenchido.
update public.profiles
  set contact = null
  where contact is not null
    and birth_date > current_date - interval '18 years';

-- ------------------------------------------------
-- 5) Depoimentos: profissão copiada do perfil
-- ------------------------------------------------
alter table public.experiences
  add column if not exists profession_cbo text references public.cbo_ocupacoes(codigo) on delete set null,
  add column if not exists profession_status text;

alter table public.experiences drop constraint if exists experiences_profession_status_check;
alter table public.experiences add constraint experiences_profession_status_check
  check (profession_status in ('atuo', 'estudo', 'atuei'));

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

-- ------------------------------------------------
-- 6) Privacidade: quem pode ler o quê em profiles
-- ------------------------------------------------
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

-- ------------------------------------------------
-- Conferência (opcional)
-- ------------------------------------------------
-- 1. Depois da carga, deve dar ~2.600:
--    select count(*) from public.cbo_ocupacoes;
-- 2. Colunas legíveis por anon (email e birth_date NÃO devem aparecer):
--    select column_name from information_schema.column_privileges
--    where table_name = 'profiles' and grantee = 'anon' and privilege_type = 'SELECT';
