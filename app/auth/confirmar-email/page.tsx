"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ConfirmarEmailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="p-4">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao início</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-8">
          {/* Logo */}
          <Image
            src="/images/logo-inova.png"
            alt="INOVA"
            width={180}
            height={60}
            className="mx-auto"
          />

          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-primary" />
          </div>

          {/* Message */}
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground">
              Verifique seu email
            </h1>
            <p className="text-muted-foreground">
              Enviamos um link de confirmação para o seu email. 
              Clique no link para ativar sua conta e começar a usar o INOVA.
            </p>
          </div>

          {/* Tips */}
          <div className="bg-muted/50 p-4 rounded-lg text-left space-y-2">
            <p className="text-sm font-medium text-foreground">Não recebeu o email?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Verifique sua pasta de spam</li>
              <li>• Confirme se o email está correto</li>
              <li>• Aguarde alguns minutos e verifique novamente</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-center"
            >
              Ir para o login
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
