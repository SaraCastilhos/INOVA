import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'

interface ConviteContaProps {
  titulo: string
  descricao: string
  className?: string
}

/** Convite para criar conta / entrar, mostrado ao visitante (uso sem conta). */
export function ConviteConta({ titulo, descricao, className = '' }: ConviteContaProps) {
  return (
    <Card className={`border-primary/30 bg-primary/5 ${className}`}>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{titulo}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{descricao}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/auth/cadastro">Criar conta grátis</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
