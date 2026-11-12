"use client"

import { toast } from 'sonner'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Experience, ExperienceComment, ForumTopic, PublicProfile, CommunityTab, ForumReply, ReportableContentType, SpecialistRequest } from '@/lib/types'
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/types'
import {
  descreverFormacao,
  descreverProfissao,
  EXPERIENCE_RANGE_LABELS,
  slugDoGuia
} from '@/lib/cbo'
import {
  CamposProfissaoForm,
  camposProfissaoParaPerfil,
  camposProfissaoValidos,
  type CamposProfissao
} from '@/components/perfil-profissional'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  MessageSquare,
  Users,
  Award,
  Heart,
  Clock,
  Plus,
  Send,
  ChevronRight,
  BadgeCheck,
  MessageCircle,
  Eye,
  Loader2,
  Trash2,
  Search,
  X,
  GraduationCap,
  Briefcase,
  Phone,
  Calendar,
  Pin,
  PinOff,
  Lock,
  Unlock,
  Pencil,
  Flag,
  BookOpen
} from 'lucide-react'

// Limites de tamanho inspirados no LinkedIn (posts ~3000, comentários
// ~1250) — precisam bater com as constraints check(...) do banco
// (migração 010). Mudar aqui sem migrar o banco só afeta a validação no
// navegador, não o que o servidor aceita.
const POST_LENGTH_LIMIT = 3000
const COMMENT_LENGTH_LIMIT = 1250
const TOPIC_TITLE_LENGTH_LIMIT = 200

// O gatilho de limite de frequência (migração 010) rejeita o insert com
// uma mensagem que contém este texto — usamos isso pra mostrar a
// mensagem de verdade do banco em vez do toast genérico de erro.
function friendlyInsertError(error: { message: string } | null | undefined, fallback: string) {
  if (error?.message?.includes('limite de publicações')) return error.message
  // Filtro de conteúdo (migração 014) rejeita o insert com esta mensagem.
  if (error?.message?.includes('Conteúdo não permitido')) return error.message
  return fallback
}

const tabs: { id: CommunityTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'experiences', label: 'Depoimentos', icon: MessageSquare },
  { id: 'forum', label: 'Fórum', icon: MessageCircle },
  { id: 'specialists', label: 'Especialistas', icon: Award },
]

// Botão de denúncia — alimenta a fila content_reports (migração 014).
// Não aparece para quem não está logado nem para o autor do conteúdo.
function ReportButton({
  contentType,
  contentId,
  authorId,
  className = 'text-muted-foreground hover:text-destructive transition-colors p-1',
  iconClassName = 'w-4 h-4'
}: {
  contentType: ReportableContentType
  contentId: string
  authorId: string | null
  className?: string
  iconClassName?: string
}) {
  const { user } = useAuth()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!user || user.id === authorId) return null

  const submit = async () => {
    setSubmitting(true)
    const { error } = await supabase.from('content_reports').insert({
      reporter_id: user.id,
      content_type: contentType,
      content_id: contentId,
      reason: reason.trim() || null
    })
    setSubmitting(false)
    setOpen(false)
    setReason('')

    if (error) {
      // 23505 = unique_violation → já denunciou este conteúdo antes
      toast.error(
        error.code === '23505'
          ? 'Você já denunciou este conteúdo.'
          : 'Não foi possível enviar a denúncia. Tente novamente.'
      )
      return
    }
    toast.success('Denúncia enviada. Nossa equipe vai analisar.')
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={className} aria-label="Denunciar">
        <Flag className={iconClassName} />
      </button>
      <AlertDialog open={open} onOpenChange={(o) => !submitting && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Denunciar conteúdo</AlertDialogTitle>
            <AlertDialogDescription>
              Conte o que há de errado (opcional). O autor não vê quem denunciou.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Ex: linguagem ofensiva, spam, informação ou profissão falsa..."
            className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground resize-none"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={submit}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Enviar denúncia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function CommunitySection() {
  const [activeTab, setActiveTab] = useState<CommunityTab>('experiences')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewedProfile, setViewedProfile] = useState<PublicProfile | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comunidade</h1>
        <p className="text-muted-foreground mt-1">
          Conecte-se com profissionais e estudantes
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      {activeTab !== 'specialists' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'experiences'
                ? 'Buscar por profissão, nome ou palavra-chave...'
                : 'Buscar por título ou palavra-chave...'
            }
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'experiences' && (
        <ExperiencesTab searchQuery={searchQuery} onViewProfile={setViewedProfile} />
      )}
      {activeTab === 'forum' && (
        <ForumTab searchQuery={searchQuery} onViewProfile={setViewedProfile} />
      )}
      {activeTab === 'specialists' && <SpecialistsTab onViewProfile={setViewedProfile} />}

      {viewedProfile && (
        <PublicProfileModal profile={viewedProfile} onClose={() => setViewedProfile(null)} />
      )}
    </div>
  )
}

// Experiences Tab Component
function ExperiencesTab({
  searchQuery,
  onViewProfile
}: {
  searchQuery: string
  onViewProfile: (profile: PublicProfile) => void
}) {
  const { user, profile, awardCountBadges } = useAuth()
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set())
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const fetchExperiences = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('experiences')
      .select(`*, profiles(${PUBLIC_PROFILE_COLUMNS})`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    setExperiences((data as Experience[]) || [])
    setLoading(false)
  }, [supabase])

  const fetchLikes = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('experience_likes')
      .select('experience_id')
      .eq('user_id', user.id)

    if (data) {
      setLikedIds(new Set(data.map(l => l.experience_id)))
    }
  }, [supabase, user])

  useEffect(() => {
    fetchExperiences()
    fetchLikes()
  }, [fetchExperiences, fetchLikes])

  const toggleLike = async (experienceId: string) => {
    if (!user) return
    // Ignora cliques repetidos enquanto a curtida anterior ainda está
    // em andamento — evita que dois toggles simultâneos cheguem ao
    // banco fora de ordem e deixem a contagem incoerente (incluindo
    // valores negativos).
    if (likingIds.has(experienceId)) return

    setLikingIds(prev => new Set(prev).add(experienceId))

    const isLiked = likedIds.has(experienceId)

    // Snapshot para reverter se a escrita no banco falhar
    const prevLikedIds = new Set(likedIds)
    const prevExperiences = [...experiences]

    if (isLiked) {
      setLikedIds(prev => {
        const next = new Set(prev)
        next.delete(experienceId)
        return next
      })
      setExperiences(prev =>
        prev.map(e => e.id === experienceId ? { ...e, likes_count: Math.max(0, e.likes_count - 1) } : e)
      )
    } else {
      setLikedIds(prev => new Set(prev).add(experienceId))
      setExperiences(prev =>
        prev.map(e => e.id === experienceId ? { ...e, likes_count: e.likes_count + 1 } : e)
      )
    }

    const { error } = isLiked
      ? await supabase
        .from('experience_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('experience_id', experienceId)
      : await supabase
        .from('experience_likes')
        .insert({ user_id: user.id, experience_id: experienceId })

    if (error) {
      setLikedIds(prevLikedIds)
      setExperiences(prevExperiences)
      toast.error('Erro ao curtir. Verifique sua conexão.')
    }

    setLikingIds(prev => {
      const next = new Set(prev)
      next.delete(experienceId)
      return next
    })
  }

  const handleDeleteExperience = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    const { data, error } = await supabase.from('experiences').delete().eq('id', deleteTargetId).select('id')
    setDeleting(false)

    // Um DELETE bloqueado pelo RLS (sem permissão) não gera "error" — só
    // afeta 0 linhas. Sem checar isso, o app diria "excluído" mesmo sem
    // ter apagado nada, e o item voltaria a aparecer ao recarregar.
    if (error || !data || data.length === 0) {
      toast.error('Erro ao excluir depoimento. Tente novamente.')
      return
    }

    setExperiences((prev) => prev.filter((exp) => exp.id !== deleteTargetId))
    setDeleteTargetId(null)
    toast.success('Depoimento excluído.')
  }

  // A profissão não vai no insert: o banco copia a do perfil (migração 017).
  const handleSubmitExperience = async (data: { content: string }) => {
    if (!user) return

    const { error } = await supabase.from('experiences').insert({
      user_id: user.id,
      content: data.content,
      status: 'approved'
    })

    if (error) {
      toast.error(friendlyInsertError(error, 'Erro ao enviar depoimento. Tente novamente.'))
      return
    }

    await awardCountBadges('experiences', { 1: 'first_experience' })

    toast.success('Depoimento publicado!')
    setShowForm(false)
    fetchExperiences()
  }

  // Na edição, só o texto muda — a profissão do depoimento fica a da época
  // em que foi publicado.
  const handleEditExperience = async (data: { content: string }) => {
    if (!editingExperience) return

    const { data: rows, error } = await supabase
      .from('experiences')
      .update({ content: data.content })
      .eq('id', editingExperience.id)
      .select('id')

    if (error || !rows || rows.length === 0) {
      toast.error('Não foi possível salvar as alterações. Tente novamente.')
      return
    }

    setExperiences((prev) =>
      prev.map((e) => (e.id === editingExperience.id ? { ...e, ...data } : e))
    )
    setEditingExperience(null)
    toast.success('Depoimento atualizado.')
  }

  const handleToggleExperienceClosed = async (exp: Experience) => {
    const { data: rows, error } = await supabase
      .from('experiences')
      .update({ is_closed: !exp.is_closed })
      .eq('id', exp.id)
      .select('id')

    if (error || !rows || rows.length === 0) {
      toast.error('Não foi possível atualizar o depoimento. Tente novamente.')
      return
    }

    setExperiences((prev) =>
      prev.map((e) => (e.id === exp.id ? { ...e, is_closed: !exp.is_closed } : e))
    )
    toast.success(exp.is_closed ? 'Comentários reabertos.' : 'Comentários encerrados.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const query = searchQuery.trim().toLowerCase()
  const filteredExperiences = query
    ? experiences.filter(
        (exp) =>
          exp.author_name.toLowerCase().includes(query) ||
          exp.profession.toLowerCase().includes(query) ||
          exp.content.toLowerCase().includes(query)
      )
    : experiences

  return (
    <div className="space-y-4">
      {/* Add Experience Button */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full p-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        <span>Compartilhar minha experiência</span>
      </button>

      {/* Experience Form Modal */}
      {showForm && (
        <ExperienceFormModal
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmitExperience}
        />
      )}

      {/* Edit Experience Modal */}
      {editingExperience && (
        <ExperienceFormModal
          initial={{
            profession: descreverProfissao(
              editingExperience.profession,
              editingExperience.profession_status
            ),
            content: editingExperience.content
          }}
          onClose={() => setEditingExperience(null)}
          onSubmit={handleEditExperience}
        />
      )}

      {/* Experiences List */}
      {filteredExperiences.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          {query ? (
            <p>Nenhum depoimento encontrado para &quot;{searchQuery}&quot;.</p>
          ) : (
            <>
              <p>Nenhum depoimento encontrado.</p>
              <p className="text-sm mt-1">Seja o primeiro a compartilhar!</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExperiences.map((exp) => (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              isLiked={likedIds.has(exp.id)}
              isLiking={likingIds.has(exp.id)}
              onToggleLike={() => toggleLike(exp.id)}
              canDelete={!!user && (user.id === exp.user_id || !!profile?.is_admin)}
              onDelete={() => setDeleteTargetId(exp.id)}
              canManage={!!user && (user.id === exp.user_id || !!profile?.is_admin)}
              onEdit={() => setEditingExperience(exp)}
              onToggleClosed={() => handleToggleExperienceClosed(exp)}
              onViewProfile={onViewProfile}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir depoimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O depoimento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExperience}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ExperienceCard({
  experience,
  isLiked,
  isLiking,
  onToggleLike,
  canDelete,
  onDelete,
  canManage,
  onEdit,
  onToggleClosed,
  onViewProfile
}: {
  experience: Experience
  isLiked: boolean
  isLiking: boolean
  onToggleLike: () => void
  canDelete: boolean
  onDelete: () => void
  canManage: boolean
  onEdit: () => void
  onToggleClosed: () => void
  onViewProfile: (profile: PublicProfile) => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentsCount, setCommentsCount] = useState(experience.comments_count)
  const guiaSlug = slugDoGuia(experience.profession_cbo)

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <button
          onClick={() => experience.profiles && onViewProfile(experience.profiles)}
          disabled={!experience.profiles}
          className="flex items-center gap-3 text-left disabled:cursor-default"
        >
          <div className="relative w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-primary overflow-hidden shrink-0">
            {experience.profiles?.avatar_url ? (
              <Image src={experience.profiles.avatar_url} alt={experience.author_name} fill className="object-cover" />
            ) : (
              experience.author_name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground hover:underline">{experience.author_name}</p>
              {experience.profiles?.is_specialist && (
                <BadgeCheck className="w-4 h-4 text-secondary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {descreverProfissao(experience.profession, experience.profession_status)}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {canManage && (
            <>
              <button
                onClick={onEdit}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Editar depoimento"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleClosed}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label={experience.is_closed ? 'Reabrir comentários' : 'Encerrar comentários'}
              >
                {experience.is_closed ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            </>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
              aria-label="Excluir depoimento"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <ReportButton contentType="experience" contentId={experience.id} authorId={experience.user_id} />
        </div>
      </div>

      {/* Content */}
      <p className="text-foreground leading-relaxed">{experience.content}</p>

      {guiaSlug && (
        <Link
          href={`/profissoes/${guiaSlug}`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Conheça essa profissão no guia
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleLike}
            disabled={isLiking}
            className={`flex items-center gap-2 text-sm transition-colors disabled:opacity-50 ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
              }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{experience.likes_count}</span>
          </button>
          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{commentsCount}</span>
            {experience.is_closed && <Lock className="w-3 h-3" aria-label="Comentários encerrados" />}
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{new Date(experience.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      {showComments && (
        <CommentsModal
          experience={experience}
          onClose={() => setShowComments(false)}
          onCommentsCountChange={setCommentsCount}
          onViewProfile={onViewProfile}
        />
      )}
    </div>
  )
}

// Painel de comentários de um depoimento — abre como uma "aba" sobre a
// tela (padrão de rede social), busca os comentários toda vez que é
// aberto (nunca usa cache de uma abertura anterior) e permite escrever
// um novo comentário direto por um campo fixo na parte de baixo.
function CommentsModal({
  experience,
  onClose,
  onCommentsCountChange,
  onViewProfile
}: {
  experience: Experience
  onClose: () => void
  onCommentsCountChange: (updater: (count: number) => number) => void
  onViewProfile: (profile: PublicProfile) => void
}) {
  const { user, profile, awardCountBadges } = useAuth()
  const supabase = createClient()

  const [comments, setComments] = useState<ExperienceComment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentInput, setCommentInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('experience_comments')
      .select(`*, profiles(${PUBLIC_PROFILE_COLUMNS})`)
      .eq('experience_id', experience.id)
      .order('created_at', { ascending: true })

    setComments((data as ExperienceComment[]) || [])
    setLoading(false)
  }, [supabase, experience.id])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !commentInput.trim() || experience.is_closed) return

    setSubmitting(true)
    const { error } = await supabase.from('experience_comments').insert({
      experience_id: experience.id,
      user_id: user.id,
      content: commentInput.trim()
    })

    if (error) {
      setSubmitting(false)
      toast.error(friendlyInsertError(error, 'Erro ao enviar comentário. Tente novamente.'))
      return
    }

    await awardCountBadges('experience_comments', { 1: 'first_comment' })

    setCommentInput('')
    setSubmitting(false)
    onCommentsCountChange((c) => c + 1)
    fetchComments()
  }

  const handleDeleteComment = async () => {
    if (!deleteCommentId) return
    const { data, error } = await supabase.from('experience_comments').delete().eq('id', deleteCommentId).select('id')

    if (error || !data || data.length === 0) {
      toast.error('Erro ao excluir comentário. Tente novamente.')
      return
    }

    setComments((prev) => prev.filter((c) => c.id !== deleteCommentId))
    onCommentsCountChange((c) => Math.max(0, c - 1))
    setDeleteCommentId(null)
    toast.success('Comentário excluído.')
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
        <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg h-[85vh] sm:h-[75vh] flex flex-col">
          <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between shrink-0">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Comentários</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum comentário ainda. Seja o primeiro a comentar!
              </p>
            ) : (
              comments.map((comment) => {
                const canDeleteComment = !!user && (user.id === comment.user_id || !!profile?.is_admin)
                return (
                  <div key={comment.id} className="flex items-start gap-2">
                    <button
                      onClick={() => comment.profiles && onViewProfile(comment.profiles)}
                      disabled={!comment.profiles}
                      className="relative w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium overflow-hidden shrink-0 disabled:cursor-default"
                    >
                      {comment.profiles?.avatar_url ? (
                        <Image src={comment.profiles.avatar_url} alt={comment.profiles.display_name} fill className="object-cover" />
                      ) : (
                        comment.profiles?.display_name?.charAt(0) || 'U'
                      )}
                    </button>
                    <div className="flex-1 min-w-0 bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        {comment.profiles ? (
                          <button
                            onClick={() => onViewProfile(comment.profiles!)}
                            className="flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
                          >
                            {comment.profiles.display_name}
                            {comment.profiles.is_specialist && (
                              <BadgeCheck className="w-3.5 h-3.5 text-secondary" />
                            )}
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-foreground">Usuário removido</span>
                        )}
                        <div className="flex items-center gap-1 shrink-0">
                          {canDeleteComment && (
                            <button
                              onClick={() => setDeleteCommentId(comment.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              aria-label="Excluir comentário"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <ReportButton
                            contentType="experience_comment"
                            contentId={comment.id}
                            authorId={comment.user_id}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            iconClassName="w-3 h-3"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {experience.is_closed ? (
            <div className="p-4 border-t border-border shrink-0 text-sm text-muted-foreground text-center">
              Os comentários deste depoimento foram encerrados.
            </div>
          ) : user && (
            <form onSubmit={handleSubmitComment} className="p-3 sm:p-4 border-t border-border shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Escreva um comentário..."
                  rows={1}
                  maxLength={COMMENT_LENGTH_LIMIT}
                  className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground resize-none"
                />
                <button
                  type="submit"
                  disabled={submitting || !commentInput.trim()}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 shrink-0"
                  aria-label="Enviar comentário"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">{commentInput.length}/{COMMENT_LENGTH_LIMIT}</p>
            </form>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Formulário de depoimento. A profissão vem do perfil (migração 017): quem
// já informou vê qual profissão vai aparecer; quem ainda não informou
// escolhe aqui mesmo (na lista da CBO), e ela é salva no perfil antes de
// publicar. Na edição, a profissão não muda — só o texto.
function ExperienceFormModal({
  onClose,
  onSubmit,
  initial
}: {
  onClose: () => void
  onSubmit: (data: { content: string }) => Promise<void>
  initial?: { profession: string; content: string }
}) {
  const { profile, updateProfile } = useAuth()
  const isEdit = !!initial
  const [content, setContent] = useState(initial?.content ?? '')
  const [submitting, setSubmitting] = useState(false)
  const temProfissao = !!profile?.profession_cbo && !!profile.profession_title
  const [campos, setCampos] = useState<CamposProfissao>({
    profissao: null,
    status: null,
    experiencia: null
  })
  const precisaProfissao = !isEdit && !temProfissao
  const podeEnviar =
    !!content.trim() && !submitting && (!precisaProfissao || camposProfissaoValidos(campos))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeEnviar) return

    setSubmitting(true)
    if (precisaProfissao) {
      const { error } = await updateProfile(camposProfissaoParaPerfil(campos))
      if (error) {
        setSubmitting(false)
        toast.error('Não foi possível salvar sua profissão. Tente novamente.')
        return
      }
    }
    await onSubmit({ content })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {isEdit ? 'Editar depoimento' : 'Compartilhar Experiência'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isEdit ? (
            <div className="bg-muted/50 p-4 rounded-lg text-sm">
              <p className="text-muted-foreground">Publicado como</p>
              <p className="font-medium text-foreground">{initial.profession}</p>
              <p className="text-xs text-muted-foreground mt-1">
                A profissão de um depoimento continua a da época em que ele foi publicado.
              </p>
            </div>
          ) : temProfissao ? (
            <div className="bg-muted/50 p-4 rounded-lg text-sm">
              <p className="text-muted-foreground">Você vai publicar como</p>
              <p className="font-medium text-foreground">
                {descreverProfissao(profile!.profession_title!, profile!.profession_status)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Para mudar, edite sua profissão em Perfil.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Antes do primeiro depoimento, conte qual é a sua profissão. Ela fica salva no seu
                perfil e aparece nos seus depoimentos.
              </p>
              <CamposProfissaoForm value={campos} onChange={setCampos} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Sua experiência
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Conte sobre sua trajetória, desafios e conquistas..."
              rows={5}
              maxLength={POST_LENGTH_LIMIT}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground resize-none"
              required
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{content.length}/{POST_LENGTH_LIMIT}</p>
          </div>

          {!isEdit && (
            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
              <p>Seu depoimento fica visível para toda a comunidade assim que você publicar. Conteúdo ofensivo ou spam pode ser removido.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!podeEnviar}
            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isEdit ? 'Salvando...' : 'Enviando...'}
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {isEdit ? 'Salvar alterações' : 'Enviar depoimento'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// Forum Tab Component
function ForumTab({
  searchQuery,
  onViewProfile
}: {
  searchQuery: string
  onViewProfile: (profile: PublicProfile) => void
}) {
  const { user, profile, awardCountBadges } = useAuth()
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTopic, setEditingTopic] = useState<ForumTopic | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const fetchTopics = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('forum_topics')
      .select(`*, profiles(${PUBLIC_PROFILE_COLUMNS})`)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    setTopics((data as ForumTopic[]) || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  const handleCreateTopic = async (data: { title: string; content: string }) => {
    if (!user) return

    const { error } = await supabase.from('forum_topics').insert({
      user_id: user.id,
      title: data.title,
      content: data.content
    })

    if (error) {
      toast.error(friendlyInsertError(error, 'Erro ao criar tópico. Tente novamente.'))
      return
    }

    await awardCountBadges('forum_topics', { 1: 'first_topic' })

    toast.success('Tópico criado com sucesso!')
    setShowForm(false)
    fetchTopics()
  }

  const handleDeleteTopic = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    const { data, error } = await supabase.from('forum_topics').delete().eq('id', deleteTargetId).select('id')
    setDeleting(false)

    if (error || !data || data.length === 0) {
      toast.error('Erro ao excluir tópico. Tente novamente.')
      return
    }

    setTopics((prev) => prev.filter((t) => t.id !== deleteTargetId))
    if (selectedTopic?.id === deleteTargetId) {
      setSelectedTopic(null)
    }
    setDeleteTargetId(null)
    toast.success('Tópico excluído.')
  }

  const isAdmin = !!profile?.is_admin

  const handleEditTopic = async (data: { title: string; content: string }) => {
    if (!editingTopic) return

    const { data: rows, error } = await supabase
      .from('forum_topics')
      .update({ title: data.title, content: data.content })
      .eq('id', editingTopic.id)
      .select('id')

    if (error || !rows || rows.length === 0) {
      toast.error('Não foi possível salvar as alterações. Tente novamente.')
      return
    }

    setTopics((prev) => prev.map((t) => (t.id === editingTopic.id ? { ...t, ...data } : t)))
    setSelectedTopic((prev) => (prev && prev.id === editingTopic.id ? { ...prev, ...data } : prev))
    setEditingTopic(null)
    toast.success('Tópico atualizado.')
  }

  // Fixar é exclusivo de admin (policy da migração 011); fechar/editar o
  // autor também pode (migração 013). Se o UPDATE não afetar nenhuma linha
  // (sem permissão), tratamos como erro em vez de falso sucesso.
  const updateTopicFlags = async (
    topic: ForumTopic,
    changes: Partial<Pick<ForumTopic, 'is_pinned' | 'is_closed'>>,
    successMessage: string
  ) => {
    const { data, error } = await supabase
      .from('forum_topics')
      .update(changes)
      .eq('id', topic.id)
      .select('id')

    if (error || !data || data.length === 0) {
      toast.error('Não foi possível atualizar o tópico. Tente novamente.')
      return
    }

    setTopics((prev) => {
      const next = prev.map((t) => (t.id === topic.id ? { ...t, ...changes } : t))
      // Espelha a ordenação da consulta: fixados primeiro, depois mais recentes.
      return next.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    })
    setSelectedTopic((prev) => (prev && prev.id === topic.id ? { ...prev, ...changes } : prev))
    toast.success(successMessage)
  }

  const handleTogglePin = (topic: ForumTopic) =>
    updateTopicFlags(
      topic,
      { is_pinned: !topic.is_pinned },
      topic.is_pinned ? 'Tópico desafixado.' : 'Tópico fixado.'
    )

  const handleToggleClose = (topic: ForumTopic) =>
    updateTopicFlags(
      topic,
      { is_closed: !topic.is_closed },
      topic.is_closed ? 'Tópico reaberto.' : 'Tópico fechado.'
    )

  const deleteDialog = (
    <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir tópico?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. O tópico e todas as respostas serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteTopic}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  const editTopicModal = editingTopic && (
    <TopicFormModal
      initial={{ title: editingTopic.title, content: editingTopic.content }}
      onClose={() => setEditingTopic(null)}
      onSubmit={handleEditTopic}
    />
  )

  if (selectedTopic) {
    const canManageTopic = !!user && (user.id === selectedTopic.user_id || isAdmin)
    return (
      <>
        <TopicDetail
          topic={selectedTopic}
          canDelete={canManageTopic}
          onDelete={() => setDeleteTargetId(selectedTopic.id)}
          onViewProfile={onViewProfile}
          canPin={isAdmin}
          canManage={canManageTopic}
          onEdit={() => setEditingTopic(selectedTopic)}
          onTogglePin={() => handleTogglePin(selectedTopic)}
          onToggleClose={() => handleToggleClose(selectedTopic)}
          onBack={() => {
            setSelectedTopic(null)
            fetchTopics()
          }}
        />
        {deleteDialog}
        {editTopicModal}
      </>
    )
  }

  const query = searchQuery.trim().toLowerCase()
  const filteredTopics = query
    ? topics.filter(
        (topic) =>
          topic.title.toLowerCase().includes(query) ||
          topic.content.toLowerCase().includes(query)
      )
    : topics

  return (
    <div className="space-y-4">
      {/* Create Topic Button */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full p-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        <span>Criar novo tópico</span>
      </button>

      {/* Topic Form Modal */}
      {showForm && (
        <TopicFormModal
          onClose={() => setShowForm(false)}
          onSubmit={handleCreateTopic}
        />
      )}

      {/* Edit Topic Modal */}
      {editTopicModal}

      {/* Topics List */}
      {filteredTopics.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          {query ? (
            <p>Nenhum tópico encontrado para &quot;{searchQuery}&quot;.</p>
          ) : (
            <>
              <p>Nenhum tópico encontrado.</p>
              <p className="text-sm mt-1">Seja o primeiro a perguntar!</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onClick={() => setSelectedTopic(topic)}
              canDelete={!!user && (user.id === topic.user_id || isAdmin)}
              onDelete={() => setDeleteTargetId(topic.id)}
              canPin={isAdmin}
              canManage={!!user && (user.id === topic.user_id || isAdmin)}
              onEdit={() => setEditingTopic(topic)}
              onTogglePin={() => handleTogglePin(topic)}
              onToggleClose={() => handleToggleClose(topic)}
            />
          ))}
        </div>
      )}

      {deleteDialog}
    </div>
  )
}

function TopicCard({
  topic,
  onClick,
  canDelete,
  onDelete,
  canPin,
  canManage,
  onEdit,
  onTogglePin,
  onToggleClose
}: {
  topic: ForumTopic
  onClick: () => void
  canDelete: boolean
  onDelete: () => void
  canPin: boolean
  canManage: boolean
  onEdit: () => void
  onTogglePin: () => void
  onToggleClose: () => void
}) {
  return (
    <div className="w-full bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <button onClick={onClick} className="flex-1 min-w-0 text-left">
          {(topic.is_pinned || topic.is_closed) && (
            <div className="flex items-center gap-2 mb-1">
              {topic.is_pinned && (
                <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs font-medium rounded">
                  Fixado
                </span>
              )}
              {topic.is_closed && (
                <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded">
                  Fechado
                </span>
              )}
            </div>
          )}
          <h3 className="font-semibold text-foreground truncate">{topic.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{topic.content}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{topic.views_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              <span>{topic.replies_count}</span>
            </div>
            <span>{new Date(topic.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {canManage && (
            <>
              <button
                onClick={onEdit}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Editar tópico"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label={topic.is_closed ? 'Reabrir tópico' : 'Fechar tópico'}
              >
                {topic.is_closed ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            </>
          )}
          {canPin && (
            <button
              onClick={onTogglePin}
              className="text-muted-foreground hover:text-accent transition-colors p-1"
              aria-label={topic.is_pinned ? 'Desafixar tópico' : 'Fixar tópico'}
            >
              {topic.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
              aria-label="Excluir tópico"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClick} className="p-1">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}

function TopicFormModal({
  onClose,
  onSubmit,
  initial
}: {
  onClose: () => void
  onSubmit: (data: { title: string; content: string }) => void
  initial?: { title: string; content: string }
}) {
  const isEdit = !!initial
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setSubmitting(true)
    await onSubmit({ title, content })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{isEdit ? 'Editar tópico' : 'Novo Tópico'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Título da pergunta
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Como é a rotina de um médico?"
              maxLength={TOPIC_TITLE_LENGTH_LIMIT}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground"
              required
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{title.length}/{TOPIC_TITLE_LENGTH_LIMIT}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Detalhes
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva sua dúvida com mais detalhes..."
              rows={4}
              maxLength={POST_LENGTH_LIMIT}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground resize-none"
              required
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{content.length}/{POST_LENGTH_LIMIT}</p>
          </div>

          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isEdit ? 'Salvando...' : 'Publicando...'}
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {isEdit ? 'Salvar alterações' : 'Publicar pergunta'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function TopicDetail({
  topic,
  onBack,
  canDelete,
  onDelete,
  onViewProfile,
  canPin,
  canManage,
  onEdit,
  onTogglePin,
  onToggleClose
}: {
  topic: ForumTopic
  onBack: () => void
  canDelete: boolean
  onDelete: () => void
  onViewProfile: (profile: PublicProfile) => void
  canPin: boolean
  canManage: boolean
  onEdit: () => void
  onTogglePin: () => void
  onToggleClose: () => void
}) {
  const { user, profile, awardCountBadges } = useAuth()
  const [replies, setReplies] = useState<ForumReply[]>([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteReplyId, setDeleteReplyId] = useState<string | null>(null)
  const [deletingReply, setDeletingReply] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    const fetchReplies = async () => {
      const { data } = await supabase
        .from('forum_replies')
        .select(`*, profiles(${PUBLIC_PROFILE_COLUMNS})`)
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: true })

      if (cancelled) return  // ✅ Não atualiza estado se desmontou

      setReplies((data as ForumReply[]) || [])
      setLoading(false)

      // Usar RPC criado no passo 6
      await supabase.rpc('increment_topic_views', { topic_id: topic.id })
    }

    fetchReplies()

    return () => {
      cancelled = true  // ✅ Cleanup
    }
  }, [supabase, topic.id]) // ← remover topic.views_count das deps (causa loop!)

  const handleSubmitReply = async () => {
    if (!user || !replyContent.trim()) return

    setSubmitting(true)
    const { error } = await supabase.from('forum_replies').insert({
      topic_id: topic.id,
      user_id: user.id,
      content: replyContent
    })

    if (error) {
      toast.error(friendlyInsertError(error, 'Erro ao enviar resposta. Tente novamente.'))
      setSubmitting(false)
      return
    }

    await awardCountBadges('forum_replies', { 1: 'first_reply' })

    setReplyContent('')
    setSubmitting(false)
    toast.success('Resposta publicada!')

    const { data } = await supabase
      .from('forum_replies')
      .select(`*, profiles(${PUBLIC_PROFILE_COLUMNS})`)
      .eq('topic_id', topic.id)
      .order('created_at', { ascending: true })

    setReplies((data as ForumReply[]) || [])
  }

  const handleDeleteReply = async () => {
    if (!deleteReplyId) return
    setDeletingReply(true)
    const { data, error } = await supabase.from('forum_replies').delete().eq('id', deleteReplyId).select('id')
    setDeletingReply(false)

    if (error || !data || data.length === 0) {
      toast.error('Erro ao excluir resposta. Tente novamente.')
      return
    }

    setReplies((prev) => prev.filter((r) => r.id !== deleteReplyId))
    setDeleteReplyId(null)
    toast.success('Resposta excluída.')
  }

  return (
    <>
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Voltar para o fórum
        </button>
        <div className="flex items-center gap-4">
          {canManage && (
            <>
              <button
                onClick={onEdit}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={onToggleClose}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {topic.is_closed ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {topic.is_closed ? 'Reabrir' : 'Fechar'}
              </button>
            </>
          )}
          {canPin && (
            <button
              onClick={onTogglePin}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              {topic.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              {topic.is_pinned ? 'Desafixar' : 'Fixar'}
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir tópico
            </button>
          )}
          <ReportButton contentType="forum_topic" contentId={topic.id} authorId={topic.user_id} />
        </div>
      </div>

      {/* Topic */}
      <div className="bg-card rounded-xl border border-border p-6">
        {(topic.is_pinned || topic.is_closed) && (
          <div className="flex items-center gap-2 mb-2">
            {topic.is_pinned && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs font-medium rounded">
                Fixado
              </span>
            )}
            {topic.is_closed && (
              <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded">
                Fechado
              </span>
            )}
          </div>
        )}
        <h1 className="text-xl font-bold text-foreground mb-3">{topic.title}</h1>
        <p className="text-foreground leading-relaxed">{topic.content}</p>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
          <span>
            Por{' '}
            {topic.profiles ? (
              <button
                onClick={() => onViewProfile(topic.profiles!)}
                className="font-medium text-foreground hover:underline"
              >
                {topic.profiles.display_name}
              </button>
            ) : (
              'Usuário removido'
            )}
          </span>
          <span>{new Date(topic.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-4">
        <h2 className="font-semibold text-foreground">
          {replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : replies.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            Nenhuma resposta ainda. Seja o primeiro a responder!
          </p>
        ) : (
          replies.map((reply) => {
            const canDeleteReply = !!user && (user.id === reply.user_id || !!profile?.is_admin)
            return (
              <div key={reply.id} className={`bg-card rounded-xl border p-5 ${reply.profiles?.is_specialist ? 'border-secondary' : 'border-border'
                }`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <button
                    onClick={() => reply.profiles && onViewProfile(reply.profiles)}
                    disabled={!reply.profiles}
                    className="flex items-start gap-3 text-left disabled:cursor-default"
                  >
                    <div className="relative w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium overflow-hidden shrink-0">
                      {reply.profiles?.avatar_url ? (
                        <Image src={reply.profiles.avatar_url} alt={reply.profiles.display_name} fill className="object-cover" />
                      ) : (
                        reply.profiles?.display_name?.charAt(0) || 'U'
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {reply.profiles ? (
                          <span className="font-medium text-foreground hover:underline">
                            {reply.profiles.display_name}
                          </span>
                        ) : (
                          <span className="font-medium text-foreground">Usuário removido</span>
                        )}
                        {reply.profiles?.is_specialist && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-secondary/10 text-secondary text-xs font-medium rounded">
                            <BadgeCheck className="w-3 h-3" />
                            Especialista
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(reply.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {canDeleteReply && (
                      <button
                        onClick={() => setDeleteReplyId(reply.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        aria-label="Excluir resposta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ReportButton contentType="forum_reply" contentId={reply.id} authorId={reply.user_id} />
                  </div>
                </div>
                <p className="text-foreground leading-relaxed">{reply.content}</p>
              </div>
            )
          })
        )}
      </div>

      {/* Reply Input */}
      {!topic.is_closed && (
        <div className="bg-card rounded-xl border border-border p-4">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Escreva sua resposta..."
            rows={3}
            maxLength={COMMENT_LENGTH_LIMIT}
            className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1 mb-3 text-right">{replyContent.length}/{COMMENT_LENGTH_LIMIT}</p>
          <button
            onClick={handleSubmitReply}
            disabled={submitting || !replyContent.trim()}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Responder
              </>
            )}
          </button>
        </div>
      )}

      {topic.is_closed && (
        <div className="bg-muted/50 rounded-xl border border-border p-4 text-sm text-muted-foreground text-center">
          Este tópico está fechado para novas respostas.
        </div>
      )}
    </div>

    <AlertDialog open={!!deleteReplyId} onOpenChange={(open) => !open && setDeleteReplyId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir resposta?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletingReply}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteReply}
            disabled={deletingReply}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

// Aba Especialistas. O pedido do selo passa pelas funções da migração 018:
// comprovação obrigatória, área = profissão da CBO do perfil (congelada na
// aprovação) e histórico em specialist_requests. O selo indica que a pessoa
// é especialista; não restringe quem responde no fórum.
function SpecialistsTab({ onViewProfile }: { onViewProfile: (profile: PublicProfile) => void }) {
  const { user, profile, refreshProfile } = useAuth()
  const [specialists, setSpecialists] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [myRequest, setMyRequest] = useState<SpecialistRequest | null>(null)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchSpecialists = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(PUBLIC_PROFILE_COLUMNS)
        .eq('is_specialist', true)
        .eq('specialist_status', 'approved')
        .order('display_name')

      // Sem isso, uma falha na consulta aparecia como "Nenhum especialista".
      setLoadError(!!error)
      setSpecialists((data as PublicProfile[]) || [])
      setLoading(false)
    }

    fetchSpecialists()
  }, [supabase])

  // Último pedido da própria pessoa (para mostrar data, motivo da recusa etc.).
  const userId = user?.id
  const fetchMyRequest = useCallback(async () => {
    if (!userId) {
      setMyRequest(null)
      return
    }
    const { data } = await supabase
      .from('specialist_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setMyRequest((data as SpecialistRequest | null) ?? null)
  }, [supabase, userId])

  useEffect(() => {
    fetchMyRequest()
  }, [fetchMyRequest])

  // Devolve true se o pedido foi gravado (o modal só fecha nesse caso).
  const handleRequestSpecialist = async (evidence: string, message: string): Promise<boolean> => {
    if (!user) return false

    const { error } = await supabase.rpc('solicitar_especialista', {
      p_evidencia: evidence,
      p_mensagem: message || null
    })

    if (error) {
      toast.error(specialistError(error, 'Não foi possível enviar o pedido. Tente novamente.'))
      return false
    }

    await Promise.all([refreshProfile(), fetchMyRequest()])
    setShowRequestForm(false)
    toast.success('Pedido enviado! Acompanhe o andamento nesta aba.')
    return true
  }

  const handleCancelRequest = async () => {
    setCanceling(true)
    const { error } = await supabase.rpc('cancelar_pedido_especialista')
    setCanceling(false)
    setShowCancelConfirm(false)

    if (error) {
      toast.error(specialistError(error, 'Não foi possível cancelar o pedido. Tente novamente.'))
      return
    }

    await Promise.all([refreshProfile(), fetchMyRequest()])
    toast.success('Pedido cancelado.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const status = profile?.specialist_status
  const isSpecialist = !!profile?.is_specialist
  const semProfissao = !!profile && !profile.profession_cbo
  const soEstuda = !!profile?.profession_cbo && profile.profession_status === 'estudo'
  // Pode abrir o pedido: atua/já atuou, ou ainda não informou a profissão
  // (escolhe no próprio formulário, como no depoimento).
  const podePedir = !!profile && !isSpecialist && status !== 'pending' && !soEstuda
  const ultimaDecisao =
    myRequest && (myRequest.status === 'rejected' || myRequest.status === 'revoked') ? myRequest : null

  return (
    <div className="space-y-6">
      {/* Já é especialista */}
      {isSpecialist && (
        <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 flex items-start gap-3">
          <BadgeCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground font-medium">
              Você é especialista verificado{profile?.specialist_area ? ` em ${profile.specialist_area}` : ''}.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              O selo aparece junto ao seu nome em depoimentos, comentários e respostas. A área
              do selo fica fixa: mudar a profissão no perfil não altera o selo. Para outra área,
              fale com a equipe pelo e-mail contat3.inova@gmail.com.
            </p>
          </div>
        </div>
      )}

      {/* Em análise */}
      {!isSpecialist && status === 'pending' && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-accent font-medium">
              Seu pedido do selo de especialista está em análise pela equipe do INOVA.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {(myRequest?.profession_title || profile?.specialist_area) && (
                <>Área: {myRequest?.profession_title || profile?.specialist_area}. </>
              )}
              {myRequest?.status === 'pending' && (
                <>Enviado em {new Date(myRequest.created_at).toLocaleDateString('pt-BR')}. </>
              )}
              O resultado aparece aqui, nesta aba.
            </p>
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="mt-3 text-sm text-muted-foreground hover:text-destructive underline underline-offset-2"
            >
              Cancelar pedido
            </button>
          </div>
        </div>
      )}

      {/* Recusado ou selo retirado: mostra o motivo */}
      {!isSpecialist && status === 'rejected' && (
        <div className="bg-muted/50 border border-border rounded-xl p-4">
          <p className="text-sm text-foreground font-medium">
            {ultimaDecisao?.status === 'revoked'
              ? 'Seu selo de especialista foi retirado.'
              : 'Seu pedido do selo de especialista não foi aprovado.'}
          </p>
          {ultimaDecisao?.decision_reason && (
            <p className="text-sm text-muted-foreground mt-1">
              Motivo: {ultimaDecisao.decision_reason}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Se tiver dúvidas, fale com a equipe pelo e-mail contat3.inova@gmail.com.
          </p>
        </div>
      )}

      {/* Convite para pedir o selo */}
      {podePedir && (
        <div className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                {status === 'rejected' ? 'Pedir o selo novamente' : 'Torne-se um Especialista Verificado'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Se você atua ou já atuou em uma profissão, peça o selo de especialista. Ele aparece
                junto ao seu nome em depoimentos, comentários e respostas do fórum, e você entra na
                lista abaixo.
                {semProfissao && ' Você vai informar sua profissão no próprio pedido.'}
              </p>
              <button
                onClick={() => setShowRequestForm(true)}
                className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/90 transition-colors"
              >
                {status === 'rejected' ? 'Solicitar novamente' : 'Solicitar verificação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quem só estuda para a profissão não pede o selo */}
      {profile && !isSpecialist && status !== 'pending' && soEstuda && (
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            O selo de especialista é para quem atua ou já atuou na profissão. No seu perfil, você
            está estudando para ser {profile.profession_title}. Quando começar a atuar, atualize
            sua situação em Perfil e peça o selo aqui.
          </p>
        </div>
      )}

      {/* Formulário do pedido */}
      {showRequestForm && (
        <SpecialistRequestModal
          onClose={() => setShowRequestForm(false)}
          onSubmit={handleRequestSpecialist}
        />
      )}

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar o pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              O pedido sai da fila de análise. Você pode pedir de novo depois (até 3 pedidos a cada 30 dias).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Manter pedido</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleCancelRequest()
              }}
              disabled={canceling}
            >
              {canceling ? 'Cancelando...' : 'Cancelar pedido'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Specialists List */}
      {loadError ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Não foi possível carregar a lista de especialistas.</p>
          <p className="text-sm mt-1">Verifique sua conexão e recarregue a página.</p>
        </div>
      ) : specialists.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum especialista verificado ainda.</p>
          <p className="text-sm mt-1">Seja o primeiro!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {specialists.map((specialist) => (
            <button
              key={specialist.id}
              onClick={() => onViewProfile(specialist)}
              className="w-full bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-start gap-4">
                <div className="relative w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold overflow-hidden shrink-0">
                  {specialist.avatar_url ? (
                    <Image src={specialist.avatar_url} alt={specialist.display_name} fill className="object-cover" />
                  ) : (
                    specialist.display_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {specialist.display_name}
                    </h3>
                    <BadgeCheck className="w-4 h-4 text-secondary shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {specialist.specialist_area || 'Área não especificada'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// As funções da migração 018 recusam com mensagens já em português
// (raise exception → código P0001); outros erros viram o texto genérico.
function specialistError(error: { message: string; code?: string } | null, fallback: string) {
  if (error?.code === 'P0001' && error.message) return error.message
  return fallback
}

const SPECIALIST_EVIDENCE_LIMIT = 300
const SPECIALIST_MESSAGE_LIMIT = 500

// Formulário do pedido. A área é a profissão do perfil (CBO); quem ainda
// não informou escolhe aqui mesmo e ela é salva no perfil antes do pedido,
// como no formulário de depoimento.
function SpecialistRequestModal({
  onClose,
  onSubmit
}: {
  onClose: () => void
  onSubmit: (evidence: string, message: string) => Promise<boolean>
}) {
  const { profile, updateProfile } = useAuth()
  const [evidence, setEvidence] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const temProfissao = !!profile?.profession_cbo && !!profile.profession_title
  const [campos, setCampos] = useState<CamposProfissao>({
    profissao: null,
    status: null,
    experiencia: null
  })
  const precisaProfissao = !temProfissao
  const escolheuEstudo = precisaProfissao && campos.status === 'estudo'
  const podeEnviar =
    evidence.trim().length >= 5 &&
    !submitting &&
    (!precisaProfissao || (camposProfissaoValidos(campos) && !escolheuEstudo))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeEnviar) return

    setSubmitting(true)
    if (precisaProfissao) {
      const { error } = await updateProfile(camposProfissaoParaPerfil(campos))
      if (error) {
        setSubmitting(false)
        toast.error('Não foi possível salvar sua profissão. Tente novamente.')
        return
      }
    }
    await onSubmit(evidence.trim(), message.trim())
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Pedir o selo de especialista</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {temProfissao ? (
            <div className="bg-muted/50 p-4 rounded-lg text-sm">
              <p className="text-muted-foreground">Área do selo</p>
              <p className="font-medium text-foreground">
                {descreverProfissao(profile!.profession_title!, profile!.profession_status)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                É a profissão do seu perfil. Depois de aprovado, a área do selo fica fixa.
                Para mudar antes de pedir, edite sua profissão em Perfil.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Conte qual é a sua profissão. Ela fica salva no seu perfil e será a área do selo.
              </p>
              <CamposProfissaoForm value={campos} onChange={setCampos} />
              {escolheuEstudo && (
                <p className="text-sm text-destructive">
                  O selo é para quem atua ou já atuou na profissão.
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="specialist-evidence" className="block text-sm font-medium text-foreground mb-2">
              Comprovação
            </label>
            <input
              id="specialist-evidence"
              type="text"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Ex.: linkedin.com/in/seu-nome ou CRM-RS 12345"
              maxLength={SPECIALIST_EVIDENCE_LIMIT}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Link de um perfil profissional (LinkedIn, currículo Lattes) ou o número do seu
              registro no conselho da profissão (CRM, CREA, OAB...). Só a equipe do INOVA vê.
            </p>
          </div>

          <div>
            <label htmlFor="specialist-message" className="block text-sm font-medium text-foreground mb-2">
              Mensagem <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              id="specialist-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Algo que ajude na análise: onde você atua, há quanto tempo..."
              rows={3}
              maxLength={SPECIALIST_MESSAGE_LIMIT}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {message.length}/{SPECIALIST_MESSAGE_LIMIT}
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
            A equipe do INOVA analisa cada pedido manualmente. O resultado, e o motivo em caso de
            recusa, aparece na aba Especialistas.
          </div>

          <button
            type="submit"
            disabled={!podeEnviar}
            className="w-full py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar pedido'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

type DepoimentoDoPerfil = Pick<
  Experience,
  'id' | 'profession' | 'profession_status' | 'content' | 'likes_count' | 'comments_count' | 'created_at'
>

// Perfil público: dados profissionais declarados + os depoimentos da pessoa.
// Só mostra colunas públicas (migração 017) — nunca e-mail ou nascimento.
function PublicProfileModal({ profile, onClose }: { profile: PublicProfile; onClose: () => void }) {
  const supabase = createClient()
  const [depoimentos, setDepoimentos] = useState<DepoimentoDoPerfil[] | null>(null)

  useEffect(() => {
    let cancelado = false
    supabase
      .from('experiences')
      .select('id, profession, profession_status, content, likes_count, comments_count, created_at')
      .eq('user_id', profile.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelado) setDepoimentos((data as DepoimentoDoPerfil[]) ?? [])
      })
    return () => {
      cancelado = true
    }
  }, [supabase, profile.id])

  const getUserTypeIcon = () => {
    switch (profile.user_type) {
      case 'estudante': return <GraduationCap className="w-4 h-4" />
      case 'profissional': return <Briefcase className="w-4 h-4" />
      case 'ambos': return <Users className="w-4 h-4" />
    }
  }

  const getUserTypeLabel = () => {
    switch (profile.user_type) {
      case 'estudante': return 'Estudante'
      case 'profissional': return 'Profissional'
      case 'ambos': return 'Estudante e Profissional'
    }
  }

  const guiaSlug = slugDoGuia(profile.profession_cbo)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Perfil</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="relative w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
              ) : (
                profile.display_name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-lg font-bold text-foreground">{profile.display_name}</h3>
                {profile.is_specialist && <BadgeCheck className="w-5 h-5 text-secondary shrink-0" />}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
                {getUserTypeIcon()}
                <span>{getUserTypeLabel()}</span>
              </div>
              {profile.is_specialist && profile.specialist_area && (
                <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                  Especialista em {profile.specialist_area}
                </span>
              )}
            </div>
          </div>

          {(profile.profession_title || profile.education_level) && (
            <div className="space-y-2 p-4 rounded-lg bg-muted/50">
              {profile.profession_title && (
                <div className="flex items-start gap-2 text-sm text-foreground">
                  <Briefcase className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <div>
                    <p>
                      {descreverProfissao(profile.profession_title, profile.profession_status)}
                      {profile.experience_range && (
                        <span className="text-muted-foreground">
                          {' · '}{EXPERIENCE_RANGE_LABELS[profile.experience_range].toLowerCase()}
                        </span>
                      )}
                    </p>
                    {guiaSlug && (
                      <Link href={`/profissoes/${guiaSlug}`} className="text-xs text-primary hover:underline">
                        Conheça essa profissão no guia
                      </Link>
                    )}
                  </div>
                </div>
              )}
              {profile.education_level && (
                <div className="flex items-start gap-2 text-sm text-foreground">
                  <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <p>{descreverFormacao(profile)}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Informações declaradas pela pessoa, não verificadas pelo INOVA.
              </p>
            </div>
          )}

          {profile.bio && (
            <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
          )}

          {profile.contact && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 shrink-0" />
              <span>{profile.contact}</span>
            </div>
          )}

          {profile.created_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                Membro desde{' '}
                {new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}

          <div className="pt-4 border-t border-border space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Depoimentos{depoimentos && depoimentos.length > 0 ? ` (${depoimentos.length})` : ''}
            </h4>
            {depoimentos === null ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : depoimentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum depoimento publicado.</p>
            ) : (
              depoimentos.map((d) => (
                <div key={d.id} className="p-3 rounded-lg border border-border space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    {descreverProfissao(d.profession, d.profession_status)}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed line-clamp-4">{d.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {d.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {d.comments_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(d.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
