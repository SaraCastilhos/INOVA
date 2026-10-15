'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PROFISSOES, FORMAS_INGRESSO, UNIVERSIDADES, AREAS, guiaAtualizadoEm } from '@/lib/data'
import { RIASEC_INFO, type RIASECType } from '@/lib/types'
import { fmtBRL, fmtData } from '@/lib/format'
import {
  Briefcase,
  GraduationCap,
  Building2,
  ExternalLink,
  MapPin,
  Filter,
  X,
  Search,
  ArrowRight,
  CalendarClock,
  Lock,
} from 'lucide-react'

type Tab = 'profissoes' | 'ingresso' | 'universidades'

// Estado da aba Carreiras guardado na sessão do navegador (sessionStorage):
// sobrevive à ida e volta da página de uma profissão e à troca de aba do menu,
// e some ao fechar a aba do navegador. Valores salvos são validados ao ler —
// um valor antigo/inválido volta ao padrão em vez de quebrar a tela.
type GuiaState = { tab: Tab; tipo: RIASECType | 'todos'; area: string; busca: string }
const VALID_TABS: Tab[] = ['profissoes', 'ingresso', 'universidades']
const RIASEC_TYPES = Object.keys(RIASEC_INFO) as RIASECType[]
const SCROLL_KEY = 'inova:guia:scroll'

function readGuiaState(key: string): Partial<GuiaState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return {}
    const s = JSON.parse(raw)
    return {
      tab: VALID_TABS.includes(s.tab) ? s.tab : undefined,
      tipo: s.tipo === 'todos' || RIASEC_TYPES.includes(s.tipo) ? s.tipo : undefined,
      area: s.area === 'todas' || (AREAS as string[]).includes(s.area) ? s.area : undefined,
      busca: typeof s.busca === 'string' ? s.busca.slice(0, 200) : undefined,
    }
  } catch {
    return {}
  }
}

export function CareersSection() {
  const { user, testResults } = useAuth()
  const lastTest = testResults?.[0]
  const jaFezTeste = Boolean(lastTest)

  // Uma chave por usuário: outra conta logada na mesma aba não herda os filtros.
  const storageKey = `inova:guia:${user?.id ?? 'anon'}`
  const [saved] = useState(() => readGuiaState(storageKey))
  const [activeTab, setActiveTab] = useState<Tab>(saved.tab ?? 'profissoes')
  // Filtro RIASEC só vale para quem já fez o teste (RN04).
  const [selectedFilter, setSelectedFilter] = useState<RIASECType | 'todos'>(
    jaFezTeste ? saved.tipo ?? 'todos' : 'todos'
  )
  const [areaFilter, setAreaFilter] = useState<string>(saved.area ?? 'todas')
  const [searchQuery, setSearchQuery] = useState(saved.busca ?? '')

  useEffect(() => {
    try {
      const state: GuiaState = { tab: activeTab, tipo: selectedFilter, area: areaFilter, busca: searchQuery }
      window.sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // sessionStorage indisponível (modo privado restrito etc.): só não lembra.
    }
  }, [storageKey, activeTab, selectedFilter, areaFilter, searchQuery])

  // Ao voltar da página de uma profissão, retoma a rolagem de onde a pessoa
  // clicou no card (a posição é guardada no clique, ver saveScroll).
  useEffect(() => {
    try {
      const y = window.sessionStorage.getItem(SCROLL_KEY)
      if (y === null) return
      window.sessionStorage.removeItem(SCROLL_KEY)
      requestAnimationFrame(() => window.scrollTo(0, Number(y) || 0))
    } catch {
      // idem acima
    }
  }, [])

  const saveScroll = () => {
    try {
      window.sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
    } catch {
      // idem acima
    }
  }
  const userTopTypes: RIASECType[] = lastTest
    ? ([lastTest.primary_type, lastTest.secondary_type, lastTest.tertiary_type].filter(Boolean) as RIASECType[])
    : []

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profissoes', label: 'Profissões', icon: <Briefcase className="h-4 w-4" /> },
    { id: 'ingresso', label: 'Formas de Ingresso', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'universidades', label: 'Universidades', icon: <Building2 className="h-4 w-4" /> },
  ]

  const hasActiveFilters = selectedFilter !== 'todos' || areaFilter !== 'todas' || searchQuery.trim() !== ''

  const clearFilters = () => {
    setSelectedFilter('todos')
    setAreaFilter('todas')
    setSearchQuery('')
  }

  const filteredProfissoes = PROFISSOES.filter((p) => {
    const matchesTipo = selectedFilter === 'todos' || p.riasec_primary === selectedFilter
    const matchesArea = areaFilter === 'todas' || p.area === areaFilter
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !query ||
      p.nome.toLowerCase().includes(query) ||
      p.descricao.toLowerCase().includes(query) ||
      p.area.toLowerCase().includes(query) ||
      p.atividades.some((a) => a.toLowerCase().includes(query))
    return matchesTipo && matchesArea && matchesSearch
  })

  return (
    <div className="space-y-6 section-enter">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            className={`flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Profissões Tab */}
      {activeTab === 'profissoes' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por profissão, descrição ou atividade..."
              className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Filter */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Filtrar por tipo RIASEC:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedFilter('todos')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedFilter === 'todos' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      Todos
                    </button>
                    {(Object.keys(RIASEC_INFO) as RIASECType[]).map((tipo) => {
                      const isUserType = userTopTypes.includes(tipo)
                      return (
                        <button
                          key={tipo}
                          onClick={() => jaFezTeste && setSelectedFilter(tipo)}
                          disabled={!jaFezTeste}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                            !jaFezTeste
                              ? 'opacity-40 cursor-not-allowed'
                              : selectedFilter === tipo
                                ? 'text-white'
                                : isUserType
                                  ? 'ring-2 ring-offset-2'
                                  : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: selectedFilter === tipo ? RIASEC_INFO[tipo].cor : `${RIASEC_INFO[tipo].cor}30`,
                            color: selectedFilter === tipo ? 'white' : RIASEC_INFO[tipo].cor,
                          }}
                        >
                          {tipo}
                          {isUserType && <span className="text-xs">(seu perfil)</span>}
                        </button>
                      )
                    })}
                  </div>
                  {!jaFezTeste && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                      <Lock className="h-3 w-3" />
                      Faça o teste vocacional para filtrar por compatibilidade com o seu perfil.
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Área de atuação:</span>
                  </div>
                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue placeholder="Todas as áreas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as áreas</SelectItem>
                      {AREAS.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Limpar filtros
                </button>
              )}
            </CardContent>
          </Card>

          {/* Professions List */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProfissoes.map((profissao) => (
              <Link
                key={profissao.slug}
                href={`/profissoes/${profissao.slug}`}
                onClick={saveScroll}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Card className="card-hover h-full">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{profissao.nome}</h3>
                        <p className="text-xs text-muted-foreground">{profissao.area}</p>
                      </div>
                      <div
                        className="shrink-0 px-2 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: RIASEC_INFO[profissao.riasec_primary].cor }}
                        title={`Perfil RIASEC: ${profissao.riasec_code}`}
                      >
                        {profissao.riasec_code}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">{profissao.descricao}</p>

                    <p className="text-sm font-medium text-secondary">
                      {fmtBRL(profissao.salario.media)}
                      <span className="text-xs text-muted-foreground font-normal"> média</span>
                    </p>

                    <span className="inline-flex items-center gap-1 text-sm text-primary">
                      Ver detalhes
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filteredProfissoes.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Nenhuma profissão encontrada {searchQuery.trim() ? `para "${searchQuery}"` : 'para este filtro'}.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Footer: rastreabilidade (RN07) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              {guiaAtualizadoEm
                ? `Guia atualizado em ${fmtData(guiaAtualizadoEm)}`
                : 'Guia em construção'}
            </span>
            <Link href="/metodologia" className="text-primary hover:underline">
              Metodologia e fontes
            </Link>
          </div>
        </div>
      )}

      {/* Formas de Ingresso Tab */}
      {activeTab === 'ingresso' && (
        <div className="space-y-4">
          {FORMAS_INGRESSO.map((forma) => (
            <Card key={forma.id} className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-foreground">{forma.nome}</CardTitle>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary mt-1">
                      {forma.sigla}
                    </span>
                  </div>
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{forma.descricao}</p>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Público-alvo:</h4>
                  <p className="text-sm text-muted-foreground">{forma.publicoAlvo}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Requisitos:</h4>
                  <ul className="space-y-1">
                    {forma.requisitos.map((req, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">-</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                {forma.link !== '#' && (
                  <a href={forma.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    Saiba mais
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Universidades Tab */}
      {activeTab === 'universidades' && (
        <div className="space-y-4">
          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-secondary">
                <MapPin className="h-5 w-5" />
                <span className="font-medium">Foco regional: Vale do Paranhana/RS</span>
              </div>
            </CardContent>
          </Card>

          {UNIVERSIDADES.map((uni) => (
            <Card key={uni.id} className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-foreground">{uni.nome}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <span className="font-bold text-primary">{uni.sigla}</span>
                      <span>-</span>
                      <span>{uni.cidade}</span>
                    </CardDescription>
                  </div>
                  <Building2 className="h-6 w-6 text-secondary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Cursos em destaque:</h4>
                  <div className="flex flex-wrap gap-2">
                    {uni.cursos.map((curso) => (
                      <span key={curso} className="px-2 py-1 rounded-lg text-xs bg-secondary/10 text-secondary font-medium">
                        {curso}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Formas de ingresso:</h4>
                  <div className="flex flex-wrap gap-2">
                    {uni.formasIngresso.map((forma) => (
                      <span key={forma} className="px-2 py-1 rounded-lg text-xs bg-primary/10 text-primary font-medium">
                        {forma}
                      </span>
                    ))}
                  </div>
                </div>
                <a href={uni.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  Visitar site
                  <ExternalLink className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
