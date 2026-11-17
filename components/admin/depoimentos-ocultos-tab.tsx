"use client"

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { Experience } from '@/lib/types'
import { DialogoConfirmacao, formatarData, mensagemDeErro, Vazio } from './comum'

// Depoimentos que não aparecem no site: os escondidos por um admin
// ('rejected') e os que ficaram 'pending' de antes da pós-moderação
// (migração 014, set/2026), que ninguém chegou a revisar.
export function DepoimentosOcultosTab({
  depoimentos,
  onMudou,
}: {
  depoimentos: Experience[]
  onMudou: () => Promise<void>
}) {
  const supabase = useMemo(() => createClient(), [])
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [apagando, setApagando] = useState<Experience | null>(null)

  const publicar = async (d: Experience) => {
    setOcupado(d.id)
    const { error } = await supabase.rpc('admin_definir_status_depoimento', { p_id: d.id, p_status: 'approved' })
    if (error) {
      setOcupado(null)
      toast.error(mensagemDeErro(error, 'Não foi possível publicar. Tente novamente.'))
      return
    }
    await onMudou()
    setOcupado(null)
    toast.success('Depoimento publicado. Ele volta a aparecer na Comunidade.')
  }

  const apagar = async (d: Experience) => {
    const { error } = await supabase.rpc('admin_apagar_conteudo', { p_tipo: 'experience', p_id: d.id })
    if (error) {
      toast.error(mensagemDeErro(error, 'Não foi possível apagar. Tente novamente.'))
      return
    }
    await onMudou()
    setApagando(null)
    toast.success('Depoimento apagado.')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Depoimentos que não aparecem no site: os <strong className="text-foreground">escondidos</strong> a partir
        de uma denúncia e os <strong className="text-foreground">pendentes</strong> de antes de setembro/2026,
        quando os depoimentos ainda esperavam aprovação. Publique ou apague cada um.
      </p>

      {depoimentos.length === 0 ? (
        <Vazio>Nenhum depoimento oculto.</Vazio>
      ) : (
        depoimentos.map((d) => (
          <div key={d.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${
                  d.status === 'pending' ? 'bg-muted text-foreground' : 'bg-accent/15 text-accent'
                }`}
              >
                {d.status === 'pending' ? 'Pendente (antigo)' : 'Escondido'}
              </span>
              <span className="text-muted-foreground">
                {d.user_id ? d.author_name : 'Usuário removido'} · {d.profession} · {formatarData(d.created_at)}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto bg-muted/40 rounded-lg p-3">
              {d.content}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={ocupado === d.id} onClick={() => publicar(d)}>
                Publicar
              </Button>
              <Button size="sm" variant="destructive" disabled={ocupado === d.id} onClick={() => setApagando(d)}>
                Apagar
              </Button>
              {ocupado === d.id && <Loader2 className="w-4 h-4 animate-spin text-primary self-center" />}
            </div>
          </div>
        ))
      )}

      <DialogoConfirmacao
        aberto={!!apagando}
        titulo="Apagar este depoimento?"
        destrutivo
        rotuloConfirmar="Apagar"
        descricao={<p>Não dá para desfazer. Os comentários dele são apagados junto.</p>}
        onCancelar={() => setApagando(null)}
        onConfirmar={async () => {
          if (apagando) await apagar(apagando)
        }}
      />
    </div>
  )
}
