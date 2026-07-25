'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, BookOpen } from 'lucide-react'

type Suggestion = { id: string; title: string; pantryMatchCount: number; usesExpiringItems: boolean }

export function ExpiringRecipes() {
  const [items, setItems] = useState<Suggestion[] | null>(null)
  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const res = await fetch('/api/recipes/suggestions')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        const prioritized = (data as Suggestion[]).sort((a, b) => Number(b.usesExpiringItems) - Number(a.usesExpiringItems)).slice(0, 3)
        setItems(prioritized)
      } catch {
        // silent
      }
    })()
    return () => { mounted = false }
  }, [])

  if (!items) return null
  if (items.length === 0) return null

  return (
    <div className="mt-4 grid gap-2">
      {items.map((r) => (
        <Link key={r.id} href={`/app/recipes/${r.id}`} className="flex items-center gap-3 p-2 rounded-md border border-border hover:bg-muted transition-colors">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-100 to-rose-100 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-amber-700" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium truncate">{r.title}</p>
            <p className="text-xs text-muted-foreground">Uses {r.pantryMatchCount} of your items {r.usesExpiringItems ? '· Uses expiring items' : ''}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
