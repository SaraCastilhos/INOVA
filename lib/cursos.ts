import cursosData from '@/data/cursos.json'
import type { Profissao } from './types'

// "Onde estudar" da página de cada profissão. data/cursos.json tem as
// instituições pesquisadas (Vale do Paranhana, cidades vizinhas e Porto
// Alegre) e um catálogo de cursos, cada um com as instituições que o oferecem
// presencialmente e o link da página do curso. A ficha guarda só os ids dos
// cursos. Validado por scripts/validate-professions.mjs.

export type NivelCurso = 'graduacao' | 'tecnologo' | 'tecnico'
export type RegiaoInstituicao = 'paranhana' | 'vizinhas' | 'porto-alegre'

export type FormaIngressoInst = 'prova' | 'enem' | 'sisu' | 'sorteio'
export type BolsaInst = 'prouni' | 'fies'

export interface Instituicao {
  id: string
  nome: string
  sigla: string
  cidade: string
  regiao: RegiaoInstituicao
  // sem mensalidade (pública e gratuita) ou com mensalidade
  gratuita: boolean
  // formas de ingresso confirmadas na página oficial (ingresso_url)
  ingresso: FormaIngressoInst[]
  // programas federais que a instituição declara aceitar
  bolsas: BolsaInst[]
  ingresso_nota?: string
  ingresso_url: string
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

export const ORDEM_REGIAO: RegiaoInstituicao[] = ['paranhana', 'vizinhas', 'porto-alegre']

export const INGRESSO_LABEL: Record<FormaIngressoInst, string> = {
  prova: 'Prova própria',
  enem: 'Nota do Enem',
  sisu: 'SiSU',
  sorteio: 'Sorteio',
}

export const BOLSA_LABEL: Record<BolsaInst, string> = {
  prouni: 'ProUni',
  fies: 'FIES',
}

const ORDEM_NIVEL: NivelCurso[] = ['graduacao', 'tecnologo', 'tecnico']

export interface CursoDaInstituicao {
  id: string
  nome: string
  nivel: NivelCurso
  url: string
  profissoes: { slug: string; nome: string }[]
}

export interface InstituicaoComCursos {
  instituicao: Instituicao
  cursos: CursoDaInstituicao[]
}

// Visão inversa do catálogo, para a aba "Onde estudar" do guia: cada
// instituição com os cursos que oferece e, em cada curso, as profissões
// publicadas que o indicam. Ordem: região (mais perto primeiro), depois nome.
export function instituicoesComCursos(
  profissoes: Pick<Profissao, 'slug' | 'nome' | 'cursos'>[],
): InstituicaoComCursos[] {
  const porCurso = new Map<string, { slug: string; nome: string }[]>()
  for (const p of profissoes) {
    for (const id of p.cursos) {
      if (!porCurso.has(id)) porCurso.set(id, [])
      porCurso.get(id)!.push({ slug: p.slug, nome: p.nome })
    }
  }
  return [...INSTITUICOES]
    .sort(
      (a, b) =>
        ORDEM_REGIAO.indexOf(a.regiao) - ORDEM_REGIAO.indexOf(b.regiao) ||
        a.nome.localeCompare(b.nome, 'pt-BR'),
    )
    .map((instituicao) => ({
      instituicao,
      cursos: DADOS.cursos
        .flatMap((c) => {
          const o = c.ofertas.find((x) => x.instituicao === instituicao.id)
          return o
            ? [{ id: c.id, nome: c.nome, nivel: c.nivel, url: o.url, profissoes: porCurso.get(c.id) ?? [] }]
            : []
        })
        .sort(
          (a, b) =>
            ORDEM_NIVEL.indexOf(a.nivel) - ORDEM_NIVEL.indexOf(b.nivel) ||
            a.nome.localeCompare(b.nome, 'pt-BR'),
        ),
    }))
}

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
