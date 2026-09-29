# Guia de profissões — como o conteúdo é mantido

Este diretório guarda o **conteúdo curado** do guia de profissões. É a fonte da
verdade: o app lê daqui, não do banco.

| Arquivo | O que é |
|---|---|
| `professions.json` | A lista de fichas de profissão. Editado à mão, revisado em _pull request_. |
| `professions.schema.json` | JSON Schema do formato de uma ficha (para o editor/IDE validar enquanto você digita). |

O validador fica em `scripts/validate-professions.mjs` e roda com:

```bash
npm run validate:professions
```

Ele **falha** (exit 1) se qualquer ficha estiver fora das regras. Rode antes de
cada commit.

---

## Regras que o validador cobra

- `slug` único, em kebab-case.
- `cbo_code` no formato `0000-00`.
- `area` **exatamente** um dos 12 valores da taxonomia (ver `lib/types.ts` →
  `AREAS_PROFISSIONAIS`).
- `descricao` com 60+ caracteres.
- `atividades`: 3+ itens. `habilidades`: 3+ itens.
- `formacao_requerida` ∈ `fundamental | medio | tecnico | superior | superior-conselho`.
- `regulamentada: true` exige `conselho` preenchido; `false` exige `conselho: null`.
- `riasec_code`: 1 a 3 letras entre `R I A S E C`. `riasec_primary` = 1ª letra.
- `salario`: `p25 <= media <= p75`, todos > 0, `moeda: "BRL"`, com `fonte` e `referencia`.
- `fontes`: 1+ item, cada um com `titulo`, `url` (http/https) e `acesso_em` (`AAAA-MM-DD`).
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
