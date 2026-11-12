'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { ConviteConta } from '@/components/convite-conta'
import { lerTestePendente, limparTestePendente, contaDoCadastro } from '@/lib/teste-pendente'
import { pontuar, respostasParaVetor } from '@/lib/instruments'
import { BottomNavigation, type Section } from '@/components/bottom-navigation'
import { HomeSection } from '@/components/sections/home-section'
import { TestSection } from '@/components/sections/test-section'
import { CareersSection } from '@/components/sections/careers-section'
import { CommunitySection } from '@/components/sections/community-section'
import { ProfileSection } from '@/components/sections/profile-section'
import { LandingPage } from '@/components/landing-page'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'

const VALID_SECTIONS: Section[] = ['inicio', 'teste', 'carreiras', 'comunidade', 'perfil']

function LoadingShell() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Image
        src="/images/logo-inova.png"
        alt="INOVA"
        width={376}
        height={216}
        preload
        className="mb-6 h-[50px] w-[150px] object-contain"
      />
      <Spinner className="h-8 w-8 text-primary" />
      <p className="mt-4 text-muted-foreground">Carregando...</p>
    </div>
  )
}

function AppContent() {
  const { user, profile, loading, saveTestResult } = useAuth()
  // A aba ativa vive na URL (/?section=carreiras etc.): é lida na carga e
  // regravada a cada troca de aba. Assim tanto o "Voltar" da página de uma
  // profissão quanto o botão voltar do navegador/celular retornam para a aba
  // em que a pessoa estava, e recarregar a página mantém a aba.
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get('section') as Section | null
  const initialSection: Section =
    sectionParam && VALID_SECTIONS.includes(sectionParam) ? sectionParam : 'inicio'
  const [activeSection, setActiveSection] = useState<Section>(initialSection)

  // Modo visitante (uso sem conta): sem login, "/" mostra a landing e
  // "/?section=..." mostra o site com Início, Teste e Carreiras liberados
  // (Comunidade e Perfil mostram um convite para criar conta). O botão
  // "Continuar sem conta" do login/cadastro leva para "/?section=inicio".
  const visitante = !user || !profile

  const navigate = (section: Section) => {
    setActiveSection(section)
    // replaceState (e não push): trocar de aba continua sem criar entradas
    // novas no histórico, como antes — só atualiza a URL da entrada atual.
    // O visitante mantém "?section=inicio" na URL: "/" sem seção é a landing.
    window.history.replaceState(
      null,
      '',
      section === 'inicio' && !visitante ? '/' : `/?section=${section}`
    )
  }

  // Teste feito sem conta → grava na conta nova criada depois dele (ver
  // lib/teste-pendente.ts). Entrar numa conta que já existia descarta o
  // pendente. Fica aqui, num efeito comum, e não no onAuthStateChange do
  // AuthProvider: lá dentro não se pode esperar consultas ao banco (deadlock).
  useEffect(() => {
    if (!user || !profile) return
    const pendente = lerTestePendente()
    if (!pendente) return
    // Limpa antes de gravar: o efeito pode rodar de novo (perfil atualizado
    // após salvar, modo estrito do React) e o teste não pode entrar duas vezes.
    limparTestePendente()
    if (!contaDoCadastro(pendente, user.email, user.created_at)) return

    const { scores } = pontuar(pendente.respostas)
    saveTestResult(scores, respostasParaVetor(pendente.respostas)).then(({ error }) => {
      if (error) {
        toast.error('Não foi possível salvar o resultado do teste que você fez antes de criar a conta.')
      } else {
        toast.success('Salvamos o resultado do teste que você fez.')
      }
    })
    // saveTestResult muda a cada render do AuthProvider; o efeito só precisa
    // reagir à chegada do usuário/perfil.
  }, [user, profile])

  if (loading) {
    return <LoadingShell />
  }

  if (visitante && !sectionParam) {
    return <LandingPage />
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'inicio':
        return <HomeSection onNavigate={navigate} />
      case 'teste':
        return <TestSection onNavigate={navigate} />
      case 'carreiras':
        return <CareersSection />
      case 'comunidade':
        return visitante ? (
          <ConviteConta
            titulo="Participe da comunidade"
            descricao="Crie sua conta para ler depoimentos de profissionais, tirar dúvidas no fórum e compartilhar experiências."
          />
        ) : (
          <CommunitySection />
        )
      case 'perfil':
        return visitante ? (
          <ConviteConta
            titulo="Guarde seus resultados"
            descricao="Com uma conta você salva o resultado do teste, acompanha seu histórico e ganha badges."
          />
        ) : (
          <ProfileSection onNavigate={navigate} />
        )
      default:
        return <HomeSection onNavigate={navigate} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border md:hidden">
        <div className="relative flex items-center justify-center h-14 px-4">
          <Image
            src="/images/logo-inova.png"
            alt="INOVA"
            width={376}
            height={216}
            preload
            className="h-8 w-auto"
          />
          {visitante && (
            <Link
              href="/auth/login"
              className="absolute right-4 text-sm font-medium text-primary hover:underline"
            >
              Entrar
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 md:pb-0 md:pl-64">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="section-enter">
            {renderSection()}
          </div>
        </div>
      </main>

      {/* Navigation */}
      <BottomNavigation
        activeSection={activeSection}
        onNavigate={navigate}
        visitante={visitante}
      />
    </div>
  )
}

// O AuthProvider fica em app/layout.tsx (não aqui), para não reiniciar o login
// cada vez que esta página é montada de novo — por exemplo, ao voltar da página
// de uma profissão.
export default function Page() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <AppContent />
    </Suspense>
  )
}