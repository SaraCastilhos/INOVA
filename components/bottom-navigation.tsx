'use client'

import { Home, FileText, Briefcase, Users, User } from 'lucide-react'

export type Section = 'inicio' | 'teste' | 'carreiras' | 'comunidade' | 'perfil'

interface BottomNavigationProps {
  activeSection: Section
  onNavigate: (section: Section) => void
}

const navItems: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'teste', label: 'Teste', icon: FileText },
  { id: 'carreiras', label: 'Carreiras', icon: Briefcase },
  { id: 'comunidade', label: 'Comunidade', icon: Users },
  { id: 'perfil', label: 'Perfil', icon: User },
]

export function BottomNavigation({ activeSection, onNavigate }: BottomNavigationProps) {
  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Desktop Sidebar Navigation */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-64 flex-col bg-card border-r border-border">
        <div className="p-6 border-b border-border">
          <img 
            src="/images/logo-inova.png" 
            alt="INOVA" 
            className="h-10 w-auto"
          />
        </div>
        
        <div className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            INOVA - Orientação Profissional
          </p>
        </div>
      </nav>
    </>
  )
}
