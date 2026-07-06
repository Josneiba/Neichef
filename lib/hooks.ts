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
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/recipes', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (Array.isArray(data)) {
          setRecipes(data.map((recipe) => ({ ...recipe, isSaved: false, pantryMatchCount: 0, totalIngredients: recipe.ingredients?.length ?? 0, usesExpiringItems: false })))
        }
      })
      .catch(() => setRecipes([]))
  }, [])

  const toggleSave = useCallback(async (id: string) => {
    const isSaved = savedIds.has(id)
    await fetch(`/api/recipes/${id}/save`, { method: isSaved ? 'DELETE' : 'POST', credentials: 'same-origin' })
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (isSaved) next.delete(id)
      else next.add(id)
      return next
    })
    setRecipes((prev) => prev.map((recipe) => (recipe.id === id ? { ...recipe, isSaved: !isSaved } : recipe)))
  }, [savedIds])

  const addCustomRecipe = useCallback(async (recipe: Omit<Recipe, 'id' | 'pantryMatchCount' | 'usesExpiringItems' | 'isSaved'>) => {
    const response = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(recipe),
    })
    const created = await response.json()
    if (created?.id) {
      setRecipes((prev) => [{ ...created, pantryMatchCount: 0, totalIngredients: created.ingredients?.length ?? 0, usesExpiringItems: false, isSaved: true }, ...prev])
      setSavedIds((prev) => new Set([...prev, created.id]))
    }
  }, [])

  const savedRecipes = recipes.filter((recipe) => savedIds.has(recipe.id))
  const suggestedRecipes = [...recipes].sort((a, b) => {
    if (b.usesExpiringItems !== a.usesExpiringItems) return b.usesExpiringItems ? 1 : -1
    const aRatio = a.pantryMatchCount / Math.max(a.totalIngredients, 1)
    const bRatio = b.pantryMatchCount / Math.max(b.totalIngredients, 1)
    return bRatio - aRatio
  })

  return { recipes, suggestedRecipes, savedRecipes, toggleSave, addCustomRecipe }
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
