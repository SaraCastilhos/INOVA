#!/usr/bin/env node
// Confere por HTTP os links do guia: fontes das fichas (data/professions.json)
// e instituições, páginas de ingresso e páginas de curso (data/cursos.json).
//
//   npm run check:links            todos os links
//   npm run check:links -- cursos  só data/cursos.json
//   npm run check:links -- fontes  só as fontes das fichas
//
// Separado do validador porque depende de rede e leva alguns minutos. Rodar
// antes de cada atualização do conteúdo (ver data/README.md).
//
// Resultado de cada link:
//   ok       respondeu 2xx (depois de seguir redirecionamentos)
//   mudou    respondeu 2xx, mas foi parar em outro site ou num endereço que
//            parece página inicial/erro: abrir e conferir à mão
//   bloqueou o site recusa script (403, 429, captcha, certificado): não dá
//            para saber daqui; abrir no navegador
//   quebrado 404/410, outro 4xx/5xx ou endereço inexistente: corrigir
// Sai com código 1 só se houver "quebrado".

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TIMEOUT_MS = 25_000
const PARALELO = 6
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'

const filtro = process.argv[2]

async function lerJson(rel) {
  return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'))
}

// url -> lista de "onde aparece", para o relatório apontar o que corrigir
const links = new Map()
function add(url, onde) {
  if (!links.has(url)) links.set(url, [])
  links.get(url).push(onde)
}

if (filtro !== 'cursos') {
  const raw = await lerJson('data/professions.json')
  const fichas = Array.isArray(raw) ? raw : raw.profissoes
  for (const p of fichas) for (const f of p.fontes ?? []) add(f.url, `ficha ${p.slug}`)
}
if (filtro !== 'fontes') {
  const cat = await lerJson('data/cursos.json')
  for (const i of cat.instituicoes) {
    add(i.fonte, `instituição ${i.id} (fonte)`)
    add(i.ingresso_url, `instituição ${i.id} (ingresso)`)
  }
  for (const c of cat.cursos) for (const o of c.ofertas) add(o.url, `curso ${c.id} @ ${o.instituicao}`)
}

const host = (u) => new URL(u).hostname.replace(/^www\d*\./, '')
// serviços anti-robô que interceptam o pedido e redirecionam para um desafio
// (o ifrs.edu.br usa o Radware, em validate.perfdrive.com)
const MURO_ANTIROBO = /(^|\.)(perfdrive\.com|captcha\.|hcaptcha\.com|challenges\.cloudflare\.com)$/
const curta = (u) => (u.length > 110 ? u.slice(0, 107) + '...' : u)
const pareceInicioOuErro = (u) => /\/(404|erro|error|not-found|pagina-nao-encontrada)\b/i.test(new URL(u).pathname)

async function pedir(url, method) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      method,
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': UA, 'accept-language': 'pt-BR,pt;q=0.9' },
    })
    // corpo pequeno o bastante para detectar captcha sem baixar páginas enormes
    const corpo = method === 'GET' ? (await r.text()).slice(0, 20_000) : ''
    return { status: r.status, final: r.url, corpo }
  } finally {
    clearTimeout(t)
  }
}

async function conferir(url) {
  let r
  try {
    // HEAD é mais leve, mas vários sites respondem errado a ele; GET confirma
    r = await pedir(url, 'HEAD')
    if (r.status >= 400 || r.status === 0) r = await pedir(url, 'GET')
  } catch (e) {
    const msg = String(e?.cause?.code ?? e?.cause?.message ?? e?.message ?? e)
    if (/ENOTFOUND|EAI_AGAIN/.test(msg)) return { res: 'quebrado', det: 'endereço não existe (DNS)' }
    if (/CERT|SSL|TLS|certificate/i.test(msg)) return { res: 'bloqueou', det: `certificado: ${msg}` }
    if (/abort/i.test(msg)) return { res: 'bloqueou', det: 'sem resposta em 25 s' }
    return { res: 'bloqueou', det: msg }
  }
  const { status, final, corpo } = r
  if (status === 403 || status === 429 || status === 503 || /captcha|cf-challenge/i.test(corpo))
    return { res: 'bloqueou', det: `HTTP ${status}` }
  if (MURO_ANTIROBO.test(new URL(final).hostname)) return { res: 'bloqueou', det: `anti-robô (${host(final)})` }
  if (status >= 400) return { res: 'quebrado', det: `HTTP ${status}` }
  if (host(final) !== host(url)) return { res: 'mudou', det: `foi para ${curta(final)}` }
  if (pareceInicioOuErro(final) || (new URL(final).pathname === '/' && new URL(url).pathname !== '/'))
    return { res: 'mudou', det: `foi para ${curta(final)}` }
  return { res: 'ok' }
}

const fila = [...links.keys()]
const resultados = new Map()
let feitos = 0
async function trabalhador() {
  while (fila.length) {
    const url = fila.shift()
    resultados.set(url, await conferir(url))
    feitos++
    if (process.stdout.isTTY) process.stdout.write(`\r${feitos}/${links.size}`)
  }
}
console.log(`Conferindo ${links.size} links únicos...`)
await Promise.all(Array.from({ length: PARALELO }, trabalhador))
if (process.stdout.isTTY) process.stdout.write('\r')

const grupos = { quebrado: [], mudou: [], bloqueou: [], ok: [] }
for (const [url, r] of resultados) grupos[r.res].push([url, r.det])

const TITULO = {
  quebrado: '✖ Quebrados (corrigir)',
  mudou: '⚠ Foram parar em outro lugar (conferir à mão)',
  bloqueou: '· O site recusou o script (abrir no navegador)',
}
for (const k of ['quebrado', 'mudou', 'bloqueou']) {
  if (!grupos[k].length) continue
  console.log(`\n${TITULO[k]}: ${grupos[k].length}`)
  for (const [url, det] of grupos[k]) {
    console.log(`  ${curta(url)}\n    ${det}\n    em: ${links.get(url).slice(0, 3).join('; ')}${links.get(url).length > 3 ? ` (+${links.get(url).length - 3})` : ''}`)
  }
}
console.log(
  `\n${grupos.ok.length} ok, ${grupos.mudou.length} a conferir, ${grupos.bloqueou.length} bloqueados, ${grupos.quebrado.length} quebrados.`,
)
process.exit(grupos.quebrado.length ? 1 : 0)
