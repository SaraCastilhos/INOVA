'use client'

import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RIASEC_INFO, type RIASECType } from '@/lib/types'
import { User, Calendar, History, RefreshCw, LogOut, GraduationCap, Briefcase, Users, Award } from 'lucide-react'
import type { Section } from '@/components/bottom-navigation'

interface ProfileSectionProps {
  onNavigate: (section: Section) => void
}

export function ProfileSection({ onNavigate }: ProfileSectionProps) {
  const { profile, testResults, badges, signOut } = useAuth()

  if (!profile) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const getUserTypeIcon = () => {
    switch (profile.user_type) {
      case 'estudante': return <GraduationCap className="h-5 w-5" />
      case 'profissional': return <Briefcase className="h-5 w-5" />
      case 'ambos': return <Users className="h-5 w-5" />
    }
  }

  const getUserTypeLabel = () => {
    switch (profile.user_type) {
      case 'estudante': return 'Estudante'
      case 'profissional': return 'Profissional'
      case 'ambos': return 'Estudante e Profissional'
    }
  }

  const lastTest = testResults?.[0] ?? null
  const topTypes: RIASECType[] = lastTest
    ? ([lastTest.primary_type, lastTest.secondary_type, lastTest.tertiary_type].filter(Boolean) as RIASECType[])
    : []

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="space-y-6 section-enter">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{profile.display_name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                {getUserTypeIcon()}
                <span>{getUserTypeLabel()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Membro desde {formatDate(profile.created_at)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Last Test Result */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <User className="h-5 w-5 text-primary" />
            Último Resultado RIASEC
          </CardTitle>
          <CardDescription>
            {lastTest
              ? `Realizado em ${formatDate(lastTest.created_at)}`
              : 'Você ainda não fez o teste'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lastTest ? (
            <div className="space-y-4">
              {/* Top Types */}
              <div className="flex flex-wrap gap-2">
                {topTypes.map((tipo, index) => (
                  <div
                    key={tipo}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: RIASEC_INFO[tipo].cor }}
                  >
                    <span className="font-bold">{index + 1}.</span>
                    <span>{tipo} - {RIASEC_INFO[tipo].nome}</span>
                  </div>
                ))}
              </div>

              {/* Score bars */}
              <div className="space-y-3 mt-4">
                {(Object.entries(lastTest.scores) as [RIASECType, number][])
                  .sort(([, a], [, b]) => b - a)
                  .map(([tipo, pontuacao]) => (
                    <div key={tipo} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">
                          {tipo} - {RIASEC_INFO[tipo].nome}
                        </span>
                        <span className="text-muted-foreground">{pontuacao}/20</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
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

              <Button
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => onNavigate('teste')}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refazer Teste
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                Descubra seu perfil profissional fazendo o teste RIASEC.
              </p>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => onNavigate('teste')}
              >
                Fazer Teste Agora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test History */}
      {testResults && testResults.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <History className="h-5 w-5 text-secondary" />
              Histórico de Testes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((teste, index) => (
                <div
                  key={teste.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      Perfil: {[teste.primary_type, teste.secondary_type, teste.tertiary_type].filter(Boolean).join(' - ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(teste.created_at)}
                    </p>
                  </div>
                  {index === 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Mais recente
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      {badges && badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Award className="h-5 w-5 text-accent" />
              Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {badges.map((userBadge) => (
                <div
                  key={userBadge.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-2xl">{userBadge.badges?.icon ?? '🏆'}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{userBadge.badges?.name}</p>
                    <p className="text-xs text-muted-foreground">{userBadge.badges?.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sign Out */}
      <Card className="border-destructive/20">
        <CardContent className="pt-6">
          <Button
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}