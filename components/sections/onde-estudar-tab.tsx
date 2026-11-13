'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PROFISSOES } from '@/lib/guia'
import {
  instituicoesComCursos,
  cursosAtualizadoEm,
  ORDEM_REGIAO,
  REGIAO_LABEL,
  NIVEL_LABEL,
  INGRESSO_LABEL,
  BOLSA_LABEL,
  type RegiaoInstituicao,
} from '@/lib/cursos'
import { fmtData } from '@/lib/format'
import { Building2, ExternalLink, MapPin, ChevronDown } from 'lucide-react'

// Aba "Onde estudar" do guia: as mesmas instituições e cursos da seção
// "Onde estudar" de cada profissão (data/cursos.json), vistos pelo lado da
// instituição. Nada aqui é escrito à mão: muda o JSON, muda a aba.
const LISTA = instituicoesComCursos(PROFISSOES)

type FiltroRegiao = RegiaoInstituicao | 'todas'

export function OndeEstudarTab() {
  const [regiao, setRegiao] = useState<FiltroRegiao>('todas')
  const [soGratuitas, setSoGratuitas] = useState(false)

  const visiveis = useMemo(
    () =>
      LISTA.filter(
        (x) =>
          (regiao === 'todas' || x.instituicao.regiao === regiao) &&
          (!soGratuitas || x.instituicao.gratuita),
      ),
    [regiao, soGratuitas],
  )

  return (
    <div className="space-y-4">
      <Card className="bg-secondary/5 border-secondary/20">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 text-secondary">
            <MapPin className="h-5 w-5" />
            <span className="font-medium">Vale do Paranhana, Vale do Sinos e Porto Alegre</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Cursos presenciais ligados às profissões do guia. Toque em um curso para ver a página dele
            na instituição, ou em uma profissão para saber mais sobre ela.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['todas', ...ORDEM_REGIAO] as FiltroRegiao[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={regiao === r ? 'default' : 'outline'}
                onClick={() => setRegiao(r)}
                aria-pressed={regiao === r}
              >
                {r === 'todas' ? 'Todas as regiões' : REGIAO_LABEL[r]}
              </Button>
            ))}
            <Button
              size="sm"
              variant={soGratuitas ? 'default' : 'outline'}
              onClick={() => setSoGratuitas((v) => !v)}
              aria-pressed={soGratuitas}
            >
              Só gratuitas
            </Button>
          </div>
        </CardContent>
      </Card>

      {visiveis.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma instituição gratuita pesquisada nesta região.
        </p>
      )}

      {visiveis.map(({ instituicao: inst, cursos }) => (
        <Card key={inst.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg text-foreground">{inst.nome}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-1 mt-1">
                  <span className="font-bold text-primary">{inst.sigla}</span>
                  <span>·</span>
                  <span>{inst.cidade}</span>
                  <span>·</span>
                  <span>{REGIAO_LABEL[inst.regiao]}</span>
                </CardDescription>
              </div>
              <Building2 className="h-6 w-6 shrink-0 text-secondary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  inst.gratuita ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'
                }`}
              >
                {inst.gratuita ? 'Gratuita' : 'Com mensalidade'}
              </span>
              {inst.bolsas.map((b) => (
                <span key={b} className="px-2 py-1 rounded-lg text-xs bg-secondary/10 text-secondary font-medium">
                  Aceita {BOLSA_LABEL[b]}
                </span>
              ))}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Como entrar</h4>
              {inst.ingresso.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {inst.ingresso.map((i) => INGRESSO_LABEL[i]).join(' · ')}
                </p>
              )}
              {inst.ingresso_nota && <p className="text-sm text-muted-foreground mt-1">{inst.ingresso_nota}</p>}
              <a
                href={inst.ingresso_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
              >
                {inst.ingresso.length > 0 ? 'Página oficial de ingresso' : 'Página oficial'}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-foreground">
                {cursos.length === 1 ? '1 curso ligado ao guia' : `${cursos.length} cursos ligados ao guia`}
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-2 space-y-2">
                {cursos.map((c) => (
                  <li key={c.id} className="rounded-xl border border-border p-3">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {c.nome}
                    </a>{' '}
                    <span className="text-xs text-muted-foreground">· {NIVEL_LABEL[c.nivel]}</span>
                    {c.profissoes.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {c.profissoes.map((p) => (
                          <Link
                            key={p.slug}
                            href={`/profissoes/${p.slug}`}
                            className="px-2 py-0.5 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            {p.nome}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </CardContent>
        </Card>
      ))}

      <p className="text-xs text-muted-foreground">
        Informações conferidas nos sites oficiais das instituições em {fmtData(cursosAtualizadoEm)}. Datas,
        vagas e regras mudam a cada processo seletivo: confira sempre o edital antes de se inscrever. Só
        aparecem aqui os cursos ligados a alguma profissão do guia, não o catálogo inteiro de cada
        instituição.
      </p>
    </div>
  )
}
