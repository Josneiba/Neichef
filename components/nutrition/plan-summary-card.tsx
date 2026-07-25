'use client'

import { type NutritionRestriction, type NutritionPlan } from '@prisma/client'

interface PlanSummaryCardProps {
  plan: NutritionPlan & { restrictions: NutritionRestriction[] }
}

const badgeClasses: Record<string, string> = {
  allergy: 'bg-destructive/10 text-destructive',
  avoid: 'bg-amber-100 text-amber-900',
  limit: 'bg-yellow-100 text-yellow-900',
  prefer: 'bg-emerald-100 text-emerald-900',
}

export function PlanSummaryCard({ plan }: PlanSummaryCardProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl text-foreground">{plan.title}</h2>
            <p className="text-sm text-muted-foreground">{plan.notes ?? 'Nutrition plan summary'}</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">{plan.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Calories</p>
            <p className="text-lg font-semibold text-foreground">{plan.caloriesTarget ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Protein</p>
            <p className="text-lg font-semibold text-foreground">{plan.proteinTargetG ?? '—'}g</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Carbs</p>
            <p className="text-lg font-semibold text-foreground">{plan.carbsTargetG ?? '—'}g</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fat</p>
            <p className="text-lg font-semibold text-foreground">{plan.fatTargetG ?? '—'}g</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(plan.restrictions ?? []).map((restriction) => (
            <span key={restriction.id} className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClasses[restriction.type] ?? 'bg-muted text-muted-foreground'}`}>
              {restriction.type}: {restriction.ingredientName}
            </span>
          ))}
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dates</div>
        <p className="text-sm text-foreground">{plan.startDate ? new Date(plan.startDate).toLocaleDateString() : 'Start date missing'} — {plan.endDate ? new Date(plan.endDate).toLocaleDateString() : 'Ongoing'}</p>
      </div>
    </div>
  )
}
