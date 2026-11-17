'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Award, EyeOff, Flag, Loader2, ShieldAlert, Ban } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import type { Experience } from '@/lib/types'
import { DenunciasTab } from '@/components/admin/denuncias-tab'
import { EspecialistasTab } from '@/components/admin/especialistas-tab'
import { DepoimentosOcultosTab } from '@/components/admin/depoimentos-ocultos-tab'
import { TermosTab } from '@/components/admin/termos-tab'
import type { DenunciaAdmin, EspecialistaAdmin, PedidoEspecialistaAdmin } from '@/components/admin/comum'

// Painel de administração. Entra-se pelo login normal do site; o que libera
// o painel é profiles.is_admin = true. Quem barra de verdade é o banco: as
// funções da migração 019 recusam quem não é admin, então abrir /admin sem
// ser admin não mostra dado nenhum. Tornar alguém admin continua só pelo
// banco (banco/admin-helpers.sql, seção 1).

type Aba = 'denuncias' | 'especialistas' | 'ocultos' | 'termos'

interface Dados {
  denuncias: DenunciaAdmin[]
  pedidos: PedidoEspecialistaAdmin[]
  especialistas: EspecialistaAdmin[]
  ocultos: Experience[]
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-4 border-b border-border">
        <Link
          href="/?section=perfil"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao app</span>
        </Link>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-6 space-y-6">{children}</main>
    </div>
  )
}

function Aviso({ titulo, texto, acao }: { titulo: string; texto: string; acao: React.ReactNode }) {
  return (
    <div className="text-center py-16 space-y-3">
      <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground" />
      <h1 className="text-xl font-bold text-foreground">{titulo}</h1>
      <p className="text-muted-foreground">{texto}</p>
      <div className="pt-2">{acao}</div>
    </div>
  )
}

export default function AdminPage() {
  const { user, profile, loading } = useAuth()
  const isAdmin = !!profile?.is_admin
  const supabase = useMemo(() => createClient(), [])
  const [aba, setAba] = useState<Aba>('denuncias')
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState(false)

  const carregar = useCallback(async () => {
    const [d, p, e, o] = await Promise.all([
      supabase.rpc('admin_listar_denuncias', { p_abertas: true }),
      supabase.rpc('admin_listar_pedidos_especialista'),
      supabase.rpc('admin_listar_especialistas'),
      supabase.rpc('admin_listar_depoimentos_ocultos'),
    ])
    if (d.error || p.error || e.error || o.error) {
      setErro(true)
      return
    }
    setErro(false)
    setDados({
      denuncias: (d.data as DenunciaAdmin[]) ?? [],
      pedidos: (p.data as PedidoEspecialistaAdmin[]) ?? [],
      especialistas: (e.data as EspecialistaAdmin[]) ?? [],
      ocultos: (o.data as Experience[]) ?? [],
    })
  }, [supabase])

  useEffect(() => {
    if (isAdmin) carregar()
  }, [isAdmin, carregar])

  if (loading) {
    return (
      <Moldura>
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Moldura>
    )
  }

  if (!user) {
    return (
      <Moldura>
        <Aviso
          titulo="Entre na sua conta"
          texto="O painel de administração é só para a equipe do INOVA."
          acao={
            <Link href="/auth/login" className="text-primary font-medium hover:underline">
              Ir para o login
            </Link>
          }
        />
      </Moldura>
    )
  }

  if (!isAdmin) {
    return (
      <Moldura>
        <Aviso
          titulo="Acesso restrito"
          texto="Esta área é só para a equipe do INOVA."
          acao={
            <Link href="/" className="text-primary font-medium hover:underline">
              Voltar ao início
            </Link>
          }
        />
      </Moldura>
    )
  }

  const denunciasAbertas = dados ? new Set(dados.denuncias.map((d) => `${d.content_type}:${d.content_id}`)).size : 0
  const abas: {
    id: Aba
    rotulo: string
    curto?: string // no celular, quando o rótulo não cabe
    icone: React.ComponentType<{ className?: string }>
    contagem?: number
  }[] = [
    { id: 'denuncias', rotulo: 'Denúncias', icone: Flag, contagem: denunciasAbertas },
    { id: 'especialistas', rotulo: 'Especialistas', icone: Award, contagem: dados?.pedidos.length },
    { id: 'ocultos', rotulo: 'Depoimentos ocultos', curto: 'Ocultos', icone: EyeOff, contagem: dados?.ocultos.length },
    { id: 'termos', rotulo: 'Termos bloqueados', icone: Ban },
  ]

  return (
    <Moldura>
      <div className="flex items-center gap-3">
        <Image src="/images/logo-inova.png" alt="INOVA" width={376} height={216} className="h-8 w-auto" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel de administração</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Moderação da Comunidade. Você está como {profile?.display_name}.
        </p>
      </div>

      <div role="tablist" className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-muted rounded-xl">
        {abas.map((a) => {
          const Icone = a.icone
          const ativa = aba === a.id
          return (
            <button
              key={a.id}
              role="tab"
              aria-selected={ativa}
              onClick={() => setAba(a.id)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                ativa ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icone className="w-4 h-4 shrink-0" />
              {a.curto ? (
                <>
                  <span className="truncate sm:hidden">{a.curto}</span>
                  <span className="truncate hidden sm:inline">{a.rotulo}</span>
                </>
              ) : (
                <span className="truncate">{a.rotulo}</span>
              )}
              {!!a.contagem && (
                <span className="ml-0.5 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {a.contagem}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {erro ? (
        <div className="text-center py-10 text-sm text-muted-foreground bg-muted/40 rounded-xl space-y-2">
          <p>Não foi possível carregar o painel.</p>
          <p>
            Se a migração 019 ainda não foi aplicada no Supabase, aplique e recarregue. Senão, verifique a conexão.
          </p>
        </div>
      ) : !dados ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : aba === 'denuncias' ? (
        <DenunciasTab abertas={dados.denuncias} onMudou={carregar} />
      ) : aba === 'especialistas' ? (
        <EspecialistasTab pedidos={dados.pedidos} especialistas={dados.especialistas} onMudou={carregar} />
      ) : aba === 'ocultos' ? (
        <DepoimentosOcultosTab depoimentos={dados.ocultos} onMudou={carregar} />
      ) : (
        <TermosTab />
      )}
    </Moldura>
  )
}
