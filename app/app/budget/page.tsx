'use client'

import { useBudget, usePantry } from '@/lib/hooks'
import { TrendingUp, TrendingDown, Package, Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'

function BarChart({ data }: { data: { label: string; saved: number; wasted: number }[] }) {
  const max = Math.max(...data.flatMap((d) => [d.saved, d.wasted]))

  return (
    <div className="flex items-end gap-2 h-36">
      {data.map(({ label, saved, wasted }) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="flex items-end gap-0.5 w-full h-28">
            <div
              className="flex-1 rounded-t-sm bg-primary transition-all"
              style={{ height: `${max > 0 ? (saved / max) * 100 : 0}%` }}
              title={`Saved: $${saved}`}
            />
            <div
              className="flex-1 rounded-t-sm bg-[oklch(0.83_0.08_25)] transition-all"
              style={{ height: `${max > 0 ? (wasted / max) * 100 : 0}%` }}
              title={`Wasted: $${wasted}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}

export default function BudgetPage() {
  const budget = useBudget()
  const { items } = usePantry()

  const freshItems = items.filter((i) => i.urgency === 'fresh').length
  const wasteRate = Math.round(
    (budget.estimatedWastedAmount / (budget.estimatedSavedAmount + budget.estimatedWastedAmount)) * 100
  )

  const weeklyChartData = budget.weeklyData.map((d) => ({ label: d.week, saved: d.saved, wasted: d.wasted }))
  const monthlyChartData = budget.monthlyTotals.map((d) => ({ label: d.month, saved: d.saved, wasted: d.wasted }))

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Insights</p>
        <h1 className="font-serif text-3xl text-foreground">Budget & Waste</h1>
        <p className="text-sm text-muted-foreground mt-1">Track money saved and food wasted over time.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Saved this month',
            value: `$${budget.estimatedSavedAmount.toFixed(0)}`,
            icon: TrendingUp,
            color: 'text-primary',
            bg: 'bg-[oklch(0.92_0.04_145)]',
            iconColor: 'text-primary',
            desc: 'From using items before expiry',
          },
          {
            label: 'Wasted this month',
            value: `$${budget.estimatedWastedAmount.toFixed(0)}`,
            icon: TrendingDown,
            color: 'text-[oklch(0.42_0.15_25)]',
            bg: 'bg-[oklch(0.93_0.05_25)]',
            iconColor: 'text-[oklch(0.42_0.15_25)]',
            desc: 'Estimated from expired items',
          },
          {
            label: 'Items saved',
            value: String(budget.itemsSavedCount),
            icon: Package,
            color: 'text-foreground',
            bg: 'bg-muted',
            iconColor: 'text-muted-foreground',
            desc: 'Used before best-before date',
          },
          {
            label: 'Waste rate',
            value: `${wasteRate}%`,
            icon: Leaf,
            color: wasteRate < 20 ? 'text-primary' : 'text-[oklch(0.42_0.10_55)]',
            bg: wasteRate < 20 ? 'bg-[oklch(0.92_0.04_145)]' : 'bg-[oklch(0.94_0.07_75)]',
            iconColor: wasteRate < 20 ? 'text-primary' : 'text-[oklch(0.42_0.10_55)]',
            desc: 'Of food value wasted vs used',
          },
        ].map(({ label, value, icon: Icon, color, bg, iconColor, desc }) => (
          <div key={label} className={cn('rounded-xl p-5 border border-border', bg)}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground leading-snug">{label}</p>
              <Icon className={cn('w-4 h-4', iconColor)} strokeWidth={1.5} />
            </div>
            <p className={cn('font-serif text-3xl mb-1', color)}>{value}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-base text-foreground">Weekly breakdown</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 5 weeks</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Saved</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[oklch(0.83_0.08_25)] inline-block" />Wasted</span>
            </div>
          </div>
          <BarChart data={weeklyChartData} />
        </div>

        {/* Monthly */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-base text-foreground">Monthly trend</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 4 months</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Saved</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[oklch(0.83_0.08_25)] inline-block" />Wasted</span>
            </div>
          </div>
          <BarChart data={monthlyChartData} />
        </div>
      </div>

      {/* Pantry snapshot */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-serif text-base text-foreground mb-5">Current pantry value</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total items', value: items.length, color: 'text-foreground' },
            { label: 'Fresh & usable', value: freshItems, color: 'text-primary' },
            { label: 'Expiring / expired', value: items.length - freshItems, color: 'text-[oklch(0.42_0.10_55)]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center py-2">
              <p className={cn('font-serif text-4xl', color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${items.length > 0 ? (freshItems / items.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {items.length > 0 ? Math.round((freshItems / items.length) * 100) : 0}% of items are fresh
        </p>
      </div>

      {/* Tips */}
      <div className="mt-6 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Reduce waste tips</p>
        {[
          'Cook items that expire soonest first — check the "Use first" section on the dashboard.',
          'When adding items, set accurate expiration dates so alerts fire at the right time.',
          'Use the recipe suggestions tab — it ranks recipes by pantry match and expiry urgency.',
        ].map((tip) => (
          <div key={tip} className="flex items-start gap-3 p-4 bg-muted rounded-lg border border-border">
            <Leaf className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
