'use client'

import { useState } from 'react'
import { useUser } from '@/contexts/user-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lightbulb, GraduationCap, Briefcase, Users } from 'lucide-react'
import Image from 'next/image'

type UserType = 'estudante' | 'profissional' | 'ambos'

export function OnboardingModal() {
  const { createUser } = useUser()
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [userType, setUserType] = useState<UserType | null>(null)
  const [error, setError] = useState('')

  const handleNext = () => {
    if (step === 1) {
      if (displayName.trim().length < 2) {
        setError('Por favor, insira um nome com pelo menos 2 caracteres.')
        return
      }
      setError('')
      setStep(2)
    } else if (step === 2 && userType) {
      createUser(displayName.trim(), userType)
    }
  }

  const userTypeOptions: { value: UserType; label: string; description: string; icon: React.ReactNode }[] = [
    { 
      value: 'estudante', 
      label: 'Estudante', 
      description: 'Estou descobrindo minha carreira',
      icon: <GraduationCap className="h-6 w-6" />
    },
    { 
      value: 'profissional', 
      label: 'Profissional', 
      description: 'Quero compartilhar minha experiência',
      icon: <Briefcase className="h-6 w-6" />
    },
    { 
      value: 'ambos', 
      label: 'Ambos', 
      description: 'Estou em transição de carreira',
      icon: <Users className="h-6 w-6" />
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <Image 
              src="/images/logo-inova.png" 
              alt="INOVA" 
              width={180} 
              height={60}
              className="mx-auto"
            />
          </div>
          <div>
            <CardTitle className="text-2xl text-foreground">
              {step === 1 ? 'Bem-vindo ao INOVA!' : 'Você é...'}
            </CardTitle>
            <CardDescription className="mt-2 text-muted-foreground">
              {step === 1 
                ? 'Sua jornada de autoconhecimento profissional começa aqui.' 
                : 'Isso nos ajuda a personalizar sua experiência.'}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium text-foreground">
                  Como você quer ser chamado?
                </label>
                <Input
                  id="displayName"
                  placeholder="Seu nome ou apelido"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              
              <div className="flex items-center gap-2 rounded-lg bg-secondary/10 p-3 text-sm text-muted-foreground">
                <Lightbulb className="h-5 w-5 text-accent flex-shrink-0" />
                <span>Você pode usar um apelido se preferir!</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {userTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setUserType(option.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    userType === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    userType === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {option.icon}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {step === 2 && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Voltar
              </Button>
            )}
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleNext}
              disabled={step === 2 && !userType}
            >
              {step === 1 ? 'Continuar' : 'Começar Jornada'}
            </Button>
          </div>

          <div className="flex justify-center gap-2">
            <div className={`h-2 w-8 rounded-full transition-colors ${step === 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-8 rounded-full transition-colors ${step === 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
