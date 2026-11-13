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
function validateFicha(p, slugsSeen, cbosSeen) {
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
  } else if (cbosSeen.has(p.cbo_code)) {
    at(`cbo_code duplicado: "${p.cbo_code}" (já usado por "${cbosSeen.get(p.cbo_code)}")`)
  } else {
    cbosSeen.set(p.cbo_code, p.nome)
  }
  if (!AREAS.includes(p.area)) at(`area inválida: ${JSON.stringify(p.area)} (use uma da taxonomia)`)
  if (!isStr(p.descricao, 60)) at('descricao ausente ou com menos de 60 caracteres')

  if (!Array.isArray(p.atividades) || p.atividades.length < 3) {
    at('atividades: mínimo de 3 itens')
  } else {
    if (!p.atividades.every((s) => isStr(s, 8))) {
      at('atividades: cada item precisa ter ao menos 8 caracteres')
    }
    if (new Set(p.atividades).size !== p.atividades.length) {
      at('atividades: há item repetido na lista')
    }
  }

  if (!Array.isArray(p.habilidades) || p.habilidades.length < 3) {
    at('habilidades: mínimo de 3 itens')
  } else {
    if (!p.habilidades.every((s) => isStr(s, 4))) {
      at('habilidades: cada item precisa ter ao menos 4 caracteres')
    }
    if (new Set(p.habilidades).size !== p.habilidades.length) {
      at('habilidades: há item repetido na lista')
    }
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
    // Só exigimos p25 <= p75 (os quartis, por definição, não podem estar
    // invertidos). NÃO exigimos p25 <= media <= p75: em distribuições
    // assimétricas — comum em profissões remuneradas por comissão, com poucos
    // ganhos muito altos puxando a média — a média pode legitimamente cair
    // fora da faixa entre o 1º e o 3º quartil. Já observado em dados reais
    // (ex.: representante comercial autônomo, CAGED ago/2025-jul/2026).
    if (isPosNum(s.p25) && isPosNum(s.p75) && !(s.p25 <= s.p75)) {
      at(`salario: p25 (${s.p25}) não pode ser maior que p75 (${s.p75})`)
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
    // URL repetida em duas fontes "diferentes" é sinal de cópia-e-cola (uma
    // delas não aponta pra fonte que diz citar) — e quebra a key do React no
    // card (fontes renderizadas com key={f.url}), gerando aviso no console.
    const urls = p.fontes.map((f) => f?.url).filter(Boolean)
    if (new Set(urls).size !== urls.length) {
      at('fontes: duas fontes apontam para a mesma URL (verifique se uma delas foi citada errada)')
    }
  }

  if (!STATUS.includes(p.status)) at(`status inválido: ${JSON.stringify(p.status)}`)
  if (!isDate(p.atualizado_em)) at('atualizado_em precisa ser AAAA-MM-DD')
  if (!isStr(p.revisado_por, 2)) at('revisado_por ausente')

  // "Onde estudar": ids do catálogo data/cursos.json (lista vazia = não há
  // curso específico a indicar).
  if (!Array.isArray(p.cursos)) {
    at('cursos precisa ser uma lista (pode ser vazia)')
  } else {
    for (const id of p.cursos) {
      if (!cursoIds.has(id)) at(`cursos: "${id}" não existe em data/cursos.json`)
    }
    if (new Set(p.cursos).size !== p.cursos.length) at('cursos: há item repetido na lista')
  }
  if (p.cursos_nota !== undefined && !isStr(p.cursos_nota, 10)) {
    at('cursos_nota, quando existe, precisa ser um texto')
  }

  return e
}

// Catálogo de "onde estudar" (data/cursos.json): instituições e cursos com as
// páginas de curso de cada instituição.
const NIVEIS = ['graduacao', 'tecnologo', 'tecnico']
const REGIOES = ['paranhana', 'vizinhas', 'porto-alegre']
const INGRESSOS = ['prova', 'enem', 'sisu', 'sorteio']
const BOLSAS = ['prouni', 'fies']
let cursoIds = new Set()

function validateCatalogo(cat) {
  const e = []
  const instIds = new Set()
  for (const i of cat.instituicoes ?? []) {
    const r = `instituição ${i?.id ?? '?'}`
    if (!isStr(i.id) || instIds.has(i.id)) e.push(`${r}: id ausente ou repetido`)
    instIds.add(i.id)
    if (!isStr(i.nome) || !isStr(i.sigla) || !isStr(i.cidade)) e.push(`${r}: nome, sigla e cidade são obrigatórios`)
    if (!REGIOES.includes(i.regiao)) e.push(`${r}: regiao inválida`)
    if (!isUrl(i.fonte)) e.push(`${r}: fonte precisa ser URL`)
    if (!isDate(i.acesso_em)) e.push(`${r}: acesso_em precisa ser AAAA-MM-DD`)
    if (typeof i.gratuita !== 'boolean') e.push(`${r}: gratuita precisa ser true ou false`)
    for (const [campo, permitidos] of [['ingresso', INGRESSOS], ['bolsas', BOLSAS]]) {
      const v = i[campo]
      if (!Array.isArray(v) || v.some((x) => !permitidos.includes(x)) || new Set(v).size !== v.length)
        e.push(`${r}: ${campo} precisa ser lista sem repetição de ${permitidos.join(', ')}`)
    }
    if (!isUrl(i.ingresso_url)) e.push(`${r}: ingresso_url precisa ser URL`)
    if (i.ingresso_nota !== undefined && !isStr(i.ingresso_nota)) e.push(`${r}: ingresso_nota precisa ser texto`)
    // sem forma de ingresso confirmada, a nota precisa dizer como se informar
    if (Array.isArray(i.ingresso) && i.ingresso.length === 0 && !isStr(i.ingresso_nota))
      e.push(`${r}: sem ingresso confirmado, ingresso_nota é obrigatória`)
  }
  for (const c of cat.cursos ?? []) {
    const r = `curso ${c?.id ?? '?'}`
    if (!isStr(c.id) || cursoIds.has(c.id)) e.push(`${r}: id ausente ou repetido`)
    cursoIds.add(c.id)
    if (!isStr(c.nome)) e.push(`${r}: nome ausente`)
    if (!NIVEIS.includes(c.nivel)) e.push(`${r}: nivel inválido`)
    if (!Array.isArray(c.ofertas)) { e.push(`${r}: ofertas precisa ser lista`); continue }
    const vistas = new Set()
    for (const o of c.ofertas) {
      if (!instIds.has(o.instituicao)) e.push(`${r}: instituição desconhecida "${o.instituicao}"`)
      if (vistas.has(o.instituicao)) e.push(`${r}: instituição repetida "${o.instituicao}"`)
      vistas.add(o.instituicao)
      if (!isUrl(o.url)) e.push(`${r}: url inválida em ${o.instituicao}`)
    }
  }
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

  try {
    const cat = JSON.parse(await readFile(path.join(ROOT, 'data', 'cursos.json'), 'utf8'))
    const errosCat = validateCatalogo(cat)
    if (errosCat.length) {
      console.error('\n✖ data/cursos.json')
      errosCat.forEach((msg) => console.error(`    - ${msg}`))
      process.exit(1)
    }
  } catch (err) {
    console.error(`✖ não foi possível ler data/cursos.json: ${err.message}`)
    process.exit(1)
  }

  const slugsSeen = new Set()
  const cbosSeen = new Map()
  let totalErros = 0
  let publicadas = 0

  data.forEach((ficha, i) => {
    const erros = validateFicha(ficha, slugsSeen, cbosSeen)
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
