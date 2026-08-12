'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PROFISSOES, FORMAS_INGRESSO, UNIVERSIDADES } from '@/lib/data'
import { RIASEC_INFO, type RIASECType } from '@/lib/types'
import { Briefcase, GraduationCap, Building2, ExternalLink, MapPin, Filter, X, Search } from 'lucide-react'

type Tab = 'profissoes' | 'ingresso' | 'universidades'

const TODAS_AREAS = Array.from(new Set(PROFISSOES.flatMap((p) => p.areas))).sort()

export function CareersSection() {
  const { testResults } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('profissoes')
  const [selectedFilter, setSelectedFilter] = useState<RIASECType | 'todos'>('todos')
  const [areaFilter, setAreaFilter] = useState<string>('todas')
  const [searchQuery, setSearchQuery] = useState('')

  const lastTest = testResults?.[0]
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
    const matchesTipo = selectedFilter === 'todos' || p.tipo === selectedFilter
    const matchesArea = areaFilter === 'todas' || p.areas.includes(areaFilter)
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !query ||
      p.nome.toLowerCase().includes(query) ||
      p.descricao.toLowerCase().includes(query) ||
      p.areas.some((area) => area.toLowerCase().includes(query))
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
              placeholder="Buscar por profissão, descrição ou área..."
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
                          onClick={() => setSelectedFilter(tipo)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                            selectedFilter === tipo ? 'text-white' : isUserType ? 'ring-2 ring-offset-2' : 'opacity-70 hover:opacity-100'
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
                </div>

                <div className="w-full sm:w-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Área de atuação:</span>
                  </div>
                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger className="w-full sm:w-48 capitalize">
                      <SelectValue placeholder="Todas as áreas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as áreas</SelectItem>
                      {TODAS_AREAS.map((area) => (
                        <SelectItem key={area} value={area} className="capitalize">
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
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredProfissoes.map((profissao) => (
              <Card key={profissao.id} className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{profissao.nome}</h3>
                      <p className="text-sm text-secondary font-medium">{profissao.salario}</p>
                    </div>
                    <div
                      className="px-2 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: RIASEC_INFO[profissao.tipo].cor }}
                    >
                      {profissao.tipo}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{profissao.descricao}</p>
                  <div className="flex flex-wrap gap-1">
                    {profissao.areas.map((area) => (
                      <span key={area} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                        {area}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
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