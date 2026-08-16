'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Sparkles } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [householdSize, setHouseholdSize] = useState(2)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const response = await fetch('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, householdSize }),
    })

    const payload = await response.json().catch(() => ({}))
    if (response.ok) {
      if (payload.confirmed) {
        router.push('/app')
        return
      }
      setSuccessMessage(payload.message || 'Cuenta creada. Revisa tu correo para confirmar tu email.')
      setSubmitted(true)
      setError('')
      return
    }

    setError(payload.error ?? 'Unable to create account')
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
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              Start fresh
            </div>
            <h1 className="mt-6 font-serif text-5xl leading-[0.95] tracking-tight text-foreground">
              Build a calmer kitchen routine.
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Set up your household profile, track pantry essentials, and start cooking with less waste from day one.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {[
              'Track your pantry across fridge, freezer, and cupboard',
              'Get recipe ideas based on what is already in the house',
              'Make smarter grocery decisions before the next shopping trip',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4 text-sm text-foreground">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                <span>{item}</span>
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Join the kitchen</p>
            <h2 className="mt-3 font-serif text-4xl text-foreground">Create your account</h2>
            <p className="mt-2 text-sm text-muted-foreground">Set up your household profile in a minute and start planning smarter meals.</p>
          </div>

          {submitted ? (
            <div className="mt-8 rounded-[1.5rem] border border-primary/25 bg-primary/5 p-5 text-sm text-foreground">
              <p className="font-medium text-foreground">Check your email to confirm your account</p>
              <p className="mt-3 text-muted-foreground leading-6">{successMessage}</p>
              <ol className="mt-4 space-y-2 text-muted-foreground">
                <li>1. Open the email from Supabase/NeiChef.</li>
                <li>2. Click the confirmation link.</li>
                <li>3. Return here and sign in to continue.</li>
              </ol>
              <Link href="/auth/sign-in" className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                I confirmed, sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Full name</label>
                <input value={name} onChange={(event) => setName(event.target.value)} type="text" placeholder="Alex Rivera" required className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10" />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Email address</label>
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="alex@example.com" required className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10" />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="relative">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Password</label>
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="••••••••" required className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10" />
                  <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-[42px] inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="relative">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Confirm</label>
                  <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showConfirm ? 'text' : 'password'} placeholder="••••••••" required className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10" />
                  <button type="button" aria-label="Toggle confirm password visibility" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-[42px] inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Household size</label>
                <select value={householdSize} onChange={(event) => setHouseholdSize(Number(event.target.value))} className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10">
                  {[1, 2, 3, 4, 5, 6].map((size) => (
                    <option key={size} value={size}>{size} {size === 1 ? 'person' : 'people'}</option>
                  ))}
                </select>
              </div>

              {error ? <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}

              <button type="submit" className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90">
                Create account
              </button>
            </form>
          )}

          <p className="mt-7 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
