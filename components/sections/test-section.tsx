'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RIASEC_QUESTIONS } from '@/lib/data'
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
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)
  const [topTypes, setTopTypes] = useState<RIASECType[]>([])
  const [scores, setScores] = useState<Record<RIASECType, number>>({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 })

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const goToNext = () => {
    if (currentQuestion < RIASEC_QUESTIONS.length - 1) {
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
    const pontuacoes: Record<RIASECType, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }

    RIASEC_QUESTIONS.forEach(question => {
      const answer = answers[question.id] || 0
      pontuacoes[question.tipo] += answer
    })

    const sortedTypes = (Object.entries(pontuacoes) as [RIASECType, number][])
      .sort(([, a], [, b]) => b - a)
      .map(([type]) => type)

    const answersArray = RIASEC_QUESTIONS.map(q => answers[q.id] || 0)

    await saveTestResult(pontuacoes, answersArray)

    setScores(pontuacoes)
    setTopTypes(sortedTypes.slice(0, 3))
    setSaving(false)
    setPhase('result')
  }

  const startTest = () => {
    setAnswers({})
    setCurrentQuestion(0)
    setTopTypes([])
    setPhase('questions')
  }

  const progress = (Object.keys(answers).length / RIASEC_QUESTIONS.length) * 100
  const currentQ = RIASEC_QUESTIONS[currentQuestion]
  const isAnswered = answers[currentQ?.id] !== undefined
  const allAnswered = Object.keys(answers).length === RIASEC_QUESTIONS.length

  if (phase === 'intro') {
    return (
      <div className="space-y-6 section-enter max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit mb-4">
              <Target className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-foreground">Teste RIASEC</CardTitle>
            <CardDescription className="text-base">
              Descubra seu perfil profissional baseado no modelo de John Holland
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
                <li>- 24 afirmações sobre preferências profissionais</li>
                <li>- Responda de 1 (discordo) a 5 (concordo totalmente)</li>
                <li>- Tempo estimado: 5-10 minutos</li>
                <li>- Resultado imediato com seu perfil</li>
              </ul>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/10 border border-accent/30">
              <AlertTriangle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                <strong>Aviso importante:</strong> O teste RIASEC é uma ferramenta de autoconhecimento. 
                Este instrumento <strong>NÃO substitui</strong> a avaliação de um psicólogo ou orientador profissional habilitado (CFP).
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
            <span>Pergunta {currentQuestion + 1} de {RIASEC_QUESTIONS.length}</span>
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
            <p className="text-lg font-medium text-foreground mb-6 text-center">
              {currentQ.texto}
            </p>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((value) => {
                const labels = [
                  'Discordo totalmente',
                  'Discordo',
                  'Neutro',
                  'Concordo',
                  'Concordo totalmente'
                ]
                const isSelected = answers[currentQ.id] === value

                return (
                  <button
                    key={value}
                    onClick={() => handleAnswer(currentQ.id, value)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {value}
                      </div>
                      <span className={`text-sm ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {labels[value - 1]}
                      </span>
                    </div>
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

          {currentQuestion < RIASEC_QUESTIONS.length - 1 ? (
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
          {RIASEC_QUESTIONS.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentQuestion
                  ? 'bg-primary scale-125'
                  : answers[q.id]
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
                      <span className="text-muted-foreground">{pontuacao}/20</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(pontuacao / 20) * 100}%`,
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
                O teste RIASEC é uma ferramenta de autoconhecimento. Este instrumento não substitui a avaliação 
                de um psicólogo ou orientador profissional habilitado (CFP).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}