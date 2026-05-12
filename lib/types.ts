export type RIASECType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'

// Database types matching Supabase schema
export interface Profile {
  id: string
  display_name: string
  email: string
  birth_date: string | null
  user_type: 'estudante' | 'profissional' | 'ambos'
  avatar_url: string | null
  is_specialist: boolean
  specialist_status: 'none' | 'pending' | 'approved' | 'rejected'
  specialist_area: string | null
  is_admin: boolean
  lgpd_consent: boolean
  lgpd_consent_date: string | null
  last_type_change: string | null
  created_at: string
  updated_at: string
}

export interface TestResult {
  id: string
  user_id: string
  scores: Record<RIASECType, number>
  primary_type: RIASECType
  secondary_type: RIASECType | null
  tertiary_type: RIASECType | null
  answers: number[] | null
  created_at: string
}

export interface Experience {
  id: string
  user_id: string
  author_name: string
  profession: string
  riasec_type: RIASECType
  content: string
  video_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  is_featured: boolean
  likes_count: number
  created_at: string
  updated_at: string
  // Joined fields
  profiles?: Profile
}

export interface ForumTopic {
  id: string
  user_id: string
  title: string
  content: string
  riasec_type: RIASECType | null
  is_pinned: boolean
  is_closed: boolean
  views_count: number
  replies_count: number
  created_at: string
  updated_at: string
  // Joined fields
  profiles?: Profile
}

export interface ForumReply {
  id: string
  topic_id: string
  user_id: string
  content: string
  is_specialist_answer: boolean
  likes_count: number
  created_at: string
  updated_at: string
  // Joined fields
  profiles?: Profile
}

export interface Badge {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: 'onboarding' | 'test' | 'community' | 'engagement'
  points: number
  created_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  // Joined fields
  badges?: Badge
}

// Legacy types for compatibility
export interface UserProfile {
  userId: string
  displayName: string
  userType: 'estudante' | 'profissional' | 'ambos'
  dataCadastro: string
  ultimoTeste: RIASECResult | null
  historicoTestes: RIASECResult[]
}

export interface RIASECResult {
  id: string
  data: string
  pontuacoes: Record<RIASECType, number>
  topTipos: RIASECType[]
}

export interface Profissao {
  id: string
  nome: string
  tipo: RIASECType
  salario: string
  descricao: string
  areas: string[]
}

export interface FormaIngresso {
  id: string
  nome: string
  sigla: string
  descricao: string
  publicoAlvo: string
  requisitos: string[]
  link: string
}

export interface Universidade {
  id: string
  nome: string
  sigla: string
  cidade: string
  cursos: string[]
  formasIngresso: string[]
  link: string
}

export interface Depoimento {
  id: string
  profissao: string
  autor: string
  tempoExperiencia: string
  tipoRIASEC: RIASECType
  depoimento: string
  conselho: string
  diaTipico?: string
  melhorParte?: string
  piorParte?: string
  tags: string[]
  status: 'pendente' | 'aprovado'
  dataEnvio: string
}

export interface RIASECQuestion {
  id: number
  tipo: RIASECType
  texto: string
}

export const RIASEC_INFO: Record<RIASECType, { nome: string; descricao: string; cor: string }> = {
  R: {
    nome: 'Realista',
    descricao: 'Prefere trabalhar com ferramentas, máquinas e coisas práticas',
    cor: '#EF4444'
  },
  I: {
    nome: 'Investigativo',
    descricao: 'Gosta de pesquisar, analisar e resolver problemas complexos',
    cor: '#3B82F6'
  },
  A: {
    nome: 'Artístico',
    descricao: 'Valoriza a criatividade, expressão e originalidade',
    cor: '#8B5CF6'
  },
  S: {
    nome: 'Social',
    descricao: 'Gosta de ajudar, ensinar e trabalhar com pessoas',
    cor: '#10B981'
  },
  E: {
    nome: 'Empreendedor',
    descricao: 'Gosta de liderar, persuadir e alcançar metas',
    cor: '#F59E0B'
  },
  C: {
    nome: 'Convencional',
    descricao: 'Prefere organização, detalhes e procedimentos claros',
    cor: '#6366F1'
  }
}

// Community section tabs
export type CommunityTab = 'experiences' | 'forum' | 'specialists'
