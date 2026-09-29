# INOVA — Plataforma de Apoio à Orientação Profissional

Trabalho de Conclusão de Curso de **Sara Amabili Castilhos** (Desenvolvimento Web). 

## Sobre o projeto

O INOVA é um sistema web de apoio à orientação profissional, voltado principalmente a jovens do Ensino Médio e, secundariamente, a adultos em transição ou reorientação de carreira. Ele nasce de um problema concreto: a dificuldade de acesso a informações sobre profissões, somada à dificuldade de autoconhecimento na hora de decidir "o que seguir".

O objetivo é reduzir a indecisão e a ansiedade ligadas à escolha profissional, funcionando como **ferramenta complementar** — o INOVA não substitui a avaliação de um psicólogo ou orientador profissional habilitado.

## Funcionalidades

- **Cadastro e autenticação** por e-mail/senha, com perfis Estudante, Profissional ou Ambos.
- **Teste vocacional RIASEC** (modelo de Holland — 6 perfis: Realista, Investigativo, Artístico, Social, Empreendedor, Convencional): adaptação pt-BR do **O\*NET Mini Interest Profiler** (30 itens, escala de 5 pontos), com ranking dos três perfis dominantes, aviso de perfil pouco diferenciado e histórico de tentativas. Cada resultado registra a versão do questionário que o gerou.
- **Guia de carreiras**:
  - *Profissões* com código CBO, descrição, atividades, habilidades, formação exigida, regulamentação, código RIASEC e salário médio com faixa (1º–3º quartil) — cada ficha com fontes públicas e data de acesso. Busca textual, filtro por área de atuação e filtro por tipo RIASEC (liberado após fazer o teste).
  - *Formas de ingresso* no ensino superior (ENEM, SISU, PROUNI, FIES, vestibular) e diretório de universidades do Vale do Paranhana/RS.
  - Página pública **/metodologia** explicando as fontes do guia e o funcionamento do teste.
- **Comunidade**:
  - *Depoimentos* de profissionais, com curtidas e comentários. O autor pode editar o próprio depoimento e encerrar seus comentários.
  - *Fórum* de discussão com tópicos e respostas. O autor edita e fecha os próprios tópicos; o admin também fixa e modera qualquer conteúdo.
  - *Especialistas verificados*: profissionais ou contas "ambos" podem solicitar verificação;
  - *Moderação*: conteúdo publica na hora (pós-moderação), passa por um filtro automático de termos ofensivos/spam no banco e pode ser denunciado para revisão.
- **Perfil**: foto (upload real), bio, contato e perfil público (visível ao clicar no nome/foto de qualquer usuário em depoimentos, fórum ou na lista de especialistas).
- **Gamificação**: badges por marcos de uso (primeiro teste, primeiro depoimento, primeiro tópico etc.), sem ranking público.

## Stack técnica

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **UI:** Tailwind CSS 4 + shadcn/ui (Radix UI)
- **Backend/banco:** Supabase (PostgreSQL + Auth + Storage), acessado via `@supabase/ssr` — não há servidor Node.js próprio
- **Deploy:** Vercel

## Estrutura do projeto

```
app/            rotas (App Router): landing, autenticação, termos/privacidade, metodologia
components/     seções da SPA (início, teste, carreiras, comunidade, perfil) e componentes de UI
contexts/       AuthProvider — sessão, perfil, testes e badges do usuário logado
data/           conteúdo curado e versionado: guia de profissões e instrumento do teste (JSON + schema)
lib/            tipos, carregamento do conteúdo de data/, pontuação do teste, dados estáticos
                (ingresso, universidades) e clientes Supabase
scripts/        validadores do conteúdo de data/
hooks/          hooks utilitários
supabase-*.sql  schema do banco, migrações numeradas e consultas de apoio ao admin
```

## Como rodar localmente

Requer Node.js 20+ e um projeto Supabase.

1. `npm install`
2. Crie `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` do seu projeto.
3. `npm run dev` e abra <http://localhost:3000>.

## Banco de dados

- **Instalação nova:** rode `supabase-schema.sql` no SQL Editor do Supabase. Ele já consolida todas as migrações.
- **Banco existente:** aplique, em ordem, as migrações `supabase-migration-NNN-*.sql` que ainda não rodaram. Todas são idempotentes e explicam o motivo no cabeçalho.
- `supabase-admin-helpers.sql` não é migração: são consultas prontas para moderação manual (aprovar especialistas, ler denúncias, manter a lista de termos bloqueados), já que ainda não há painel administrativo.

## Conteúdo curado (guia e teste)

O guia de profissões e os itens do teste não ficam no banco: vivem em `data/` como JSON versionado no git. No guia, só as fichas com `status: "publicado"` aparecem para o usuário. Antes de commitar qualquer alteração de conteúdo:

```bash
npm run validate:professions   # regras e passo a passo em data/README.md
npm run validate:instruments   # regras e versionamento em data/instruments/README.md
```

O instrumento do teste está em **rascunho**: a tradução dos itens ainda passa por revisão de juízes especialistas, e o app mostra um aviso enquanto isso.