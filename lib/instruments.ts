import miniIp from '@/data/instruments/onet-mini-ip.json'
import type { Instrumento, InstrumentoItem, RIASECType } from './types'

// data/instruments/onet-mini-ip.json é a fonte da verdade do teste vocacional
// (conteúdo curado, versionado no git). O formato é garantido por
// scripts/validate-instruments.mjs e documentado no schema ao lado do JSON.
//
// Adaptação pt-BR do O*NET Mini Interest Profiler (Mini-IP), 30 itens, 5 por
// tipo RIASEC, escala de 5 pontos (0 a 4). Enquanto status = "rascunho", os
// itens ainda não passaram por revisão por juízes.
export const INSTRUMENTO = miniIp as unknown as Instrumento

export const INSTRUMENT_SLUG = INSTRUMENTO.slug
export const INSTRUMENT_VERSION = INSTRUMENTO.version

// Itens na ordem de apresentação (posicao 1..N), já com cópia defensiva.
export const ITENS: InstrumentoItem[] = [...INSTRUMENTO.itens].sort(
  (a, b) => a.posicao - b.posicao,
)

// Valor máximo de pontuação por tipo (5 itens x 4 = 20). Derivado do JSON para
// não ficar hard-coded na UI.
export const maxPorTipo = INSTRUMENTO.pontuacao.max_por_tipo

// Resultados gravados antes da migração 015 (questionário caseiro de 24 itens,
// escala 1–5, soma de 4 a 20 por tipo). Não são comparáveis com os do Mini-IP.
export const LEGADO_MAX_POR_TIPO = 20

/** true se o resultado veio de outro instrumento/versão que não o ativo. */
export const isResultadoDeOutraVersao = (r: { instrument_slug: string; instrument_version: string }) =>
  r.instrument_slug !== INSTRUMENT_SLUG || r.instrument_version !== INSTRUMENT_VERSION

/** Máximo por tipo para exibir as barras de um resultado salvo. */
export const maxPorTipoDoResultado = (r: { instrument_slug: string }) =>
  r.instrument_slug === INSTRUMENT_SLUG ? maxPorTipo : LEGADO_MAX_POR_TIPO

// Ordem canônica RIASEC — usada só como critério de desempate explícito.
const TIPOS: RIASECType[] = ['R', 'I', 'A', 'S', 'E', 'C']

export interface ResultadoRIASEC {
  scores: Record<RIASECType, number>
  /** Tipos do maior para o menor score. Empate é resolvido pela ordem RIASEC
   *  (R, I, A, S, E, C) — critério explícito, não um efeito colateral de sort. */
  ordenados: RIASECType[]
  top3: RIASECType[]
  /** Diferença entre o 1º e o 3º score. */
  diferenciacao: number
  /** true quando 1º e 3º score estão muito próximos: perfil pouco diferenciado,
   *  o resultado deve ser lido com mais cautela. */
  poucoDiferenciado: boolean
}

/**
 * Pontua as respostas do instrumento ativo.
 * @param respostas mapa posicao -> valor escolhido (0..escala.max).
 *   Posições ausentes não somam (o teste só permite enviar completo).
 */
export function pontuar(respostas: Record<number, number>): ResultadoRIASEC {
  const scores: Record<RIASECType, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }

  for (const item of INSTRUMENTO.itens) {
    const v = respostas[item.posicao]
    if (typeof v === 'number' && Number.isFinite(v)) {
      scores[item.tipo] += v
    }
  }

  const ordenados = [...TIPOS].sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a]
    return TIPOS.indexOf(a) - TIPOS.indexOf(b)
  })

  const diferenciacao = scores[ordenados[0]] - scores[ordenados[2]]
  // Limiar: menos de 15% da amplitude máxima do tipo (mín. 2 pontos) separando
  // o 1º do 3º. Abaixo disso o perfil é considerado pouco diferenciado.
  const limiar = Math.max(2, Math.round(maxPorTipo * 0.15))

  return {
    scores,
    ordenados,
    top3: ordenados.slice(0, 3),
    diferenciacao,
    poucoDiferenciado: diferenciacao < limiar,
  }
}

/**
 * Vetor de respostas na ordem das posições (1..N), para gravar em
 * test_results.answers. -1 marca posição não respondida (não deve ocorrer
 * quando o teste é enviado completo).
 */
export function respostasParaVetor(respostas: Record<number, number>): number[] {
  return ITENS.map((it) => {
    const v = respostas[it.posicao]
    return typeof v === 'number' && Number.isFinite(v) ? v : -1
  })
}
