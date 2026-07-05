'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePantry, useRecipes } from '@/lib/hooks'
import { UrgencyBadge } from '@/components/ui/urgency-badge'
import { Search, Package, BookOpen, ArrowRight, Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'all' | 'pantry' | 'recipes'

export default function SearchPage() {
  const { items } = usePantry()
  const { recipes } = useRecipes()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')

  const matchedItems = useMemo(() => {
    if (!query.trim()) return []
    return items.filter((i) =>
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      i.category.toLowerCase().includes(query.toLowerCase())
    )
  }, [items, query])

  const matchedRecipes = useMemo(() => {
    if (!query.trim()) return []
    return recipes.filter((r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.description.toLowerCase().includes(query.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    )
  }, [recipes, query])

  const hasResults = matchedItems.length > 0 || matchedRecipes.length > 0

  const showItems = tab === 'all' || tab === 'pantry'
  const showRecipes = tab === 'all' || tab === 'recipes'

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Find</p>
        <h1 className="font-serif text-3xl text-foreground">Search</h1>
      </div>

      {/* Search input */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        <input
          type="text"
          autoFocus
          placeholder="Search pantry items, recipes, ingredients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 text-sm border border-border rounded-xl bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
        />
      </div>

      {/* Tabs */}
      {query && (
        <div className="flex border-b border-border mb-6">
          {([['all', `All (${matchedItems.length + matchedRecipes.length})`], ['pantry', `Pantry (${matchedItems.length})`], ['recipes', `Recipes (${matchedRecipes.length})`]] as [Tab, string][]).map(([id, label]) => (
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
      )}

      {/* Empty / prompt state */}
      {!query && (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-muted-foreground" strokeWidth={1} />
          </div>
          <p className="font-serif text-xl text-foreground mb-2">Search everything</p>
          <p className="text-sm text-muted-foreground">Find pantry items by name or category, or recipes by ingredient, tag, or title.</p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['chicken', 'dairy', 'quick', 'vegetarian', 'salmon'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="text-xs border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {query && !hasResults && (
        <div className="py-16 text-center">
          <p className="font-serif text-xl text-foreground mb-2">No results</p>
          <p className="text-sm text-muted-foreground">Nothing found for &ldquo;{query}&rdquo;. Try a different term.</p>
        </div>
      )}

      {/* Results */}
      {query && hasResults && (
        <div className="space-y-6">
          {/* Pantry results */}
          {showItems && matchedItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Pantry items</p>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {matchedItems.map((item) => {
                  const exp = new Date(item.expirationDate)
                  const today = new Date()
                  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <Link
                      key={item.id}
                      href="/app/pantry"
                      className="flex items-center justify-between px-5 py-3.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {item.category} · {item.quantity} {item.unit} · {item.location}
                        </p>
                      </div>
                      <UrgencyBadge urgency={item.urgency} daysUntilExpiry={diff > 0 ? diff : undefined} className="ml-3 flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recipe results */}
          {showRecipes && matchedRecipes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Recipes</p>
              </div>
              <div className="space-y-2">
                {matchedRecipes.map((recipe) => (
                  <Link
                    key={recipe.id}
                    href={`/app/recipes/${recipe.id}`}
                    className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-muted-foreground/30 transition-colors"
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
                      <p className="text-xs text-muted-foreground line-clamp-1">{recipe.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" strokeWidth={1.5} />
                          {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" strokeWidth={1.5} />
                          {recipe.servings}
                        </span>
                        <span>{recipe.pantryMatchCount}/{recipe.totalIngredients} in pantry</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
