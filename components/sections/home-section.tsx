'use client'

import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RIASEC_INFO, type RIASECType } from '@/lib/types'
import { Target, Briefcase, MessageSquare, ArrowRight, Sparkles, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import type { Section } from '@/components/bottom-navigation'

interface HomeSectionProps {
  onNavigate: (section: Section) => void
}

export function HomeSection({ onNavigate }: HomeSectionProps) {
  const { profile, testResults } = useAuth()

  const lastTest = testResults?.[0] ?? null

  const topTipos: RIASECType[] = lastTest
    ? ([lastTest.primary_type, lastTest.secondary_type, lastTest.tertiary_type].filter(Boolean) as RIASECType[])
    : []

  return (
    <div className="space-y-6 section-enter">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary p-6 text-white">
        <div className="relative z-10">
          <p className="text-sm opacity-90 mb-1">Olá, {profile?.display_name}!</p>
          <h1 className="text-2xl font-bold mb-2">Bem-vindo ao INOVA</h1>
          <p className="text-sm opacity-90 max-w-md">
            Sua jornada de autoconhecimento profissional começa aqui. Descubra suas aptidões e explore carreiras alinhadas ao seu perfil.
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-20">
          <Sparkles className="h-32 w-32" />
        </div>
      </div>

      {/* Last Test Result */}
      {lastTest ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              Seu Perfil RIASEC
            </CardTitle>
            <CardDescription>
              Resultado do seu último teste
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {topTipos.map((tipo, index) => (
                <div
                  key={tipo}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-white"
                  style={{ backgroundColor: RIASEC_INFO[tipo].cor }}
                >
                  <span className="font-bold">{index + 1}°</span>
                  <span className="font-medium">{RIASEC_INFO[tipo].nome}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onNavigate('perfil')}
              >
                Ver detalhes
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => onNavigate('carreiras')}
              >
                Explorar carreiras
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Descubra seu perfil</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Faça o teste RIASEC e descubra quais carreiras combinam com você
                </p>
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => onNavigate('teste')}
              >
                Fazer teste agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('teste')}>
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">Teste RIASEC</h3>
            <p className="text-xs text-muted-foreground mt-1">Descubra seu perfil</p>
          </CardContent>
        </Card>

        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('carreiras')}>
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-3">
              <Briefcase className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">Carreiras</h3>
            <p className="text-xs text-muted-foreground mt-1">Explore profissões</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{testResults?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Testes feitos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">12</p>
              <p className="text-xs text-muted-foreground">Profissões</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">6</p>
              <p className="text-xs text-muted-foreground">Tipos RIASEC</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About INOVA */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <Image
              src="/images/logo-inova.png"
              alt="INOVA"
              width={100}
              height={40}
              className="h-8 w-auto"
            />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O INOVA é uma plataforma de apoio à orientação profissional desenvolvida para estudantes 
            do Vale do Paranhana/RS. Baseada no modelo RIASEC de John Holland, oferecemos ferramentas 
            de autoconhecimento e conexão com experiências reais de profissionais.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Este instrumento não substitui a avaliação de um psicólogo ou orientador profissional habilitado (CFP).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}