import Link from 'next/link'

/** "ou" + botão para usar o site sem conta (modo visitante), nas telas de login e cadastro. */
export function ContinuarSemConta() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        ou
        <div className="h-px flex-1 bg-border" />
      </div>
      <Link
        href="/?section=inicio"
        className="block w-full py-3 px-4 border border-input text-center text-foreground font-medium rounded-lg hover:bg-muted transition-colors"
      >
        Continuar sem conta
      </Link>
    </div>
  )
}
