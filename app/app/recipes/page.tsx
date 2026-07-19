'use client'

import { Suspense, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useT } from '@/lib/i18n'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useRecipes } from '@/lib/hooks'
import { parseIngredientList } from '@/lib/recipes/enrich'
import { EmptyState } from '@/components/ui/empty-state'
import { BookOpen, Clock, Users, Bookmark, BookmarkCheck, ArrowRight, Plus, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Recipe } from '@/lib/types'

const recipeImages: Record<string, string> = {
  r1: '/recipe-chicken.png',
  r2: '/recipe-risotto.png',
  r3: '/recipe-salmon.png',
  r4: '/recipe-eggs.png',
  r5: '/recipe-soup.png',
}

type Tab = 'suggested' | 'saved' | 'mine'
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard'
type CostFilter = 'all' | 'low' | 'medium' | 'high'

function RecipeCard({ recipe, onToggleSave }: { recipe: Recipe; onToggleSave: (id: string) => void }) {
  const t = useT()
  const matchRatio = recipe.pantryMatchCount / Math.max(recipe.totalIngredients, 1)
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes
  const img = recipe.imageUrl ?? recipeImages[recipe.id]

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-muted-foreground/30 transition-colors group">
      {/* Image */}
      <div className="relative h-44 bg-muted overflow-hidden">
        {img ? (
          <img src={img} alt={recipe.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-muted-foreground" strokeWidth={1} />
          </div>
        )}
        {/* Expiring badge */}
        {recipe.usesExpiringItems && (
          <div className="absolute top-3 left-3 bg-[oklch(0.94_0.07_75)] border border-[oklch(0.84_0.09_70)] text-[oklch(0.42_0.10_55)] text-[10px] font-medium px-2 py-1 rounded">
            Uses expiring items
          </div>
        )}
        {/* Save button */}
        <button
          onClick={(e) => { e.preventDefault(); onToggleSave(recipe.id) }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-card transition-colors shadow-sm"
          aria-label={recipe.isSaved ? 'Unsave recipe' : 'Save recipe'}
        >
          {recipe.isSaved
            ? <BookmarkCheck className="w-4 h-4 text-primary" strokeWidth={1.5} />
            : <Bookmark className="w-4 h-4" strokeWidth={1.5} />
          }
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Pantry match */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${matchRatio * 100}%` }} />
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {recipe.pantryMatchCount}/{recipe.totalIngredients} {t('inPantry')}
          </span>
        </div>

        <Link href={`/app/recipes/${recipe.id}`} className="block">
          <h3 className="font-serif text-base text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
            {recipe.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">{recipe.description}</p>
        </Link>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" strokeWidth={1.5} />
              {totalTime} min
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" strokeWidth={1.5} />
              {recipe.servings}
            </span>
            <span className="capitalize">{recipe.difficulty}</span>
          </div>
          <Link href={`/app/recipes/${recipe.id}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            View <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function RecipesContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const { recipes, suggestedRecipes, savedRecipes, toggleSave, findRecipesByIngredients, usePantrySuggestions, isLoadingSuggestions, suggestionError } = useRecipes()
  const [tab, setTab] = useState<Tab>('suggested')
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>('all')
  const [costFilter, setCostFilter] = useState<CostFilter>('all')
  const [maxTime, setMaxTime] = useState<number | 'any'>('any')
  const [ingredientText, setIngredientText] = useState('')
  const [matchMode, setMatchMode] = useState<'flexible' | 'exact'>('flexible')

  useEffect(() => {
    const ingredients = searchParams.get('ingredients')
    if (!ingredients) return
    const urlMaxTime = searchParams.get('maxTimeMinutes')
    const flavor = searchParams.get('flavor')
    const mealType = searchParams.get('mealType')
    const parsedIngredients = parseIngredientList(ingredients)
    if (urlMaxTime) setMaxTime(urlMaxTime === 'any' ? 'any' : Number(urlMaxTime))
    setIngredientText(ingredients)
    setMatchMode(searchParams.get('matchMode') === 'exact' ? 'exact' : 'flexible')
    setTab('suggested')
    void findRecipesByIngredients(
      parsedIngredients,
      searchParams.get('matchMode') === 'exact' ? 'exact' : 'flexible',
      {
        maxTimeMinutes: urlMaxTime ?? undefined,
        flavor: flavor === 'sweet' || flavor === 'savory' || flavor === 'any' ? flavor : undefined,
        mealType: mealType === 'breakfast' || mealType === 'lunch' || mealType === 'dinner' || mealType === 'snack' || mealType === 'dessert' || mealType === 'any' ? mealType : undefined,
      },
    )
  }, [findRecipesByIngredients, searchParams])

  const myRecipes = recipes.filter((recipe) => recipe.isOwner || recipe.source === 'user')
  const source = tab === 'suggested' ? suggestedRecipes : tab === 'saved' ? savedRecipes : myRecipes

  const filtered = source.filter((r) => {
    if (diffFilter !== 'all' && r.difficulty !== diffFilter) return false
    if (costFilter !== 'all' && r.costLevel !== costFilter) return false
    if (maxTime !== 'any' && r.prepTimeMinutes + r.cookTimeMinutes > maxTime) return false
    return true
  })

  function handleIngredientSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const ingredients = parseIngredientList(ingredientText)
    if (ingredients.length === 0) {
      void usePantrySuggestions()
      return
    }
    setTab('suggested')
    void findRecipesByIngredients(ingredients, matchMode)
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Cook</p>
          <h1 className="font-serif text-3xl text-foreground">Recipes</h1>
        </div>
        <Link
          href="/app/recipes/new"
          className="inline-flex items-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-muted transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add recipe
        </Link>
      </div>

      <form onSubmit={handleIngredientSearch} className="border border-border rounded-lg p-3 mb-6 bg-card">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              value={ingredientText}
              onChange={(event) => setIngredientText(event.target.value)}
              placeholder="Chicken, tomato, rice..."
              className="w-full pl-9 pr-3 py-2.5 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <select
            value={matchMode}
            onChange={(event) => setMatchMode(event.target.value as 'flexible' | 'exact')}
            className="px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="flexible">Can include extras</option>
            <option value="exact">Exact main ingredients</option>
          </select>
          <button
            type="submit"
            disabled={isLoadingSuggestions}
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {isLoadingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> : <Search className="w-4 h-4" strokeWidth={2} />}
            Find recipes
          </button>
          <button
            type="button"
            onClick={() => { setIngredientText(''); void usePantrySuggestions() }}
            className="px-3 py-2.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Use pantry
          </button>
        </div>
        {suggestionError && <p className="text-xs text-destructive mt-2">{suggestionError}</p>}
      </form>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {([['suggested', 'Suggestions'], ['saved', `Saved (${savedRecipes.length})`], ['mine', `My recipes (${myRecipes.length})`]] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-1 border border-border rounded-md overflow-hidden text-xs">
          {(['all', 'easy', 'medium', 'hard'] as DifficultyFilter[]).map((d) => (
            <button key={d} onClick={() => setDiffFilter(d)} className={cn('px-3 py-1.5 capitalize transition-colors', diffFilter === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {d === 'all' ? 'Any difficulty' : d}
            </button>
          ))}
        </div>
        <select
          value={maxTime === 'any' ? 'any' : String(maxTime)}
          onChange={(e) => setMaxTime(e.target.value === 'any' ? 'any' : Number(e.target.value))}
          className="px-3 py-1.5 text-xs border border-border rounded-md bg-card text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="any">Any time</option>
          <option value="20">Under 20 min</option>
          <option value="30">Under 30 min</option>
          <option value="45">Under 45 min</option>
          <option value="60">Under 60 min</option>
        </select>
        <div className="flex items-center gap-1 border border-border rounded-md overflow-hidden text-xs">
          {(['all', 'low', 'medium', 'high'] as CostFilter[]).map((c) => (
            <button key={c} onClick={() => setCostFilter(c)} className={cn('px-3 py-1.5 capitalize transition-colors', costFilter === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {c === 'all' ? 'Any cost' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={tab === 'saved' ? 'No saved recipes' : tab === 'mine' ? 'No recipes created yet' : 'No recipes match filters'}
          description={tab === 'saved' ? 'Save recipes from the suggestions tab to find them here.' : tab === 'mine' ? 'Create a recipe manually, from a photo, or from a document.' : 'Try adjusting the filters to see more options.'}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onToggleSave={toggleSave} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function RecipesPage() {
  return (
    <Suspense fallback={null}>
      <RecipesContent />
    </Suspense>
  )
}
