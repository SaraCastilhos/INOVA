import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Termos de Uso - INOVA',
}

export default function TermosPage() {
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
          <h1 className="text-2xl font-bold text-foreground">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Última atualização: a definir. Rascunho pendente de revisão jurídica.
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-foreground space-y-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-6 [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
          <p>
            O INOVA é uma plataforma gratuita de apoio à orientação profissional,
            desenvolvida como Trabalho de Conclusão de Curso, voltada principalmente
            a estudantes do Ensino Médio e a adultos em transição de carreira.
          </p>

          <h2>1. Natureza da ferramenta</h2>
          <p>
            O teste vocacional RIASEC e demais conteúdos oferecidos pelo INOVA são
            ferramentas de autoconhecimento e apoio informativo. Eles{' '}
            <strong>não substituem</strong> a avaliação de um psicólogo ou
            orientador profissional habilitado (CFP).
          </p>

          <h2>2. Cadastro e conta</h2>
          <ul>
            <li>O cadastro exige nome, e-mail, senha e, opcionalmente, data de nascimento.</li>
            <li>Você é responsável por manter a confidencialidade da sua senha.</li>
            <li>É permitido alternar entre os perfis Estudante e Profissional, com limite de troca a cada 30 dias.</li>
          </ul>

          <h2>3. Conteúdo enviado pelo usuário</h2>
          <p>
            Depoimentos e mensagens no fórum passam por moderação antes de serem
            publicados publicamente. Não é permitido conteúdo ofensivo,
            discriminatório ou que viole direitos de terceiros. Conteúdo em
            desacordo com estes termos pode ser removido.
          </p>

          <h2>4. Especialistas verificados</h2>
          <p>
            Profissionais podem solicitar o selo de "Especialista Verificado" para
            responder na categoria restrita do fórum. A aprovação é feita pela
            equipe administrativa do INOVA.
          </p>

          <h2>5. Exclusão de conta</h2>
          <p>
            Você pode solicitar a exclusão da sua conta a qualquer momento. Dados
            pessoais são removidos; publicações já feitas no fórum permanecem
            atribuídas a "Usuário removido", conforme detalhado na{' '}
            <Link href="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>

          <h2>6. Contato</h2>
          <p>Dúvidas sobre estes termos podem ser enviadas para a equipe do INOVA.</p>
        </div>
      </main>
    </div>
  )
}
