"use client"

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Flag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { ReportableContentType } from '@/lib/types'
import {
  DialogoConfirmacao,
  formatarData,
  mensagemDeErro,
  TIPO_CONTEUDO,
  Vazio,
  type DenunciaAdmin,
} from './comum'

type Acao = 'descartar' | 'resolver' | 'esconder' | 'apagar'

interface Grupo {
  chave: string
  tipo: ReportableContentType
  id: string
  conteudo: DenunciaAdmin // dados do conteúdo (iguais em todas as denúncias do grupo)
  denuncias: DenunciaAdmin[]
}

// Junta as denúncias do mesmo conteúdo num cartão só, mantendo a ordem
// (mais recente primeiro).
function agrupar(lista: DenunciaAdmin[]): Grupo[] {
  const grupos = new Map<string, Grupo>()
  for (const d of lista) {
    const chave = `${d.content_type}:${d.content_id}`
    const g = grupos.get(chave)
    if (g) g.denuncias.push(d)
    else grupos.set(chave, { chave, tipo: d.content_type, id: d.content_id, conteudo: d, denuncias: [d] })
  }
  return [...grupos.values()]
}

function onde(c: DenunciaAdmin): string | null {
  if (!c.contexto) return null
  if (c.content_type === 'forum_reply') return `no tópico “${c.contexto}”`
  if (c.content_type === 'experience_comment') return `no depoimento de ${c.contexto}`
  return null
}

export function DenunciasTab({
  abertas,
  onMudou,
}: {
  abertas: DenunciaAdmin[]
  onMudou: () => Promise<void>
}) {
  const supabase = useMemo(() => createClient(), [])
  const [vendo, setVendo] = useState<'abertas' | 'tratadas'>('abertas')
  const [tratadas, setTratadas] = useState<DenunciaAdmin[] | null>(null)
  const [erroTratadas, setErroTratadas] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [apagando, setApagando] = useState<Grupo | null>(null)

  useEffect(() => {
    if (vendo !== 'tratadas' || tratadas) return
    supabase.rpc('admin_listar_denuncias', { p_abertas: false }).then(({ data, error }) => {
      setErroTratadas(!!error)
      setTratadas((data as DenunciaAdmin[]) ?? [])
    })
  }, [vendo, tratadas, supabase])

  const tratar = async (g: Grupo, acao: Acao) => {
    setOcupado(g.chave)
    const { error } = await supabase.rpc('admin_tratar_denuncias', {
      p_tipo: g.tipo,
      p_conteudo: g.id,
      p_acao: acao,
    })
    if (error) {
      setOcupado(null)
      toast.error(mensagemDeErro(error, 'Não foi possível concluir. Tente novamente.'))
      return
    }
    await onMudou()
    setTratadas(null) // recarrega o histórico na próxima vez
    setOcupado(null)
    toast.success(
      {
        descartar: 'Denúncia descartada. O conteúdo continua no ar.',
        resolver: 'Denúncia marcada como resolvida.',
        esconder: 'Depoimento escondido. Ele pode ser republicado na aba Depoimentos ocultos.',
        apagar: 'Conteúdo apagado.',
      }[acao]
    )
  }

  const lista = vendo === 'abertas' ? abertas : tratadas
  const grupos = lista ? agrupar(lista) : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Denúncias feitas pelo botão <Flag className="inline w-3.5 h-3.5 -mt-0.5" /> da Comunidade.
        Denúncias do mesmo conteúdo aparecem juntas e são tratadas de uma vez.
      </p>

      <div className="flex gap-2">
        {(['abertas', 'tratadas'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVendo(v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              vendo === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {v === 'abertas' ? `Abertas (${agrupar(abertas).length})` : 'Já tratadas'}
          </button>
        ))}
      </div>

      {!grupos ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : vendo === 'tratadas' && erroTratadas ? (
        <Vazio>Não foi possível carregar o histórico. Recarregue a página.</Vazio>
      ) : grupos.length === 0 ? (
        <Vazio>{vendo === 'abertas' ? 'Nenhuma denúncia aberta.' : 'Nenhuma denúncia tratada ainda.'}</Vazio>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => {
            const c = g.conteudo
            const escondido = c.content_type === 'experience' && c.situacao !== 'approved'
            const local = onde(c)
            const emAndamento = ocupado === g.chave
            return (
              <div key={g.chave} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-medium">
                    {TIPO_CONTEUDO[g.tipo]}
                  </span>
                  {!c.conteudo_existe && (
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Já apagado</span>
                  )}
                  {c.conteudo_existe && escondido && (
                    <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">Escondido</span>
                  )}
                  <span className="text-muted-foreground">
                    {g.denuncias.length} denúncia{g.denuncias.length > 1 ? 's' : ''}
                  </span>
                </div>

                {c.conteudo_existe ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {c.autor_id ? c.autor_nome : 'Usuário removido'}
                      {local && ` · ${local}`}
                      {c.publicado_em && ` · publicado em ${formatarData(c.publicado_em)}`}
                    </p>
                    {c.titulo && <p className="font-semibold text-foreground">{c.titulo}</p>}
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto bg-muted/40 rounded-lg p-3">
                      {c.texto}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Este conteúdo já foi apagado (pelo autor ou por um admin).
                    {vendo === 'abertas' && ' Só falta dar a denúncia como resolvida.'}
                  </p>
                )}

                <ul className="space-y-1 text-sm border-t border-border pt-3">
                  {g.denuncias.map((d) => (
                    <li key={d.denuncia_id} className="text-muted-foreground">
                      <span className="text-foreground font-medium">{d.denunciante ?? 'Alguém'}</span>
                      {' · '}{formatarData(d.criada_em)}
                      {' · '}
                      {d.motivo ? <span className="text-foreground">“{d.motivo}”</span> : 'sem motivo informado'}
                      {d.status !== 'open' && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted">
                          {d.status === 'dismissed' ? 'descartada' : 'tratada'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                {vendo === 'abertas' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {c.conteudo_existe ? (
                      <>
                        <Button size="sm" variant="outline" disabled={emAndamento} onClick={() => tratar(g, 'descartar')}>
                          Manter no ar
                        </Button>
                        {g.tipo === 'experience' && !escondido && (
                          <Button size="sm" variant="outline" disabled={emAndamento} onClick={() => tratar(g, 'esconder')}>
                            Esconder
                          </Button>
                        )}
                        {escondido && (
                          <Button size="sm" variant="outline" disabled={emAndamento} onClick={() => tratar(g, 'resolver')}>
                            Já está escondido: resolver
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" disabled={emAndamento} onClick={() => setApagando(g)}>
                          Apagar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" disabled={emAndamento} onClick={() => tratar(g, 'resolver')}>
                        Marcar como resolvida
                      </Button>
                    )}
                    {emAndamento && <Loader2 className="w-4 h-4 animate-spin text-primary self-center" />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <DialogoConfirmacao
        aberto={!!apagando}
        titulo="Apagar este conteúdo?"
        destrutivo
        rotuloConfirmar="Apagar"
        descricao={
          <>
            <p>Não dá para desfazer.</p>
            {apagando?.tipo === 'experience' && (
              <p>Os comentários do depoimento são apagados junto. Para tirar do ar sem apagar, use “Esconder”.</p>
            )}
            {apagando?.tipo === 'forum_topic' && <p>As respostas do tópico são apagadas junto.</p>}
          </>
        }
        onCancelar={() => setApagando(null)}
        onConfirmar={async () => {
          if (apagando) await tratar(apagando, 'apagar')
          setApagando(null)
        }}
      />
    </div>
  )
}
