"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import type { Experience, ForumTopic, Profile, RIASECType, CommunityTab } from '@/lib/types'
import { RIASEC_INFO } from '@/lib/types'
import { 
  MessageSquare, 
  Users, 
  Award,
  Heart,
  Clock,
  Filter,
  Plus,
  Send,
  ChevronRight,
  BadgeCheck,
  MessageCircle,
  Eye,
  Loader2,
  X
} from 'lucide-react'

const tabs: { id: CommunityTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'experiences', label: 'Depoimentos', icon: MessageSquare },
  { id: 'forum', label: 'Fórum', icon: MessageCircle },
  { id: 'specialists', label: 'Especialistas', icon: Award },
]

export function CommunitySection() {
  const [activeTab, setActiveTab] = useState<CommunityTab>('experiences')
  const [typeFilter, setTypeFilter] = useState<RIASECType | 'all'>('all')

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
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                activeTab === tab.id
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

      {/* Filter by RIASEC type */}
      {activeTab !== 'specialists' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              typeFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </button>
          {(Object.keys(RIASEC_INFO) as RIASECType[]).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                typeFilter === type
                  ? 'text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
              style={typeFilter === type ? { backgroundColor: RIASEC_INFO[type].cor } : {}}
            >
              {RIASEC_INFO[type].nome}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'experiences' && <ExperiencesTab typeFilter={typeFilter} />}
      {activeTab === 'forum' && <ForumTab typeFilter={typeFilter} />}
      {activeTab === 'specialists' && <SpecialistsTab />}
    </div>
  )
}

// Experiences Tab Component
function ExperiencesTab({ typeFilter }: { typeFilter: RIASECType | 'all' }) {
  const { user, awardBadge } = useAuth()
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const fetchExperiences = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('experiences')
      .select('*, profiles(display_name, avatar_url, is_specialist)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (typeFilter !== 'all') {
      query = query.eq('riasec_type', typeFilter)
    }

    const { data } = await query
    setExperiences((data as Experience[]) || [])
    setLoading(false)
  }, [supabase, typeFilter])

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

    const isLiked = likedIds.has(experienceId)
    
    if (isLiked) {
      await supabase
        .from('experience_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('experience_id', experienceId)
      
      setLikedIds(prev => {
        const next = new Set(prev)
        next.delete(experienceId)
        return next
      })
      setExperiences(prev => 
        prev.map(e => e.id === experienceId ? { ...e, likes_count: e.likes_count - 1 } : e)
      )
    } else {
      await supabase
        .from('experience_likes')
        .insert({ user_id: user.id, experience_id: experienceId })
      
      setLikedIds(prev => new Set(prev).add(experienceId))
      setExperiences(prev => 
        prev.map(e => e.id === experienceId ? { ...e, likes_count: e.likes_count + 1 } : e)
      )
    }
  }

  const handleSubmitExperience = async (data: {
    profession: string
    riasec_type: RIASECType
    content: string
  }) => {
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    await supabase.from('experiences').insert({
      user_id: user.id,
      author_name: profile?.display_name || 'Usuário',
      profession: data.profession,
      riasec_type: data.riasec_type,
      content: data.content,
      status: 'pending'
    })

    // Award badge for first experience
    const { count } = await supabase
      .from('experiences')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count === 1) {
      await awardBadge('first_experience')
    }

    setShowForm(false)
    fetchExperiences()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

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

      {/* Experiences List */}
      {experiences.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum depoimento encontrado.</p>
          <p className="text-sm mt-1">Seja o primeiro a compartilhar!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {experiences.map((exp) => (
            <ExperienceCard 
              key={exp.id} 
              experience={exp}
              isLiked={likedIds.has(exp.id)}
              onToggleLike={() => toggleLike(exp.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ExperienceCard({ 
  experience, 
  isLiked, 
  onToggleLike 
}: { 
  experience: Experience
  isLiked: boolean
  onToggleLike: () => void
}) {
  const typeInfo = RIASEC_INFO[experience.riasec_type]

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: typeInfo.cor }}
          >
            {experience.author_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">{experience.author_name}</p>
              {experience.profiles?.is_specialist && (
                <BadgeCheck className="w-4 h-4 text-secondary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{experience.profession}</p>
          </div>
        </div>
        <span 
          className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: typeInfo.cor }}
        >
          {typeInfo.nome}
        </span>
      </div>

      {/* Content */}
      <p className="text-foreground leading-relaxed">{experience.content}</p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <button
          onClick={onToggleLike}
          className={`flex items-center gap-2 text-sm transition-colors ${
            isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          <span>{experience.likes_count}</span>
        </button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{new Date(experience.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  )
}

function ExperienceFormModal({
  onClose,
  onSubmit
}: {
  onClose: () => void
  onSubmit: (data: { profession: string; riasec_type: RIASECType; content: string }) => void
}) {
  const [profession, setProfession] = useState('')
  const [riasecType, setRiasecType] = useState<RIASECType>('R')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profession.trim() || !content.trim()) return
    
    setSubmitting(true)
    await onSubmit({ profession, riasec_type: riasecType, content })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Compartilhar Experiência</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Sua profissão
            </label>
            <input
              type="text"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="Ex: Engenheiro de Software"
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tipo RIASEC mais relacionado
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(RIASEC_INFO) as RIASECType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRiasecType(type)}
                  className={`p-2 rounded-lg text-sm font-medium transition-all ${
                    riasecType === type
                      ? 'text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                  style={riasecType === type ? { backgroundColor: RIASEC_INFO[type].cor } : {}}
                >
                  {RIASEC_INFO[type].nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Sua experiência
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Conte sobre sua trajetória, desafios e conquistas..."
              rows={5}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground resize-none"
              required
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
            <p>Seu depoimento será revisado antes de ser publicado.</p>
          </div>

          <button
            type="submit"
            disabled={submitting || !profession.trim() || !content.trim()}
            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar depoimento
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// Forum Tab Component
function ForumTab({ typeFilter }: { typeFilter: RIASECType | 'all' }) {
  const { user, awardBadge } = useAuth()
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null)
  const supabase = createClient()

  const fetchTopics = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('forum_topics')
      .select('*, profiles(display_name, avatar_url, is_specialist)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (typeFilter !== 'all') {
      query = query.eq('riasec_type', typeFilter)
    }

    const { data } = await query
    setTopics((data as ForumTopic[]) || [])
    setLoading(false)
  }, [supabase, typeFilter])

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  const handleCreateTopic = async (data: { title: string; content: string; riasec_type: RIASECType | null }) => {
    if (!user) return

    await supabase.from('forum_topics').insert({
      user_id: user.id,
      title: data.title,
      content: data.content,
      riasec_type: data.riasec_type
    })

    // Award badge for first topic
    const { count } = await supabase
      .from('forum_topics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count === 1) {
      await awardBadge('first_topic')
    }

    setShowForm(false)
    fetchTopics()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (selectedTopic) {
    return (
      <TopicDetail 
        topic={selectedTopic} 
        onBack={() => {
          setSelectedTopic(null)
          fetchTopics()
        }} 
      />
    )
  }

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

      {/* Topics List */}
      {topics.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum tópico encontrado.</p>
          <p className="text-sm mt-1">Seja o primeiro a perguntar!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <TopicCard 
              key={topic.id} 
              topic={topic}
              onClick={() => setSelectedTopic(topic)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TopicCard({ topic, onClick }: { topic: ForumTopic; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl border border-border p-4 text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {topic.is_pinned && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs font-medium rounded">
                Fixado
              </span>
            )}
            {topic.riasec_type && (
              <span 
                className="px-2 py-0.5 text-xs font-medium rounded text-white"
                style={{ backgroundColor: RIASEC_INFO[topic.riasec_type].cor }}
              >
                {RIASEC_INFO[topic.riasec_type].nome}
              </span>
            )}
          </div>
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
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
    </button>
  )
}

function TopicFormModal({
  onClose,
  onSubmit
}: {
  onClose: () => void
  onSubmit: (data: { title: string; content: string; riasec_type: RIASECType | null }) => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [riasecType, setRiasecType] = useState<RIASECType | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    
    setSubmitting(true)
    await onSubmit({ title, content, riasec_type: riasecType })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Novo Tópico</h2>
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
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Categoria RIASEC <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRiasecType(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  riasecType === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                Geral
              </button>
              {(Object.keys(RIASEC_INFO) as RIASECType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRiasecType(type)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    riasecType === type
                      ? 'text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  style={riasecType === type ? { backgroundColor: RIASEC_INFO[type].cor } : {}}
                >
                  {RIASEC_INFO[type].nome}
                </button>
              ))}
            </div>
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
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Publicar pergunta
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function TopicDetail({ topic, onBack }: { topic: ForumTopic; onBack: () => void }) {
  const { user, profile, awardBadge } = useAuth()
  const [replies, setReplies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchReplies = async () => {
      const { data } = await supabase
        .from('forum_replies')
        .select('*, profiles(display_name, avatar_url, is_specialist, specialist_area)')
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: true })

      setReplies(data || [])
      setLoading(false)

      // Increment view count
      await supabase
        .from('forum_topics')
        .update({ views_count: topic.views_count + 1 })
        .eq('id', topic.id)
    }

    fetchReplies()
  }, [supabase, topic.id, topic.views_count])

  const handleSubmitReply = async () => {
    if (!user || !replyContent.trim()) return

    setSubmitting(true)
    await supabase.from('forum_replies').insert({
      topic_id: topic.id,
      user_id: user.id,
      content: replyContent,
      is_specialist_answer: profile?.is_specialist || false
    })

    // Award badge for first reply
    const { count } = await supabase
      .from('forum_replies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count === 1) {
      await awardBadge('first_reply')
    }

    setReplyContent('')
    setSubmitting(false)

    // Refresh replies
    const { data } = await supabase
      .from('forum_replies')
      .select('*, profiles(display_name, avatar_url, is_specialist, specialist_area)')
      .eq('topic_id', topic.id)
      .order('created_at', { ascending: true })

    setReplies(data || [])
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Voltar para o fórum
      </button>

      {/* Topic */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          {topic.riasec_type && (
            <span 
              className="px-2.5 py-1 text-xs font-medium rounded text-white"
              style={{ backgroundColor: RIASEC_INFO[topic.riasec_type].cor }}
            >
              {RIASEC_INFO[topic.riasec_type].nome}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-foreground mb-3">{topic.title}</h1>
        <p className="text-foreground leading-relaxed">{topic.content}</p>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
          <span>Por {topic.profiles?.display_name || 'Usuário'}</span>
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
          replies.map((reply) => (
            <div key={reply.id} className={`bg-card rounded-xl border p-5 ${
              reply.is_specialist_answer ? 'border-secondary' : 'border-border'
            }`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {reply.profiles?.display_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {reply.profiles?.display_name || 'Usuário'}
                    </span>
                    {reply.is_specialist_answer && (
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
              </div>
              <p className="text-foreground leading-relaxed">{reply.content}</p>
            </div>
          ))
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
            className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground resize-none mb-3"
          />
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
    </div>
  )
}

// Specialists Tab Component
function SpecialistsTab() {
  const { user, profile, updateProfile } = useAuth()
  const [specialists, setSpecialists] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchSpecialists = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_specialist', true)
        .eq('specialist_status', 'approved')
        .order('display_name')

      setSpecialists((data as Profile[]) || [])
      setLoading(false)
    }

    fetchSpecialists()
  }, [supabase])

  const handleRequestSpecialist = async (area: string) => {
    if (!user) return

    await updateProfile({
      specialist_status: 'pending',
      specialist_area: area
    })

    setShowRequestForm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Become Specialist CTA */}
      {profile && !profile.is_specialist && profile.specialist_status === 'none' && (
        <div className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                Torne-se um Especialista Verificado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Compartilhe sua expertise e ajude estudantes com dúvidas sobre sua área profissional.
              </p>
              <button
                onClick={() => setShowRequestForm(true)}
                className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Solicitar verificação
              </button>
            </div>
          </div>
        </div>
      )}

      {profile?.specialist_status === 'pending' && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
          <p className="text-sm text-accent font-medium">
            Sua solicitação de especialista está em análise. Você será notificado quando for aprovada.
          </p>
        </div>
      )}

      {/* Specialist Request Form Modal */}
      {showRequestForm && (
        <SpecialistRequestModal 
          onClose={() => setShowRequestForm(false)}
          onSubmit={handleRequestSpecialist}
        />
      )}

      {/* Specialists List */}
      {specialists.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum especialista verificado ainda.</p>
          <p className="text-sm mt-1">Seja o primeiro!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {specialists.map((specialist) => (
            <div
              key={specialist.id}
              className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold">
                  {specialist.display_name.charAt(0).toUpperCase()}
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SpecialistRequestModal({
  onClose,
  onSubmit
}: {
  onClose: () => void
  onSubmit: (area: string) => void
}) {
  const [area, setArea] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!area.trim()) return
    
    setSubmitting(true)
    await onSubmit(area)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Solicitar Verificação</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Informe sua área de atuação profissional. Nossa equipe irá analisar sua solicitação.
          </p>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Área de especialidade
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Ex: Engenharia de Software, Medicina, Direito..."
              className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !area.trim()}
            className="w-full py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar solicitação'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
