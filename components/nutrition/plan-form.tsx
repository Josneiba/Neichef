'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Plus, Trash } from 'lucide-react'

interface RestrictionItem {
  type: 'allergy' | 'avoid' | 'limit' | 'prefer'
  ingredientName: string
  note?: string
}

interface NutritionPlanDraft {
  title?: string
  notes?: string
  caloriesTarget?: number
  proteinTargetG?: number
  carbsTargetG?: number
  fatTargetG?: number
  mealsPerDay?: number
  startDate?: string
  endDate?: string
  restrictions?: RestrictionItem[]
  source?: 'manual' | 'upload_photo' | 'upload_file'
  rawFileUrl?: string
  rawExtractedText?: string
  extractionStatus?: 'pending' | 'processing' | 'done' | 'failed' | 'needs_review'
}

interface PlanFormProps {
  onSaved: () => void
  initialData?: NutritionPlanDraft
}

export function PlanForm({ onSaved, initialData }: PlanFormProps) {
  const t = useT()
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [caloriesTarget, setCaloriesTarget] = useState(initialData?.caloriesTarget?.toString() ?? '')
  const [proteinTargetG, setProteinTargetG] = useState(initialData?.proteinTargetG?.toString() ?? '')
  const [carbsTargetG, setCarbsTargetG] = useState(initialData?.carbsTargetG?.toString() ?? '')
  const [fatTargetG, setFatTargetG] = useState(initialData?.fatTargetG?.toString() ?? '')
  const [mealsPerDay, setMealsPerDay] = useState(initialData?.mealsPerDay?.toString() ?? '3')
  const [startDate, setStartDate] = useState(initialData?.startDate ?? '')
  const [endDate, setEndDate] = useState(initialData?.endDate ?? '')
  const [restrictions, setRestrictions] = useState<RestrictionItem[]>(initialData?.restrictions ?? [])
  const [source] = useState(initialData?.source ?? 'manual')
  const [rawFileUrl] = useState(initialData?.rawFileUrl ?? '')
  const [rawExtractedText] = useState(initialData?.rawExtractedText ?? '')
  const [extractionStatus] = useState(initialData?.extractionStatus ?? 'done')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialData) return

    setTitle(initialData.title ?? '')
    setNotes(initialData.notes ?? '')
    setCaloriesTarget(initialData.caloriesTarget?.toString() ?? '')
    setProteinTargetG(initialData.proteinTargetG?.toString() ?? '')
    setCarbsTargetG(initialData.carbsTargetG?.toString() ?? '')
    setFatTargetG(initialData.fatTargetG?.toString() ?? '')
    setMealsPerDay(initialData.mealsPerDay?.toString() ?? '3')
    setStartDate(initialData.startDate ?? '')
    setEndDate(initialData.endDate ?? '')
    setRestrictions(initialData.restrictions ?? [])
  }, [initialData])

  function addRestriction() {
    setRestrictions((current) => [...current, { type: 'avoid', ingredientName: '', note: '' }])
  }

  function updateRestriction(index: number, updated: Partial<RestrictionItem>) {
    setRestrictions((current) => current.map((item, idx) => (idx === index ? { ...item, ...updated } : item)))
  }

  function removeRestriction(index: number) {
    setRestrictions((current) => current.filter((_, idx) => idx !== index))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    const body = {
      title,
      notes,
      caloriesTarget: caloriesTarget ? Number(caloriesTarget) : undefined,
      proteinTargetG: proteinTargetG ? Number(proteinTargetG) : undefined,
      carbsTargetG: carbsTargetG ? Number(carbsTargetG) : undefined,
      fatTargetG: fatTargetG ? Number(fatTargetG) : undefined,
      mealsPerDay: mealsPerDay ? Number(mealsPerDay) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      restrictions: restrictions.filter((item) => item.ingredientName.trim().length > 0),
      source,
      rawFileUrl: rawFileUrl || undefined,
      rawExtractedText: rawExtractedText || undefined,
      extractionStatus: extractionStatus || undefined,
    }

    try {
      const response = await fetch('/api/nutrition/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error ?? 'Unable to save nutrition plan.')
      } else {
        setTitle('')
        setNotes('')
        setCaloriesTarget('')
        setProteinTargetG('')
        setCarbsTargetG('')
        setFatTargetG('')
        setMealsPerDay('3')
        setStartDate('')
        setEndDate('')
        setRestrictions([])
        onSaved()
      }
    } catch (err) {
      setError('Unable to save nutrition plan.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-3">
        <h2 className="font-serif text-xl text-foreground">{t('nutritionCreatePlanHeading')}</h2>
        <p className="text-sm text-muted-foreground">{t('nutritionCreatePlanDescription')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-2 text-sm text-foreground">
          <span>{t('nutritionPlanTitle')}</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Training phase / Nutritionist plan"
            required
          />
        </label>

        <label className="space-y-2 text-sm text-foreground">
          <span>{t('nutritionPlanNotes')}</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full min-h-[5rem] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Optional details or special instructions"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2 text-sm text-foreground">
          <span>{t('nutritionCaloriesTarget')}</span>
          <input
            value={caloriesTarget}
            onChange={(event) => setCaloriesTarget(event.target.value)}
            type="number"
            min={0}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="e.g. 2000"
          />
        </label>
        <label className="space-y-2 text-sm text-foreground">
          <span>{t('nutritionProteinTarget')}</span>
          <input
            value={proteinTargetG}
            onChange={(event) => setProteinTargetG(event.target.value)}
            type="number"
            min={0}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="e.g. 150"
          />
        </label>
        <label className="space-y-2 text-sm text-foreground">
          <span>{t('nutritionCarbsTarget')}</span>
          <input
            value={carbsTargetG}
            onChange={(event) => setCarbsTargetG(event.target.value)}
            type="number"
            min={0}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="e.g. 220"
          />
        </label>
        <label className="space-y-2 text-sm text-foreground">
          <span>{t('nutritionFatTarget')}</span>
          <input
            value={fatTargetG}
            onChange={(event) => setFatTargetG(event.target.value)}
            type="number"
            min={0}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="e.g. 70"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2 text-sm text-foreground">
          <span>{t('nutritionMealsPerDay')}</span>
          <input
            value={mealsPerDay}
            onChange={(event) => setMealsPerDay(event.target.value)}
            type="number"
            min={1}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="space-y-2 text-sm text-foreground">
          <span>{t('nutritionStartDate')}</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="space-y-2 text-sm text-foreground">
          <span>{t('nutritionEndDate')}</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{t('nutritionRestrictionsHeading')}</h3>
          <Button type="button" variant="outline" size="sm" onClick={addRestriction}>
            <Plus className="mr-2 h-4 w-4" /> {t('nutritionAddRestriction')}
          </Button>
        </div>

        <div className="space-y-3">
          {restrictions.map((restriction, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-border bg-muted p-4 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                <label className="space-y-2 text-sm text-foreground">
                  <span>Type</span>
                  <select
                    value={restriction.type}
                    onChange={(event) => updateRestriction(index, { type: event.target.value as RestrictionItem['type'] })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="allergy">Allergy</option>
                    <option value="avoid">Avoid</option>
                    <option value="limit">Limit</option>
                    <option value="prefer">Prefer</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-foreground">
                  <span>Ingredient</span>
                  <input
                    value={restriction.ingredientName}
                    onChange={(event) => updateRestriction(index, { ingredientName: event.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="e.g. peanuts"
                  />
                </label>
                <label className="space-y-2 text-sm text-foreground sm:col-span-2">
                  <span>Note</span>
                  <input
                    value={restriction.note ?? ''}
                    onChange={(event) => updateRestriction(index, { note: event.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Optional note or instruction"
                  />
                </label>
              </div>
              <Button type="button" variant="destructive" size="sm" onClick={() => removeRestriction(index)}>
                <Trash className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('saving') ?? 'Saving…' : t('nutritionSavePlan')}
        </Button>
      </div>
    </form>
  )
}
