import cursosData from '@/data/cursos.json'
import type { Profissao } from './types'

// "Onde estudar" da página de cada profissão. data/cursos.json tem as
// instituições pesquisadas (Vale do Paranhana, cidades vizinhas e Porto
// Alegre) e um catálogo de cursos, cada um com as instituições que o oferecem
// presencialmente e o link da página do curso. A ficha guarda só os ids dos
// cursos. Validado por scripts/validate-professions.mjs.

export type NivelCurso = 'graduacao' | 'tecnologo' | 'tecnico'
export type RegiaoInstituicao = 'paranhana' | 'vizinhas' | 'porto-alegre'

export interface Instituicao {
  id: string
  nome: string
  sigla: string
  cidade: string
  regiao: RegiaoInstituicao
  fonte: string
  acesso_em: string
}

interface CursoCatalogo {
  id: string
  nome: string
  nivel: NivelCurso
  ofertas: { instituicao: string; url: string }[]
}

const DADOS = cursosData as {
  acesso_em: string
  instituicoes: Instituicao[]
  cursos: CursoCatalogo[]
}

export const INSTITUICOES = DADOS.instituicoes
export const cursosAtualizadoEm = DADOS.acesso_em

const INST = new Map(INSTITUICOES.map((i) => [i.id, i]))
const CURSOS = new Map(DADOS.cursos.map((c) => [c.id, c]))

export const NIVEL_LABEL: Record<NivelCurso, string> = {
  graduacao: 'Graduação',
  tecnologo: 'Graduação tecnológica',
  tecnico: 'Curso técnico',
}

export const REGIAO_LABEL: Record<RegiaoInstituicao, string> = {
  paranhana: 'Vale do Paranhana',
  vizinhas: 'Vale do Sinos',
  'porto-alegre': 'Porto Alegre',
}

const ORDEM_REGIAO: RegiaoInstituicao[] = ['paranhana', 'vizinhas', 'porto-alegre']

export interface OfertaCurso {
  instituicao: Instituicao
  url: string
}

export interface CursoIndicado {
  id: string
  nome: string
  nivel: NivelCurso
  // ofertas agrupadas por região, da mais próxima para a mais distante
  porRegiao: { regiao: RegiaoInstituicao; ofertas: OfertaCurso[] }[]
}

export function cursosDaProfissao(p: Profissao): CursoIndicado[] {
  return p.cursos.flatMap((id) => {
    const c = CURSOS.get(id)
    if (!c) return []
    const ofertas = c.ofertas.flatMap((o) => {
      const instituicao = INST.get(o.instituicao)
      return instituicao ? [{ instituicao, url: o.url }] : []
    })
    const porRegiao = ORDEM_REGIAO.map((regiao) => ({
      regiao,
      ofertas: ofertas.filter((o) => o.instituicao.regiao === regiao),
    })).filter((g) => g.ofertas.length > 0)
    return [{ id: c.id, nome: c.nome, nivel: c.nivel, porRegiao }]
  })
}

// Busca oficial do MEC para cursos superiores (o e-MEC não aceita link direto
// para um curso; a pessoa filtra pelo nome do curso e pela cidade).
export const EMEC_URL = 'https://emec.mec.gov.br/'
