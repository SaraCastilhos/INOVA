# Guia de profissões — como o conteúdo é mantido

Este diretório guarda o **conteúdo curado** do guia de profissões. É a fonte da
verdade: o app lê daqui, não do banco.

| Arquivo | O que é |
|---|---|
| `professions.json` | A lista de fichas de profissão. Editado à mão, revisado em _pull request_. |
| `professions.schema.json` | JSON Schema do formato de uma ficha (para o editor/IDE validar enquanto você digita). |
| `cbo.json` | Lista oficial de ocupações da CBO (código, título, sinônimos) usada na busca de profissão do perfil. **Gerado**, não editar à mão — ver abaixo. |

O validador fica em `scripts/validate-professions.mjs` e roda com:

```bash
npm run validate:professions
```

Ele **falha** (exit 1) se qualquer ficha estiver fora das regras. Rode antes de
cada commit.

---

## Regras que o validador cobra

- `slug` único, em kebab-case.
- `cbo_code` no formato `0000-00`, **único** entre as fichas (não repetir o código de outra profissão).
- `area` **exatamente** um dos 12 valores da taxonomia (ver `lib/types.ts` →
  `AREAS_PROFISSIONAIS`).
- `descricao` com 60+ caracteres.
- `atividades`: 3+ itens, sem repetição. `habilidades`: 3+ itens, sem repetição.
- `formacao_requerida` ∈ `fundamental | medio | tecnico | superior | superior-conselho`.
- `regulamentada: true` exige `conselho` preenchido; `false` exige `conselho: null`.
- `riasec_code`: 1 a 3 letras entre `R I A S E C`. `riasec_primary` = 1ª letra.
- `salario`: `p25 <= p75` e todos > 0, `moeda: "BRL"`, com `fonte` e `referencia`. A `media` **não** precisa cair entre `p25` e `p75` — em profissões remuneradas majoritariamente por comissão (ex.: representante comercial, corretor de imóveis), a distribuição real de salário é assimétrica e a média pode ficar fora da faixa dos quartis. Isso é um dado real, não um erro de digitação.
- `fontes`: 1+ item, cada um com `titulo`, `url` (http/https) e `acesso_em` (`AAAA-MM-DD`), **sem duas fontes apontando para a mesma URL** — além de ser sinal de cópia-e-cola errada, isso quebra a chave do React no card (renderizado com `key={f.url}`) e gera aviso no console/overlay do Next.js em `npm run dev`.
- `status` ∈ `rascunho | publicado`. **Só `publicado` aparece no guia.**

---

## Passo a passo para adicionar uma profissão

Faça **uma fonte de cada vez** e cole a URL em `fontes[]` assim que usar.

1. **Identifique a ocupação na CBO.** Busque em <https://cbo.mte.gov.br> pelo nome.
   Anote o **código** (`0000-00`) e o título oficial.

2. **Descrição + atividades.** Da página da família CBO:
   - a _descrição sumária_ vira `descricao` (resuma para 2–4 frases);
   - a lista de _áreas de atividades_ vira `atividades[]` (5–8 itens concretos;
     ignore itens genéricos como "demonstrar competências pessoais").

3. **Habilidades.** Combine as _competências pessoais_ da CBO com o bloco de
   _skills_ da ocupação equivalente no O*NET. 5–8 itens em `habilidades[]`.

4. **Salário.** No painel do Novo CAGED (ou num agregador que cite o CAGED),
   busque pelo código CBO e registre:
   - `media` = salário médio mensal (como a fonte publica);
   - `p25` / `p75` = 1º e 3º quartis;
   - `fonte` = nome da base + "(dados do CAGED/MTE)" se for agregador;
   - `referencia` = período dos dados (ex.: `2025-08/2026-07`).

5. **RIASEC.** Em <https://www.onetonline.org>, ache a ocupação equivalente e
   copie o _Interest code_ (ordem de dominância). `riasec_code` = 2–3 letras;
   `riasec_primary` = a primeira.

6. **Formação e regulamentação.** Da CBO + site do conselho, se houver.
   Profissão regulamentada → `regulamentada: true` e `conselho: "SIGLA"`.

7. **Preencha a ficha** em `professions.json`. Comece com `"status": "rascunho"`.

8. **Valide:** `npm run validate:professions`. Corrija o que apontar.

9. **Confira no app** (`npm run dev` → aba Profissões). Rascunho não aparece;
   para revisar visualmente, troque para `"publicado"` temporariamente ou
   confira pela ficha ao lado.

10. **Publique:** com tudo conferido e todas as fontes em `fontes[]`, mude
    `"status"` para `"publicado"`, ajuste `atualizado_em` para a data de hoje e
    preencha `revisado_por`. Commit.

---

## Convenção de commit

```
feat(guia): adiciona <nome da profissão> (CBO 0000-00)
```

Uma profissão por commit facilita a revisão e o histórico de fontes.

---

## Lista da CBO (`cbo.json`)

Alimenta o campo "Sua profissão" do perfil (migração 017). A pessoa só pode
escolher uma ocupação da lista, então não há texto livre nem erro de digitação.

Para gerar ou atualizar:

1. Em <https://cbo.mte.gov.br/cbosite/pages/downloads.jsf>, baixe **Estrutura
   CBO (CSV) - Arquivo ZIP** e extraia numa pasta fora do projeto.
2. `node scripts/build-cbo.mjs <pasta-extraida> <AAAA-MM-DD do download>`
3. O script escreve `data/cbo.json` e `banco/dados/cbo-ocupacoes.sql`. Rode o
   `.sql` no SQL Editor do Supabase (depois da migração 017) para a tabela
   `cbo_ocupacoes` ficar igual à lista do app — o banco recusa código que não
   esteja nela.


## Onde estudar (`cursos.json`)

Alimenta a seção "Onde estudar" da página de cada profissão e a aba "Onde
estudar" do guia (a mesma informação vista pela instituição, gerada por
`instituicoesComCursos()` em `lib/cursos.ts`). Tem duas listas:

- `instituicoes`: as instituições pesquisadas, com cidade, região
  (`paranhana`, `vizinhas` ou `porto-alegre`), a página onde a lista de cursos
  foi lida (`fonte`) e a data (`acesso_em`). Também diz se é `gratuita`
  (`true`/`false`), as formas de `ingresso` confirmadas (`prova`, `enem`,
  `sisu`, `sorteio`), as `bolsas` federais que declara aceitar (`prouni`,
  `fies`), a página oficial de ingresso (`ingresso_url`) e, se precisar, uma
  `ingresso_nota` curta. Só entra o que a página oficial diz: o que não foi
  confirmado fica fora (lista vazia), não é deduzido. Sem nenhuma forma de
  ingresso confirmada, a `ingresso_nota` é obrigatória e diz como se informar.
  Atenção: a Liberato é pública estadual mas cobra mensalidade (`gratuita: false`).
- `cursos`: o catálogo de cursos (`graduacao`, `tecnologo` ou `tecnico`), cada um
  com as instituições que o oferecem **presencialmente** e o link da página do
  curso naquela instituição. Curso sem nenhuma oferta encontrada fica com
  `ofertas: []` e aparece na ficha como "não encontrado nas instituições
  pesquisadas".

Cada ficha de `professions.json` tem `cursos` (lista de ids do catálogo; vazia
quando não há curso a indicar) e, se precisar, `cursos_nota` (uma observação
curta sobre a formação). Para profissões de nível fundamental ou médio, a tela
apresenta os cursos como "podem ajudar", não como exigência. O validador recusa
id de curso inexistente e instituição desconhecida.

Ao atualizar: confira a lista de cursos no site de cada instituição, só
presencial (cursos de portal "online"/EaD não entram — a PUCRS, por exemplo,
redireciona alguns cursos para online.pucrs.br), e troque `acesso_em`. Atenção:
a "Escola Técnica Estadual Parobé" fica em Porto Alegre, não em Parobé.
