'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Plus, Trash } from 'lucide-react'
import type { MealSlot } from '@prisma/client'

interface RoutineFormProps {
  onSaved: () => void
}

interface RoutineSlotItem {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout'
  timeOfDay?: string
  targetCalories?: number
  recipeId?: string
  freeText?: string
}

export function RoutineForm({ onSaved }: RoutineFormProps) {
  const t = useT()
  const [name, setName] = useState('')
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([])
  const [slots, setSlots] = useState<RoutineSlotItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function toggleDay(day: string) {
    setDaysOfWeek((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    )
  }

  function addSlot() {
    setSlots((current) => [...current, { mealType: 'breakfast' }])
  }

  function updateSlot(index: number, updated: Partial<RoutineSlotItem>) {
    setSlots((current) => current.map((slot, idx) => (idx === index ? { ...slot, ...updated } : slot)))
  }

  function removeSlot(index: number) {
    setSlots((current) => current.filter((_, idx) => idx !== index))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    const body = {
      name,
      daysOfWeek,
      slots,
    }

    try {
      const response = await fetch('/api/nutrition/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error ?? 'Unable to save routine.')
      } else {
        setName('')
        setDaysOfWeek([])
        setSlots([])
        onSaved()
      }
    } catch {
      setError('Unable to save routine.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="font-serif text-xl text-foreground">{t('nutritionCreateRoutineTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('nutritionCreateRoutineDescription')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-2 text-sm text-foreground">
          <span>{t('nutritionRoutineName')}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Training day"
            required
          />
        </label>
        <div className="space-y-2 text-sm text-foreground">
          <span>{t('nutritionDaysOfWeek')}</span>
          <div className="flex flex-wrap gap-2">
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full px-3 py-2 text-sm transition ${daysOfWeek.includes(day) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >
                {day.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{t('nutritionMealSlots')}</h3>
          <Button type="button" variant="outline" size="sm" onClick={addSlot}>
            <Plus className="mr-2 h-4 w-4" /> {t('nutritionAddSlot')}
          </Button>
        </div>

        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-border bg-muted p-4 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-foreground">
                  <span>{t('nutritionMealType')}</span>
                  <select
                    value={slot.mealType}
                    onChange={(event) => updateSlot(index, { mealType: event.target.value as RoutineSlotItem['mealType'] })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                    <option value="pre_workout">Pre-workout</option>
                    <option value="post_workout">Post-workout</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-foreground">
                  <span>{t('time')}</span>
                  <input
                    type="time"
                    value={slot.timeOfDay ?? ''}
                    onChange={(event) => updateSlot(index, { timeOfDay: event.target.value || undefined })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="space-y-2 text-sm text-foreground">
                  <span>{t('nutritionCaloriesTarget')}</span>
                  <input
                    type="number"
                    min={0}
                    value={slot.targetCalories ?? ''}
                    onChange={(event) => updateSlot(index, { targetCalories: event.target.value ? Number(event.target.value) : undefined })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="space-y-2 text-sm text-foreground">
                  <span>{t('nutritionRecipeOrNotes')}</span>
                  <input
                    value={slot.freeText ?? ''}
                    onChange={(event) => updateSlot(index, { freeText: event.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Optional recipe or meal idea"
                  />
                </label>
              </div>
              <Button type="button" variant="destructive" size="sm" onClick={() => removeSlot(index)}>
                <Trash className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving || !name || daysOfWeek.length === 0}>
          {isSaving ? t('saving') ?? 'Saving…' : t('nutritionSaveRoutine')}
        </Button>
      </div>
    </form>
  )
}
