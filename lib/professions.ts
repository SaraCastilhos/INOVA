import professionsData from '@/data/professions.json'
import type { Profissao, AreaProfissional, RIASECType } from './types'

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

// "Profissões parecidas" da página de cada profissão. Regra simples e
// explicável, só com dados que a ficha já tem (sem campo novo):
//   +2 se é da mesma área
//   +1 por letra do código RIASEC em comum (0 a 3)
//   +1 se o tipo principal (1ª letra) é o mesmo
// Só entra quem divide a área ou o tipo principal E tem ao menos uma letra
// RIASEC em comum (sem isso, a área sozinha puxava profissões de perfil
// oposto, ex.: cuidador de idosos SCR → advogado ECI). Empate em ordem
// alfabética. O motivo vai junto para a tela mostrar por que apareceu.
export type MotivoParecida = 'area-e-perfil' | 'area' | 'perfil'

export function profissoesParecidas(alvo: Profissao, limite = 4) {
  const letrasAlvo = [...alvo.riasec_code]

  return PROFISSOES.filter((p) => p.slug !== alvo.slug)
    .map((p) => {
      const mesmaArea = p.area === alvo.area
      const mesmoTipo = p.riasec_primary === alvo.riasec_primary
      const emComum = [...p.riasec_code].filter((l) => letrasAlvo.includes(l)).length
      const pontos = (mesmaArea ? 2 : 0) + emComum + (mesmoTipo ? 1 : 0)
      const motivo: MotivoParecida | null =
        emComum === 0
          ? null
          : mesmaArea && mesmoTipo
            ? 'area-e-perfil'
            : mesmaArea
              ? 'area'
              : mesmoTipo
                ? 'perfil'
                : null
      return { profissao: p, pontos, motivo }
    })
    .filter((c): c is { profissao: Profissao; pontos: number; motivo: MotivoParecida } => c.motivo !== null)
    .sort(
      (a, b) => b.pontos - a.pontos || a.profissao.nome.localeCompare(b.profissao.nome, 'pt-BR'),
    )
    .slice(0, limite)
}

// Sugestões do resultado do teste (RF03). Para cada um dos três tipos
// predominantes, as profissões cujo tipo principal (1ª letra do código O*NET)
// é aquele tipo. Dentro do tipo vêm antes as que têm mais letras do código em
// comum com os três tipos da pessoa; empate em ordem alfabética. É uma regra
// simples de leitura do código, não um índice de congruência validado.
export function sugerirProfissoes(top3: RIASECType[]) {
  const emComum = (p: Profissao) =>
    [...p.riasec_code].filter((letra) => top3.includes(letra as RIASECType)).length

  return top3.map((tipo) => ({
    tipo,
    profissoes: PROFISSOES.filter((p) => p.riasec_primary === tipo).sort(
      (a, b) => emComum(b) - emComum(a) || a.nome.localeCompare(b.nome, 'pt-BR'),
    ),
  }))
}
