'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (response.ok) {
      router.push('/app')
      return
    }

    const payload = await response.json().catch(() => ({}))
    setError(payload.error ?? 'Unable to sign in')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Back to home
        </Link>

        <div className="mb-8">
          <span className="font-serif text-2xl text-foreground">NeiChef</span>
          <h1 className="font-serif text-3xl text-foreground mt-4 mb-2">Sign in</h1>
          <p className="text-sm text-muted-foreground">Welcome back. Access your pantry and recipes.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Email address</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="alex@example.com" required className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-foreground">Password</label>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Forgot password?</a>
            </div>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" required className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button type="submit" className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
            Sign in
          </button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-6">
          New to NeiChef?{' '}
          <Link href="/auth/sign-up" className="text-primary hover:underline font-medium">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
