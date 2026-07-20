'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePantry, useRecipes, useNotifications, useBudget } from '@/lib/hooks'
import { UrgencyBadge } from '@/components/ui/urgency-badge'
import { RecipeFinderModal } from '@/components/recipes/recipe-finder-modal'
import { ArrowRight, Package, Bell, BookOpen, TrendingUp, AlertTriangle, Camera, ListPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export default function DashboardPage() {
  const { t, locale } = useTranslation()
  const { items, expiringCount, expiredCount } = usePantry()
  const { suggestedRecipes } = useRecipes()
  const { notifications, unreadCount } = useNotifications()
  const budget = useBudget()
  const [recipeFinderMode, setRecipeFinderMode] = useState<'photo' | 'ingredients' | null>(null)

  const freshCount = items.filter((i) => i.urgency === 'fresh').length
  const recentNotifications = notifications.filter((n) => !n.isRead).slice(0, 3)
  const fallbackRecipes = [
    {
      id: 'fallback-pasta',
      title: 'Easy Tomato Pasta',
      description: 'A quick pantry-friendly pasta recipe with pantry staples and tomato sauce.',
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      servings: 2,
      difficulty: 'easy',
      costLevel: 'low',
      pantryMatchCount: 0,
      totalIngredients: 3,
      usesExpiringItems: false,
      isSaved: false,
      isOwner: false,
    },
    {
      id: 'fallback-salad',
      title: 'Chickpea Salad',
      description: 'A fresh, simple salad that works well with canned pantry items and fresh greens.',
      prepTimeMinutes: 10,
      cookTimeMinutes: 0,
      servings: 2,
      difficulty: 'easy',
      costLevel: 'low',
      pantryMatchCount: 0,
      totalIngredients: 4,
      usesExpiringItems: false,
      isSaved: false,
      isOwner: false,
    },
    {
      id: 'fallback-stirfry',
      title: 'Veggie Stir-Fry',
      description: 'A versatile stir-fry that pairs well with fresh or frozen vegetables and pantry sauces.',
      prepTimeMinutes: 15,
      cookTimeMinutes: 10,
      servings: 2,
      difficulty: 'medium',
      costLevel: 'medium',
      pantryMatchCount: 0,
      totalIngredients: 5,
      usesExpiringItems: false,
      isSaved: false,
      isOwner: false,
    },
  ]
  const topRecipes = suggestedRecipes.length > 0 ? suggestedRecipes.slice(0, 3) : fallbackRecipes

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{t('dashboardOverview')}</p>
        <h1 className="font-serif text-3xl text-foreground">{t('yourKitchen')}</h1>
      </div>

      <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t('cookWithWhatYouHave')}</p>
            <h2 className="font-serif text-xl text-foreground">{t('findRecipesFromTheIngredients')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('usePhotoOrTypeIngredients')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setRecipeFinderMode('photo')} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Camera className="h-4 w-4" strokeWidth={1.6} />
              {t('takeAPhoto')}
            </button>
            <button type="button" onClick={() => setRecipeFinderMode('ingredients')} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              <ListPlus className="h-4 w-4" strokeWidth={1.6} />
              {t('addIngredients')}
            </button>
          </div>
        </div>
      </div>

      {/* Alert bar — expiring/expired */}
      {(expiringCount > 0 || expiredCount > 0) && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-lg border border-[oklch(0.84_0.09_70)] bg-[oklch(0.97_0.04_75)]">
          <AlertTriangle className="w-4 h-4 text-[oklch(0.42_0.10_55)] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[oklch(0.35_0.09_60)]">
              {expiredCount > 0 && `${expiredCount} ${t('expired').toLowerCase()}`}
              {expiredCount > 0 && expiringCount > 0 && ' · '}
              {expiringCount > 0 && `${expiringCount} ${t('expiring').toLowerCase()} ${locale === 'es' ? 'pronto' : 'soon'}`}
            </p>
            <p className="text-xs text-[oklch(0.48_0.08_60)] mt-0.5">{t('checkPantryToTakeAction')}</p>
          </div>
          <Link href="/app/pantry" className="text-xs font-medium text-[oklch(0.35_0.09_60)] hover:underline flex-shrink-0">
            {t('viewPantry')}
          </Link>
        </div>
      )}

      {/* Pantry summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Fresh', count: freshCount, color: 'bg-[oklch(0.92_0.04_145)]', textColor: 'text-[oklch(0.28_0.08_145)]', subColor: 'text-[oklch(0.38_0.07_145)]' },
          { label: 'Expiring', count: expiringCount, color: 'bg-[oklch(0.94_0.07_75)]', textColor: 'text-[oklch(0.42_0.10_55)]', subColor: 'text-[oklch(0.48_0.08_60)]' },
          { label: 'Expired', count: expiredCount, color: 'bg-[oklch(0.93_0.05_25)]', textColor: 'text-[oklch(0.42_0.15_25)]', subColor: 'text-[oklch(0.48_0.12_25)]' },
        ].map(({ label, count, color, textColor, subColor }) => (
          <Link key={label} href="/app/pantry" className={cn('rounded-xl p-4 transition-opacity hover:opacity-90', color)}>
            <p className={cn('font-serif text-3xl', textColor)}>{count}</p>
            <p className={cn('text-xs mt-1', subColor)}>{label}</p>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pantry preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expiring items */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <h2 className="font-serif text-base text-foreground">Use first</h2>
              </div>
              <Link href="/app/pantry" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                All items <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {items
                .filter((i) => i.urgency !== 'fresh')
                .slice(0, 5)
                .map((item) => {
                  const exp = new Date(item.expirationDate)
                  const today = new Date()
                  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.quantity} {item.unit} · {item.location}
                        </p>
                      </div>
                      <UrgencyBadge urgency={item.urgency} daysUntilExpiry={diff > 0 ? diff : undefined} className="ml-3 flex-shrink-0" />
                    </div>
                  )
                })}
              {items.filter((i) => i.urgency !== 'fresh').length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">All pantry items are fresh.</p>
              )}
            </div>
          </div>

          {/* Recipe suggestions */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <h2 className="font-serif text-base text-foreground">Suggested recipes</h2>
              </div>
              <Link href="/app/recipes" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                All recipes <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {topRecipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/app/recipes/${recipe.id}`}
                  className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:opacity-80 transition-opacity"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground truncate">{recipe.title}</p>
                      {recipe.usesExpiringItems && (
                        <span className="text-[10px] font-medium text-[oklch(0.42_0.10_55)] bg-[oklch(0.94_0.07_75)] border border-[oklch(0.84_0.09_70)] px-1.5 py-0.5 rounded flex-shrink-0">
                          Uses expiring
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {recipe.pantryMatchCount}/{recipe.totalIngredients} ingredients in pantry · {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <h2 className="font-serif text-base text-foreground">Alerts</h2>
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <Link href="/app/notifications" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentNotifications.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No new alerts.</p>
              ) : (
                recentNotifications.map((n) => (
                  <div key={n.id} className="py-2 border-b border-border last:border-0">
                    <p className="text-xs font-medium text-foreground leading-snug">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Budget snapshot */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="font-serif text-base text-foreground">This month</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Saved from waste</p>
                <p className="font-serif text-2xl text-primary">${budget.estimatedSavedAmount.toFixed(0)}</p>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Still wasted</p>
                <p className="font-serif text-2xl text-[oklch(0.42_0.15_25)]">${budget.estimatedWastedAmount.toFixed(0)}</p>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Items saved</p>
                <p className="font-serif text-2xl text-foreground">{budget.itemsSavedCount}</p>
              </div>
            </div>
            <Link href="/app/budget" className="mt-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              View full report <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
      {recipeFinderMode && <RecipeFinderModal initialMode={recipeFinderMode} onClose={() => setRecipeFinderMode(null)} />}
    </div>
  )
}
