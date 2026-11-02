"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react'

export default function NovaSenhaPage() {
  const router = useRouter()
  const supabase = createClient()

  // null = ainda verificando; false = link inválido/expirado
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // O /auth/callback já trocou o código do email por uma sessão antes de
  // chegar aqui; sem sessão, o link expirou ou já foi usado.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))
  }, [supabase])

  const passwordRequirements = [
    { met: password.length >= 8, text: 'Mínimo de 8 caracteres' },
    { met: /[A-Z]/.test(password), text: 'Uma letra maiúscula' },
    { met: /[a-z]/.test(password), text: 'Uma letra minúscula' },
    { met: /[0-9]/.test(password), text: 'Um número' }
  ]

  const isPasswordValid = passwordRequirements.every(req => req.met)
  const doPasswordsMatch = password === confirmPassword && password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid) {
      setError('A senha não atende aos requisitos')
      return
    }
    if (!doPasswordsMatch) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(
        error.code === 'same_password'
          ? 'A nova senha precisa ser diferente da anterior.'
          : 'Não foi possível alterar a senha. Peça um novo link e tente de novo.'
      )
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
              Criar nova senha
            </h1>
          </div>

          {hasSession === null && (
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {hasSession === false && (
            <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
              <p className="text-sm text-foreground">
                Este link expirou ou já foi usado.
              </p>
              <Link href="/auth/esqueci-senha" className="text-primary hover:underline font-medium text-sm">
                Pedir um novo link
              </Link>
            </div>
          )}

          {hasSession && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 pr-12 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="Sua nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {passwordRequirements.map((req) => (
                      <li
                        key={req.text}
                        className={`flex items-center gap-2 text-xs ${req.met ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        <Check className="w-3 h-3" />
                        {req.text}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Repita a nova senha"
                  />
                  {confirmPassword.length > 0 && !doPasswordsMatch && (
                    <p className="mt-2 text-xs text-destructive">As senhas não coincidem</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar nova senha'
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
