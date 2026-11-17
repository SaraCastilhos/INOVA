"use client"

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BadgeCheck, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { descreverProfissao } from '@/lib/cbo'
import {
  Avatar,
  DialogoConfirmacao,
  formatarData,
  linkSeguro,
  mensagemDeErro,
  Vazio,
  type EspecialistaAdmin,
  type PedidoEspecialistaAdmin,
} from './comum'

type Decisao =
  | { tipo: 'aprovar'; pedido: PedidoEspecialistaAdmin }
  | { tipo: 'recusar'; pedido: PedidoEspecialistaAdmin }
  | { tipo: 'revogar'; especialista: EspecialistaAdmin }

// A decisão passa sempre pelas funções da migração 018
// (decidir_pedido_especialista / revogar_especialista): elas gravam o
// histórico, o motivo que a pessoa vê e congelam a área do selo.
export function EspecialistasTab({
  pedidos,
  especialistas,
  onMudou,
}: {
  pedidos: PedidoEspecialistaAdmin[]
  especialistas: EspecialistaAdmin[]
  onMudou: () => Promise<void>
}) {
  const supabase = useMemo(() => createClient(), [])
  const [decisao, setDecisao] = useState<Decisao | null>(null)

  const executar = async (d: Decisao, motivo: string) => {
    const { error } =
      d.tipo === 'revogar'
        ? await supabase.rpc('revogar_especialista', { p_usuario: d.especialista.user_id, p_motivo: motivo })
        : await supabase.rpc('decidir_pedido_especialista', {
            p_pedido: d.pedido.pedido_id,
            p_aprovar: d.tipo === 'aprovar',
            p_motivo: d.tipo === 'recusar' ? motivo : null,
          })
    if (error) {
      toast.error(mensagemDeErro(error, 'Não foi possível concluir. Tente novamente.'))
      return
    }
    await onMudou()
    setDecisao(null)
    toast.success(
      d.tipo === 'aprovar' ? 'Selo aprovado.' : d.tipo === 'recusar' ? 'Pedido recusado.' : 'Selo retirado.'
    )
  }

  const nome = decisao ? (decisao.tipo === 'revogar' ? decisao.especialista.display_name : decisao.pedido.display_name) : ''

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-semibold text-foreground">Pedidos em análise ({pedidos.length})</h2>
        {pedidos.length === 0 ? (
          <Vazio>Nenhum pedido esperando análise.</Vazio>
        ) : (
          pedidos.map((p) => {
            const link = p.evidence ? linkSeguro(p.evidence) : null
            return (
              <div key={p.pedido_id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar nome={p.display_name} url={p.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{p.display_name}</p>
                    {p.email && <p className="text-sm text-muted-foreground break-all">{p.email}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pedido em {formatarData(p.created_at)}
                      {p.pedidos_anteriores > 0 &&
                        ` · ${p.pedidos_anteriores} pedido${p.pedidos_anteriores > 1 ? 's' : ''} anterior${p.pedidos_anteriores > 1 ? 'es' : ''}`}
                    </p>
                  </div>
                </div>

                <dl className="text-sm space-y-2">
                  <div>
                    <dt className="text-muted-foreground">Área do selo</dt>
                    <dd className="text-foreground">
                      {p.profession_title
                        ? descreverProfissao(p.profession_title, p.profession_status)
                        : 'Sem profissão da CBO (pedido antigo — veja a mensagem)'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Comprovação</dt>
                    <dd className="text-foreground break-all">
                      {!p.evidence ? (
                        'Não informada (pedido anterior à comprovação obrigatória)'
                      ) : link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {p.evidence}
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      ) : (
                        <>{p.evidence} <span className="text-muted-foreground">(registro: confira no site do conselho)</span></>
                      )}
                    </dd>
                  </div>
                  {p.message && (
                    <div>
                      <dt className="text-muted-foreground">Mensagem</dt>
                      <dd className="text-foreground whitespace-pre-wrap break-words">{p.message}</dd>
                    </div>
                  )}
                </dl>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setDecisao({ tipo: 'aprovar', pedido: p })}>
                    Aprovar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDecisao({ tipo: 'recusar', pedido: p })}>
                    Recusar
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-foreground">Especialistas verificados ({especialistas.length})</h2>
        {especialistas.length === 0 ? (
          <Vazio>Ninguém tem o selo ainda.</Vazio>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {especialistas.map((e) => (
              <div key={e.user_id} className="flex items-center gap-3 p-3">
                <Avatar nome={e.display_name} url={e.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground flex items-center gap-1.5">
                    <span className="truncate">{e.display_name}</span>
                    <BadgeCheck className="w-4 h-4 text-secondary shrink-0" />
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {e.specialist_area || 'Área não especificada'}
                    {e.aprovado_em && ` · desde ${formatarData(e.aprovado_em)}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => setDecisao({ tipo: 'revogar', especialista: e })}
                >
                  Retirar selo
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <DialogoConfirmacao
        key={decisao ? `${decisao.tipo}-${nome}` : 'nenhuma'}
        aberto={!!decisao}
        titulo={
          decisao?.tipo === 'aprovar'
            ? `Aprovar o selo de ${nome}?`
            : decisao?.tipo === 'recusar'
              ? `Recusar o pedido de ${nome}?`
              : `Retirar o selo de ${nome}?`
        }
        descricao={
          decisao?.tipo === 'aprovar' ? (
            <p>
              O selo aparece na hora junto ao nome da pessoa, com a área
              {decisao.pedido.profession_title ? ` “${decisao.pedido.profession_title}”` : ' informada'}. A área fica
              fixa, mesmo que ela mude a profissão no perfil depois.
            </p>
          ) : decisao?.tipo === 'recusar' ? (
            <p>A pessoa vê o motivo na aba Especialistas e pode pedir de novo depois.</p>
          ) : (
            <p>O selo some na hora de depoimentos, comentários e respostas. A pessoa vê o motivo na aba Especialistas.</p>
          )
        }
        rotuloConfirmar={decisao?.tipo === 'aprovar' ? 'Aprovar' : decisao?.tipo === 'recusar' ? 'Recusar' : 'Retirar selo'}
        destrutivo={decisao?.tipo !== 'aprovar'}
        motivo={
          decisao && decisao.tipo !== 'aprovar'
            ? { rotulo: 'Motivo (a pessoa vai ver)', placeholder: 'Ex.: não conseguimos confirmar o registro informado.' }
            : undefined
        }
        onCancelar={() => setDecisao(null)}
        onConfirmar={async (motivo) => {
          if (decisao) await executar(decisao, motivo)
        }}
      />
    </div>
  )
}
