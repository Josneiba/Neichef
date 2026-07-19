'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRecipe } from '@/lib/hooks'
import { ArrowLeft, ArrowRight, ChefHat, Clock, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Phase = 'prep' | 'countdown' | 'cooking' | 'done'

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function CookModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { recipe, isLoading } = useRecipe(id)

  const [phase, setPhase] = useState<Phase>('prep')
  const [countdown, setCountdown] = useState(3)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [showIngredients, setShowIngredients] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [stepStartedAt, setStepStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())

  const estimatedSeconds = useMemo(() => {
    if (!recipe) return 0
    return Math.max(60, (recipe.prepTimeMinutes + recipe.cookTimeMinutes) * 60)
  }, [recipe])

  const stepSeconds = useCallback((index: number) => {
    if (!recipe) return 60
    const explicit = recipe.steps[index]?.durationMinutes
    if (explicit && explicit > 0) return explicit * 60
    return Math.max(60, Math.round(estimatedSeconds / Math.max(recipe.steps.length, 1)))
  }, [estimatedSeconds, recipe])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      const start = Date.now()
      setStartedAt(start)
      setStepStartedAt(start)
      setPhase('cooking')
      return
    }
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, phase])

  useEffect(() => {
    if (phase !== 'cooking') return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [phase])

  const beginCooking = useCallback(() => {
    setCountdown(3)
    setPhase('countdown')
  }, [])

  const completeCurrentStep = useCallback(() => {
    if (!recipe) return
    setCompletedSteps((prev) => new Set([...prev, currentStep]))
    if (currentStep >= recipe.steps.length - 1) {
      setFinishedAt(Date.now())
      setPhase('done')
      return
    }
    setCurrentStep((step) => step + 1)
    setStepStartedAt(Date.now())
  }, [currentStep, recipe])

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1)
      setStepStartedAt(Date.now())
    }
  }, [currentStep])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <ChefHat className="w-8 h-8 text-muted-foreground animate-pulse" strokeWidth={1} />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
          <p className="text-muted-foreground mb-4">Recipe not found.</p>
          <Link href="/app/recipes" className="text-sm text-primary hover:underline">Back to recipes</Link>
        </div>
      </div>
    )
  }

  const step = recipe.steps[currentStep]
  const totalSteps = recipe.steps.length
  const progress = phase === 'done' ? 100 : ((currentStep + completedSteps.size / Math.max(totalSteps, 1)) / Math.max(totalSteps, 1)) * 100
  const elapsedSeconds = startedAt ? Math.round(((finishedAt ?? now) - startedAt) / 1000) : 0
  const currentStepElapsed = stepStartedAt ? Math.round((now - stepStartedAt) / 1000) : 0
  const currentStepEstimate = stepSeconds(currentStep)
  const currentStepRemaining = currentStepEstimate - currentStepElapsed
  const overEstimate = elapsedSeconds > estimatedSeconds

  return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border">
        <Link href={`/app/recipes/${id}`} className="flex items-center gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors text-sm">
          <X className="w-4 h-4" strokeWidth={1.5} />
          Exit Cook Mode
        </Link>
        <div className="flex items-center gap-2 text-sm text-sidebar-foreground/60">
          <ChefHat className="w-4 h-4" strokeWidth={1.5} />
          <span className="font-serif">{recipe.title}</span>
        </div>
        <button onClick={() => setShowIngredients(!showIngredients)} className="text-sidebar-foreground/60 hover:text-sidebar-foreground text-sm transition-colors">
          Ingredients
        </button>
      </div>

      <div className="h-1 bg-sidebar-border">
        <div className="h-full bg-sidebar-primary transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {showIngredients && (
        <div className="bg-sidebar-accent border-b border-sidebar-border px-6 py-4">
          <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-widest mb-3">Ingredients</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {recipe.ingredients.map((ing, index) => (
              <div key={`${ing.name}-${index}`} className="flex items-center gap-2 text-sm">
                <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', ing.inPantry ? 'bg-[oklch(0.55_0.09_145)]' : 'bg-[oklch(0.65_0.12_25)]')} />
                <span className="text-sidebar-foreground/80">{ing.amount} {ing.unit} {ing.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 max-w-2xl mx-auto w-full">
        {phase === 'prep' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-sidebar-accent flex items-center justify-center mx-auto mb-6">
              <ChefHat className="w-8 h-8 text-sidebar-foreground" strokeWidth={1.2} />
            </div>
            <h1 className="font-serif text-4xl text-sidebar-foreground mb-4">Ready to cook?</h1>
            <p className="text-sidebar-foreground/65 leading-relaxed mb-6">
              Do you have all ingredients, tools, and a clear workspace ready?
            </p>
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-4 text-left text-sm text-sidebar-foreground/75 mb-6">
              Estimated time: {Math.round(estimatedSeconds / 60)} min · {totalSteps} guided steps
            </div>
            <button onClick={beginCooking} className="w-full rounded-md bg-sidebar-primary px-6 py-3 font-medium text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
              Yes, start countdown
            </button>
          </div>
        )}

        {phase === 'countdown' && (
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-sidebar-foreground/40 mb-5">Starting</p>
            <p className="font-serif text-8xl text-sidebar-foreground">{countdown > 0 ? countdown : 'Go'}</p>
          </div>
        )}

        {phase === 'cooking' && (
          <>
            <div className="flex items-center gap-2 mb-8">
              {recipe.steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentStep(i); setStepStartedAt(Date.now()) }}
                  className={cn('transition-all rounded-full', i === currentStep ? 'w-8 h-2 bg-sidebar-primary' : completedSteps.has(i) ? 'w-2 h-2 bg-sidebar-primary/60' : 'w-2 h-2 bg-sidebar-border')}
                />
              ))}
            </div>

            <p className="text-xs font-medium text-sidebar-foreground/40 uppercase tracking-widest mb-4">
              Step {currentStep + 1} of {totalSteps}
            </p>
            <p className="font-serif text-center text-sidebar-foreground leading-snug mb-8 text-pretty text-3xl md:text-4xl lg:text-5xl">
              {step.instruction}
            </p>

            <div className={cn('mb-6 w-full rounded-xl border p-4 text-center', currentStepRemaining < 0 ? 'border-[oklch(0.84_0.09_70)] bg-[oklch(0.18_0.04_65)]' : 'border-sidebar-border bg-sidebar-accent')}>
              <p className="text-xs text-sidebar-foreground/50 flex items-center justify-center gap-1.5">
                <Clock className="w-3 h-3" strokeWidth={1.5} />
                Step estimate · {Math.round(currentStepEstimate / 60)} min
              </p>
              <p className="font-serif text-5xl text-sidebar-foreground mt-1">
                {currentStepRemaining >= 0 ? formatTime(currentStepRemaining) : `+${formatTime(Math.abs(currentStepRemaining))}`}
              </p>
            </div>

            <p className="text-xs text-sidebar-foreground/50">Total elapsed: {formatTime(elapsedSeconds)}</p>
          </>
        )}

        {phase === 'done' && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-[oklch(0.35_0.08_145)] flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-sidebar-foreground" strokeWidth={1.7} />
            </div>
            <h2 className="font-serif text-4xl text-sidebar-foreground mb-4">Meal completed</h2>
            <p className="text-sidebar-foreground/65 mb-2">Estimated: {formatTime(estimatedSeconds)}</p>
            <p className={cn('text-lg mb-8', overEstimate ? 'text-[oklch(0.82_0.10_70)]' : 'text-[oklch(0.72_0.11_145)]')}>
              You took {formatTime(elapsedSeconds)} · {overEstimate ? `${formatTime(elapsedSeconds - estimatedSeconds)} over` : `${formatTime(estimatedSeconds - elapsedSeconds)} faster`}
            </p>
            <Link href="/app" className="inline-flex items-center gap-2 bg-sidebar-primary text-sidebar-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-sidebar-primary/90 transition-colors">
              Back to kitchen
            </Link>
          </div>
        )}
      </div>

      {phase === 'cooking' && (
        <div className="px-6 pb-10 pt-4 border-t border-sidebar-border">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <button onClick={goPrev} disabled={currentStep === 0} className="flex items-center gap-2 px-4 py-3 rounded-md border border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground hover:border-sidebar-foreground/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              Prev
            </button>
            <button onClick={completeCurrentStep} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-medium hover:bg-sidebar-primary/90 transition-colors">
              {currentStep === totalSteps - 1 ? 'Finish' : 'Seguimos'}
              {currentStep === totalSteps - 1 ? <Check className="w-4 h-4" strokeWidth={2} /> : <ArrowRight className="w-4 h-4" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
