// Gera a lista de ocupações da CBO usada no app a partir dos CSVs oficiais.
//
// Fonte: Ministério do Trabalho e Emprego — Classificação Brasileira de
// Ocupações, "Estrutura CBO (CSV)", em
// https://cbo.mte.gov.br/cbosite/pages/downloads.jsf
//
// Uso:
//   1. Baixe "Estrutura CBO (CSV) - Arquivo ZIP" no site acima e extraia.
//   2. node scripts/build-cbo.mjs <pasta-extraida> [AAAA-MM-DD do download]
//
// Lê "CBO2002 - Ocupacao.csv" (código + título) e "CBO2002 - Sinonimo.csv"
// (código + sinônimo) e escreve:
//   - data/cbo.json                    → busca de profissão no app
//   - banco/dados/cbo-ocupacoes.sql    → carga da tabela cbo_ocupacoes
//                                        (rodar depois da migração 017)

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const [, , pasta, acessoEm = new Date().toISOString().slice(0, 10)] = process.argv

if (!pasta) {
  console.error('Uso: node scripts/build-cbo.mjs <pasta-com-os-csv> [AAAA-MM-DD]')
  process.exit(1)
}

// Os CSVs do MTE vêm em ISO-8859-1 (às vezes já convertidos para UTF-8 por
// quem extraiu). Se o arquivo for UTF-8 válido, usa UTF-8; senão, latin1.
function lerTexto(caminho) {
  const bytes = readFileSync(caminho)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('latin1').decode(bytes)
  }
}

function acharArquivo(trecho) {
  const nome = readdirSync(pasta).find(
    (f) => f.toLowerCase().endsWith('.csv') && f.toLowerCase().includes(trecho),
  )
  if (!nome) {
    console.error(`Não achei um CSV com "${trecho}" no nome em ${pasta}.`)
    process.exit(1)
  }
  return join(pasta, nome)
}

// Linhas "CODIGO;TEXTO" (cabeçalho na primeira linha). O texto pode vir
// entre aspas.
function lerPares(caminho) {
  const linhas = lerTexto(caminho).split(/\r?\n/).filter((l) => l.trim())
  return linhas.slice(1).map((linha) => {
    const i = linha.indexOf(';')
    const codigo = linha.slice(0, i).trim().replace(/^"|"$/g, '')
    const texto = linha.slice(i + 1).trim().replace(/^"|"$/g, '').replace(/\s+/g, ' ')
    return [codigo, texto]
  })
}

const ocupacoes = new Map()
for (const [codigo, titulo] of lerPares(acharArquivo('ocupacao'))) {
  if (!/^\d{6}$/.test(codigo)) {
    console.error(`Código inválido em Ocupacao.csv: "${codigo}"`)
    process.exit(1)
  }
  ocupacoes.set(codigo, { titulo, sinonimos: new Set() })
}

let semOcupacao = 0
for (const [codigo, sinonimo] of lerPares(acharArquivo('sinonimo'))) {
  const oc = ocupacoes.get(codigo)
  if (!oc) {
    semOcupacao++
    continue
  }
  if (sinonimo.toLowerCase() !== oc.titulo.toLowerCase()) oc.sinonimos.add(sinonimo)
}

const lista = [...ocupacoes.entries()]
  .sort(([, a], [, b]) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
  .map(([codigo, { titulo, sinonimos }]) => [codigo, titulo, [...sinonimos]])

const json = {
  fonte: 'Ministério do Trabalho e Emprego — Classificação Brasileira de Ocupações (CBO 2002), Estrutura CBO (CSV)',
  url: 'https://cbo.mte.gov.br/cbosite/pages/downloads.jsf',
  acesso_em: acessoEm,
  // [código de 6 dígitos, título oficial, sinônimos]
  ocupacoes: lista,
}
writeFileSync(join(ROOT, 'data', 'cbo.json'), JSON.stringify(json) + '\n')

const sqlStr = (s) => `'${s.replace(/'/g, "''")}'`
const valores = lista.map(([codigo, titulo]) => `  (${sqlStr(codigo)}, ${sqlStr(titulo)})`)
const sql = `-- ================================================
-- Carga da tabela cbo_ocupacoes (gerado por scripts/build-cbo.mjs — não editar à mão)
-- Fonte: ${json.fonte}
-- ${json.url} (acesso em ${acessoEm})
-- Rodar no SQL Editor do Supabase DEPOIS da migração 017.
-- Idempotente: atualiza títulos que mudarem numa nova versão da CBO.
-- ================================================

insert into public.cbo_ocupacoes (codigo, titulo) values
${valores.join(',\n')}
on conflict (codigo) do update set titulo = excluded.titulo;
`
mkdirSync(join(ROOT, 'banco', 'dados'), { recursive: true })
writeFileSync(join(ROOT, 'banco', 'dados', 'cbo-ocupacoes.sql'), sql)

const totalSinonimos = lista.reduce((n, [, , s]) => n + s.length, 0)
console.log(`${lista.length} ocupações, ${totalSinonimos} sinônimos.`)
if (semOcupacao) console.log(`${semOcupacao} sinônimos ignorados (código sem ocupação).`)
console.log('Escrito: data/cbo.json e banco/dados/cbo-ocupacoes.sql')
