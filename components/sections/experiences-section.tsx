'use client'

import { useState } from 'react'
import { useUser } from '@/contexts/user-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RIASEC_INFO, type RIASECType, type Depoimento } from '@/lib/types'
import { MessageSquare, Plus, Filter, Clock, ChevronDown, ChevronUp, Send, CheckCircle, X } from 'lucide-react'

export function ExperiencesSection() {
  const { user, depoimentos, addDepoimento } = useUser()
  const [selectedFilter, setSelectedFilter] = useState<RIASECType | 'todos'>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formSubmitted, setFormSubmitted] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    profissao: '',
    tempoExperiencia: '',
    tipoRIASEC: 'S' as RIASECType,
    depoimento: '',
    conselho: '',
    diaTipico: '',
    melhorParte: '',
    piorParte: '',
    tags: ''
  })

  const approvedDepoimentos = depoimentos.filter(d => d.status === 'aprovado')

  const filteredDepoimentos = approvedDepoimentos.filter(d => {
    const matchesFilter = selectedFilter === 'todos' || d.tipoRIASEC === selectedFilter
    const matchesSearch = searchTerm === '' || 
      d.profissao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.depoimento.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.profissao.length < 3 || formData.depoimento.length < 100 || formData.conselho.length < 10) {
      return
    }

    addDepoimento({
      profissao: formData.profissao,
      tempoExperiencia: formData.tempoExperiencia,
      tipoRIASEC: formData.tipoRIASEC,
      depoimento: formData.depoimento,
      conselho: formData.conselho,
      diaTipico: formData.diaTipico || undefined,
      melhorParte: formData.melhorParte || undefined,
      piorParte: formData.piorParte || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
    })

    setFormSubmitted(true)
    setFormData({
      profissao: '',
      tempoExperiencia: '',
      tipoRIASEC: 'S',
      depoimento: '',
      conselho: '',
      diaTipico: '',
      melhorParte: '',
      piorParte: '',
      tags: ''
    })

    setTimeout(() => {
      setFormSubmitted(false)
      setShowForm(false)
    }, 3000)
  }

  return (
    <div className="space-y-6 section-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Experiências Reais</h2>
          <p className="text-sm text-muted-foreground">
            Depoimentos de profissionais sobre suas carreiras
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? 'Cancelar' : 'Compartilhar'}
        </Button>
      </div>

      {/* Submit Form */}
      {showForm && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Compartilhe sua experiência</CardTitle>
            <CardDescription>
              Ajude outros a conhecerem sua profissão. Seu depoimento passará por análise antes de ser publicado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formSubmitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Obrigado por contribuir!</h3>
                  <p className="text-sm text-muted-foreground">
                    Seu depoimento foi enviado e passará por análise.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Profissão *</label>
                    <Input
                      value={formData.profissao}
                      onChange={(e) => setFormData(prev => ({ ...prev, profissao: e.target.value }))}
                      placeholder="Ex: Engenheiro de Software"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Tempo de experiência *</label>
                    <Input
                      value={formData.tempoExperiencia}
                      onChange={(e) => setFormData(prev => ({ ...prev, tempoExperiencia: e.target.value }))}
                      placeholder="Ex: 5 anos"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tipo RIASEC predominante *</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(RIASEC_INFO) as RIASECType[]).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, tipoRIASEC: tipo }))}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          formData.tipoRIASEC === tipo
                            ? 'text-white'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: formData.tipoRIASEC === tipo ? RIASEC_INFO[tipo].cor : `${RIASEC_INFO[tipo].cor}30`,
                          color: formData.tipoRIASEC === tipo ? 'white' : RIASEC_INFO[tipo].cor
                        }}
                      >
                        {tipo} - {RIASEC_INFO[tipo].nome}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Seu depoimento * <span className="text-muted-foreground font-normal">(mínimo 100 caracteres)</span>
                  </label>
                  <textarea
                    value={formData.depoimento}
                    onChange={(e) => setFormData(prev => ({ ...prev, depoimento: e.target.value }))}
                    placeholder="Conte sobre sua experiência na profissão, os desafios e aprendizados..."
                    className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.depoimento.length}/100 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Conselho para quem está começando *</label>
                  <textarea
                    value={formData.conselho}
                    onChange={(e) => setFormData(prev => ({ ...prev, conselho: e.target.value }))}
                    placeholder="Que conselho você daria para quem está pensando em seguir essa carreira?"
                    className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>

                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium text-foreground">Campos opcionais:</p>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Como é um dia típico?</label>
                    <Input
                      value={formData.diaTipico}
                      onChange={(e) => setFormData(prev => ({ ...prev, diaTipico: e.target.value }))}
                      placeholder="Descreva brevemente sua rotina de trabalho"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Melhor parte da profissão</label>
                      <Input
                        value={formData.melhorParte}
                        onChange={(e) => setFormData(prev => ({ ...prev, melhorParte: e.target.value }))}
                        placeholder="O que você mais gosta?"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Desafio da profissão</label>
                      <Input
                        value={formData.piorParte}
                        onChange={(e) => setFormData(prev => ({ ...prev, piorParte: e.target.value }))}
                        placeholder="O que é mais difícil?"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Tags (separadas por vírgula)</label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="Ex: tecnologia, remoto, criatividade"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  disabled={formData.profissao.length < 3 || formData.depoimento.length < 100 || formData.conselho.length < 10}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Depoimento
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por profissão ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFilter('todos')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedFilter === 'todos'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Todos ({approvedDepoimentos.length})
            </button>
            {(Object.keys(RIASEC_INFO) as RIASECType[]).map((tipo) => {
              const count = approvedDepoimentos.filter(d => d.tipoRIASEC === tipo).length
              return (
                <button
                  key={tipo}
                  onClick={() => setSelectedFilter(tipo)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedFilter === tipo
                      ? 'text-white'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: selectedFilter === tipo ? RIASEC_INFO[tipo].cor : `${RIASEC_INFO[tipo].cor}30`,
                    color: selectedFilter === tipo ? 'white' : RIASEC_INFO[tipo].cor
                  }}
                >
                  {tipo} ({count})
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Depoimentos List */}
      <div className="space-y-4">
        {filteredDepoimentos.map((depoimento) => (
          <DepoimentoCard
            key={depoimento.id}
            depoimento={depoimento}
            isExpanded={expandedId === depoimento.id}
            onToggle={() => toggleExpand(depoimento.id)}
          />
        ))}

        {filteredDepoimentos.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedFilter !== 'todos'
                  ? 'Nenhum depoimento encontrado para este filtro.'
                  : 'Ainda não há depoimentos publicados.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

interface DepoimentoCardProps {
  depoimento: Depoimento
  isExpanded: boolean
  onToggle: () => void
}

function DepoimentoCard({ depoimento, isExpanded, onToggle }: DepoimentoCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <Card className="card-hover">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: RIASEC_INFO[depoimento.tipoRIASEC].cor }}
            >
              {depoimento.autor.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{depoimento.profissao}</h3>
              <p className="text-sm text-muted-foreground">{depoimento.autor}</p>
            </div>
          </div>
          <div className="text-right">
            <div
              className="px-2 py-1 rounded-full text-xs font-bold text-white inline-block"
              style={{ backgroundColor: RIASEC_INFO[depoimento.tipoRIASEC].cor }}
            >
              {depoimento.tipoRIASEC}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              {depoimento.tempoExperiencia}
            </div>
          </div>
        </div>

        <p className="text-sm text-foreground mb-3">
          {isExpanded ? depoimento.depoimento : `${depoimento.depoimento.slice(0, 150)}...`}
        </p>

        {isExpanded && (
          <div className="space-y-4 mt-4 pt-4 border-t border-border">
            <div className="p-3 rounded-lg bg-secondary/10">
              <h4 className="text-sm font-semibold text-secondary mb-1">Conselho:</h4>
              <p className="text-sm text-foreground">{depoimento.conselho}</p>
            </div>

            {depoimento.diaTipico && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Dia típico:</h4>
                <p className="text-sm text-muted-foreground">{depoimento.diaTipico}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {depoimento.melhorParte && (
                <div>
                  <h4 className="text-sm font-semibold text-secondary mb-1">Melhor parte:</h4>
                  <p className="text-sm text-muted-foreground">{depoimento.melhorParte}</p>
                </div>
              )}
              {depoimento.piorParte && (
                <div>
                  <h4 className="text-sm font-semibold text-accent mb-1">Desafio:</h4>
                  <p className="text-sm text-muted-foreground">{depoimento.piorParte}</p>
                </div>
              )}
            </div>

            {depoimento.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {depoimento.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Publicado em {formatDate(depoimento.dataEnvio)}
            </p>
          </div>
        )}

        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-sm text-primary hover:underline mt-3"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Ler mais
            </>
          )}
        </button>
      </CardContent>
    </Card>
  )
}
