'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/lib/types'
import { RIASEC_INFO, type RIASECType } from '@/lib/types'
import {
  User,
  Calendar,
  History,
  RefreshCw,
  LogOut,
  GraduationCap,
  Briefcase,
  Users,
  Award,
  Pencil,
  Camera,
  Loader2,
  Phone,
  X
} from 'lucide-react'
import type { Section } from '@/components/bottom-navigation'

interface ProfileSectionProps {
  onNavigate: (section: Section) => void
}

export function ProfileSection({ onNavigate }: ProfileSectionProps) {
  const { profile, testResults, badges, signOut } = useAuth()
  const [showEditModal, setShowEditModal] = useState(false)

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
          <div className="flex items-start gap-4">
            <div className="relative shrink-0 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold overflow-hidden">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  fill
                  className="object-cover"
                />
              ) : (
                profile.display_name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{profile.display_name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                {getUserTypeIcon()}
                <span>{getUserTypeLabel()}</span>
              </div>
              {profile.bio && (
                <p className="text-sm text-foreground mt-3 leading-relaxed">{profile.bio}</p>
              )}
              {profile.contact && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{profile.contact}</span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="shrink-0"
            >
              <Pencil className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Membro desde {formatDate(profile.created_at)}</span>
          </div>
        </CardContent>
      </Card>

      {showEditModal && (
        <EditProfileModal profile={profile} onClose={() => setShowEditModal(false)} />
      )}

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

function EditProfileModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { updateProfile } = useAuth()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [contact, setContact] = useState(profile.contact ?? '')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.')
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      toast.error('Erro ao enviar a imagem. Tente novamente.')
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`)
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await updateProfile({
      avatar_url: avatarUrl,
      bio: bio.trim() || null,
      contact: contact.trim() || null
    })

    setSubmitting(false)

    if (error) {
      toast.error('Erro ao salvar perfil. Tente novamente.')
      return
    }

    toast.success('Perfil atualizado!')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Editar perfil</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-24 w-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold overflow-hidden">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={profile.display_name} fill className="object-cover" />
              ) : (
                profile.display_name.charAt(0).toUpperCase()
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 text-sm text-primary hover:underline disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
            </button>
            <p className="text-xs text-muted-foreground">JPG ou PNG, até 2MB.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Sobre você <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre sua trajetória..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Contato <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Ex: WhatsApp, e-mail ou LinkedIn"
              maxLength={200}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-input text-foreground font-medium rounded-lg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}