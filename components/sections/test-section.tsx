'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { abrirGuiaNoTipo } from '@/components/sections/careers-section'
import { INSTRUMENTO, INSTRUMENT_VERSION, ITENS, maxPorTipo, pontuar, respostasParaVetor } from '@/lib/instruments'
import { sugerirProfissoes } from '@/lib/professions'
import { RIASEC_INFO, type RIASECType } from '@/lib/types'
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle, ArrowRight, Loader2, ListChecks, Clock } from 'lucide-react'
import type { Section } from '@/components/bottom-navigation'
import { ConviteConta } from '@/components/convite-conta'
import { HexagonoResultado } from '@/components/hexagono-resultado'
import { lerTestePendente, salvarTestePendente } from '@/lib/teste-pendente'

interface TestSectionProps {
  onNavigate: (section: Section) => void
}

type TestPhase = 'intro' | 'questions' | 'result'

// Quantas profissões sugeridas aparecem por tipo no resultado.
const SUGESTOES_POR_TIPO = 2

// Pausa entre marcar a resposta e passar para a próxima atividade.
const AVANCO_MS = 350

// Progresso do teste guardado na sessão do navegador (sessionStorage), como o
// estado do guia: trocar de aba no meio das perguntas, ou abrir uma profissão
// sugerida e voltar, não perde as respostas nem o resultado. Só vale para a
// versão atual do instrumento e some ao fechar a aba do navegador. Valores
// salvos são validados ao ler; o que for inválido é descartado.
type TesteSalvo = { version: string; phase: TestPhase; atual: number; respostas: Record<number, number> }

function readTesteSalvo(key: string): TesteSalvo | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (s.version !== INSTRUMENT_VERSION) return null

    const respostas: Record<number, number> = {}
    for (const item of ITENS) {
      const v = s.respostas?.[item.posicao]
      if (Number.isInteger(v) && v >= INSTRUMENTO.escala.min && v <= INSTRUMENTO.escala.max) {
        respostas[item.posicao] = v
      }
    }
    const completo = Object.keys(respostas).length === ITENS.length
    const phase: TestPhase =
      s.phase === 'result' && completo ? 'result' : s.phase === 'questions' ? 'questions' : 'intro'
    const atual = Number.isInteger(s.atual) ? Math.min(Math.max(s.atual, 0), ITENS.length - 1) : 0
    return { version: INSTRUMENT_VERSION, phase, atual, respostas }
  } catch {
    return null
  }
}

// Visitante (sem conta) que volta outro dia: o progresso da sessão já sumiu,
// mas o último resultado completo continua guardado no navegador
// (lib/teste-pendente.ts) — abre direto nele.
function readResultadoVisitante(): TesteSalvo | null {
  const pendente = lerTestePendente()
  return pendente
    ? { version: INSTRUMENT_VERSION, phase: 'result', atual: ITENS.length - 1, respostas: pendente.respostas }
    : null
}

export function TestSection({ onNavigate }: TestSectionProps) {
  const { user, saveTestResult } = useAuth()
  const storageKey = `inova:teste:${user?.id ?? 'anon'}`
  const [saved] = useState(() => readTesteSalvo(storageKey) ?? (user ? null : readResultadoVisitante()))
  const [phase, setPhase] = useState<TestPhase>(saved?.phase ?? 'intro')
  const [currentQuestion, setCurrentQuestion] = useState(saved?.atual ?? 0)
  // respostas: posicao do item -> valor escolhido (0..escala.max)
  const [answers, setAnswers] = useState<Record<number, number>>(saved?.respostas ?? {})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      if (phase === 'intro') {
        window.sessionStorage.removeItem(storageKey)
      } else {
        const state: TesteSalvo = { version: INSTRUMENT_VERSION, phase, atual: currentQuestion, respostas: answers }
        window.sessionStorage.setItem(storageKey, JSON.stringify(state))
      }
    } catch {
      // sessionStorage indisponível (modo privado restrito etc.): só não lembra.
    }
  }, [storageKey, phase, currentQuestion, answers])

  // O resultado é sempre recalculado das respostas (que só ficam completas e
  // gravadas — no banco, ou no navegador para o visitante — antes de a tela de
  // resultado abrir).
  const resultado = phase === 'result' ? pontuar(answers) : null

  const abrirNoGuia = (tipo: RIASECType) => {
    abrirGuiaNoTipo(user?.id, tipo)
    onNavigate('carreiras')
  }

  // Ao escolher uma resposta, o teste avança sozinho depois de uma pausa curta
  // (para a pessoa ver a opção marcada). Qualquer navegação manual cancela o
  // avanço pendente.
  const avancoRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelarAvanco = () => {
    if (avancoRef.current) clearTimeout(avancoRef.current)
    avancoRef.current = null
  }
  useEffect(() => cancelarAvanco, [])

  // Sentido da última troca de pergunta, para a animação de entrada.
  const [direcao, setDirecao] = useState<'next' | 'prev'>('next')

  const goToNext = () => {
    cancelarAvanco()
    setDirecao('next')
    setCurrentQuestion(prev => Math.min(prev + 1, ITENS.length - 1))
  }

  const goToPrev = () => {
    cancelarAvanco()
    setDirecao('prev')
    setCurrentQuestion(prev => Math.max(prev - 1, 0))
  }

  const handleAnswer = (posicao: number, valor: number) => {
    setAnswers(prev => ({ ...prev, [posicao]: valor }))
    cancelarAvanco()
    if (currentQuestion < ITENS.length - 1) {
      avancoRef.current = setTimeout(goToNext, AVANCO_MS)
    }
  }

  const calculateResult = async () => {
    // Sem conta: nada vai para o banco. O resultado fica só no navegador, para
    // ser levado à conta caso a pessoa se cadastre depois (lib/teste-pendente.ts).
    if (!user) {
      salvarTestePendente(answers)
      setPhase('result')
      return
    }

    setSaving(true)
    const { error } = await saveTestResult(pontuar(answers).scores, respostasParaVetor(answers))
    setSaving(false)

    if (error) {
      toast.error('Não foi possível salvar seu resultado. Verifique sua conexão e tente novamente.')
      return
    }

    setPhase('result')
  }

  const startTest = () => {
    setAnswers({})
    setCurrentQuestion(0)
    setPhase('questions')
  }

  const progress = (Object.keys(answers).length / ITENS.length) * 100
  const currentQ = ITENS[currentQuestion]
  const isAnswered = currentQ ? answers[currentQ.posicao] !== undefined : false
  const allAnswered = Object.keys(answers).length === ITENS.length

  if (phase === 'intro') {
    return (
      // No computador o card fica no meio da altura da tela, e não colado no topo.
      <div className="section-enter max-w-2xl mx-auto md:min-h-[calc(100vh-3rem)] md:flex md:flex-col md:justify-center">
        <Card>
          <CardHeader className="text-center gap-1 space-y-0 pb-2">
            <CardTitle className="text-2xl text-foreground">Descubra seus interesses profissionais</CardTitle>
            <CardDescription className="text-base">
              Um teste rápido para conhecer melhor o que você gosta de fazer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <p className="text-sm text-center text-foreground">
                Você vai descobrir quais destes tipos combinam mais com você:
              </p>
              {/* 3 por linha no celular: em 6 colunas "Investigativo" não cabe e quebra no meio. */}
              <div className="grid grid-cols-3 gap-y-3 gap-x-2 sm:grid-cols-6">
                {(Object.entries(RIASEC_INFO) as [RIASECType, typeof RIASEC_INFO[RIASECType]][]).map(([tipo, info]) => (
                  <div key={tipo} className="flex flex-col items-center gap-1 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: info.cor }}
                    >
                      {tipo}
                    </div>
                    <span className="text-xs text-muted-foreground text-center leading-tight">
                      {info.nome}
                    </span>
                  </div>
                ))}
              </div>
              <details className="group rounded-lg text-sm pt-4">
                <summary className="flex items-center gap-1 cursor-pointer select-none text-primary hover:underline list-none [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                  O que significa cada tipo?
                </summary>
                <ul className="mt-3 space-y-2">
                  {(Object.entries(RIASEC_INFO) as [RIASECType, typeof RIASEC_INFO[RIASECType]][]).map(([tipo, info]) => (
                    <li key={tipo} className="flex items-start gap-2">
                      <span
                        className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: info.cor }}
                      >
                        {tipo}
                      </span>
                      <span className="text-muted-foreground">
                        <strong className="text-foreground font-medium">{info.nome}:</strong> {info.descricao}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>

            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-center gap-3">
                <ListChecks className="h-5 w-5 text-primary shrink-0" />
                {ITENS.length} atividades de trabalho: diga o quanto gostaria de fazer cada uma
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                Cerca de 5 minutos
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                Resultado na hora, com profissões para explorar
              </li>
            </ul>

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6"
              onClick={startTest}
            >
              Começar o teste
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted">
              <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Este teste é para autoconhecimento e <strong>não substitui</strong> um psicólogo ou
                orientador profissional.{' '}
                <Link href="/metodologia#teste" className="text-primary hover:underline">
                  Saiba como funciona
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (phase === 'questions') {
    return (
      <div className="space-y-6 section-enter max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground">
              Atividade {currentQuestion + 1} de {ITENS.length}
            </span>
            <span className="text-muted-foreground">{Math.round(progress)}% concluído</span>
          </div>
          <div
            className="h-3 bg-muted rounded-full overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-label="Progresso do teste"
          >
            <div
              className="h-full bg-primary rounded-full progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card — a key reinicia a animação a cada troca de atividade */}
        <Card key={currentQuestion} className={direcao === 'next' ? 'question-enter-next' : 'question-enter-prev'}>
          <CardContent className="pt-6">
            {/* A instrução completa só aparece na 1ª atividade; nas demais, a
                própria pergunta "Você gostaria de…" faz esse papel. */}
            {currentQuestion === 0 && (
              <p className="text-sm text-muted-foreground mb-4 text-center">
                {INSTRUMENTO.escala.instrucao}
              </p>
            )}
            <p className="text-sm font-medium text-primary text-center mb-1">Você gostaria de…</p>
            <p className="text-xl font-semibold text-foreground mb-6 text-center text-balance">
              {currentQ.texto}
            </p>

            <div className="space-y-3">
              {INSTRUMENTO.escala.opcoes.map((opcao) => {
                const isSelected = answers[currentQ.posicao] === opcao.valor

                return (
                  <button
                    key={opcao.valor}
                    onClick={() => handleAnswer(currentQ.posicao, opcao.valor)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <span className={`text-sm ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {opcao.rotulo}
                    </span>
                    {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={goToPrev}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          {currentQuestion < ITENS.length - 1 ? (
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={goToNext}
              disabled={!isAnswered}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={calculateResult}
              disabled={!allAnswered || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  Ver Resultado
                  <CheckCircle className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (resultado) {
    const { scores, top3: topTypes, poucoDiferenciado, diferenciacao } = resultado
    const sugestoes = sugerirProfissoes(topTypes)
    const sintese = topTypes.map((tipo) => RIASEC_INFO[tipo].frase).join('; ')
    // Tamanho das letras do código: decrescente quando há ordem clara; igual
    // quando o perfil é pouco diferenciado (ali a ordem pouco significa).
    const tamanhoLetra = poucoDiferenciado
      ? ['text-[2.7rem]', 'text-[2.7rem]', 'text-[2.7rem]']
      : ['text-[3.4rem]', 'text-[2.7rem]', 'text-[2.2rem]']

    return (
      <div className="space-y-4 section-enter max-w-2xl mx-auto">
        {/* Código de Holland */}
        <Card>
          <CardContent className="space-y-3">
            {poucoDiferenciado ? (
              <>
                <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                  Perfil equilibrado
                </span>
                <h2 className="text-xl font-bold text-foreground text-balance">
                  Seus interesses estão bem distribuídos
                </h2>
              </>
            ) : (
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Seu código de interesses
              </p>
            )}

            {/* Letras juntas, com espaçamento fixo (lidas como uma sigla), e os
                nomes numa linha só embaixo, cada um na cor do seu tipo. */}
            <div
              className="space-y-1.5"
              role="img"
              aria-label={`Código ${topTypes.join('')}: ${topTypes.map((t) => RIASEC_INFO[t].nome).join(', ')}`}
            >
              <div className="flex items-baseline gap-3">
                {topTypes.map((tipo, i) => (
                  <span
                    key={tipo}
                    className={`${tamanhoLetra[i]} font-extrabold leading-none tracking-tight`}
                    style={{ color: RIASEC_INFO[tipo].corForte }}
                  >
                    {tipo}
                  </span>
                ))}
              </div>
              <p className="text-sm font-semibold">
                {topTypes.map((tipo, i) => (
                  <span key={tipo}>
                    {i > 0 && <span className="text-muted-foreground"> · </span>}
                    <span style={{ color: RIASEC_INFO[tipo].corForte }}>{RIASEC_INFO[tipo].nome}</span>
                  </span>
                ))}
              </p>
            </div>

            {poucoDiferenciado ? (
              <p className="border-l-[3px] border-border pl-2.5 text-sm text-muted-foreground">
                Os três tipos mais altos ficaram a até {diferenciacao}{' '}
                {diferenciacao === 1 ? 'ponto' : 'pontos'} um do outro. Isso é comum: use-os como
                pontos de partida para explorar, não como uma resposta fechada.
              </p>
            ) : (
              <p className="text-[0.95rem] text-foreground">
                O que mais chama sua atenção: {sintese}.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Hexágono + pontuações */}
        <Card>
          <CardContent className="space-y-4">
            <div>
              <HexagonoResultado scores={scores} max={maxPorTipo} destaques={topTypes} />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Tipos vizinhos no hexágono têm interesses parecidos.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {(Object.entries(scores) as [RIASECType, number][])
                .sort(([, a], [, b]) => b - a)
                .map(([tipo, pontuacao]) => {
                  const destaque = topTypes.includes(tipo)
                  return (
                    <div key={tipo} className="min-w-0 space-y-1">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className={`truncate ${destaque ? 'text-foreground' : 'text-muted-foreground'}`}>
                          <b style={destaque ? { color: RIASEC_INFO[tipo].corForte } : undefined}>{tipo}</b>{' '}
                          {RIASEC_INFO[tipo].nome}
                        </span>
                        <span className={`tabular-nums ${destaque ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {pontuacao}/{maxPorTipo}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(pontuacao / maxPorTipo) * 100}%`,
                            backgroundColor: destaque ? RIASEC_INFO[tipo].corForte : 'var(--muted-foreground)',
                            opacity: destaque ? 1 : 0.45,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Um card por tipo predominante: descrição + profissões (RF03) */}
        <h3 className="px-0.5 pt-1 font-bold text-foreground">Para explorar</h3>
        {sugestoes.map(({ tipo, profissoes }) => (
          <div key={tipo} className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: RIASEC_INFO[tipo].corForte }}
              >
                {tipo}
              </div>
              <span className="font-semibold text-foreground">{RIASEC_INFO[tipo].nome}</span>
            </div>
            <p className="text-sm text-muted-foreground">{RIASEC_INFO[tipo].descricao}.</p>
            {profissoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há profissões deste tipo no guia.</p>
            ) : (
              <>
                <ul className="space-y-1">
                  {profissoes.slice(0, SUGESTOES_POR_TIPO).map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/profissoes/${p.slug}`}
                        onClick={() => abrirGuiaNoTipo(user?.id, tipo)}
                        className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm text-foreground hover:bg-muted/70"
                      >
                        <span>{p.nome}</span>
                        <span className="text-xs text-muted-foreground">{p.riasec_code}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {profissoes.length > SUGESTOES_POR_TIPO && (
                  <button
                    onClick={() => abrirNoGuia(tipo)}
                    className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                    style={{ color: RIASEC_INFO[tipo].corForte }}
                  >
                    Ver as {profissoes.length} profissões do tipo {RIASEC_INFO[tipo].nome}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        ))}

        {!user && (
          <ConviteConta
            titulo="Quer guardar este resultado?"
            descricao="Crie sua conta e o resultado deste teste fica salvo nela. Com a conta você também acompanha seu histórico, ganha badges e participa da comunidade."
          />
        )}

        {/* Ações */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => abrirNoGuia(topTypes[0])}
            >
              Explorar o Guia de Profissões
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" className="flex-1" onClick={startTest}>
              Refazer Teste
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Autoconhecimento, não diagnóstico.</span>{' '}
            Este questionário não substitui a avaliação de um psicólogo ou orientador profissional
            habilitado (CFP).
          </p>
        </div>
      </div>
    )
  }

  return null
}
