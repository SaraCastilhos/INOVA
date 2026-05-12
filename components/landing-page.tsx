"use client"

import Image from 'next/image'
import Link from 'next/link'
import { 
  ClipboardCheck, 
  Users, 
  BookOpen, 
  Award,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  GraduationCap
} from 'lucide-react'
import { RIASEC_INFO } from '@/lib/types'

const features = [
  {
    icon: ClipboardCheck,
    title: 'Teste RIASEC',
    description: 'Descubra seu perfil profissional com um teste científico baseado na teoria de John Holland.'
  },
  {
    icon: BookOpen,
    title: 'Guias de Carreira',
    description: 'Explore profissões, formas de ingresso e universidades da região do Vale do Paranhana.'
  },
  {
    icon: MessageSquare,
    title: 'Comunidade',
    description: 'Conecte-se com profissionais e estudantes, tire dúvidas e compartilhe experiências.'
  },
  {
    icon: Award,
    title: 'Gamificação',
    description: 'Ganhe badges e acompanhe seu progresso na jornada de autoconhecimento.'
  }
]

const benefits = [
  'Teste vocacional gratuito e científico',
  'Depoimentos reais de profissionais',
  'Fórum para tirar dúvidas',
  'Especialistas verificados',
  'Informações sobre universidades locais',
  'Totalmente em português'
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Image
            src="/images/logo-inova.png"
            alt="INOVA"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/auth/cadastro"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
            Descubra seu caminho profissional com o{' '}
            <span className="text-primary">INOVA</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Plataforma gratuita de orientação profissional para estudantes e profissionais 
            do Vale do Paranhana e região.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/cadastro"
              className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              Começar agora
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto px-8 py-4 border border-input text-foreground font-medium rounded-lg hover:bg-muted transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* RIASEC Preview */}
      <section className="py-16 bg-muted/30 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
            Conheça os 6 tipos de personalidade RIASEC
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            O teste RIASEC identifica suas principais inclinações profissionais baseado em 6 tipos de personalidade.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(Object.entries(RIASEC_INFO) as [string, typeof RIASEC_INFO['R']][]).map(([type, info]) => (
              <div
                key={type}
                className="bg-card p-4 rounded-xl border border-border text-center hover:shadow-lg transition-shadow"
              >
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: info.cor }}
                >
                  {type}
                </div>
                <h3 className="font-semibold text-foreground">{info.nome}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {info.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            Tudo que você precisa para sua jornada
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-primary/5 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                Por que escolher o INOVA?
              </h2>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card p-8 rounded-2xl border border-border">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Estudantes</h3>
                  <p className="text-sm text-muted-foreground">Explore suas possibilidades</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Profissionais</h3>
                  <p className="text-sm text-muted-foreground">Compartilhe sua experiência</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Pronto para começar?
          </h2>
          <p className="text-muted-foreground mb-8">
            Crie sua conta gratuitamente e descubra seu perfil profissional hoje mesmo.
          </p>
          <Link
            href="/auth/cadastro"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Criar minha conta grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Image
            src="/images/logo-inova.png"
            alt="INOVA"
            width={100}
            height={32}
            className="h-8 w-auto"
          />
          <p className="text-sm text-muted-foreground text-center">
            Plataforma de Apoio à Orientação Profissional - Vale do Paranhana/RS
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/termos" className="hover:text-foreground transition-colors">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
