'use client'

import { useEffect, useId, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import {
  buscarOcupacoes,
  carregarCbo,
  EXPERIENCE_RANGE_LABELS,
  formatarCbo,
  noMeioDaFrase,
  PROFESSION_STATUS_LABELS,
  type OcupacaoCbo,
  type ResultadoBusca,
} from '@/lib/cbo'
import type { ExperienceRange, ProfessionStatus } from '@/lib/types'

// Campos de profissão do perfil (migração 017): profissão da CBO, situação
// e tempo de experiência. Usado no "Editar perfil" e no formulário de
// depoimento de quem ainda não informou a profissão.

export interface ProfissaoEscolhida {
  codigo: string
  titulo: string
}

export interface CamposProfissao {
  profissao: ProfissaoEscolhida | null
  status: ProfessionStatus | null
  experiencia: ExperienceRange | null
}

export function camposProfissaoValidos(c: CamposProfissao): boolean {
  return !!c.profissao && !!c.status
}

// Valores para gravar em profiles. O título não vai: o banco preenche a
// partir do código.
export function camposProfissaoParaPerfil(c: CamposProfissao) {
  return {
    profession_cbo: c.profissao?.codigo ?? null,
    profession_status: c.profissao ? c.status : null,
    experience_range: c.profissao && c.status !== 'estudo' ? c.experiencia : null,
  }
}

const inputClass =
  'w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground'

export function CamposProfissaoForm({
  value,
  onChange,
}: {
  value: CamposProfissao
  onChange: (next: CamposProfissao) => void
}) {
  const statusId = useId()
  const experienciaId = useId()

  return (
    <div className="space-y-4">
      <ProfessionPicker
        value={value.profissao}
        onChange={(profissao) => onChange({ ...value, profissao })}
      />

      {value.profissao && (
        <>
          <div>
            <label htmlFor={statusId} className="block text-sm font-medium text-foreground mb-2">
              Sua situação nessa profissão
            </label>
            <select
              id={statusId}
              value={value.status ?? ''}
              onChange={(e) =>
                onChange({ ...value, status: (e.target.value || null) as ProfessionStatus | null })
              }
              className={inputClass}
              required
            >
              <option value="" disabled>
                Escolha uma opção
              </option>
              {(Object.keys(PROFESSION_STATUS_LABELS) as ProfessionStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PROFESSION_STATUS_LABELS[s]} {noMeioDaFrase(value.profissao!.titulo)}
                </option>
              ))}
            </select>
          </div>

          {value.status && value.status !== 'estudo' && (
            <div>
              <label htmlFor={experienciaId} className="block text-sm font-medium text-foreground mb-2">
                Tempo de experiência{' '}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <select
                id={experienciaId}
                value={value.experiencia ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    experiencia: (e.target.value || null) as ExperienceRange | null,
                  })
                }
                className={inputClass}
              >
                <option value="">Prefiro não informar</option>
                {(Object.keys(EXPERIENCE_RANGE_LABELS) as ExperienceRange[]).map((r) => (
                  <option key={r} value={r}>
                    {EXPERIENCE_RANGE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Busca na lista oficial da CBO. Só aceita uma ocupação da lista — não há
// texto livre.
export function ProfessionPicker({
  value,
  onChange,
}: {
  value: ProfissaoEscolhida | null
  onChange: (next: ProfissaoEscolhida | null) => void
}) {
  const inputId = useId()
  const listId = useId()
  const [lista, setLista] = useState<OcupacaoCbo[] | null>(null)
  const [erro, setErro] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [ativo, setAtivo] = useState(0)

  useEffect(() => {
    if (value || lista) return
    let cancelado = false
    carregarCbo()
      .then((l) => !cancelado && setLista(l))
      .catch(() => !cancelado && setErro(true))
    return () => {
      cancelado = true
    }
  }, [value, lista])

  const resultados: ResultadoBusca[] = lista ? buscarOcupacoes(lista, consulta) : []

  const escolher = (r: ResultadoBusca) => {
    onChange({ codigo: r.ocupacao.codigo, titulo: r.ocupacao.titulo })
    setConsulta('')
    setAtivo(0)
  }

  if (value) {
    return (
      <div>
        <p className="block text-sm font-medium text-foreground mb-2">Sua profissão</p>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border border-input rounded-lg bg-muted/40">
          <div className="min-w-0">
            <p className="text-foreground font-medium">{value.titulo}</p>
            <p className="text-xs text-muted-foreground">CBO {formatarCbo(value.codigo)}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-sm text-primary hover:underline"
          >
            Trocar
          </button>
        </div>
      </div>
    )
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!resultados.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAtivo((i) => (i + 1) % resultados.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((i) => (i - 1 + resultados.length) % resultados.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      escolher(resultados[Math.min(ativo, resultados.length - 1)])
    }
  }

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground mb-2">
        Sua profissão
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={resultados.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value)
            setAtivo(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Digite para buscar. Ex: enfermeiro, programador"
          className={`${inputClass} pl-10 pr-10`}
        />
        {consulta && (
          <button
            type="button"
            onClick={() => setConsulta('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {erro ? (
        <p className="text-xs text-destructive mt-2">
          Não foi possível carregar a lista de profissões. Verifique sua conexão e tente de novo.
        </p>
      ) : !lista ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Carregando a lista de profissões...
        </p>
      ) : consulta.trim().length >= 2 && resultados.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-2">
          Nenhuma profissão encontrada. Tente outro nome, um sinônimo ou um termo mais geral.
        </p>
      ) : resultados.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="mt-2 border border-border rounded-lg divide-y divide-border overflow-hidden"
        >
          {resultados.map((r, i) => (
            <li
              key={r.ocupacao.codigo}
              role="option"
              aria-selected={i === ativo}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(r)}
              onMouseEnter={() => setAtivo(i)}
              className={`px-4 py-2.5 cursor-pointer ${i === ativo ? 'bg-muted' : 'bg-card'}`}
            >
              <p className="text-sm text-foreground">{r.ocupacao.titulo}</p>
              <p className="text-xs text-muted-foreground">
                CBO {formatarCbo(r.ocupacao.codigo)}
                {r.via && <> · também chamado de &quot;{r.via}&quot;</>}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground mt-2">
          Lista oficial da Classificação Brasileira de Ocupações (CBO).
        </p>
      )}
    </div>
  )
}
