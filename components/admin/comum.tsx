"use client"

import { useState } from 'react'
import Image from 'next/image'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { ReportableContentType } from '@/lib/types'

// Linhas devolvidas pelas funções da migração 019 (banco/migracoes/019-painel-admin.sql).
export interface DenunciaAdmin {
  denuncia_id: string
  content_type: ReportableContentType
  content_id: string
  motivo: string | null
  status: 'open' | 'reviewed' | 'dismissed'
  criada_em: string
  denunciante: string | null
  conteudo_existe: boolean
  titulo: string | null
  texto: string | null
  autor_id: string | null
  autor_nome: string | null
  situacao: 'pending' | 'approved' | 'rejected' | null
  publicado_em: string | null
  contexto: string | null
}

export interface PedidoEspecialistaAdmin {
  pedido_id: string
  user_id: string
  display_name: string
  email: string | null
  avatar_url: string | null
  profession_title: string | null
  profession_status: 'atuo' | 'atuei' | null
  evidence: string | null
  message: string | null
  created_at: string
  pedidos_anteriores: number
}

export interface EspecialistaAdmin {
  user_id: string
  display_name: string
  avatar_url: string | null
  specialist_area: string | null
  aprovado_em: string | null
}

// As funções do banco recusam com mensagens já em português (raise exception
// → código P0001); outros erros (rede, permissão) viram o texto genérico.
export function mensagemDeErro(error: { message: string; code?: string } | null, fallback: string) {
  if (error?.code === 'P0001' && error.message) return error.message
  return fallback
}

export function formatarData(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR')
}

export const TIPO_CONTEUDO: Record<ReportableContentType, string> = {
  experience: 'Depoimento',
  experience_comment: 'Comentário em depoimento',
  forum_topic: 'Tópico do fórum',
  forum_reply: 'Resposta no fórum',
}

// Comprovação do especialista: só vira link se for http(s) — nunca
// "javascript:" ou outro esquema. "www.x" ganha https://.
export function linkSeguro(texto: string): string | null {
  const t = texto.trim()
  if (/^https?:\/\/\S+$/i.test(t)) return t
  if (/^www\.\S+$/i.test(t)) return `https://${t}`
  return null
}

export function Avatar({ nome, url }: { nome: string; url: string | null }) {
  return (
    <div className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
      {url ? (
        <Image src={url} alt="" fill sizes="40px" className="object-cover" />
      ) : (
        nome.charAt(0).toUpperCase()
      )}
    </div>
  )
}

// Confirmação de ação. Com `motivo`, pede um texto obrigatório (recusa e
// retirada do selo: o motivo aparece para a pessoa). O botão de confirmar não
// é um AlertDialogAction para o diálogo não fechar antes de a ação terminar.
export function DialogoConfirmacao({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar,
  destrutivo = false,
  motivo,
  onCancelar,
  onConfirmar,
}: {
  aberto: boolean
  titulo: string
  descricao: React.ReactNode
  rotuloConfirmar: string
  destrutivo?: boolean
  motivo?: { rotulo: string; placeholder: string }
  onCancelar: () => void
  onConfirmar: (motivo: string) => Promise<void>
}) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const faltaMotivo = !!motivo && texto.trim().length === 0

  const confirmar = async () => {
    setEnviando(true)
    try {
      await onConfirmar(texto.trim())
      setTexto('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AlertDialog
      open={aberto}
      onOpenChange={(o) => {
        if (!o && !enviando) {
          setTexto('')
          onCancelar()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">{descricao}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {motivo && (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-foreground">{motivo.rotulo}</span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={motivo.placeholder}
              className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground resize-none"
            />
            <span className="block text-xs text-muted-foreground text-right">{texto.length}/500</span>
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <Button
            variant={destrutivo ? 'destructive' : 'default'}
            disabled={enviando || faltaMotivo}
            onClick={confirmar}
          >
            {enviando ? 'Aguarde...' : rotuloConfirmar}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-10 text-sm text-muted-foreground bg-muted/40 rounded-xl">
      {children}
    </div>
  )
}
