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
          width={376}
          height={216}
          preload
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
            <li>Teste feito sem conta: as respostas ficam apenas no seu navegador e não são enviadas ao INOVA. Se você criar uma conta depois, nesse mesmo navegador, o resultado é salvo nela.</li>
            <li>Dados de perfil que você escolhe informar: foto, bio, contato, profissão (da lista oficial da CBO), situação nela, tempo de experiência e formação.</li>
            <li>Conteúdo publicado por você: depoimentos e mensagens do fórum.</li>
            <li>Métricas de acesso anônimas e agregadas (Vercel Analytics), usadas apenas para fins estatísticos, sem identificação individual.</li>
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
            comerciais. Ficam visíveis publicamente dentro da plataforma, conforme
            a natureza da comunidade: o nome de exibição, os dados de perfil que
            você escolher informar (foto, bio, contato, profissão, tempo de
            experiência e formação), os depoimentos e as mensagens do fórum. A
            profissão informada também aparece nos seus depoimentos; ela é
            declarada por você e não é verificada pelo INOVA. Seu e-mail e sua
            data de nascimento nunca são exibidos a outras pessoas.
          </p>

          <h2>5. Exclusão e anonimização</h2>
          <p>
            Você pode excluir sua conta pelo próprio site, em Perfil &gt; Excluir
            minha conta. Se não conseguir acessá-la, envie um e-mail para{' '}
            <a href="mailto:contat3.inova@gmail.com" className="text-primary hover:underline">contat3.inova@gmail.com</a>{' '}
            a partir do endereço cadastrado, para confirmarmos que o pedido é seu.
            Ao excluir a conta, seus dados pessoais (nome, e-mail, data de
            nascimento, foto, bio, contato, profissão, formação, resultados do teste
            e conquistas) são
            apagados e não podem ser recuperados. As publicações feitas com ela
            (depoimentos, tópicos, respostas e comentários) são anonimizadas:
            continuam na Comunidade, mas sem vínculo com você, com o autor exibido
            como &quot;Usuário removido&quot;. Se quiser que alguma publicação seja
            apagada, exclua-a antes de excluir a conta, ou peça pelo e-mail acima.
          </p>

          <h2>6. Seus direitos</h2>
          <p>
            Conforme a LGPD, você pode solicitar a qualquer momento: confirmação
            do tratamento, acesso aos dados, correção, anonimização ou exclusão,
            e revogação do consentimento. Para isso, escreva para o e-mail de
            contato indicado abaixo.
          </p>

          <h2>7. Segurança</h2>
          <p>
            A plataforma utiliza conexão HTTPS, senhas com hash e controle de
            acesso por linha (Row Level Security) no banco de dados.
          </p>

          <h2>8. Crianças e adolescentes</h2>
          <p>
            O INOVA é voltado a pessoas com 14 anos ou mais. Usuários menores de 18
            anos devem usar a plataforma com a ciência dos pais ou responsáveis, que
            também podem solicitar a exclusão da conta e dos dados pelo e-mail de
            contato. Por segurança, perfis de menores de 18 anos (pela data de
            nascimento informada no cadastro) não exibem contato.
          </p>

          <h2>9. Contato</h2>
          <p>
            Solicitações relacionadas aos seus dados pessoais podem ser enviadas
            para <a href="mailto:contat3.inova@gmail.com" className="text-primary hover:underline">contat3.inova@gmail.com</a>.
          </p>
        </div>
      </main>
    </div>
  )
}
