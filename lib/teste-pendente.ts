// Resultado do teste feito SEM conta (modo visitante).
//
// Fica só no navegador da pessoa (localStorage) — nunca vai para o banco
// enquanto ela não tiver conta. Serve para duas coisas:
//   1. liberar no guia o filtro por tipo RIASEC para o visitante;
//   2. ser gravado na conta NOVA que a pessoa criar depois do teste.
//
// Regra (decidida pela pesquisadora): o resultado só vai para uma conta criada
// a partir deste navegador depois do teste. Entrar numa conta que já existia
// descarta o resultado pendente, para não misturar testes de pessoas/contas.
// Por isso a tela de cadastro "marca" o pendente com o e-mail cadastrado e a
// hora do cadastro (marcarCadastro); no primeiro login, ele só é gravado se o
// e-mail bater e a conta tiver sido criada nesse cadastro (contaDoCadastro).
//
// localStorage (e não sessionStorage) porque o link de confirmação do e-mail
// costuma abrir em outra aba. Expira em 7 dias e vale só para a versão atual
// do instrumento.

import { INSTRUMENTO, INSTRUMENT_VERSION, ITENS } from '@/lib/instruments'

const KEY = 'inova:teste-pendente'
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000
// Folga para diferença entre o relógio do aparelho e o do servidor ao comparar
// a hora do cadastro (aparelho) com a criação da conta (servidor).
const FOLGA_RELOGIO_MS = 10 * 60 * 1000

export type TestePendente = {
  version: string
  respostas: Record<number, number>
  concluidoEm: string
  cadastro?: { email: string; em: string }
}

export function lerTestePendente(): TestePendente | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    const concluido = Date.parse(s.concluidoEm)
    if (s.version !== INSTRUMENT_VERSION || !Number.isFinite(concluido) || Date.now() - concluido > VALIDADE_MS) {
      limparTestePendente()
      return null
    }

    const respostas: Record<number, number> = {}
    for (const item of ITENS) {
      const v = s.respostas?.[item.posicao]
      if (!Number.isInteger(v) || v < INSTRUMENTO.escala.min || v > INSTRUMENTO.escala.max) {
        limparTestePendente()
        return null
      }
      respostas[item.posicao] = v
    }

    const cadastro =
      typeof s.cadastro?.email === 'string' && typeof s.cadastro?.em === 'string'
        ? { email: s.cadastro.email, em: s.cadastro.em }
        : undefined
    return { version: INSTRUMENT_VERSION, respostas, concluidoEm: s.concluidoEm, cadastro }
  } catch {
    return null
  }
}

/** Guarda o resultado de um teste completo feito sem conta (substitui o anterior). */
export function salvarTestePendente(respostas: Record<number, number>) {
  try {
    const dados: TestePendente = { version: INSTRUMENT_VERSION, respostas, concluidoEm: new Date().toISOString() }
    window.localStorage.setItem(KEY, JSON.stringify(dados))
  } catch {
    // localStorage indisponível: o resultado só não é levado para a conta.
  }
}

/** Chamado quando o cadastro é enviado: associa o resultado pendente a este e-mail. */
export function marcarCadastro(email: string) {
  const atual = lerTestePendente()
  if (!atual) return
  try {
    const dados: TestePendente = { ...atual, cadastro: { email: email.trim().toLowerCase(), em: new Date().toISOString() } }
    window.localStorage.setItem(KEY, JSON.stringify(dados))
  } catch {
    // idem acima
  }
}

export function limparTestePendente() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // idem acima
  }
}

/** A conta que acabou de entrar é a que foi criada no cadastro marcado? */
export function contaDoCadastro(pendente: TestePendente, email: string | undefined, contaCriadaEm: string | undefined) {
  if (!pendente.cadastro || !email || !contaCriadaEm) return false
  if (pendente.cadastro.email !== email.trim().toLowerCase()) return false
  const criada = Date.parse(contaCriadaEm)
  const cadastrou = Date.parse(pendente.cadastro.em)
  // Conta criada antes do cadastro marcado = conta que já existia (ex.: a
  // pessoa tentou se cadastrar de novo com um e-mail que já tinha conta).
  return Number.isFinite(criada) && Number.isFinite(cadastrou) && criada >= cadastrou - FOLGA_RELOGIO_MS
}
