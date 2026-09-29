-- ================================================
-- Migração 009 — Restringe solicitação de especialista a profissional/ambos
-- Rodar manualmente no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- ================================================
--
-- Contexto: até agora, qualquer tipo de conta (inclusive "estudante")
-- conseguia solicitar verificação de especialista (specialist_status ->
-- 'pending'). O app já esconde o botão na tela para contas do tipo
-- "estudante", mas isso sozinho não impede alguém de chamar o Supabase
-- direto pelo navegador e setar specialist_status = 'pending' mesmo
-- sendo estudante. Esta migração bloqueia isso também no banco, no
-- mesmo trigger que já protege is_admin/is_specialist/specialist_status
-- contra auto-promoção (migração 003).
--
-- Continua igual: só profissional/ambos podem pedir; a aprovação em si
-- continua manual, feita por um admin.

create or replace function public.protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  is_privileged boolean;
begin
  is_privileged := auth.uid() is null
    or coalesce(auth.role(), '') = 'service_role'
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    );

  if is_privileged then
    return new;
  end if;

  new.is_admin := old.is_admin;
  new.is_specialist := old.is_specialist;

  if new.specialist_status is distinct from old.specialist_status then
    if new.specialist_status <> 'pending' then
      -- só admin pode aprovar/rejeitar (fora do "if is_privileged" acima)
      new.specialist_status := old.specialist_status;
    elsif new.user_type not in ('profissional', 'ambos') then
      -- estudante não pode solicitar verificação de especialista
      new.specialist_status := old.specialist_status;
    end if;
  end if;

  return new;
end;
$$;
