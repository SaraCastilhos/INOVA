"use client"

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ClipboardCheck,
  BookOpen,
  MessageSquare,
  ArrowRight,
  ChevronDown,
  Mail,
  Search,
  Sparkles,
} from 'lucide-react'
import { RIASEC_INFO, type RIASECType } from '@/lib/types'
import { PROFISSOES } from '@/lib/guia'

const EMAIL_CONTATO = 'contat3.inova@gmail.com'

// Ordem R-I-A-S-E-C: é a ordem dos vértices no hexágono de Holland.
const TIPOS = Object.keys(RIASEC_INFO) as RIASECType[]

// Uma profissão de cada tipo RIASEC (a primeira em ordem alfabética), para
// mostrar a variedade do guia sem fixar quantas fichas existem.
const PROFISSOES_EM_DESTAQUE = TIPOS.map((tipo) =>
  PROFISSOES.filter((p) => p.riasec_primary === tipo).sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR'),
  )[0],
).filter(Boolean)

const passos = [
  {
    icon: ClipboardCheck,
    titulo: 'Faça o teste',
    descricao:
      'Diga o quanto você gostaria de fazer algumas atividades de trabalho. Leva poucos minutos.',
  },
  {
    icon: Sparkles,
    titulo: 'Conheça seu perfil',
    descricao:
      'Veja na hora seus três tipos RIASEC predominantes e o que cada um diz sobre seus interesses.',
  },
  {
    icon: Search,
    titulo: 'Explore profissões',
    descricao:
      'Receba sugestões de profissões que combinam com você e veja o que fazem, a formação e como ingressar.',
  },
]

const recursos = [
  {
    icon: ClipboardCheck,
    titulo: 'Teste vocacional',
    descricao:
      'Baseado na teoria dos interesses profissionais de John Holland, usada em orientação profissional no mundo todo.',
    cor: 'bg-primary/10 text-primary',
  },
  {
    icon: BookOpen,
    titulo: 'Guia de profissões',
    descricao:
      'Atividades, habilidades, formação, faixa salarial e formas de ingresso, com as fontes de cada informação.',
    cor: 'bg-secondary/10 text-secondary',
  },
  {
    icon: MessageSquare,
    titulo: 'Comunidade',
    descricao:
      'Depoimentos de quem já trabalha na área e um fórum para tirar dúvidas, com especialistas verificados.',
    cor: 'bg-accent/10 text-accent',
  },
]

const perguntas: { pergunta: string; resposta: ReactNode }[] = [
  {
    pergunta: 'O INOVA é gratuito?',
    resposta: 'Sim. Todas as funções do site são gratuitas.',
  },
  {
    pergunta: 'Preciso criar uma conta?',
    resposta:
      'Não para fazer o teste e consultar o guia de profissões. A conta é necessária para participar da comunidade e guardar o histórico dos seus resultados.',
  },
  {
    pergunta: 'Meu resultado fica salvo?',
    resposta:
      'Com conta, sim: ele fica no seu perfil. Sem conta, o resultado fica apenas no seu navegador e não é enviado ao INOVA. Se você criar uma conta depois, no mesmo navegador, ele é salvo nela.',
  },
  {
    pergunta: 'O resultado do teste é definitivo?',
    resposta: (
      <>
        Não. O teste é uma ferramenta de autoconhecimento: mostra quais tipos de
        atividade mais combinam com seus interesses, como ponto de partida para
        explorar. Ele não substitui um psicólogo ou orientador profissional.{' '}
        <Link href="/metodologia" className="text-primary font-medium hover:underline">
          Veja a metodologia
        </Link>
        .
      </>
    ),
  },
  {
    pergunta: 'O que acontece com os meus dados?',
    resposta: (
      <>
        Seus dados não são vendidos nem compartilhados para fins comerciais, e
        você pode excluir sua conta quando quiser. Os detalhes estão na{' '}
        <Link href="/privacidade" className="text-primary font-medium hover:underline">
          Política de Privacidade
        </Link>
        .
      </>
    ),
  },
]

function Rotulo({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">
      {children}
    </p>
  )
}

// Hexágono de Holland: os seis tipos nos vértices, na ordem R-I-A-S-E-C.
// Tipos vizinhos no hexágono são mais parecidos entre si; opostos, mais diferentes.
function HexagonoHolland() {
  const c = 160
  const raio = 115
  const pontos = TIPOS.map((tipo, i) => {
    const ang = ((-120 + i * 60) * Math.PI) / 180
    return {
      tipo,
      x: Math.round((c + raio * Math.cos(ang)) * 100) / 100,
      y: Math.round((c + raio * Math.sin(ang)) * 100) / 100,
    }
  })
  const contorno = pontos.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg
      viewBox="0 0 320 320"
      className="w-full max-w-[340px] mx-auto"
      role="img"
      aria-label="Hexágono de Holland com os seis tipos de interesse: Realista, Investigativo, Artístico, Social, Empreendedor e Convencional"
    >
      <defs>
        <linearGradient id="hex-fundo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <polygon points={contorno} fill="url(#hex-fundo)" stroke="var(--border)" strokeWidth="2" />
      {pontos.slice(0, 3).map((p, i) => {
        const oposto = pontos[i + 3]
        return (
          <line
            key={p.tipo}
            x1={p.x}
            y1={p.y}
            x2={oposto.x}
            y2={oposto.y}
            stroke="var(--border)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
        )
      })}
      {pontos.map((p) => (
        <g key={p.tipo}>
          <circle cx={p.x} cy={p.y} r="30" fill={RIASEC_INFO[p.tipo].cor} opacity="0.18" />
          <circle cx={p.x} cy={p.y} r="23" fill={RIASEC_INFO[p.tipo].cor} />
          <text
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontSize="20"
            fontWeight="700"
          >
            {p.tipo}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/75 backdrop-blur-md border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Image
            src="/images/logo-inova.png"
            alt="INOVA"
            width={376}
            height={216}
            preload
            className="h-10 w-auto"
          />
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/auth/login"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/auth/cadastro"
              className="px-3 sm:px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-24 md:pt-28 md:pb-32">
        {/* Fundo decorativo */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 -translate-x-[110%] w-[520px] h-[520px] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -top-10 left-1/2 translate-x-[10%] w-[460px] h-[460px] rounded-full bg-secondary/15 blur-3xl" />
          <div className="absolute top-64 left-1/2 -translate-x-1/2 w-[360px] h-[360px] rounded-full bg-accent/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center section-enter">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] text-balance">
            Descubra seu caminho profissional com o{' '}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              INOVA
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Faça um teste de interesses, conheça seu perfil e explore profissões que
            combinam com você.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/cadastro"
              className="group w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-full shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
            >
              Descobrir minha profissão
              <ArrowRight className="w-5 h-5 motion-safe:group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto px-8 py-4 bg-card/80 border border-border text-foreground font-medium rounded-full hover:bg-card hover:border-primary/30 transition-colors"
            >
              Já tenho conta
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-3">
            <div className="flex -space-x-2" aria-hidden="true">
              {TIPOS.map((tipo) => (
                <span
                  key={tipo}
                  className="w-8 h-8 rounded-full ring-2 ring-background flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: RIASEC_INFO[tipo].cor }}
                >
                  {tipo}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-left max-w-[11rem] sm:max-w-none">
              Baseado nos 6 tipos de interesse da teoria de John Holland
            </p>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-4 py-20 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Rotulo>Como funciona</Rotulo>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground text-balance">
              Do teste à profissão em três passos
            </h2>
          </div>
          <div className="relative">
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] border-t-2 border-dashed border-border"
          />
          <ol className="relative grid md:grid-cols-3 gap-10 md:gap-8">
            {passos.map((passo, i) => (
              <li key={passo.titulo} className="relative text-center">
                <div className="relative mx-auto w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-secondary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                  <passo.icon className="w-7 h-7" aria-hidden="true" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent text-white text-sm font-bold flex items-center justify-center ring-4 ring-card">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-foreground">{passo.titulo}</h3>
                <p className="mt-2 text-muted-foreground max-w-xs mx-auto">{passo.descricao}</p>
              </li>
            ))}
          </ol>
          </div>
        </div>
      </section>

      {/* Tipos RIASEC */}
      <section className="px-4 py-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 lg:gap-16 items-center">
          <div>
            <div className="text-center lg:text-left mb-8">
              <Rotulo>A teoria por trás do teste</Rotulo>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground text-balance">
                Os 6 tipos de interesse RIASEC
              </h2>
              <p className="mt-4 text-muted-foreground text-pretty">
                Segundo John Holland, os interesses profissionais se organizam em seis
                tipos. Todo mundo tem um pouco de cada um; o teste mostra quais se
                destacam em você. No hexágono, tipos vizinhos são mais parecidos entre si.
              </p>
            </div>
            <HexagonoHolland />
          </div>
          <ul className="grid sm:grid-cols-2 gap-4">
            {TIPOS.map((tipo) => {
              const info = RIASEC_INFO[tipo]
              return (
                <li
                  key={tipo}
                  className="relative overflow-hidden bg-card p-5 rounded-2xl border border-border shadow-sm"
                >
                  <div
                    aria-hidden="true"
                    className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-10"
                    style={{ backgroundColor: info.cor }}
                  />
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: info.cor }}
                    >
                      {tipo}
                    </span>
                    <h3 className="font-semibold text-foreground">{info.nome}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{info.descricao}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* Profissões em destaque */}
      <section className="px-4 py-20 bg-linear-to-b from-primary/[0.04] to-secondary/[0.06] border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div className="max-w-2xl text-center md:text-left">
              <Rotulo>Guia de profissões</Rotulo>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground text-balance">
                Conheça profissões de todos os tipos
              </h2>
              <p className="mt-4 text-muted-foreground text-pretty">
                Cada profissão tem uma ficha com o que se faz no dia a dia, a formação
                necessária, a faixa salarial e as fontes das informações.
              </p>
            </div>
            <Link
              href="/?section=carreiras"
              className="hidden md:inline-flex shrink-0 items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border text-foreground font-medium hover:border-primary/40 hover:text-primary transition-colors"
            >
              Ver todas as profissões
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROFISSOES_EM_DESTAQUE.map((p) => {
              const cor = RIASEC_INFO[p.riasec_primary].cor
              return (
                <Link
                  key={p.slug}
                  href={`/profissoes/${p.slug}`}
                  className="group relative overflow-hidden bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-xl motion-safe:hover:-translate-y-1 transition-all duration-200 flex flex-col"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundColor: cor }}
                  />
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {p.nome}
                    </h3>
                    <div className="flex gap-1 shrink-0" aria-label={`Código RIASEC ${p.riasec_code}`}>
                      {[...p.riasec_code].map((letra) => (
                        <span
                          key={letra}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[11px] font-bold"
                          style={{ backgroundColor: RIASEC_INFO[letra as RIASECType].cor }}
                        >
                          {letra}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">{p.area}</p>
                  <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{p.descricao}</p>
                  <span className="mt-5 text-sm font-semibold text-primary inline-flex items-center gap-1">
                    Ver ficha
                    <ArrowRight className="w-4 h-4 motion-safe:group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              )
            })}
          </div>
          <div className="mt-10 text-center md:hidden">
            <Link
              href="/?section=carreiras"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card border border-border text-foreground font-medium hover:border-primary/40 hover:text-primary transition-colors"
            >
              Ver todas as profissões
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* O que você encontra */}
      <section className="px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Rotulo>Na plataforma</Rotulo>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground text-balance">
              O que você encontra no INOVA
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {recursos.map((r) => (
              <div
                key={r.titulo}
                className="bg-card p-8 rounded-2xl border border-border shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${r.cor}`}>
                  <r.icon className="w-7 h-7" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{r.titulo}</h3>
                <p className="text-muted-foreground">{r.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="px-4 py-20 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10 lg:gap-16">
          <div className="text-center lg:text-left">
            <Rotulo>Dúvidas</Rotulo>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground text-balance">
              Perguntas frequentes
            </h2>
            <p className="mt-4 text-muted-foreground">
              Não encontrou o que procurava? Fale com a gente.
            </p>
            <a
              href={`mailto:${EMAIL_CONTATO}`}
              className="group mt-6 inline-flex items-center gap-4 p-4 pr-6 rounded-2xl bg-primary/5 border border-primary/15 hover:border-primary/40 transition-colors text-left max-w-full"
            >
              <span className="w-12 h-12 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Mail className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-muted-foreground">Escreva para</span>
                <span className="block font-semibold text-primary break-all group-hover:underline">
                  {EMAIL_CONTATO}
                </span>
              </span>
            </a>
          </div>
          <div className="space-y-3">
            {perguntas.map(({ pergunta, resposta }) => (
              <details
                key={pergunta}
                className="group rounded-2xl border border-border bg-background open:bg-card open:shadow-sm transition-colors"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-5 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  {pergunta}
                  <span className="w-8 h-8 shrink-0 rounded-full bg-muted flex items-center justify-center group-open:bg-primary group-open:text-primary-foreground transition-colors">
                    <ChevronDown
                      className="w-4 h-4 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </span>
                </summary>
                <div className="px-6 pb-6 -mt-1 text-muted-foreground leading-relaxed">{resposta}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-4 py-20">
        <div className="relative overflow-hidden max-w-5xl mx-auto rounded-3xl bg-linear-to-br from-primary to-secondary px-6 py-16 md:px-16 text-center shadow-2xl shadow-primary/20">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-white/10" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white text-balance">
              Pronto para começar?
            </h2>
            <p className="mt-4 text-lg text-white/85 max-w-xl mx-auto">
              Faça o teste e descubra quais profissões combinam com você.
            </p>
            <Link
              href="/auth/cadastro"
              className="group mt-8 inline-flex items-center gap-2 whitespace-nowrap px-6 sm:px-8 py-4 bg-white text-primary font-semibold rounded-full shadow-lg hover:bg-white/90 transition-colors"
            >
              Descobrir minha profissão
              <ArrowRight className="w-5 h-5 motion-safe:group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 pt-12 pb-8 bg-card border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            <div className="text-center md:text-left">
              <Image
                src="/images/logo-inova.png"
                alt="INOVA"
                width={376}
                height={216}
                className="h-9 w-auto mx-auto md:mx-0"
              />
              <p className="mt-3 text-sm text-muted-foreground max-w-xs">
                Plataforma de Apoio à Orientação Profissional
                <br />
                Vale do Paranhana/RS
              </p>
            </div>
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <Link href="/metodologia" className="hover:text-foreground transition-colors">
                Metodologia
              </Link>
              <Link href="/termos" className="hover:text-foreground transition-colors">
                Termos
              </Link>
              <Link href="/privacidade" className="hover:text-foreground transition-colors">
                Privacidade
              </Link>
              <a
                href={`mailto:${EMAIL_CONTATO}`}
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                Contato
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
