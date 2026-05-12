"use client"

import Link from 'next/link'
import Image from 'next/image'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

export default function AuthErrorPage() {
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
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>

          {/* Message */}
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground">
              Ops! Algo deu errado
            </h1>
            <p className="text-muted-foreground">
              Ocorreu um erro durante a autenticação. 
              Por favor, tente novamente ou entre em contato conosco se o problema persistir.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-center"
            >
              Tentar novamente
            </Link>
            <Link
              href="/"
              className="block w-full py-3 px-4 border border-input text-foreground font-medium rounded-lg hover:bg-muted transition-colors text-center"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
