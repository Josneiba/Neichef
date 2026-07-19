'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle2 } from 'lucide-react'

function ConfirmedContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const href = next && next.startsWith('/app') ? next : '/app'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <span className="font-serif text-2xl text-foreground">NeiChef</span>
        <h1 className="font-serif text-3xl text-foreground mt-4 mb-2">Cuenta confirmada</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tu email ya está confirmado. Ahora puedes entrar a tu cocina, completar tu perfil y empezar a guardar ingredientes y recetas.
        </p>
        <Link href={href} className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Ir a NeiChef
        </Link>
        <Link href="/auth/sign-in" className="mt-3 inline-flex text-sm text-muted-foreground hover:text-foreground">
          Iniciar sesión manualmente
        </Link>
      </div>
    </div>
  )
}

export default function ConfirmedPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmedContent />
    </Suspense>
  )
}
