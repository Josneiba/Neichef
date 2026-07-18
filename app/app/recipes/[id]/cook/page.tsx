'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRecipe } from '@/lib/hooks'
import { ArrowLeft, ArrowRight, ChefHat, Clock, Check, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function Timer({ minutes }: { minutes: number }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!running) return
    if (secondsLeft <= 0) { setRunning(false); setFinished(true); return }
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(interval)
  }, [running, secondsLeft])

  function reset() {
    setSecondsLeft(minutes * 60)
    setRunning(false)
    setFinished(false)
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return (
    <div className={cn('mt-4 rounded-xl border p-4 flex items-center gap-4 transition-colors', finished ? 'bg-[oklch(0.92_0.04_145)] border-[oklch(0.82_0.06_145)]' : 'bg-muted border-border')}>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
          <Clock className="w-3 h-3" strokeWidth={1.5} />
          Timer · {minutes} min
        </p>
        <p className={cn('font-serif text-4xl tracking-tight', finished ? 'text-[oklch(0.28_0.08_145)]' : 'text-foreground')}>
          {finished ? 'Done!' : display}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {!finished && (
          <button
            onClick={() => setRunning((r) => !r)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              running ? 'bg-[oklch(0.93_0.05_25)] text-[oklch(0.42_0.15_25)] border border-[oklch(0.83_0.08_25)]' : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {running ? 'Pause' : secondsLeft < minutes * 60 ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 rounded-md text-sm font-medium border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 justify-center"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
          Reset
        </button>
      </div>
    </div>
  )
}

export default function CookModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { recipe, isLoading } = useRecipe(id)

  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [showIngredients, setShowIngredients] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function speak(_text: string) {
    // Plumbing for future Text-to-Speech. Disabled by default.
    // TODO: enable actual speechSynthesis when user consents and UX is finalized.
    if (!speechEnabled) return
  }

  const markComplete = useCallback(() => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.add(currentStep)
      return next
    })
  }, [currentStep])

  const goNext = useCallback(() => {
    markComplete()
    if (recipe && currentStep < recipe.steps.length - 1) {
      setCurrentStep((s) => s + 1)
    }
  }, [currentStep, markComplete, recipe])

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
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
  const isLast = currentStep === recipe.steps.length - 1
  const isCompleted = completedSteps.has(currentStep)
  const allDone = completedSteps.size === recipe.steps.length
  const progress = ((currentStep + (isCompleted ? 1 : 0)) / recipe.steps.length) * 100

  return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border">
        <Link
          href={`/app/recipes/${id}`}
          className="flex items-center gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors text-sm"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
          Exit Cook Mode
        </Link>
        <div className="flex items-center gap-2 text-sm text-sidebar-foreground/60">
          <ChefHat className="w-4 h-4" strokeWidth={1.5} />
          <span className="font-serif">{recipe.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowIngredients(!showIngredients)}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground text-sm transition-colors"
          >
            Ingredients
          </button>
          <button
            onClick={() => setSpeechEnabled((s) => !s)}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground text-sm transition-colors"
            aria-pressed={speechEnabled}
            title="Toggle text-to-speech (off by default)"
          >
            {speechEnabled ? 'TTS: On' : 'TTS: Off'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-sidebar-border">
        <div
          className="h-full bg-sidebar-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Ingredients sheet */}
      {showIngredients && (
        <div className="bg-sidebar-accent border-b border-sidebar-border px-6 py-4">
          <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-widest mb-3">Ingredients</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {recipe.ingredients.map((ing) => (
              <div key={ing.name} className="flex items-center gap-2 text-sm">
                <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', ing.inPantry ? 'bg-[oklch(0.55_0.09_145)]' : 'bg-[oklch(0.65_0.12_25)]')} />
                <span className="text-sidebar-foreground/80">{ing.amount} {ing.unit} {ing.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main step area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 max-w-2xl mx-auto w-full">
        {allDone ? (
          /* All done state */
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-[oklch(0.35_0.08_145)] flex items-center justify-center mx-auto mb-6">
              <ChefHat className="w-10 h-10 text-sidebar-foreground" strokeWidth={1} />
            </div>
            <h2 className="font-serif text-4xl text-sidebar-foreground mb-4">Enjoy your meal.</h2>
            <p className="text-sidebar-foreground/60 mb-8">
              {recipe.title} — {recipe.servings} serving{recipe.servings > 1 ? 's' : ''}
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 bg-sidebar-primary text-sidebar-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-sidebar-primary/90 transition-colors"
            >
              Back to kitchen
            </Link>
          </div>
        ) : (
          <>
            {/* Step counter */}
            <div className="flex items-center gap-2 mb-8">
              {recipe.steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    'transition-all rounded-full',
                    i === currentStep
                      ? 'w-8 h-2 bg-sidebar-primary'
                      : completedSteps.has(i)
                      ? 'w-2 h-2 bg-sidebar-primary/60'
                      : 'w-2 h-2 bg-sidebar-border'
                  )}
                />
              ))}
            </div>

            {/* Step number */}
            <p className="text-xs font-medium text-sidebar-foreground/40 uppercase tracking-widest mb-6">
              Step {step.step} of {recipe.steps.length}
            </p>

            {/* Main instruction — large and legible */}
            <p className={cn(
              'font-serif text-center text-sidebar-foreground leading-snug mb-8 text-pretty transition-all',
              'text-3xl md:text-4xl lg:text-5xl'
            )}>
              {step.instruction}
            </p>

            {/* Timer if this step has a duration */}
            {step.durationMinutes && <Timer minutes={step.durationMinutes} />}

            {/* Completion status */}
            {isCompleted && !step.durationMinutes && (
              <div className="mt-6 flex items-center gap-2 text-[oklch(0.55_0.09_145)] text-sm">
                <Check className="w-4 h-4" strokeWidth={2} />
                Step complete
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      {!allDone && (
        <div className="px-6 pb-10 pt-4 border-t border-sidebar-border">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <button
              onClick={goPrev}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-3 rounded-md border border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground hover:border-sidebar-foreground/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              Prev
            </button>

            <button
              onClick={isLast ? markComplete : goNext}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-medium hover:bg-sidebar-primary/90 transition-colors"
            >
              {isLast ? (
                isCompleted ? (
                  <>
                    <ChefHat className="w-4 h-4" strokeWidth={1.5} />
                    Finish cooking
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" strokeWidth={2} />
                    Complete final step
                  </>
                )
              ) : (
                <>
                  Next step
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
