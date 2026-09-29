export type RIASECType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'

// Database types matching Supabase schema
export interface Profile {
  id: string
  display_name: string
  email: string
  birth_date: string | null
  user_type: 'estudante' | 'profissional' | 'ambos'
  avatar_url: string | null
  bio: string | null
  contact: string | null
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
  riasec_type: RIASECType | null
  content: string
  video_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  is_featured: boolean
  is_closed: boolean
  likes_count: number
  comments_count: number
  created_at: string
  updated_at: string
  // Joined fields
  profiles?: Profile
}

export interface ExperienceComment {
  id: string
  experience_id: string
  user_id: string
  content: string
  created_at: string
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
  likes_count: number
  created_at: string
  updated_at: string
  // Joined fields
  profiles?: Profile
}

export type ReportableContentType =
  | 'experience'
  | 'experience_comment'
  | 'forum_topic'
  | 'forum_reply'

export interface ContentReport {
  id: string
  reporter_id: string
  content_type: ReportableContentType
  content_id: string
  reason: string | null
  status: 'open' | 'reviewed' | 'dismissed'
  created_at: string
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

// Áreas de atuação do guia de profissões — taxonomia fechada (alinhada às
// grandes áreas OCDE/CINE usadas pelo MEC). Um valor por profissão.
export const AREAS_PROFISSIONAIS = [
  'Agrárias e Meio Ambiente',
  'Artes, Design e Cultura',
  'Ciências Biológicas',
  'Ciências Exatas e da Terra',
  'Comunicação e Informação',
  'Construção e Infraestrutura',
  'Educação',
  'Gestão e Negócios',
  'Indústria e Produção',
  'Saúde e Bem-estar',
  'Serviços Sociais e Jurídicos',
  'Tecnologia da Informação',
] as const

export type AreaProfissional = (typeof AREAS_PROFISSIONAIS)[number]

export type FormacaoRequerida =
  | 'fundamental'
  | 'medio'
  | 'tecnico'
  | 'superior'
  | 'superior-conselho'

export const FORMACAO_LABELS: Record<FormacaoRequerida, string> = {
  fundamental: 'Ensino fundamental',
  medio: 'Ensino médio',
  tecnico: 'Curso técnico',
  superior: 'Ensino superior',
  'superior-conselho': 'Ensino superior + registro em conselho',
}

// Referência de onde um dado foi extraído. Toda profissão publicada precisa
// de pelo menos uma. `acesso_em` é a data em que a fonte foi consultada.
export interface FonteReferencia {
  titulo: string
  url: string
  acesso_em: string // AAAA-MM-DD
}

export interface SalarioInfo {
  media: number // salário médio mensal (a fonte publica "salário médio")
  p25: number // 1º quartil
  p75: number // 3º quartil
  moeda: 'BRL'
  fonte: string
  referencia: string // ex.: "2025-08/2026-07"
}

export interface Profissao {
  slug: string
  nome: string
  cbo_code: string // ex.: "2124-05"
  area: AreaProfissional
  descricao: string
  atividades: string[]
  habilidades: string[]
  formacao_requerida: FormacaoRequerida
  regulamentada: boolean
  conselho: string | null
  riasec_code: string // 1 a 3 letras RIASEC, ex.: "IC" (fonte: O*NET)
  riasec_primary: RIASECType // = riasec_code[0]; mantém o filtro atual
  salario: SalarioInfo
  fontes: FonteReferencia[]
  status: 'rascunho' | 'publicado'
  atualizado_em: string // AAAA-MM-DD
  revisado_por: string
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
