#!/usr/bin/env node
/**
 * Valida data/instruments/onet-mini-ip.json contra as regras do instrumento
 * do teste vocacional.
 *
 * Uso:  node scripts/validate-instruments.mjs
 * Sai com código 1 se o arquivo estiver fora das regras — serve para rodar
 * localmente antes de commitar e, no futuro, em CI.
 *
 * Sem dependências externas de propósito: a lógica precisa ser legível para
 * quem for manter o instrumento. O arquivo onet-mini-ip.schema.json documenta
 * o mesmo contrato de forma declarativa (para editores/IDE).
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_PATH = path.join(ROOT, 'data', 'instruments', 'onet-mini-ip.json')

const RIASEC = ['R', 'I', 'A', 'S', 'E', 'C']
const STATUS = ['rascunho', 'publicado']

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isUrl = (v) => typeof v === 'string' && /^https?:\/\/\S+$/.test(v)
const isStr = (v, min = 1) => typeof v === 'string' && v.trim().length >= min
const isInt = (v) => typeof v === 'number' && Number.isInteger(v)

/** @returns {string[]} lista de erros (vazia = ok) */
function validate(inst) {
  const e = []
  const at = (msg) => e.push(msg)

  if (!isStr(inst.slug) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(inst.slug || '')) {
    at('slug ausente ou fora do padrão kebab-case')
  }
  if (!isStr(inst.version, 3)) at('version ausente ou muito curta')
  if (!isStr(inst.nome, 3)) at('nome ausente ou muito curto')
  if (!isStr(inst.nome_curto, 3)) at('nome_curto ausente ou muito curto')
  if (inst.modelo !== 'RIASEC') at('modelo precisa ser "RIASEC"')
  if (!STATUS.includes(inst.status)) at(`status inválido: ${JSON.stringify(inst.status)}`)
  if (!isDate(inst.atualizado_em)) at('atualizado_em precisa ser AAAA-MM-DD')
  if (inst.status === 'publicado' && !isStr(inst.revisado_por, 2)) {
    at('status "publicado" exige revisado_por preenchido (nomes dos juízes / responsável)')
  }
  if (typeof inst.revisado_por !== 'string') at('revisado_por precisa ser string (pode ser "" enquanto rascunho)')

  const o = inst.origem
  if (typeof o !== 'object' || o === null) {
    at('origem ausente')
  } else {
    for (const k of ['instrumento', 'forma', 'autores', 'publicado_por']) {
      if (!isStr(o[k], 4)) at(`origem.${k} ausente`)
    }
    if (!isStr(o.licenca, 10)) at('origem.licenca ausente')
    if (!isStr(o.traducao_status, 10)) at('origem.traducao_status ausente')
  }

  if (!Array.isArray(inst.fontes) || inst.fontes.length < 1) {
    at('fontes: pelo menos 1 referência é obrigatória')
  } else {
    inst.fontes.forEach((f, i) => {
      if (!isStr(f?.titulo, 4)) at(`fontes[${i}].titulo ausente`)
      if (!isUrl(f?.url)) at(`fontes[${i}].url inválida`)
      if (!isDate(f?.acesso_em)) at(`fontes[${i}].acesso_em precisa ser AAAA-MM-DD`)
    })
  }

  const esc = inst.escala
  let opCount = 0
  if (typeof esc !== 'object' || esc === null) {
    at('escala ausente')
  } else {
    if (!isStr(esc.tipo, 3)) at('escala.tipo ausente')
    if (!isInt(esc.min)) at('escala.min precisa ser inteiro')
    if (!isInt(esc.max)) at('escala.max precisa ser inteiro')
    if (isInt(esc.min) && isInt(esc.max) && esc.min >= esc.max) {
      at('escala: precisa valer min < max')
    }
    if (!isStr(esc.instrucao, 10)) at('escala.instrucao ausente ou muito curta')
    if (!Array.isArray(esc.opcoes) || esc.opcoes.length < 2) {
      at('escala.opcoes: mínimo de 2 opções')
    } else {
      opCount = esc.opcoes.length
      const valores = new Set()
      esc.opcoes.forEach((op, i) => {
        if (!isInt(op?.valor)) at(`escala.opcoes[${i}].valor precisa ser inteiro`)
        else {
          if (isInt(esc.min) && isInt(esc.max) && (op.valor < esc.min || op.valor > esc.max)) {
            at(`escala.opcoes[${i}].valor (${op.valor}) fora de [${esc.min}, ${esc.max}]`)
          }
          if (valores.has(op.valor)) at(`escala.opcoes: valor duplicado ${op.valor}`)
          valores.add(op.valor)
        }
        if (!isStr(op?.rotulo)) at(`escala.opcoes[${i}].rotulo ausente`)
        if (!isStr(op?.rotulo_en)) at(`escala.opcoes[${i}].rotulo_en ausente`)
      })
      if (isInt(esc.min) && isInt(esc.max) && opCount !== esc.max - esc.min + 1) {
        at(`escala.opcoes: esperado ${esc.max - esc.min + 1} opções (min..max), encontrado ${opCount}`)
      }
    }
  }

  const p = inst.pontuacao
  if (typeof p !== 'object' || p === null) {
    at('pontuacao ausente')
  } else {
    if (p.metodo !== 'soma') at('pontuacao.metodo: só "soma" é suportado')
    if (!isInt(p.itens_por_tipo) || p.itens_por_tipo <= 0) at('pontuacao.itens_por_tipo precisa ser inteiro > 0')
    if (!isInt(p.min_por_tipo) || p.min_por_tipo < 0) at('pontuacao.min_por_tipo precisa ser inteiro >= 0')
    if (!isInt(p.max_por_tipo) || p.max_por_tipo <= 0) at('pontuacao.max_por_tipo precisa ser inteiro > 0')
    if (esc && isInt(esc.max) && isInt(p.itens_por_tipo) && isInt(p.max_por_tipo)) {
      if (p.max_por_tipo !== p.itens_por_tipo * esc.max) {
        at(`pontuacao.max_por_tipo (${p.max_por_tipo}) precisa ser itens_por_tipo x escala.max (${p.itens_por_tipo * esc.max})`)
      }
    }
    if (esc && isInt(esc.min) && isInt(p.itens_por_tipo) && isInt(p.min_por_tipo)) {
      if (p.min_por_tipo !== p.itens_por_tipo * esc.min) {
        at(`pontuacao.min_por_tipo (${p.min_por_tipo}) precisa ser itens_por_tipo x escala.min (${p.itens_por_tipo * esc.min})`)
      }
    }
  }

  if (!Array.isArray(inst.itens) || inst.itens.length < 6) {
    at('itens: lista ausente ou com menos de 6 itens')
  } else {
    const porTipo = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }
    const posicoes = new Set()
    inst.itens.forEach((it, i) => {
      if (!isInt(it?.posicao) || it.posicao <= 0) at(`itens[${i}].posicao precisa ser inteiro > 0`)
      else if (posicoes.has(it.posicao)) at(`itens: posicao duplicada ${it.posicao}`)
      else posicoes.add(it.posicao)

      if (!RIASEC.includes(it?.tipo)) at(`itens[${i}].tipo inválido: ${JSON.stringify(it?.tipo)}`)
      else porTipo[it.tipo]++

      if (!isStr(it?.texto, 3)) at(`itens[${i}].texto ausente ou muito curto`)
      if (!isStr(it?.texto_original, 3)) at(`itens[${i}].texto_original ausente ou muito curto`)
    })

    const esperado = p && isInt(p.itens_por_tipo) ? p.itens_por_tipo : null
    for (const t of RIASEC) {
      if (esperado !== null && porTipo[t] !== esperado) {
        at(`tipo ${t}: esperado ${esperado} itens, encontrado ${porTipo[t]}`)
      }
    }
    if (esperado !== null && inst.itens.length !== esperado * 6) {
      at(`itens: esperado ${esperado * 6} no total (${esperado} x 6 tipos), encontrado ${inst.itens.length}`)
    }
    // posições devem cobrir 1..N sem buracos
    for (let n = 1; n <= inst.itens.length; n++) {
      if (!posicoes.has(n)) at(`itens: falta a posicao ${n} (as posições devem ser 1..${inst.itens.length})`)
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
    console.error(`✖ JSON inválido em onet-mini-ip.json: ${err.message}`)
    process.exit(1)
  }

  const erros = validate(data)

  if (erros.length) {
    console.error(`\n✖ ${data?.slug || 'instrumento'}`)
    erros.forEach((msg) => console.error(`    - ${msg}`))
    console.error(`\n✖ ${erros.length} problema(s) encontrado(s). Corrija antes de commitar.`)
    process.exit(1)
  }

  console.log(
    `\n${data.slug} v${data.version} — ${data.itens.length} itens, status "${data.status}".`,
  )
  console.log('✓ tudo válido.')
}

main()
