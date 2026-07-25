'use client'

import { useEffect, useRef, useState } from 'react'
import type { NutritionPlan as PrismaNutritionPlan, NutritionRestriction } from '@prisma/client'
import Link from 'next/link'
import { useT } from '@/lib/i18n'
import { useRecipes } from '@/lib/hooks'
import { NutritionEmptyState } from '@/components/nutrition/empty-state'
import { PlanForm } from '@/components/nutrition/plan-form'
import { PlanSummaryCard } from '@/components/nutrition/plan-summary-card'
import { RoutineForm } from '@/components/nutrition/routine-form'
import { Loader2, ArrowRight } from 'lucide-react'

type NutritionPlanDraft = {
  id: string
  title: string
  notes?: string | null
  status: string
  caloriesTarget?: number | null
  proteinTargetG?: number | null
  carbsTargetG?: number | null
  fatTargetG?: number | null
  mealsPerDay?: number | null
  startDate?: string | null
  endDate?: string | null
  restrictions: Array<{ id: string; type: string; ingredientName: string; note?: string | null }>
}

type NutritionPlanWithRestrictions = PrismaNutritionPlan & {
  restrictions: NutritionRestriction[]
}

type MealRoutine = {
  id: string
  name: string
  daysOfWeek: string[]
  slots: Array<{
    id: string
    mealType: string
    timeOfDay?: string | null
    targetCalories?: number | null
    recipeId?: string | null
    freeText?: string | null
  }>
}

export default function NutritionPage() {
  const t = useT()
  const [activeTab, setActiveTab] = useState<'overview' | 'plan' | 'routines' | 'recommendations'>('overview')
  const { suggestedRecipes, isLoadingSuggestions, suggestionError } = useRecipes()
  const [plan, setPlan] = useState<NutritionPlanWithRestrictions | null>(null)
  const [routines, setRoutines] = useState<MealRoutine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draftPlan, setDraftPlan] = useState<any | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const [planRes, routinesRes] = await Promise.all([
          fetch('/api/nutrition/plans', { credentials: 'same-origin' }),
          fetch('/api/nutrition/routines', { credentials: 'same-origin' }),
        ])

        if (!planRes.ok) throw new Error('Unable to load nutrition plan')
        if (!routinesRes.ok) throw new Error('Unable to load routines')

        const planData = await planRes.json()
        const routinesData = await routinesRes.json()

        setPlan(planData)
        setRoutines(Array.isArray(routinesData) ? routinesData : [])
      } catch (err) {
        setError('Unable to load nutrition data. Please refresh.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  function refresh() {
    setLoading(true)
    setError(null)
    setPlan(null)
    setRoutines([])
    setDraftPlan(null)
    setUploadError(null)
    void fetch('/api/nutrition/plans', { credentials: 'same-origin' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setPlan(data))
      .catch(() => setError('Unable to refresh nutrition plan.'))
      .finally(() => setLoading(false))

    void fetch('/api/nutrition/routines', { credentials: 'same-origin' })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setRoutines(Array.isArray(data) ? data : []))
      .catch(() => setError('Unable to refresh routines.'))
  }

  async function handleUpload(file: File, source: 'upload_photo' | 'upload_file') {
    setUploadError(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('source', source)

    try {
      const response = await fetch('/api/nutrition/extract', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setUploadError(payload.error ?? 'Unable to extract plan from upload.')
        return
      }
      setDraftPlan(payload.draft)
      setActiveTab('plan')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to upload file.')
    } finally {
      setLoading(false)
    }
  }

  function handlePhotoUpload() {
    setUploadError(null)
    if (!fileInputRef.current) return
    fileInputRef.current.accept = 'image/jpeg,image/png,image/webp'
    fileInputRef.current.capture = 'environment'
    fileInputRef.current.click()
  }

  function handleFileUpload() {
    setUploadError(null)
    if (!fileInputRef.current) return
    fileInputRef.current.accept = 'image/jpeg,image/png,image/webp,application/pdf'
    fileInputRef.current.removeAttribute('capture')
    fileInputRef.current.click()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">{t('myNutrition')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('nutritionOverviewDescription')}</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {['overview', 'plan', 'routines', 'recommendations'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'overview'
              ? t('nutritionTabOverview')
              : tab === 'plan'
              ? t('nutritionTabPlan')
              : tab === 'routines'
              ? t('nutritionTabRoutines')
              : t('nutritionTabRecommendations')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" strokeWidth={1.5} />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div>
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <NutritionEmptyState
                onAddManual={() => setActiveTab('plan')}
                onUploadPhoto={handlePhotoUpload}
                onUploadFile={handleFileUpload}
              />
              {uploadError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {uploadError}
                </div>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0]
                  if (!selectedFile) return
                  const currentAccept = event.target.accept
                  const source = currentAccept?.includes('application/pdf') ? 'upload_file' : 'upload_photo'
                  void handleUpload(selectedFile, source)
                  event.target.value = ''
                }}
              />
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="space-y-6">
              {draftPlan && !plan ? (
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold text-foreground">{t('nutritionReviewExtractedPlanTitle')}</h2>
                      <p className="text-sm text-muted-foreground">{t('nutritionReviewExtractedPlanDescription')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftPlan(null)}
                      className="text-sm font-medium text-destructive hover:underline"
                    >
                      {t('nutritionDiscardDraft')}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-sm font-semibold text-foreground">{t('nutritionExtractionStatus')}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {draftPlan.extractionStatus === 'done'
                          ? t('nutritionExtractionStatusDone')
                          : draftPlan.extractionStatus === 'needs_review'
                          ? t('nutritionExtractionStatusNeedsReview')
                          : draftPlan.extractionStatus === 'failed'
                          ? t('nutritionExtractionStatusFailed')
                          : draftPlan.extractionStatus}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-sm font-semibold text-foreground">{draftPlan.source === 'upload_photo' ? t('nutritionSourcePhoto') : t('nutritionSourceFile')}</p>
                      <p className="text-sm text-muted-foreground mt-1">{draftPlan.title ?? t('nutritionReviewExtractedPlanTitle')}</p>
                    </div>
                  </div>
                  {draftPlan.rawExtractedText ? (
                    <div className="rounded-xl border border-border bg-muted p-4">
                      <p className="text-sm font-semibold text-foreground">{t('nutritionExtractionRawText')}</p>
                      <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                        {draftPlan.rawExtractedText}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {plan ? (
                <div className="space-y-4">
                  <PlanSummaryCard plan={plan} />
                  <div className="rounded-xl border border-border bg-card p-6">
                    <p className="text-sm text-muted-foreground">{t('nutritionDisclaimer')}</p>
                  </div>
                </div>
              ) : (
                <PlanForm onSaved={refresh} initialData={draftPlan ?? undefined} />
              )}
            </div>
          )}

          {activeTab === 'routines' && (
            <div className="space-y-6">
              <RoutineForm onSaved={refresh} />
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-serif text-xl text-foreground mb-4">{t('nutritionRoutineSummaryTitle')}</h2>
                {routines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('nutritionNoRoutinesYet')}</p>
                ) : (
                  <div className="grid gap-4">
                    {routines.map((routine) => (
                      <div key={routine.id} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">{routine.name}</h3>
                            <p className="text-sm text-muted-foreground">{routine.daysOfWeek.join(', ').toUpperCase()}</p>
                          </div>
                        </div>
                        {routine.slots.length > 0 ? (
                          <div className="mt-4 grid gap-3">
                            {routine.slots.map((slot) => (
                              <div key={slot.id} className="rounded-xl border border-border bg-muted p-3">
                                <div className="flex items-center justify-between gap-4">
                                  <p className="font-medium text-foreground">{slot.mealType.replace('_', ' ')}</p>
                                  <p className="text-sm text-muted-foreground">{slot.timeOfDay ?? t('nutritionAnyTime')}</p>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {slot.targetCalories ? `${slot.targetCalories} kcal` : t('nutritionNoCalorieTarget')}
                                  {slot.freeText ? ` · ${slot.freeText}` : ''}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{t('nutritionNoMealSlots')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-serif text-xl text-foreground mb-2">{t('nutritionTabRecommendations')}</h2>
                <p className="text-sm text-muted-foreground">
                  {plan || routines.length > 0 ? t('nutritionRecommendationsIntro') : t('nutritionRecommendationsComingSoon')}
                </p>
              </div>
              {(plan || routines.length > 0) ? (
                isLoadingSuggestions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" strokeWidth={1.5} />
                  </div>
                ) : suggestionError ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
                    {suggestionError}
                  </div>
                ) : suggestedRecipes && suggestedRecipes.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {suggestedRecipes.slice(0, 6).map((recipe) => (
                      <Link key={recipe.id} href={`/app/recipes/${recipe.id}`} className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/70">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-foreground">{recipe.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
                          </div>
                          <span className="rounded-full bg-muted px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                            {recipe.pantryMatchCount}/{recipe.totalIngredients} {t('inPantry')}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} min</span>
                          <span>·</span>
                          <span>{recipe.servings} servings</span>
                          <span>·</span>
                          <span className="capitalize">{recipe.difficulty}</span>
                        </div>
                        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                          <span>{t('view')}</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
                    {t('nutritionNoRecommendations')}
                  </div>
                )
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
