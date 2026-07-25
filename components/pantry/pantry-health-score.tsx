'use client'

import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import { calculatePantryHealthScore } from '@/lib/pantry/health-score'
import type { PantryItem } from '@/lib/types'

interface PantryHealthScoreCardProps {
  items: PantryItem[]
}

export function PantryHealthScoreCard({ items }: PantryHealthScoreCardProps) {
  const health = calculatePantryHealthScore(items)
  const isCritical = health.status === 'critical'
  const isGoodOrBetter = health.status === 'excellent' || health.status === 'good'

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Pantry health</p>
          <h2 className="font-serif text-xl text-foreground">{health.score}/100</h2>
        </div>
        <div className={isCritical ? 'rounded-full bg-[oklch(0.93_0.05_25)] p-2 text-[oklch(0.42_0.15_25)]' : isGoodOrBetter ? 'rounded-full bg-[oklch(0.92_0.04_145)] p-2 text-primary' : 'rounded-full bg-[oklch(0.94_0.07_75)] p-2 text-[oklch(0.42_0.10_55)]'}>
          {isCritical ? <AlertTriangle className="h-4 w-4" strokeWidth={1.6} /> : isGoodOrBetter ? <CheckCircle2 className="h-4 w-4" strokeWidth={1.6} /> : <Sparkles className="h-4 w-4" strokeWidth={1.6} />}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {health.status === 'critical' && 'Attention needed soon.'}
        {health.status === 'fair' && 'A few items need attention.'}
        {health.status === 'good' && 'Your pantry is in good shape.'}
        {health.status === 'excellent' && 'Your pantry is in excellent shape.'}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
        <div className="rounded-lg bg-muted px-2 py-2">
          <p className="font-serif text-lg text-foreground">{health.freshCount}</p>
          <p>Fresh</p>
        </div>
        <div className="rounded-lg bg-muted px-2 py-2">
          <p className="font-serif text-lg text-foreground">{health.expiringSoonCount}</p>
          <p>Expiring</p>
        </div>
        <div className="rounded-lg bg-muted px-2 py-2">
          <p className="font-serif text-lg text-foreground">{health.expiredCount}</p>
          <p>Expired</p>
        </div>
      </div>
    </div>
  )
}
