#!/usr/bin/env node
/**
 * Valida data/professions.json contra as regras do guia de profissões.
 *
 * Uso:  node scripts/validate-professions.mjs
 * Sai com código 1 se qualquer ficha estiver inválida — serve para rodar
 * localmente antes de commitar e, no futuro, em CI.
 *
 * Sem dependências externas de propósito: a lógica precisa ser legível para
 * quem for manter o guia. O arquivo data/professions.schema.json documenta o
 * mesmo contrato de forma declarativa (para editores/IDE).
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_PATH = path.join(ROOT, 'data', 'professions.json')

const AREAS = [
  'Agrárias e Meio Ambiente',
  'Artes, Design e Cultura',
  'Ciências Biológicas',
  'Ciências Exatas e da Terra',
  'Comunicação e Informação',
  'Construção e Infraestrutura',
  'Educação',
  'Gestão e Negócios',
  'Indústria e Produção',
  'Saúde e Bem-estar',
  'Serviços Sociais e Jurídicos',
  'Tecnologia da Informação',
]
const FORMACOES = ['fundamental', 'medio', 'tecnico', 'superior', 'superior-conselho']
const RIASEC = ['R', 'I', 'A', 'S', 'E', 'C']
const STATUS = ['rascunho', 'publicado']

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isUrl = (v) => typeof v === 'string' && /^https?:\/\/\S+$/.test(v)
const isStr = (v, min = 1) => typeof v === 'string' && v.trim().length >= min
const isPosNum = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0

/** @returns {string[]} lista de erros da ficha (vazia = ok) */
function validateFicha(p, slugsSeen) {
  const e = []
  const at = (msg) => e.push(msg)

  if (!isStr(p.slug) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug || '')) {
    at('slug ausente ou fora do padrão kebab-case')
  } else if (slugsSeen.has(p.slug)) {
    at(`slug duplicado: "${p.slug}"`)
  } else {
    slugsSeen.add(p.slug)
  }

  if (!isStr(p.nome, 3)) at('nome ausente ou muito curto')
  if (!isStr(p.cbo_code) || !/^\d{4}-\d{2}$/.test(p.cbo_code || '')) {
    at('cbo_code ausente ou fora do formato 0000-00')
  }
  if (!AREAS.includes(p.area)) at(`area inválida: ${JSON.stringify(p.area)} (use uma da taxonomia)`)
  if (!isStr(p.descricao, 60)) at('descricao ausente ou com menos de 60 caracteres')

  if (!Array.isArray(p.atividades) || p.atividades.length < 3) {
    at('atividades: mínimo de 3 itens')
  } else if (!p.atividades.every((s) => isStr(s, 8))) {
    at('atividades: cada item precisa ter ao menos 8 caracteres')
  }

  if (!Array.isArray(p.habilidades) || p.habilidades.length < 3) {
    at('habilidades: mínimo de 3 itens')
  } else if (!p.habilidades.every((s) => isStr(s, 4))) {
    at('habilidades: cada item precisa ter ao menos 4 caracteres')
  }

  if (!FORMACOES.includes(p.formacao_requerida)) {
    at(`formacao_requerida inválida: ${JSON.stringify(p.formacao_requerida)}`)
  }
  if (typeof p.regulamentada !== 'boolean') at('regulamentada precisa ser true/false')
  if (p.regulamentada === true && !isStr(p.conselho)) {
    at('regulamentada=true exige "conselho" preenchido')
  }
  if (p.regulamentada === false && p.conselho !== null) {
    at('regulamentada=false exige "conselho": null')
  }

  if (!isStr(p.riasec_code) || !/^[RIASEC]{1,3}$/.test(p.riasec_code || '')) {
    at('riasec_code precisa ter 1 a 3 letras entre R I A S E C')
  }
  if (!RIASEC.includes(p.riasec_primary)) {
    at(`riasec_primary inválido: ${JSON.stringify(p.riasec_primary)}`)
  }
  if (isStr(p.riasec_code) && isStr(p.riasec_primary) && p.riasec_code[0] !== p.riasec_primary) {
    at(`riasec_primary ("${p.riasec_primary}") precisa ser a 1ª letra de riasec_code ("${p.riasec_code}")`)
  }

  const s = p.salario
  if (typeof s !== 'object' || s === null) {
    at('salario ausente')
  } else {
    if (!isPosNum(s.media)) at('salario.media precisa ser número > 0')
    if (!isPosNum(s.p25)) at('salario.p25 precisa ser número > 0')
    if (!isPosNum(s.p75)) at('salario.p75 precisa ser número > 0')
    if (isPosNum(s.p25) && isPosNum(s.media) && isPosNum(s.p75)) {
      if (!(s.p25 <= s.media && s.media <= s.p75)) {
        at(`salario: precisa valer p25 <= media <= p75 (recebido ${s.p25} / ${s.media} / ${s.p75})`)
      }
    }
    if (s.moeda !== 'BRL') at('salario.moeda precisa ser "BRL"')
    if (!isStr(s.fonte, 4)) at('salario.fonte ausente')
    if (!isStr(s.referencia, 4)) at('salario.referencia ausente (período dos dados)')
  }

  if (!Array.isArray(p.fontes) || p.fontes.length < 1) {
    at('fontes: pelo menos 1 referência é obrigatória')
  } else {
    p.fontes.forEach((f, i) => {
      if (!isStr(f?.titulo, 4)) at(`fontes[${i}].titulo ausente`)
      if (!isUrl(f?.url)) at(`fontes[${i}].url inválida`)
      if (!isDate(f?.acesso_em)) at(`fontes[${i}].acesso_em precisa ser AAAA-MM-DD`)
    })
  }

  if (!STATUS.includes(p.status)) at(`status inválido: ${JSON.stringify(p.status)}`)
  if (!isDate(p.atualizado_em)) at('atualizado_em precisa ser AAAA-MM-DD')
  if (!isStr(p.revisado_por, 2)) at('revisado_por ausente')

  return e
}

async function main() {
  let raw
  try {
    raw = await readFile(DATA_PATH, 'utf8')
  } catch {
    console.error(`✖ não foi possível ler ${path.relative(ROOT, DATA_PATH)}`)
    process.exit(1)
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch (err) {
    console.error(`✖ JSON inválido em professions.json: ${err.message}`)
    process.exit(1)
  }

  if (!Array.isArray(data)) {
    console.error('✖ o arquivo precisa conter um array de fichas')
    process.exit(1)
  }

  const slugsSeen = new Set()
  let totalErros = 0
  let publicadas = 0

  data.forEach((ficha, i) => {
    const erros = validateFicha(ficha, slugsSeen)
    const rotulo = ficha?.slug || ficha?.nome || `#${i}`
    if (ficha?.status === 'publicado') publicadas++
    if (erros.length) {
      totalErros += erros.length
      console.error(`\n✖ ${rotulo}`)
      erros.forEach((msg) => console.error(`    - ${msg}`))
    }
  })

  console.log(
    `\n${data.length} ficha(s) — ${publicadas} publicada(s), ${data.length - publicadas} rascunho(s).`,
  )

  if (totalErros) {
    console.error(`\n✖ ${totalErros} problema(s) encontrado(s). Corrija antes de commitar.`)
    process.exit(1)
  }
  console.log('✓ tudo válido.')
}

main()
