import professionsData from '@/data/professions.json'
import type { Profissao, AreaProfissional } from './types'

// data/professions.json é a fonte da verdade do guia (conteúdo curado,
// versionado no git). O formato é garantido por scripts/validate-professions.mjs
// e documentado em data/professions.schema.json.
const TODAS: Profissao[] = professionsData as Profissao[]

// O guia só expõe fichas com status "publicado" — ou seja, com todos os
// campos preenchidos e fontes registradas. Rascunhos ficam no arquivo mas
// não aparecem para o usuário.
export const PROFISSOES: Profissao[] = TODAS.filter((p) => p.status === 'publicado')

// Áreas que têm ao menos uma profissão publicada (para o filtro da UI).
export const AREAS: AreaProfissional[] = Array.from(
  new Set(PROFISSOES.map((p) => p.area)),
).sort((a, b) => a.localeCompare(b, 'pt-BR'))

// Data da última revisão entre as fichas publicadas — exibida no rodapé do
// guia (RN07: "data da última atualização").
export const guiaAtualizadoEm: string | null = PROFISSOES.reduce<string | null>(
  (maisRecente, p) =>
    maisRecente && maisRecente >= p.atualizado_em ? maisRecente : p.atualizado_em,
  null,
)
