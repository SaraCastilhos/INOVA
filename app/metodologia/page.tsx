import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { guiaAtualizadoEm, PROFISSOES } from '@/lib/data'
import { INSTRUMENTO, ITENS } from '@/lib/instruments'

export const metadata = {
  title: 'Metodologia e Fontes - INOVA',
}

const fmtData = (iso: string | null) => {
  if (!iso) return 'em construção'
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

export default function MetodologiaPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-4 border-b border-border">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao início</span>
        </Link>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
        <Image
          src="/images/logo-inova.png"
          alt="INOVA"
          width={140}
          height={48}
          className="h-10 w-auto"
        />

        <div>
          <h1 className="text-2xl font-bold text-foreground">Metodologia e fontes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Guia de profissões: {PROFISSOES.length} profiss{PROFISSOES.length === 1 ? 'ão' : 'ões'} publicada
            {PROFISSOES.length === 1 ? '' : 's'} · última atualização em {fmtData(guiaAtualizadoEm)}
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-foreground space-y-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-6 [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
          <p>
            Cada profissão do guia é montada a partir de fontes públicas e oficiais.
            Nenhum dado é estimado ou preenchido de memória: os campos só entram no
            ar quando têm uma referência registrada, e cada ficha lista as fontes
            consultadas com a data de acesso.
          </p>

          <h2>De onde vem cada informação</h2>
          <ul>
            <li>
              <strong>Descrição, atividades típicas e habilidades:</strong>{' '}
              <a
                href="https://cbo.mte.gov.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Classificação Brasileira de Ocupações (CBO)
              </a>
              , do Ministério do Trabalho e Emprego. Cada profissão é vinculada ao
              seu código CBO, que permite conferir a origem do texto.
            </li>
            <li>
              <strong>Remuneração:</strong> microdados do{' '}
              <a
                href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/novo-caged"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Novo CAGED
              </a>{' '}
              (MTE). Exibimos o salário médio mensal e a faixa entre o 1º e o 3º
              quartil, com o período de referência. Quando a fonte usada é um
              agregador desses dados, isso é indicado na própria ficha.
            </li>
            <li>
              <strong>Perfil RIASEC (código de interesses):</strong>{' '}
              <a
                href="https://www.onetonline.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                O*NET
              </a>
              , base mantida pelo Departamento do Trabalho dos Estados Unidos, que
              publica o perfil de interesses de cada ocupação. Usamos a ocupação
              equivalente para atribuir o código de 2 a 3 letras.
            </li>
            <li>
              <strong>Formação exigida e regulamentação:</strong> CBO e, quando a
              profissão é regulamentada, o site do conselho profissional
              correspondente (CREA, CRP, CRM, CRC, OAB, CAU e outros).
            </li>
          </ul>

          <h2>Como uma profissão é publicada</h2>
          <p>
            O conteúdo é versionado no repositório do projeto. Uma ficha passa por
            um validador automático que exige todos os campos obrigatórios, salário
            numérico coerente (1º quartil ≤ média ≤ 3º quartil), pelo menos três
            atividades, três habilidades e uma fonte com URL e data de acesso. Só
            então ela recebe o status &quot;publicado&quot; e aparece no guia;
            enquanto isso não acontece, fica como rascunho e não é exibida.
          </p>

          <h2>Limitações conhecidas</h2>
          <ul>
            <li>
              Os valores de remuneração são médias nacionais e variam bastante por
              região, porte da empresa e experiência.
            </li>
            <li>
              O código RIASEC é uma referência de apoio, derivada de uma base
              internacional; não substitui o resultado do teste vocacional.
            </li>
            <li>
              O guia é uma ferramenta informativa e complementar. Ele não substitui
              a orientação de um psicólogo ou orientador profissional.
            </li>
          </ul>

          <h2 id="teste">O teste vocacional</h2>
          <p>
            O teste de interesses é uma adaptação para o português do{' '}
            <a
              href={INSTRUMENTO.fontes[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {INSTRUMENTO.origem.instrumento}
            </a>
            , instrumento público do Departamento do Trabalho dos Estados Unidos
            baseado no modelo RIASEC de John Holland ({INSTRUMENTO.origem.autores}).
            São {ITENS.length} atividades de trabalho, {INSTRUMENTO.pontuacao.itens_por_tipo}{' '}
            por tipo, e para cada uma você indica o quanto gostaria de fazê-la, numa
            escala de {INSTRUMENTO.escala.opcoes.length} pontos. A pontuação de cada tipo é
            a soma das respostas (de {INSTRUMENTO.pontuacao.min_por_tipo} a{' '}
            {INSTRUMENTO.pontuacao.max_por_tipo}), e o resultado mostra os três tipos
            com maior pontuação.
          </p>
          <ul>
            <li>
              Não existe versão oficial do instrumento em português. A tradução
              foi feita pela equipe do INOVA
              {INSTRUMENTO.status === 'rascunho'
                ? ' e ainda está em revisão por especialistas.'
                : ` e revisada por ${INSTRUMENTO.revisado_por}.`}
            </li>
            <li>
              Cada resultado é salvo junto com a versão do questionário que o gerou
              (atual: {INSTRUMENTO.version}). Resultados de
              versões diferentes não são comparados entre si.
            </li>
            <li>
              Quando as pontuações ficam muito próximas, o resultado avisa que o
              perfil é pouco diferenciado e deve ser lido como pista, não como
              resposta fechada.
            </li>
            <li>
              É um questionário de interesses para autoconhecimento. Não mede
              aptidão e não substitui a avaliação de um psicólogo ou orientador
              profissional habilitado.
            </li>
          </ul>

          <h2>Encontrou algo desatualizado?</h2>
          <p>
            Envie um aviso para a equipe do INOVA indicando a profissão e a fonte
            mais recente. As correções entram na próxima revisão do guia.
          </p>
        </div>
      </main>
    </div>
  )
}
