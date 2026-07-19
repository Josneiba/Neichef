'use client'

import { useEffect, useState, useCallback } from 'react'
import type { PantryItem, Recipe, Notification, BudgetStats, UserProfile, ItemUrgency, Category, StorageLocation } from './types'

function computeUrgency(expirationDate: string): ItemUrgency {
  const today = new Date()
  const exp = new Date(expirationDate)
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays < 0 ? 'expired' : diffDays <= 3 ? 'expiring' : 'fresh'
}

function normalizePantryItem(item: PantryItem): PantryItem {
  return { ...item, urgency: item.urgency ?? computeUrgency(item.expirationDate) }
}

function normalizeRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    isSaved: Boolean(recipe.isSaved),
    pantryMatchCount: recipe.pantryMatchCount ?? 0,
    totalIngredients: recipe.totalIngredients ?? recipe.ingredients?.filter((ingredient) => !ingredient.isStaple).length ?? 0,
    usesExpiringItems: Boolean(recipe.usesExpiringItems),
  }
}

export function usePantry() {
  const [items, setItems] = useState<PantryItem[]>([])

  useEffect(() => {
    fetch('/api/pantry', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (Array.isArray(data)) setItems(data.map(normalizePantryItem))
      })
      .catch(() => setItems([]))
  }, [])

  const addItem = useCallback(async (item: Omit<PantryItem, 'id' | 'addedDate' | 'urgency'>) => {
    const response = await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(item),
    })
    const created = await response.json()
    if (created?.id) {
      setItems((prev) => [normalizePantryItem(created), ...prev])
    }
  }, [])

  const removeItem = useCallback(async (id: string) => {
    await fetch(`/api/pantry/${id}`, { method: 'DELETE', credentials: 'same-origin' })
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const updateItem = useCallback(async (id: string, updates: Partial<PantryItem>) => {
    const response = await fetch(`/api/pantry/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(updates),
    })
    if (response.ok) {
      setItems((prev) => prev.map((item) => (item.id === id ? normalizePantryItem({ ...item, ...updates }) : item)))
    }
  }, [])

  const getByUrgency = useCallback((urgency: ItemUrgency) => items.filter((i) => i.urgency === urgency), [items])
  const getByCategory = useCallback((category: Category) => items.filter((i) => i.category === category), [items])
  const getByLocation = useCallback((location: StorageLocation) => items.filter((i) => i.location === location), [items])

  const expiringCount = items.filter((i) => i.urgency === 'expiring').length
  const expiredCount = items.filter((i) => i.urgency === 'expired').length

  return { items, addItem, removeItem, updateItem, getByUrgency, getByCategory, getByLocation, expiringCount, expiredCount }
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [suggestions, setSuggestions] = useState<Recipe[] | null>(null)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const loadSuggestions = useCallback(async (options?: {
    ingredients?: string[]
    matchMode?: 'flexible' | 'exact'
    maxTimeMinutes?: string
    flavor?: 'any' | 'sweet' | 'savory'
    mealType?: 'any' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'
  }) => {
    setIsLoadingSuggestions(true)
    setSuggestionError(null)
    const params = new URLSearchParams()
    if (options?.ingredients?.length) params.set('ingredients', options.ingredients.join(','))
    if (options?.matchMode) params.set('matchMode', options.matchMode)
    if (options?.maxTimeMinutes && options.maxTimeMinutes !== 'any') params.set('maxTimeMinutes', options.maxTimeMinutes)
    if (options?.flavor) params.set('flavor', options.flavor)
    if (options?.mealType) params.set('mealType', options.mealType)
    const url = params.size > 0 ? `/api/recipes/suggestions?${params}` : '/api/recipes/suggestions'
    try {
      const res = await fetch(url, { credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not load recipe suggestions')
      if (Array.isArray(data)) setSuggestions(data.map(normalizeRecipe))
    } catch (err) {
      setSuggestions(null)
      setSuggestionError(err instanceof Error ? err.message : 'Could not load recipe suggestions')
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/recipes', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!Array.isArray(data)) return
        const normalized: Recipe[] = data.map(normalizeRecipe)
        setRecipes(normalized)
        setSavedIds(new Set(normalized.filter((r) => r.isSaved).map((r) => r.id)))
      })
      .catch(() => setRecipes([]))

    // Personalized, pantry-aware ranking. Falls back to client-side sorting
    // of the general recipe list (below) when the person isn't signed in or
    // the request fails — this endpoint requires auth since it's scoped to
    // the user's own pantry.
    void loadSuggestions()
  }, [loadSuggestions])

  const toggleSave = useCallback(async (id: string) => {
    const isSaved = savedIds.has(id)
    const response = await fetch(`/api/recipes/${id}/save`, { method: isSaved ? 'DELETE' : 'POST', credentials: 'same-origin' })
    if (!response.ok) return
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (isSaved) next.delete(id)
      else next.add(id)
      return next
    })
    setRecipes((prev) => prev.map((recipe) => (recipe.id === id ? { ...recipe, isSaved: !isSaved } : recipe)))
    setSuggestions((prev) => prev?.map((recipe) => (recipe.id === id ? { ...recipe, isSaved: !isSaved } : recipe)) ?? prev)
  }, [savedIds])

  const addCustomRecipe = useCallback(async (recipe: Omit<Recipe, 'id' | 'pantryMatchCount' | 'totalIngredients' | 'usesExpiringItems' | 'isSaved'>) => {
    const response = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(recipe),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error ?? 'Could not save recipe')
    }
    const created = await response.json()
    if (created?.id) {
      // Also mark it saved for real, so it shows under "Saved" and stays
      // there after a reload — not just an optimistic local flag.
      const saveResponse = await fetch(`/api/recipes/${created.id}/save`, { method: 'POST', credentials: 'same-origin' })
      const isSaved = saveResponse.ok
      const normalized: Recipe = { ...created, pantryMatchCount: 0, totalIngredients: created.ingredients?.length ?? 0, usesExpiringItems: false, isSaved }
      setRecipes((prev) => [normalized, ...prev])
      if (isSaved) setSavedIds((prev) => new Set([...prev, created.id]))
    }
    return created
  }, [])

  const savedRecipes = recipes.filter((recipe) => savedIds.has(recipe.id))
  const suggestedRecipes = suggestions ?? [...recipes].sort((a, b) => {
    if (b.usesExpiringItems !== a.usesExpiringItems) return b.usesExpiringItems ? 1 : -1
    const aRatio = a.pantryMatchCount / Math.max(a.totalIngredients, 1)
    const bRatio = b.pantryMatchCount / Math.max(b.totalIngredients, 1)
    return bRatio - aRatio
  })

  const findRecipesByIngredients = useCallback((
    ingredients: string[],
    matchMode: 'flexible' | 'exact',
    options?: { maxTimeMinutes?: string; flavor?: 'any' | 'sweet' | 'savory'; mealType?: 'any' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' },
  ) => loadSuggestions({ ingredients, matchMode, ...options }), [loadSuggestions])
  const usePantrySuggestions = useCallback(() => loadSuggestions(), [loadSuggestions])

  return { recipes, suggestedRecipes, savedRecipes, toggleSave, addCustomRecipe, findRecipesByIngredients, usePantrySuggestions, isLoadingSuggestions, suggestionError }
}

/**
 * Fetches one recipe directly by id. The recipe list/detail pages used to
 * rely entirely on filtering the already-fetched bulk `/api/recipes` list,
 * which meant a recipe not present in that list (e.g. reached via a direct
 * link, or one only surfaced through /api/recipes/suggestions) showed as
 * "not found" even though it existed.
 */
export function useRecipe(id: string | undefined) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetch(`/api/recipes/${id}`, { credentials: 'same-origin' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(data.error ?? 'Recipe not found')
          setRecipe(null)
        } else {
          setRecipe(data)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this recipe')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const toggleSave = useCallback(async () => {
    if (!recipe) return
    const wasSaved = recipe.isSaved
    const response = await fetch(`/api/recipes/${recipe.id}/save`, { method: wasSaved ? 'DELETE' : 'POST', credentials: 'same-origin' })
    if (response.ok) setRecipe((prev) => (prev ? { ...prev, isSaved: !wasSaved } : prev))
  }, [recipe])

  return { recipe, isLoading, error, toggleSave }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    fetch('/api/notifications', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data)
      })
      .catch(() => setNotifications([]))
  }, [])

  const markRead = useCallback(async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH', credentials: 'same-origin' })
    setNotifications((prev) => prev.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)))
  }, [])

  const markAllRead = useCallback(async () => {
    await Promise.all(notifications.map((notification) => fetch(`/api/notifications/${notification.id}`, { method: 'PATCH', credentials: 'same-origin' })))
    setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })))
  }, [notifications])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  const unreadCount = notifications.filter((notification) => !notification.isRead).length

  return { notifications, markRead, markAllRead, dismiss, unreadCount }
}

export function useBudget(): BudgetStats {
  const [budgetStats, setBudgetStats] = useState<BudgetStats>({
    itemsSavedCount: 0,
    estimatedSavedAmount: 0,
    estimatedWastedAmount: 0,
    weeklyData: [],
    monthlyTotals: [],
  })

  useEffect(() => {
    fetch('/api/budget', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setBudgetStats(data))
      .catch(() => setBudgetStats({ itemsSavedCount: 0, estimatedSavedAmount: 0, estimatedWastedAmount: 0, weeklyData: [], monthlyTotals: [] }))
  }, [])

  return budgetStats
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>({ id: '', name: '', email: '', householdSize: 1, dietaryPreferences: [], notificationDaysAhead: 3 })

  useEffect(() => {
    fetch('/api/profile', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setProfile({ id: data.id ?? '', name: data.name ?? '', email: data.email ?? '', householdSize: data.householdSize ?? 1, dietaryPreferences: data.dietaryPreferences ?? [], notificationDaysAhead: data.notificationDaysAhead ?? 3 })
      })
      .catch(() => setProfile({ id: '', name: '', email: '', householdSize: 1, dietaryPreferences: [], notificationDaysAhead: 3 }))
  }, [])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(updates),
    })
    const updated = await response.json()
    if (updated?.id) setProfile((prev) => ({ ...prev, ...updated }))
  }, [])

  return { profile, updateProfile }
}
