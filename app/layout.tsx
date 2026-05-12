import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
