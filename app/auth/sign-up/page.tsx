'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'

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

    if (response.ok) {
      setSubmitted(true)
      setError('')
      return
    }

    const payload = await response.json().catch(() => ({}))
    setError(payload.error ?? 'Unable to create account')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Back to home
        </Link>

        <div className="mb-8">
          <span className="font-serif text-2xl text-foreground">NeiChef</span>
          <h1 className="font-serif text-3xl text-foreground mt-4 mb-2">Create your account</h1>
          <p className="text-sm text-muted-foreground">Set up your household profile and start tracking food with confidence.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Full name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} type="text" placeholder="Alex Rivera" required className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Email address</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="alex@example.com" required className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="block text-xs font-medium text-foreground mb-1.5">Password</label>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="••••••••" required className="w-full pr-10 px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-8 inline-flex items-center justify-center p-1 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-foreground mb-1.5">Confirm password</label>
              <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showConfirm ? 'text' : 'password'} placeholder="••••••••" required className="w-full pr-10 px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              <button type="button" aria-label="Toggle confirm password visibility" onClick={() => setShowConfirm((s) => !s)} className="absolute right-2 top-8 inline-flex items-center justify-center p-1 text-muted-foreground">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Household size</label>
            <select value={householdSize} onChange={(event) => setHouseholdSize(Number(event.target.value))} className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              {[1,2,3,4,5,6].map((size) => <option key={size} value={size}>{size} {size === 1 ? 'person' : 'people'}</option>)}
            </select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {submitted ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
              Cuenta creada. Revisa tu correo y confirma tu email usando el enlace enviado. Después podrás iniciar sesión.
            </div>
          ) : (
            <button type="submit" className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              Create account
            </button>
          )}
        </form>

        <p className="text-sm text-center text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
