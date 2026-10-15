import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  ArrowLeft,
  Wrench,
  Sparkles,
  FileText,
  CalendarClock,
  GraduationCap,
  ExternalLink,
} from 'lucide-react'
import { PROFISSOES } from '@/lib/data'
import { RIASEC_INFO, FORMACAO_LABELS } from '@/lib/types'
import { fmtBRL, fmtData } from '@/lib/format'

// Página pública (sem exigir login — ver nota em lib/supabase/middleware.ts: o
// app não protege rotas por middleware, o gate de autenticação é só no
// componente app/page.tsx). Isso cumpre, para esta página, o que o RF02
// original pedia: guia de profissões com leitura pública.

type Params = Promise<{ slug: string }>

function getProfissao(slug: string) {
  return PROFISSOES.find((p) => p.slug === slug)
}

export async function generateStaticParams() {
  return PROFISSOES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const profissao = getProfissao(slug)
  if (!profissao) return { title: 'Profissão não encontrada - INOVA' }
  return {
    title: `${profissao.nome} - INOVA`,
    description: profissao.descricao,
  }
}

export default async function ProfissaoDetalhePage({ params }: { params: Params }) {
  const { slug } = await params
  const profissao = getProfissao(slug)
  if (!profissao) notFound()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-4 border-b border-border">
        <Link
          href="/?section=carreiras"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao guia de profissões</span>
        </Link>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
        <Image
          src="/images/logo-inova.png"
          alt="INOVA"
          width={376}
          height={216}
          preload
          className="h-10 w-auto"
        />

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profissao.nome}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              CBO {profissao.cbo_code} · {profissao.area}
            </p>
          </div>
          <div
            className="shrink-0 px-3 py-1.5 rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: RIASEC_INFO[profissao.riasec_primary].cor }}
            title={`Perfil RIASEC: ${profissao.riasec_code}`}
          >
            {profissao.riasec_code}
          </div>
        </div>

        <p className="text-foreground leading-relaxed">{profissao.descricao}</p>

        <div className="rounded-xl border border-border p-4">
          <p className="text-lg font-semibold text-secondary">
            {fmtBRL(profissao.salario.media)}
            <span className="text-sm text-muted-foreground font-normal">
              {' '}(média; faixa {fmtBRL(profissao.salario.p25)}–{fmtBRL(profissao.salario.p75)})
            </span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Fonte: {profissao.salario.fonte} · ref. {profissao.salario.referencia}
          </p>
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground mb-2">
            <Wrench className="h-4 w-4" /> Atividades típicas
          </h2>
          <ul className="space-y-1.5">
            {profissao.atividades.map((a) => (
              <li key={a} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">-</span>
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground mb-2">
            <Sparkles className="h-4 w-4" /> Habilidades
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {profissao.habilidades.map((h) => (
              <span key={h} className="px-2.5 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                {h}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="h-4 w-4" />
          {FORMACAO_LABELS[profissao.formacao_requerida]}
          {profissao.regulamentada && profissao.conselho && (
            <span>· registro no {profissao.conselho}</span>
          )}
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground mb-2">
            <FileText className="h-4 w-4" /> Fontes
          </h2>
          <ul className="space-y-1.5">
            {profissao.fontes.map((f) => (
              <li key={f.url}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    {f.titulo}{' '}
                    <span className="text-muted-foreground">(acesso em {fmtData(f.acesso_em)})</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            Atualizado em {fmtData(profissao.atualizado_em)}
          </span>
          <Link href="/metodologia" className="text-primary hover:underline">
            Metodologia e fontes
          </Link>
        </div>
      </main>
    </div>
  )
}
