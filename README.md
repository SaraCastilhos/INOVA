# INOVA — Plataforma de Apoio à Orientação Profissional

Trabalho de Conclusão de Curso de **Sara Amabili Castilhos** (Desenvolvimento Web). 

## Sobre o projeto

O INOVA é um sistema web de apoio à orientação profissional, voltado principalmente a jovens do Ensino Médio e, secundariamente, a adultos em transição ou reorientação de carreira. Ele nasce de um problema concreto: a dificuldade de acesso a informações sobre profissões, somada à dificuldade de autoconhecimento na hora de decidir "o que seguir".

O objetivo é reduzir a indecisão e a ansiedade ligadas à escolha profissional, funcionando como **ferramenta complementar** — o INOVA não substitui a avaliação de um psicólogo ou orientador profissional habilitado.

## Funcionalidades

- **Cadastro e autenticação** por e-mail/senha, com perfis Estudante, Profissional ou Ambos.
- **Teste vocacional RIASEC** (modelo de Holland — 6 perfis: Realista, Investigativo, Artístico, Social, Empreendedor, Convencional), com ranking dos três perfis dominantes e histórico de tentativas.
- **Guia de carreiras**: profissões, formas de ingresso no ensino superior (ENEM, SISU, PROUNI, FIES, vestibular) e diretório de universidades do Vale do Paranhana/RS — com busca textual e filtro por área/tipo RIASEC.
- **Comunidade**:
  - *Depoimentos* de profissionais, com curtidas e comentários.
  - *Fórum* de discussão com tópicos e respostas.
  - *Especialistas verificados*: profissionais ou contas "ambos" podem solicitar verificação;
- **Perfil**: foto (upload real), bio, contato e perfil público (visível ao clicar no nome/foto de qualquer usuário em depoimentos, fórum ou na lista de especialistas).
- **Gamificação**: badges por marcos de uso (primeiro teste, primeiro depoimento, primeiro tópico etc.), sem ranking público.

## Stack técnica

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **UI:** Tailwind CSS 4 + shadcn/ui (Radix UI)
- **Backend/banco:** Supabase (PostgreSQL + Auth + Storage), acessado via `@supabase/ssr` — não há servidor Node.js próprio
- **Deploy:** Vercel

## Estrutura do projeto

```
app/            rotas (App Router): landing, autenticação, termos/privacidade
components/     seções da SPA (início, teste, carreiras, comunidade, perfil) e componentes de UI
contexts/       AuthProvider — sessão, perfil, testes e badges do usuário logado
lib/            tipos, dados estáticos (profissões, universidades, perguntas do teste) e clientes Supabase
hooks/          hooks utilitários
```