'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Camera, Loader2, Search, X } from 'lucide-react'
import { useT } from '@/lib/i18n'

type FinderMode = 'photo' | 'ingredients'
type Flavor = 'any' | 'sweet' | 'savory'
type MealType = 'any' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'
type MatchMode = 'flexible' | 'exact'

type RecipeFinderModalProps = {
  initialMode: FinderMode
  onClose: () => void
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function parseIngredients(text: string) {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function RecipeFinderModal({ initialMode, onClose }: RecipeFinderModalProps) {
  const t = useT()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<FinderMode>(initialMode)
  const [ingredientText, setIngredientText] = useState('')
  const [flavor, setFlavor] = useState<Flavor>('any')
  const [mealType, setMealType] = useState<MealType>('any')
  const [maxTime, setMaxTime] = useState('45')
  const [matchMode, setMatchMode] = useState<MatchMode>('flexible')
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState('')

  async function handlePhoto(file: File | undefined) {
    if (!file) return
    setIsDetecting(true)
    setError('')
    try {
      const imageBase64 = await fileToBase64(file)
      const response = await fetch('/api/pantry/photo-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ imageBase64 }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error ?? t('noIngredientsDetected'))
      const names = Array.isArray(payload.items)
        ? payload.items.map((item: { name?: string }) => item.name).filter(Boolean)
        : []
      if (names.length === 0) {
        setError(t('noIngredientsDetected'))
      } else {
        setIngredientText(names.join(', '))
        setMode('ingredients')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('noIngredientsDetected'))
    } finally {
      setIsDetecting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function findRecipes() {
    const ingredients = parseIngredients(ingredientText)
    if (ingredients.length === 0) {
      setError(t('addAtLeastOneIngredient'))
      return
    }
    const params = new URLSearchParams({
      ingredients: ingredients.join(','),
      matchMode,
      flavor,
      mealType,
    })
    if (maxTime !== 'any') params.set('maxTimeMinutes', maxTime)
    router.push(`/app/recipes?${params}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t('recipeFinderTitle')}</p>
            <h2 className="font-serif text-xl text-foreground mt-1">{t('whatCanWeCook')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('recipeFinderDescription')}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('photo')}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${mode === 'photo' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted'}`}
            >
              {t('takeAPhoto')}
            </button>
            <button
              type="button"
              onClick={() => setMode('ingredients')}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${mode === 'ingredients' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted'}`}
            >
              {t('addIngredients')}
            </button>
          </div>

          {mode === 'photo' && (
            <div className="rounded-lg border border-dashed border-border bg-background p-4 text-center">
              <Camera className="mx-auto mb-2 h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm font-medium text-foreground">Photograph ingredients for recipe ideas</p>
              <p className="text-xs text-muted-foreground mt-1">{t('recipeFinderPhotoDescription')}</p>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void handlePhoto(event.target.files?.[0])} />
              <button
                type="button"
                disabled={isDetecting}
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {isDetecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {isDetecting ? 'Detecting...' : t('choosePhoto')}
              </button>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">{t('ingredientsLabel')}</label>
            <textarea
              value={ingredientText}
              onChange={(event) => setIngredientText(event.target.value)}
              rows={3}
              placeholder={t('searchRecipesPlaceholder')}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('separateIngredientsWithCommas')}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-foreground">{t('styleLabel')}</span>
              <select value={flavor} onChange={(event) => setFlavor(event.target.value as Flavor)} className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                <option value="any">Any</option>
                <option value="savory">Savory</option>
                <option value="sweet">Sweet</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-foreground">{t('mealLabel')}</span>
              <select value={mealType} onChange={(event) => setMealType(event.target.value as MealType)} className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                <option value="any">Any meal</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
                <option value="dessert">Dessert</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-foreground">{t('timeLabel')}</span>
              <select value={maxTime} onChange={(event) => setMaxTime(event.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                <option value="any">Any time</option>
                <option value="20">Under 20 min</option>
                <option value="30">Under 30 min</option>
                <option value="45">Under 45 min</option>
                <option value="60">Under 60 min</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-foreground">{t('matchLabel')}</span>
              <select value={matchMode} onChange={(event) => setMatchMode(event.target.value as MatchMode)} className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                <option value="flexible">{t('canIncludeExtrasOption')}</option>
                <option value="exact">{t('exactMainIngredientsOption')}</option>
              </select>
            </label>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button type="button" onClick={findRecipes} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Search className="h-4 w-4" />
            {t('findRecipesButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
