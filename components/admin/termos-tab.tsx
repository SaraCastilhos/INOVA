"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Vazio } from './comum'

// Mesmo formato da trava do banco (migração 019, blocked_terms_formato): o
// filtro monta uma expressão regular com cada termo, e um caractere especial
// quebraria todas as publicações.
const FORMATO_TERMO = /^[a-z0-9à-ÿ]+([ -][a-z0-9à-ÿ]+)*$/

function normalizar(texto: string) {
  return texto.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function TermosTab() {
  const supabase = useMemo(() => createClient(), [])
  const [termos, setTermos] = useState<string[] | null>(null)
  const [erro, setErro] = useState(false)
  const [novo, setNovo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('blocked_terms').select('term').order('term')
    setErro(!!error)
    setTermos((data ?? []).map((t: { term: string }) => t.term))
  }, [supabase])

  useEffect(() => {
    carregar()
  }, [carregar])

  const termo = normalizar(novo)
  const invalido = termo.length > 0 && (termo.length < 2 || termo.length > 60 || !FORMATO_TERMO.test(termo))

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termo || invalido) return
    if (termos?.includes(termo)) {
      toast.error('Esse termo já está na lista.')
      return
    }
    setSalvando(true)
    const { error } = await supabase.from('blocked_terms').insert({ term: termo })
    setSalvando(false)
    if (error) {
      toast.error(
        error.code === '23505'
          ? 'Esse termo já está na lista.'
          : error.code === '23514'
            ? 'Use só letras, números, espaço ou hífen (2 a 60 caracteres).'
            : 'Não foi possível adicionar. Tente novamente.'
      )
      return
    }
    setNovo('')
    await carregar()
    toast.success(`“${termo}” foi bloqueado.`)
  }

  const remover = async (t: string) => {
    setRemovendo(t)
    const { error } = await supabase.from('blocked_terms').delete().eq('term', t)
    setRemovendo(null)
    if (error) {
      toast.error('Não foi possível remover. Tente novamente.')
      return
    }
    await carregar()
    toast.success(`“${t}” foi liberado.`)
  }

  const visiveis = termos?.filter((t) => t.includes(normalizar(busca))) ?? []

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          Publicações (depoimentos, comentários, tópicos e respostas), pedidos de selo e perfis com algum
          destes termos são recusados na hora, com o aviso “Conteúdo não permitido”.
        </p>
        <p>
          O termo vale como palavra inteira e ignora maiúsculas, mas <strong className="text-foreground">não ignora
          acento</strong>: cadastre as variações (ex.: “sapatão” e “sapatao”). Vale só para o que for publicado
          daqui em diante.
        </p>
      </div>

      <form onSubmit={adicionar} className="space-y-1">
        <div className="flex gap-2">
          <input
            type="text"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            maxLength={60}
            placeholder="Novo termo"
            aria-label="Novo termo bloqueado"
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground"
          />
          <Button type="submit" disabled={!termo || invalido || salvando}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </Button>
        </div>
        {invalido && (
          <p className="text-xs text-destructive">Use só letras, números, espaço ou hífen (2 a 60 caracteres).</p>
        )}
      </form>

      {termos === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : erro ? (
        <Vazio>Não foi possível carregar a lista. Recarregue a página.</Vazio>
      ) : termos.length === 0 ? (
        <Vazio>Nenhum termo bloqueado.</Vazio>
      ) : (
        <div className="space-y-3">
          {termos.length > 12 && (
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={`Buscar entre ${termos.length} termos`}
              aria-label="Buscar termo"
              className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground"
            />
          )}
          <ul className="flex flex-wrap gap-2">
            {visiveis.map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-muted text-sm text-foreground"
              >
                {t}
                <button
                  onClick={() => remover(t)}
                  disabled={removendo === t}
                  aria-label={`Liberar “${t}”`}
                  className="p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-background disabled:opacity-50"
                >
                  {removendo === t ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </li>
            ))}
          </ul>
          {visiveis.length === 0 && <p className="text-sm text-muted-foreground">Nenhum termo com “{busca}”.</p>}
        </div>
      )}
    </div>
  )
}
