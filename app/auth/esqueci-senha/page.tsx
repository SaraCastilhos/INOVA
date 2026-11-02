"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react'

export default function EsqueciSenhaPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/nova-senha`
    })

    setLoading(false)

    // Só mostra erro de limite de envios; qualquer outro caso cai na
    // mesma mensagem, para não revelar quais emails têm conta.
    if (error && error.status === 429) {
      setError('Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.')
      return
    }

    setSent(true)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="p-4">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para o login</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Image
              src="/images/logo-inova.png"
              alt="INOVA"
              width={376}
              height={216}
              preload
              className="mx-auto mb-4 h-[60px] w-[180px] object-contain"
            />
            <h1 className="text-2xl font-bold text-foreground">
              Esqueceu sua senha?
            </h1>
            <p className="text-muted-foreground mt-2">
              Informe seu email e enviaremos um link para criar uma nova senha
            </p>
          </div>

          {sent ? (
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg text-center space-y-3">
              <MailCheck className="w-10 h-10 text-primary mx-auto" />
              <p className="text-foreground font-medium">Verifique seu email</p>
              <p className="text-sm text-muted-foreground">
                Se existir uma conta com <strong>{email}</strong>, você vai receber um link
                para redefinir a senha. Confira também a caixa de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar link'
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
