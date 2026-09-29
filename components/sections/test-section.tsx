'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { INSTRUMENTO, ITENS, maxPorTipo, pontuar, respostasParaVetor } from '@/lib/instruments'
import { RIASEC_INFO, type RIASECType } from '@/lib/types'
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle, Target, ArrowRight, Loader2 } from 'lucide-react'
import type { Section } from '@/components/bottom-navigation'

interface TestSectionProps {
  onNavigate: (section: Section) => void
}

type TestPhase = 'intro' | 'questions' | 'result'

export function TestSection({ onNavigate }: TestSectionProps) {
  const { saveTestResult } = useAuth()
  const [phase, setPhase] = useState<TestPhase>('intro')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  // respostas: posicao do item -> valor escolhido (0..escala.max)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)
  const [topTypes, setTopTypes] = useState<RIASECType[]>([])
  const [scores, setScores] = useState<Record<RIASECType, number>>({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 })
  const [poucoDiferenciado, setPoucoDiferenciado] = useState(false)

  const handleAnswer = (posicao: number, valor: number) => {
    setAnswers(prev => ({ ...prev, [posicao]: valor }))
  }

  const goToNext = () => {
    if (currentQuestion < ITENS.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const goToPrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const calculateResult = async () => {
    setSaving(true)
    const resultado = pontuar(answers)
    const answersArray = respostasParaVetor(answers)

    const { error } = await saveTestResult(resultado.scores, answersArray)
    setSaving(false)

    if (error) {
      toast.error('Não foi possível salvar seu resultado. Verifique sua conexão e tente novamente.')
      return
    }

    setScores(resultado.scores)
    setTopTypes(resultado.top3)
    setPoucoDiferenciado(resultado.poucoDiferenciado)
    setPhase('result')
  }

  const startTest = () => {
    setAnswers({})
    setCurrentQuestion(0)
    setTopTypes([])
    setPoucoDiferenciado(false)
    setPhase('questions')
  }

  const progress = (Object.keys(answers).length / ITENS.length) * 100
  const currentQ = ITENS[currentQuestion]
  const isAnswered = currentQ ? answers[currentQ.posicao] !== undefined : false
  const allAnswered = Object.keys(answers).length === ITENS.length

  if (phase === 'intro') {
    return (
      <div className="space-y-6 section-enter max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit mb-4">
              <Target className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-foreground">Teste de Interesses RIASEC</CardTitle>
            <CardDescription className="text-base">
              Baseado no modelo de John Holland (RIASEC), adaptado do O*NET Mini Interest Profiler
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.entries(RIASEC_INFO) as [RIASECType, typeof RIASEC_INFO[RIASECType]][]).map(([tipo, info]) => (
                <div
                  key={tipo}
                  className="p-3 rounded-xl text-center"
                  style={{ backgroundColor: `${info.cor}15` }}
                >
                  <div
                    className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold mb-2"
                    style={{ backgroundColor: info.cor }}
                  >
                    {tipo}
                  </div>
                  <p className="text-sm font-medium text-foreground">{info.nome}</p>
                </div>
              ))}
            </div>

            <div className="bg-muted rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-foreground">Como funciona:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- {ITENS.length} atividades de trabalho</li>
                <li>- Para cada uma, diga o quanto gostaria de fazê-la (de &ldquo;{INSTRUMENTO.escala.opcoes[0].rotulo}&rdquo; a &ldquo;{INSTRUMENTO.escala.opcoes[INSTRUMENTO.escala.opcoes.length - 1].rotulo}&rdquo;)</li>
                <li>- Tempo estimado: 5-10 minutos</li>
                <li>- Resultado imediato com seu perfil</li>
              </ul>
            </div>

            {INSTRUMENTO.status === 'rascunho' && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted border border-border">
                <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Esta é uma versão em construção do questionário: a adaptação dos itens para o
                  português ainda está em revisão por especialistas.{' '}
                  <Link href="/metodologia#teste" className="text-primary hover:underline">
                    Saiba como funciona
                  </Link>
                </p>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/10 border border-accent/30">
              <AlertTriangle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                <strong>Aviso importante:</strong> este é um questionário de interesses para
                autoconhecimento. Ele <strong>NÃO substitui</strong> a avaliação de um psicólogo
                ou orientador profissional habilitado (CFP).
              </p>
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6"
              onClick={startTest}
            >
              Iniciar Teste
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
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
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Pergunta {currentQuestion + 1} de {ITENS.length}</span>
            <span>{Math.round(progress)}% concluído</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2 text-center">
              {INSTRUMENTO.escala.instrucao}
            </p>
            <p className="text-lg font-medium text-foreground mb-6 text-center">
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

        {/* Quick navigation dots */}
        <div className="flex flex-wrap justify-center gap-1">
          {ITENS.map((item, index) => (
            <button
              key={item.posicao}
              onClick={() => setCurrentQuestion(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentQuestion
                  ? 'bg-primary scale-125'
                  : answers[item.posicao] !== undefined
                  ? 'bg-primary/40'
                  : 'bg-muted'
              }`}
              aria-label={`Ir para pergunta ${index + 1}`}
            />
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    return (
      <div className="space-y-6 section-enter max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-4 rounded-full bg-secondary/10 w-fit mb-4">
              <CheckCircle className="h-12 w-12 text-secondary" />
            </div>
            <CardTitle className="text-2xl text-foreground">Seu Perfil RIASEC</CardTitle>
            <CardDescription className="text-base">
              Baseado nas suas respostas, identificamos seu perfil profissional
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {poucoDiferenciado && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted border border-border">
                <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Suas pontuações ficaram próximas umas das outras. Isso é comum e indica um
                  perfil pouco diferenciado — nesse caso, leia os tipos abaixo como pistas, não
                  como uma resposta fechada.
                </p>
              </div>
            )}

            {/* Top 3 Types */}
            <div className="space-y-4">
              <h3 className="font-semibold text-center text-foreground">Seus tipos predominantes:</h3>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {topTypes.map((tipo, index) => (
                  <div
                    key={tipo}
                    className="flex-1 p-4 rounded-xl text-center text-white"
                    style={{ backgroundColor: RIASEC_INFO[tipo].cor }}
                  >
                    <div className="text-3xl font-bold mb-1">{index + 1}°</div>
                    <div className="text-xl font-bold">{tipo}</div>
                    <div className="text-sm opacity-90">{RIASEC_INFO[tipo].nome}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Descriptions */}
            <div className="space-y-3">
              {topTypes.map((tipo) => (
                <div
                  key={tipo}
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: `${RIASEC_INFO[tipo].cor}15` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: RIASEC_INFO[tipo].cor }}
                    >
                      {tipo}
                    </div>
                    <span className="font-semibold text-foreground">{RIASEC_INFO[tipo].nome}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{RIASEC_INFO[tipo].descricao}</p>
                </div>
              ))}
            </div>

            {/* All scores */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Todas as pontuações:</h3>
              {(Object.entries(scores) as [RIASECType, number][])
                .sort(([, a], [, b]) => b - a)
                .map(([tipo, pontuacao]) => (
                  <div key={tipo} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {tipo} - {RIASEC_INFO[tipo].nome}
                      </span>
                      <span className="text-muted-foreground">{pontuacao}/{maxPorTipo}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(pontuacao / maxPorTipo) * 100}%`,
                          backgroundColor: RIASEC_INFO[tipo].cor
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => onNavigate('carreiras')}
              >
                Ver Profissões Sugeridas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="flex-1" onClick={startTest}>
                Refazer Teste
              </Button>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/10 border border-accent/30">
              <AlertTriangle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Este é um questionário de interesses para autoconhecimento. Ele não substitui a
                avaliação de um psicólogo ou orientador profissional habilitado (CFP).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
