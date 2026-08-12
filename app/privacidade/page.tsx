import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidade - INOVA',
}

export default function PrivacidadePage() {
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
          <h1 className="text-2xl font-bold text-foreground">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Última atualização: a definir. Rascunho pendente de revisão jurídica.
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-foreground space-y-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-6 [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
          <p>
            Esta política descreve como o INOVA trata os dados pessoais dos
            usuários, em conformidade com a Lei Geral de Proteção de Dados
            (LGPD, Lei nº 13.709/2018).
          </p>

          <h2>1. Dados coletados</h2>
          <ul>
            <li>Dados de cadastro: nome, e-mail, senha (armazenada com hash) e, opcionalmente, data de nascimento.</li>
            <li>Dados de uso: respostas e resultados do teste vocacional RIASEC.</li>
            <li>Conteúdo publicado por você: depoimentos e mensagens do fórum.</li>
            <li>Registros de acesso anônimos, usados apenas para fins estatísticos, sem identificação individual.</li>
          </ul>

          <h2>2. Finalidade do tratamento</h2>
          <p>
            Os dados são usados exclusivamente para viabilizar o funcionamento da
            plataforma: autenticação, cálculo e histórico do teste vocacional,
            recomendações de carreira e participação na comunidade.
          </p>

          <h2>3. Base legal</h2>
          <p>
            O tratamento se baseia no consentimento explícito fornecido no
            cadastro. Você pode revogar esse consentimento a qualquer momento,
            solicitando a exclusão da sua conta.
          </p>

          <h2>4. Compartilhamento</h2>
          <p>
            Os dados não são vendidos ou compartilhados com terceiros para fins
            comerciais. O nome de exibição e depoimentos aprovados ficam visíveis
            publicamente dentro da plataforma, conforme a natureza da comunidade.
          </p>

          <h2>5. Exclusão e anonimização</h2>
          <p>
            Ao excluir sua conta, seus dados pessoais (nome, e-mail, data de
            nascimento) são removidos. Publicações já existentes no fórum têm o
            autor substituído por "Usuário removido", preservando o histórico da
            discussão sem manter vínculo com sua identidade.
          </p>

          <h2>6. Seus direitos</h2>
          <p>
            Conforme a LGPD, você pode solicitar a qualquer momento: confirmação
            do tratamento, acesso aos dados, correção, anonimização ou exclusão,
            e revogação do consentimento.
          </p>

          <h2>7. Segurança</h2>
          <p>
            A plataforma utiliza conexão HTTPS, senhas com hash e controle de
            acesso por linha (Row Level Security) no banco de dados.
          </p>

          <h2>8. Contato</h2>
          <p>
            Solicitações relacionadas aos seus dados pessoais podem ser enviadas
            para a equipe responsável pelo INOVA.
          </p>
        </div>
      </main>
    </div>
  )
}
