'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT } from '@/lib/i18n'
import { useRecipes } from '@/lib/hooks'
import { ArrowLeft, Plus, Trash2, Loader2, FileText, X } from 'lucide-react'
import type { RecipeDifficulty } from '@/lib/types'
import { parseImportedRecipeText } from '@/lib/recipes/import'

type DraftIngredient = { name: string; amount: string; unit: string }
type DraftStep = { instruction: string; durationMinutes: string }

// This page did not exist before — the recipes list linked to
// /app/recipes/new, but nothing rendered at that route, so "Add recipe"
// was a dead link. addCustomRecipe() in lib/hooks.ts and POST /api/recipes
// were already implemented; this page is what actually calls them.
export default function NewRecipePage() {
  const t = useT()
  const router = useRouter()
  const { addCustomRecipe } = useRecipes()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('15')
  const [cookTimeMinutes, setCookTimeMinutes] = useState('20')
  const [servings, setServings] = useState('2')
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>('easy')
  const [costLevel, setCostLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [tags, setTags] = useState('')
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([{ name: '', amount: '', unit: 'g' }])
  const [steps, setSteps] = useState<DraftStep[]>([{ instruction: '', durationMinutes: '' }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importMode, setImportMode] = useState<'manual' | 'paste' | 'document'>('manual')
  const [error, setError] = useState('')
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteText, setPasteText] = useState('')

  function updateIngredient(index: number, patch: Partial<DraftIngredient>) {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)))
  }
  function updateStep(index: number, patch: Partial<DraftStep>) {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)))
  }

  async function importRecipeText(text: string, source: 'paste' | 'document') {
    setIsImporting(true)
    setError('')
    try {
      const response = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ text, source }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error ?? 'Could not import this recipe.')
      const draft = payload.draft
      if (!draft) throw new Error('The import service did not return a draft.')
      setTitle(draft.title ?? '')
      setDescription(draft.description ?? '')
      setPrepTimeMinutes(String(draft.prepTimeMinutes ?? 15))
      setCookTimeMinutes(String(draft.cookTimeMinutes ?? 20))
      setServings(String(draft.servings ?? 2))
      setDifficulty(draft.difficulty ?? 'medium')
      setTags((draft.tags ?? []).join(', '))
      setIngredients((draft.ingredients ?? []).map((item: { name: string; amount: number | string; unit: string }) => ({ name: item.name, amount: String(item.amount ?? 1), unit: item.unit ?? 'pcs' })))
      setSteps((draft.steps ?? []).map((step: { instruction: string; durationMinutes?: number | string }) => ({ instruction: step.instruction, durationMinutes: step.durationMinutes ? String(step.durationMinutes) : '' })))
      setImportMode(source === 'document' ? 'document' : 'paste')
    } catch (err) {
      const fallback = parseImportedRecipeText(text, 'Imported recipe')
      setTitle(fallback.title)
      setDescription(fallback.description)
      setPrepTimeMinutes(fallback.prepTimeMinutes)
      setCookTimeMinutes(fallback.cookTimeMinutes)
      setServings(fallback.servings)
      setDifficulty(fallback.difficulty)
      setTags(fallback.tags.join(', '))
      setIngredients(fallback.ingredients)
      setSteps(fallback.steps)
      setError(err instanceof Error ? err.message : 'Could not import this recipe.')
    } finally {
      setIsImporting(false)
    }
  }

  async function importDocument(file: File | undefined) {
    if (!file) return
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError('For now, recipe import supports .txt and .md files. Photo OCR needs a dedicated OCR provider.')
      return
    }
    const text = await file.text()
    if (!text.trim()) return
    await importRecipeText(text, 'document')
  }

  async function handlePasteImport() {
    setShowPasteModal(true)
    setPasteText('')
  }

  async function handlePasteSubmit() {
    if (!pasteText?.trim()) {
      setShowPasteModal(false)
      return
    }
    setShowPasteModal(false)
    await importRecipeText(pasteText, 'paste')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleanIngredients = ingredients.filter((i) => i.name.trim())
    const cleanSteps = steps.filter((s) => s.instruction.trim())

    if (!title.trim() || !description.trim() || cleanIngredients.length === 0 || cleanSteps.length === 0) {
      setError('Add a title, description, at least one ingredient and one step.')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await addCustomRecipe({
        title: title.trim(),
        description: description.trim(),
        prepTimeMinutes: Number(prepTimeMinutes) || 1,
        cookTimeMinutes: Number(cookTimeMinutes) || 1,
        servings: Number(servings) || 1,
        difficulty,
        costLevel,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        ingredients: cleanIngredients.map((i) => ({ name: i.name.trim(), amount: Number(i.amount) || 1, unit: i.unit.trim() || 'pcs', inPantry: false })),
        steps: cleanSteps.map((s, idx) => ({ step: idx + 1, instruction: s.instruction.trim(), durationMinutes: s.durationMinutes ? Number(s.durationMinutes) : undefined })),
      })
      if (created?.id) {
        router.push(`/app/recipes/${created.id}`)
      } else {
        router.push('/app/recipes')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this recipe.')
      setIsSubmitting(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring'
  const labelClass = 'block text-xs font-medium text-foreground mb-1.5'

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 lg:pb-8">
      <Link href="/app/recipes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> {t('backToRecipes')}
      </Link>

      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{t('createRecipe')}</p>
        <h1 className="font-serif text-3xl text-foreground">{t('newRecipe')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('importRecipeDraft')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('pasteRecipeDescription')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setImportMode('manual')} className={importMode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground border border-border'} style={{ borderRadius: 999, padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>{t('manualImport')}</button>
              <button type="button" onClick={() => void handlePasteImport()} className={importMode === 'paste' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground border border-border'} style={{ borderRadius: 999, padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>{t('pasteText')}</button>
              <label className={importMode === 'document' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground border border-border'} style={{ borderRadius: 999, padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <FileText className="h-4 w-4" strokeWidth={1.6} />
                {t('uploadFile')}
                <input type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={(event) => void importDocument(event.target.files?.[0])} />
              </label>
            </div>
          </div>
          {isImporting ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('extractingRecipeDraft')}
            </div>
          ) : null}
        </div>

        <div>
          <label className={labelClass}>{t('recipeTitle')} *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weeknight garlic pasta" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>{t('recipeDescription')} *</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="A short description of the dish" className={inputClass} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>{t('prepTime')}</label>
            <input type="number" min="1" value={prepTimeMinutes} onChange={(e) => setPrepTimeMinutes(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('cookTime')}</label>
            <input type="number" min="1" value={cookTimeMinutes} onChange={(e) => setCookTimeMinutes(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('servings')}</label>
            <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{t('difficulty')}</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as RecipeDifficulty)} className={cn_select()}>
              <option value="easy">{t('easy')}</option>
              <option value="medium">{t('intermediate')}</option>
              <option value="hard">{t('advanced')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('costLevel')}</label>
            <select value={costLevel} onChange={(e) => setCostLevel(e.target.value as 'low' | 'medium' | 'high')} className={cn_select()}>
              <option value="low">{t('low')}</option>
              <option value="medium">{t('medium')}</option>
              <option value="high">{t('high')}</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>{t('tagsSeparated')}</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="quick, vegetarian, weeknight" className={inputClass} />
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>{t('ingredients')} *</label>
          </div>
          <div className="space-y-2">
            {ingredients.map((ing, index) => (
              <div key={index} className="grid grid-cols-[1fr_80px_80px_auto] gap-2">
                <input value={ing.name} onChange={(e) => updateIngredient(index, { name: e.target.value })} placeholder={t('ingredients')} className={inputClass} />
                <input value={ing.amount} onChange={(e) => updateIngredient(index, { amount: e.target.value })} placeholder="Amt" inputMode="decimal" className={inputClass} />
                <input value={ing.unit} onChange={(e) => updateIngredient(index, { unit: e.target.value })} placeholder="Unit" className={inputClass} />
                <button type="button" onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive" aria-label="Remove ingredient">
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setIngredients((prev) => [...prev, { name: '', amount: '', unit: 'g' }])} className="mt-2 w-full flex items-center justify-center gap-1.5 border border-dashed border-border rounded-lg py-2 text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> {t('addIngredient')}
          </button>
        </div>

        {/* Steps */}
        <div>
          <label className={labelClass}>{t('method')} *</label>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-shrink-0 w-7 h-7 mt-1.5 rounded-full bg-muted border border-border flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                </div>
                <textarea
                  value={step.instruction}
                  onChange={(e) => updateStep(index, { instruction: e.target.value })}
                  placeholder={`${t('step')} ${index + 1}`}
                  rows={2}
                  className={cn_textarea()}
                />
                <input
                  value={step.durationMinutes}
                  onChange={(e) => updateStep(index, { durationMinutes: e.target.value })}
                  placeholder="min"
                  inputMode="numeric"
                  className="w-16 h-10 mt-1.5 px-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button type="button" onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive mt-2.5 flex-shrink-0" aria-label="Remove step">
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setSteps((prev) => [...prev, { instruction: '', durationMinutes: '' }])} className="mt-2 w-full flex items-center justify-center gap-1.5 border border-dashed border-border rounded-lg py-2 text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> {t('addStep')}
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isSubmitting ? t('saving') : t('saveRecipe')}
        </button>
      </form>

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-foreground">{t('pasteRecipeTitle')}</h2>
              <button onClick={() => setShowPasteModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t('pasteRecipePrompt')}</p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste recipe here..."
              rows={8}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {t('submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function cn_select() {
  return 'w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring capitalize'
}
function cn_textarea() {
  return 'flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring'
}
