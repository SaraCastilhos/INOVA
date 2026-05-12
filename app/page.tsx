'use client'

import { useState } from 'react'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { BottomNavigation, type Section } from '@/components/bottom-navigation'
import { HomeSection } from '@/components/sections/home-section'
import { TestSection } from '@/components/sections/test-section'
import { CareersSection } from '@/components/sections/careers-section'
import { CommunitySection } from '@/components/sections/community-section'
import { ProfileSection } from '@/components/sections/profile-section'
import { LandingPage } from '@/components/landing-page'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'

function AppContent() {
  const { user, profile, loading } = useAuth()
  const [activeSection, setActiveSection] = useState<Section>('inicio')

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Image
          src="/images/logo-inova.png"
          alt="INOVA"
          width={150}
          height={50}
          className="mb-6"
        />
        <Spinner className="h-8 w-8 text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!user || !profile) {
    return <LandingPage />
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'inicio':
        return <HomeSection onNavigate={setActiveSection} />
      case 'teste':
        return <TestSection onNavigate={setActiveSection} />
      case 'carreiras':
        return <CareersSection />
      case 'comunidade':
        return <CommunitySection />
      case 'perfil':
        return <ProfileSection onNavigate={setActiveSection} />
      default:
        return <HomeSection onNavigate={setActiveSection} />
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
            width={100}
            height={32}
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
        onNavigate={setActiveSection}
      />
    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}