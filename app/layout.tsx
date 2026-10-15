import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/auth-context'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'INOVA - Plataforma de Apoio à Orientação Profissional',
  description: 'Descubra seu perfil profissional com o teste RIASEC, explore carreiras e conecte-se com experiências reais de profissionais.',
  keywords: ['orientação profissional', 'teste vocacional', 'RIASEC', 'carreiras', 'Vale do Paranhana'],
  authors: [{ name: 'INOVA' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1A5276',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className={`${inter.variable} font-sans antialiased min-h-screen`}>
        {/* No layout raiz (e não dentro de app/page.tsx) para o login inicializar
            uma vez só: o layout não desmonta ao navegar entre / e
            /profissoes/[slug], então voltar de uma profissão não recarrega o app. */}
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="bottom-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}