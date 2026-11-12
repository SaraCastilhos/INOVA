-- ================================================
-- Migração 018 — Pedidos de especialista com comprovação e histórico
-- Rodar manualmente no SQL Editor do Supabase, DEPOIS da 017
-- (usa a profissão da CBO no perfil).
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Contexto: até aqui o pedido de selo era só "specialist_status = 'pending'"
-- + uma área em texto livre, gravados direto em profiles. Faltava:
--   - comprovação (o admin só tinha o e-mail para conferir);
--   - motivo da recusa, data, histórico, cancelamento;
--   - ligação com a profissão do perfil (CBO, migração 017);
--   - travar a área depois da aprovação (o usuário conseguia trocá-la
--     pelo console, porque o gatilho não protegia specialist_area).
--
-- Regras decididas (12/11/2026):
--   - pode pedir quem tem profissão no perfil com situação "atuo" ou
--     "atuei" (o tipo de conta deixa de importar);
--   - comprovação obrigatória: link (LinkedIn, Lattes...) ou número de
--     registro no conselho (CRM, CREA, OAB...);
--   - a área do selo é o título da CBO no momento da aprovação e fica
--     congelada — trocar a profissão no perfil depois não muda o selo.
--   - o selo indica que a pessoa é especialista; NÃO restringe quem
--     responde no fórum (não há categoria restrita).
--
-- Como funciona:
--   - Os pedidos ficam em specialist_requests, que só a própria pessoa e
--     o admin leem (profiles é pública; a comprovação não vai para lá).
--   - Ninguém grava na tabela direto: tudo passa por três funções —
--     solicitar_especialista, cancelar_pedido_especialista (usuário) e
--     decidir_pedido_especialista / revogar_especialista (admin). Elas
--     mantêm profiles.specialist_status / is_specialist / specialist_area
--     em sincronia, então o selo e a lista continuam lendo de profiles.
--   - O usuário comum não altera mais specialist_status nem
--     specialist_area por update em profiles (gatilho abaixo).

-- ------------------------------------------------
-- 1) Tabela de pedidos
-- ------------------------------------------------
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

-- ------------------------------------------------
-- 2) Proteção de profiles: status e área do selo só mudam pelas funções
-- ------------------------------------------------
-- As funções abaixo rodam com o auth.uid() de quem chamou, então o gatilho
-- não consegue distinguir "usuário pelo console" de "função autorizada"
-- pelo usuário. Elas ligam a flag inova.specialist_sync, que vale só
-- dentro da transação (set_config(..., true)); cada chamada da API é uma
-- transação própria e set_config não é exposto pela API, então o cliente
-- não consegue ligá-la.
create or replace function public.protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  is_privileged boolean;
begin
  -- auth.uid() nulo = acesso direto ao banco (SQL Editor, migrações).
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

  new.is_admin := old.is_admin;
  new.is_specialist := old.is_specialist;
  new.specialist_status := old.specialist_status;
  new.specialist_area := old.specialist_area;

  return new;
end;
$$;

-- ------------------------------------------------
-- 3) Funções do usuário
-- ------------------------------------------------
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

-- ------------------------------------------------
-- 4) Funções do admin
-- ------------------------------------------------
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

-- ------------------------------------------------
-- 5) Pedidos que já estavam em análise
-- ------------------------------------------------
-- Viram registros na tabela nova, sem comprovação, com a área em texto
-- livre guardada na mensagem. A decisão segue pela função do admin.
insert into public.specialist_requests (user_id, profession_cbo, profession_title, profession_status, message, created_at)
select p.id,
       case when p.profession_status in ('atuo', 'atuei') then p.profession_cbo end,
       case when p.profession_status in ('atuo', 'atuei') then p.profession_title end,
       case when p.profession_status in ('atuo', 'atuei') then p.profession_status end,
       'Pedido anterior à migração 018. Área informada: ' || coalesce(p.specialist_area, '(não informada)'),
       p.updated_at
from public.profiles p
where p.specialist_status = 'pending'
  and not exists (
    select 1 from public.specialist_requests r
    where r.user_id = p.id and r.status = 'pending'
  );

-- ------------------------------------------------
-- Conferência (opcional)
-- ------------------------------------------------
-- 1. Pedidos em análise (deve bater com profiles.specialist_status = 'pending'):
--    select count(*) from public.specialist_requests where status = 'pending';
--    select count(*) from public.profiles where specialist_status = 'pending';
-- 2. O usuário comum não consegue mais mudar o status pelo update — testar
--    pelo app: o botão "Solicitar verificação" passa pela função.
