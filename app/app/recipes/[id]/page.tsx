'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRecipe } from '@/lib/hooks'
import { useT } from '@/lib/i18n'
import { ArrowLeft, Bookmark, BookmarkCheck, ChefHat, Check, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const recipeImages: Record<string, string> = {
  r1: '/recipe-chicken.png',
  r2: '/recipe-risotto.png',
  r3: '/recipe-salmon.png',
  r4: '/recipe-eggs.png',
  r5: '/recipe-soup.png',
}

const difficultyLabel: Record<string, string> = { easy: 'Easy', medium: 'Intermediate', hard: 'Advanced' }

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { recipe, isLoading, error, toggleSave } = useRecipe(id)
  const t = useT()
  const [nutrition, setNutrition] = useState<{ calories: number; protein: number; carbs: number; fat: number; sugars: number; matchedIngredients: number; note: string } | null>(null)

  useEffect(() => {
    if (!recipe) return
    let cancelled = false
    fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ ingredients: recipe.ingredients }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.matchedIngredients > 0) setNutrition(data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [recipe])

  if (isLoading) {
    return (
      <div className="px-6 py-8 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mb-3" strokeWidth={1.5} />
        <p className="text-sm">{t('loadingRecipe')}</p>
      </div>
    )
  }

  if (!recipe || error) {
    return (
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <Link href="/app/recipes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> {t('backToRecipes')}
        </Link>
        <p className="text-muted-foreground">{error ?? t('recipeNotFound')}</p>
      </div>
    )
  }

  const img = recipe.imageUrl ?? recipeImages[recipe.id]
  const missingIngredients = recipe.ingredients.filter((i) => !i.inPantry && !i.isStaple)
  const matchRatio = recipe.pantryMatchCount / Math.max(recipe.totalIngredients, 1)
  const methodText = recipe.steps.map((step) => step.instruction).filter(Boolean).join(' ')

  return (
    <div className="max-w-3xl mx-auto pb-24 lg:pb-8">
      {/* Back */}
      <div className="px-6 pt-8 pb-4">
        <Link href="/app/recipes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          {t('backToRecipes')}
        </Link>
      </div>

      {/* Hero image */}
      <div className="relative h-64 md:h-80 bg-muted mx-6 rounded-xl overflow-hidden mb-6">
        {img ? (
          <img src={img} alt={recipe.title} className="h-full w-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-12 h-12 text-muted-foreground" strokeWidth={1} />
          </div>
        )}
        {recipe.usesExpiringItems && (
          <div className="absolute top-4 left-4 bg-[oklch(0.94_0.07_75)] border border-[oklch(0.84_0.09_70)] text-[oklch(0.42_0.10_55)] text-xs font-medium px-3 py-1.5 rounded-full">
            Uses expiring items
          </div>
        )}
      </div>

      <div className="px-6">
        {/* Title + meta */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 mr-4">
            <h1 className="font-serif text-3xl text-foreground mb-2 text-pretty">{recipe.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{recipe.description}</p>
          </div>
          <button
            onClick={() => toggleSave()}
            className="flex-shrink-0 w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            aria-label={recipe.isSaved ? 'Unsave' : 'Save'}
          >
            {recipe.isSaved
              ? <BookmarkCheck className="w-5 h-5 text-primary" strokeWidth={1.5} />
              : <Bookmark className="w-5 h-5" strokeWidth={1.5} />
            }
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 py-4 border-y border-border mb-6">
          {[
            { label: t('prepTime'), value: `${recipe.prepTimeMinutes} min` },
            { label: t('cookTime'), value: `${recipe.cookTimeMinutes} min` },
            { label: t('serves'), value: String(recipe.servings) },
            { label: t('difficulty'), value: t(recipe.difficulty as 'easy' | 'intermediate' | 'advanced') },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="font-serif text-lg text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Pantry match */}
        <div className="bg-muted rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">{t('pantryMatch')}</p>
            <p className="text-sm text-muted-foreground">{recipe.pantryMatchCount}/{recipe.totalIngredients} {t('pantryMatchLabel')}</p>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${matchRatio * 100}%` }} />
          </div>
          {missingIngredients.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {t('missing')} {missingIngredients.map((i) => i.name).join(', ')}
            </p>
          )}
        </div>

        {nutrition && (
          <div className="mb-6 rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{t('nutritionEstimate')}</p>
              <p className="text-xs text-muted-foreground">{nutrition.matchedIngredients} {t('matchedIngredients')}</p>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                ['Calories', nutrition.calories],
                ['Protein', `${nutrition.protein}g`],
                ['Carbs', `${nutrition.carbs}g`],
                ['Fat', `${nutrition.fat}g`],
                ['Sugar', `${nutrition.sugars}g`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-muted px-2 py-2">
                  <p className="font-serif text-base text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{nutrition.note}</p>
          </div>
        )}

        {/* Ingredients */}
        <div className="mb-8">
          <h2 className="font-serif text-xl text-foreground mb-4">Ingredients</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {recipe.ingredients.map((ing, index) => (
              <div key={`${ing.name}-${index}`} className={cn('flex items-start gap-2 rounded-md border p-2.5', ing.inPantry ? 'border-[oklch(0.82_0.06_145)] bg-[oklch(0.98_0.015_145)]' : 'border-[oklch(0.86_0.05_25)] bg-[oklch(0.985_0.012_25)]')}>
                <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5', ing.inPantry ? 'bg-[oklch(0.32_0.08_145)] border-[oklch(0.32_0.08_145)]' : 'border-[oklch(0.7_0.1_25)] bg-transparent')}>
                  {ing.inPantry
                    ? <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={2.5} />
                    : <AlertCircle className="w-2.5 h-2.5 text-[oklch(0.55_0.15_25)]" strokeWidth={2} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-medium leading-snug', ing.inPantry ? 'text-foreground' : 'text-[oklch(0.42_0.1_25)]')}>
                    {ing.amount} {ing.unit} {ing.name}
                    {!ing.inPantry && !ing.isStaple && <span className="ml-1 font-normal text-muted-foreground">- not in pantry</span>}
                    {ing.isStaple && <span className="ml-1 font-normal text-muted-foreground">- staple</span>}
                  </p>
                  {ing.substitution && (
                    <p className="text-xs text-muted-foreground mt-0.5">Sub: {ing.substitution}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="mb-8">
          <h2 className="font-serif text-xl text-foreground mb-4">Method</h2>
          <p className="rounded-lg border border-border bg-card p-4 text-sm leading-7 text-foreground">
            {methodText}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Cook Mode breaks this method into guided steps with timers.</p>
        </div>

        {/* Cook Mode CTA */}
        <div className="sticky bottom-6 mt-8">
          <Link
            href={`/app/recipes/${recipe.id}/cook`}
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-4 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg"
          >
            <ChefHat className="w-4 h-4" strokeWidth={1.5} />
            Start Cook Mode
          </Link>
        </div>
      </div>
    </div>
  )
}
