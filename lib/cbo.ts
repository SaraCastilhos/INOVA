import { PROFISSOES } from './professions'
import type { EducationLevel, ExperienceRange, ProfessionStatus } from './types'

// Perfil profissional (migração 017): profissão escolhida na CBO, situação,
// tempo de experiência e formação. A lista da CBO (data/cbo.json, gerada por
// scripts/build-cbo.mjs) é grande, então só é carregada quando alguém abre
// o seletor de profissão — ver carregarCbo().

export interface OcupacaoCbo {
  codigo: string // 6 dígitos, ex.: "223505"
  titulo: string
  sinonimos: string[]
}

export const PROFESSION_STATUS_LABELS: Record<ProfessionStatus, string> = {
  atuo: 'Atuo como',
  estudo: 'Estou estudando para ser',
  atuei: 'Já atuei como',
}

// Mesma situação, em 3ª pessoa (como outra pessoa lê no depoimento/perfil).
const PROFESSION_STATUS_TERCEIRA: Record<ProfessionStatus, string> = {
  atuo: 'Atua como',
  estudo: 'Estuda para ser',
  atuei: 'Já atuou como',
}

export const EXPERIENCE_RANGE_LABELS: Record<ExperienceRange, string> = {
  'ate-1': 'Menos de 1 ano',
  '1-4': '1 a 4 anos',
  '5-9': '5 a 9 anos',
  '10-mais': '10 anos ou mais',
}

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  fundamental: 'Ensino fundamental',
  medio: 'Ensino médio',
  tecnico: 'Curso técnico',
  graduacao: 'Graduação',
  especializacao: 'Pós-graduação (especialização/MBA)',
  mestrado: 'Mestrado',
  doutorado: 'Doutorado',
}

// Níveis em que faz sentido informar o nome do curso.
export function nivelTemCurso(nivel: EducationLevel | null): boolean {
  return !!nivel && nivel !== 'fundamental' && nivel !== 'medio'
}

// "223505" → "2235-05" (formato em que a CBO é citada).
export function formatarCbo(codigo: string): string {
  return codigo.length === 6 ? `${codigo.slice(0, 4)}-${codigo.slice(4)}` : codigo
}

// Primeira letra minúscula para usar no meio da frase ("Atua como
// enfermeiro"), sem estragar siglas ("DJ").
export function noMeioDaFrase(titulo: string): string {
  if (titulo.length > 1 && titulo[1] === titulo[1].toLowerCase()) {
    return titulo[0].toLowerCase() + titulo.slice(1)
  }
  return titulo
}

// "Atua como enfermeiro" — linha de profissão de um depoimento ou perfil.
// Sem situação (depoimento antigo, texto livre), mostra só o texto.
export function descreverProfissao(
  titulo: string,
  status: ProfessionStatus | null,
): string {
  if (!status) return titulo
  return `${PROFESSION_STATUS_TERCEIRA[status]} ${noMeioDaFrase(titulo)}`
}

// "Graduação em Enfermagem (cursando)".
export function descreverFormacao(p: {
  education_level: EducationLevel | null
  education_course: string | null
  education_in_progress: boolean
}): string {
  if (!p.education_level) return ''
  const nivel = EDUCATION_LEVEL_LABELS[p.education_level]
  const curso =
    nivelTemCurso(p.education_level) && p.education_course ? ` em ${p.education_course}` : ''
  return `${nivel}${curso}${p.education_in_progress ? ' (cursando)' : ''}`
}

// Mesma regra do banco (enforce_profile_rules, migração 017): menor de 18
// anos não exibe contato. Sem data de nascimento, não há como saber.
export function isMenorDeIdade(birthDate: string | null): boolean {
  if (!birthDate) return false
  const nascimento = new Date(`${birthDate}T00:00:00`)
  const limite = new Date()
  limite.setFullYear(limite.getFullYear() - 18)
  return nascimento > limite
}

// Profissão do guia com o mesmo código da CBO, se houver ("2235-05" no guia).
const SLUG_POR_CBO = new Map(PROFISSOES.map((p) => [p.cbo_code.replace('-', ''), p.slug]))

export function slugDoGuia(codigo: string | null): string | null {
  return codigo ? SLUG_POR_CBO.get(codigo) ?? null : null
}

// ---- Lista e busca ----

let cache: Promise<OcupacaoCbo[]> | null = null

export function carregarCbo(): Promise<OcupacaoCbo[]> {
  if (!cache) {
    cache = import('@/data/cbo.json').then((mod) =>
      (mod.default.ocupacoes as [string, string, string[]][]).map(
        ([codigo, titulo, sinonimos]) => ({ codigo, titulo, sinonimos }),
      ),
    )
    // Se falhar (rede), permite tentar de novo na próxima abertura.
    cache.catch(() => {
      cache = null
    })
  }
  return cache
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export interface ResultadoBusca {
  ocupacao: OcupacaoCbo
  // Sinônimo que casou com a busca, quando não foi o título.
  via: string | null
}

// Cada palavra digitada precisa ser o começo de alguma palavra (sem acento,
// sem caixa) do título ou de um mesmo sinônimo — "enferm" acha "Enfermeiro",
// mas "uber" não acha "tubérculos". Cada ocupação entra uma vez, pelo melhor
// texto que casou. Ordem: textos que começam com a busca antes dos outros;
// dentro de cada grupo, título antes de sinônimo e o mais curto (mais
// genérico, ex.: "Advogado" antes de "Advogado (direito penal)") primeiro.
export function buscarOcupacoes(
  lista: OcupacaoCbo[],
  consulta: string,
  limite = 8,
): ResultadoBusca[] {
  const q = normalizar(consulta.trim()).replace(/\s+/g, ' ')
  if (q.length < 2) return []
  const termos = q.split(' ')

  const pontuar = (texto: string, ehSinonimo: boolean): number[] | null => {
    const t = normalizar(texto)
    const palavras = t.split(/[^a-z0-9]+/).filter(Boolean)
    if (!termos.every((termo) => palavras.some((p) => p.startsWith(termo)))) return null
    return [t.startsWith(q) ? 0 : 1, ehSinonimo ? 1 : 0, t.length]
  }
  const menor = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]
    return false
  }

  const achados: { r: ResultadoBusca; nota: number[] }[] = []
  for (const ocupacao of lista) {
    let melhor = pontuar(ocupacao.titulo, false)
    let via: string | null = null
    for (const sinonimo of ocupacao.sinonimos) {
      const nota = pontuar(sinonimo, true)
      if (nota && (!melhor || menor(nota, melhor))) {
        melhor = nota
        via = sinonimo
      }
    }
    if (melhor) achados.push({ r: { ocupacao, via }, nota: melhor })
  }

  return achados
    .sort((a, b) => (menor(a.nota, b.nota) ? -1 : menor(b.nota, a.nota) ? 1 : 0))
    .slice(0, limite)
    .map((a) => a.r)
}
