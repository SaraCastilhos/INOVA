'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
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
  const { user, profile, loading } = useAuth()
  // A aba ativa vive na URL (/?section=carreiras etc.): é lida na carga e
  // regravada a cada troca de aba. Assim tanto o "Voltar" da página de uma
  // profissão quanto o botão voltar do navegador/celular retornam para a aba
  // em que a pessoa estava, e recarregar a página mantém a aba.
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get('section') as Section | null
  const initialSection: Section =
    sectionParam && VALID_SECTIONS.includes(sectionParam) ? sectionParam : 'inicio'
  const [activeSection, setActiveSection] = useState<Section>(initialSection)

  const navigate = (section: Section) => {
    setActiveSection(section)
    // replaceState (e não push): trocar de aba continua sem criar entradas
    // novas no histórico, como antes — só atualiza a URL da entrada atual.
    window.history.replaceState(null, '', section === 'inicio' ? '/' : `/?section=${section}`)
  }

  if (loading) {
    return <LoadingShell />
  }

  if (!user || !profile) {
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
        return <CommunitySection />
      case 'perfil':
        return <ProfileSection onNavigate={navigate} />
      default:
        return <HomeSection onNavigate={navigate} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border md:hidden">
        <div className="flex items-center justify-center h-14 px-4">
          <Image
            src="/images/logo-inova.png"
            alt="INOVA"
            width={376}
            height={216}
            preload
            className="h-8 w-auto"
          />
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