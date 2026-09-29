# Teste vocacional — instrumento

Este diretório guarda o **conteúdo curado** do teste vocacional. É a fonte da
verdade: o app lê daqui, não do banco.

| Arquivo | O que é |
|---|---|
| `onet-mini-ip.json` | O instrumento em uso: itens, escala e regras de pontuação. Editado à mão, revisado em _pull request_. |
| `onet-mini-ip.schema.json` | JSON Schema do formato (para o editor/IDE validar enquanto você digita). |

O validador fica em `scripts/validate-instruments.mjs` e roda com:

```bash
npm run validate:instruments
```

Ele **falha** (exit 1) se o arquivo estiver fora das regras. Rode antes de cada
commit.

---

## O que é o instrumento

Adaptação em português do **O*NET Mini Interest Profiler (Mini-IP)** — 30 itens,
5 por tipo RIASEC, escala de 5 pontos (0 a 4, de "Não gosto nada" a "Gosto
muito"). Pontuação = soma dos valores por tipo; faixa 0 a 20 por tipo.

- **Fonte:** Rounds, J., Wee, C. J., Cao, M., Song, C. & Lewis, P. (2016).
  _Development of an O*NET Mini Interest Profiler (Mini-IP) for Mobile Devices._
  National Center for O*NET Development / U.S. Department of Labor.
  <https://www.onetcenter.org/dl_files/Mini-IP.pdf>
- Os `texto_original` dos itens são o texto verbatim da fonte (inglês). O campo
  `texto` é a tradução pt-BR feita pela equipe — **adaptação não oficial**.
- Não existe versão oficial do IP em português (só espanhol, no _Mi Próximo
  Paso_).

## Status e versão

- `status: "rascunho"` → **não validado**. A tradução ainda não passou por
  revisão por juízes especialistas; o teste roda, mas com aviso.
- `status: "publicado"` → só depois da revisão por juízes, com `revisado_por`
  preenchido.
- `version` muda a **cada alteração de conteúdo** (item, escala, pontuação).
  Convenção: `mini-ip-ptbr-<n.n>` — sufixo `.0/.1/...` enquanto rascunho;
  ao publicar, subir para `mini-ip-ptbr-1.0`.
- `test_results.instrument_version` grava essa string junto de cada resultado
  (migração 015). Resultados com versões diferentes **não são comparáveis**.

## Como alterar os itens (ex.: aplicar correções dos juízes)

1. Edite `texto` no `onet-mini-ip.json`. **Não** mexa em `texto_original` (é a
   referência) nem em `tipo`/`posicao` sem um bom motivo registrado.
2. Suba a `version` e ajuste `atualizado_em`.
3. `npm run validate:instruments` — corrija o que apontar.
4. Confira no app (`npm run dev` → aba Teste).
5. Ao concluir a revisão por juízes: preencha `revisado_por`, mude `status` para
   `"publicado"`, suba a `version` para `mini-ip-ptbr-1.0`. Commit.

## Convenção de commit

```
feat(teste): <o que mudou no instrumento> (mini-ip vX)
```
