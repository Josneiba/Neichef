'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft } from 'lucide-react'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Confirming your email...')
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function confirm() {
      try {
        const { data, error } = await supabase.auth.detectSessionInUrl({ storeSession: true })
        if (error) {
          setError(error.message || 'No se pudo confirmar el email.')
          setStatus('Confirmation failed')
          return
        }

        if (data?.session) {
          setStatus('Email confirmado correctamente. Redirigiendo...')
          window.setTimeout(() => router.push('/app'), 1600)
          return
        }

        setStatus('Email confirmado. Ahora puedes iniciar sesión.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado al confirmar el email.')
        setStatus('Confirmation failed')
      }
    }

    confirm()
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Back to home
        </Link>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-serif text-3xl text-foreground mb-3">Confirm your email</h1>
          <p className="text-sm text-muted-foreground mb-6">This page completes the email verification flow for your account.</p>

          <div className="rounded-2xl border border-border bg-background p-6">
            <p className="text-sm text-foreground mb-3">{status}</p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {!error ? (
              <p className="text-sm text-muted-foreground">If you are not redirected automatically, you can <Link href="/auth/sign-in" className="text-primary hover:underline">sign in manually</Link>.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Please retry the confirmation link or <Link href="/auth/sign-up" className="text-primary hover:underline">create a new account</Link>.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
