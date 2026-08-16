'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { ArrowLeft, ChefHat, ShieldCheck } from 'lucide-react'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const paramError = searchParams.get('error')
    if (paramError) setError(paramError)
  }, [searchParams])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    })

    if (response.ok) {
      const next = searchParams.get('next')
      router.push(next && next.startsWith('/app') ? next : '/app')
      router.refresh()
      return
    }

    const payload = await response.json().catch(() => ({}))
    setError(payload.error ?? 'Unable to sign in')
  }

  return (
    <div className="auth-page min-h-screen px-6 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="hidden rounded-[2rem] border border-border bg-card/50 p-8 shadow-[0_18px_60px_rgba(17,24,39,0.08)] lg:block">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl text-foreground">NeiChef</span>
          </div>

          <div className="mt-10 max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <ChefHat className="h-3.5 w-3.5" strokeWidth={2} />
              Smart pantry planning
            </div>
            <h1 className="mt-6 font-serif text-5xl leading-[0.95] tracking-tight text-foreground">
              Cook with what you already have.
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Track pantry essentials, use recipes based on expiring ingredients, and make better meals with less waste.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Pantry overview', text: 'Know exactly what is in the fridge and cupboard.' },
              { title: 'Recipe matching', text: 'Surface meals that fit the ingredients you already have.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/8 text-primary">
                  <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
                </div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-card mx-auto w-full max-w-md rounded-[2rem] border border-border bg-card p-6 shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:p-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Back to home
          </Link>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Welcome back</p>
            <h2 className="mt-3 font-serif text-4xl text-foreground">Sign in</h2>
            <p className="mt-2 text-sm text-muted-foreground">Access your pantry, recipes, and household plan.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Email address</label>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="alex@example.com" required className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10" />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Password</label>
                <a href="#" className="text-xs text-muted-foreground transition hover:text-foreground">Forgot password?</a>
              </div>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" required className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10" />
            </div>

            {error ? <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}

            <button type="submit" className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
              Sign in
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-muted-foreground">
            New to NeiChef?{' '}
            <Link href="/auth/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  )
}
