import type { RecipeDifficulty } from '@/lib/types'

export type ImportedRecipeDraft = {
  title: string
  description: string
  prepTimeMinutes: string
  cookTimeMinutes: string
  servings: string
  difficulty: RecipeDifficulty
  tags: string[]
  ingredients: { name: string; amount: string; unit: string }[]
  steps: { instruction: string; durationMinutes: string }[]
}

function normalizeLine(line: string) {
  return line.trim().replace(/^[-*•\d.)\s]+/, '')
}

function inferDifficulty(text: string): RecipeDifficulty {
  const lower = text.toLowerCase()
  if (/(quick|simple|easy|sandwich|salad|pasta|breakfast|snack|dessert)/.test(lower)) return 'easy'
  if (/(complex|advanced|slow|long|braise|wellington|souffle|caramelize|tempering|folding|render|confit)/.test(lower)) return 'hard'

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const methodStart = lines.findIndex((line) => /^(method|instructions?|directions?):?$/i.test(line))
  const methodLines = (methodStart >= 0 ? lines.slice(methodStart + 1) : lines)
    .filter((line) => !/^ingredients?:?$/i.test(line) && !/^(method|instructions?|directions?):?$/i.test(line))
  if (methodLines.length <= 2) return 'easy'

  return 'medium'
}

export function parseImportedRecipeText(rawText: string, fallbackTitle = 'Imported recipe'): ImportedRecipeDraft {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) {
    return {
      title: fallbackTitle,
      description: 'Imported from text',
      prepTimeMinutes: '15',
      cookTimeMinutes: '20',
      servings: '2',
      difficulty: 'medium',
      tags: [],
      ingredients: [],
      steps: [],
    }
  }

  const ingredientStart = lines.findIndex((line) => /^ingredients?:?$/i.test(line))
  const methodStart = lines.findIndex((line) => /^(method|instructions?|directions?):?$/i.test(line))
  const titleLine = lines.find((line, index) => {
    if (/^ingredients?:?$/i.test(line) || /^(method|instructions?|directions?):?$/i.test(line)) return false
    if (/^[-*•\d.)\s]+/.test(line)) return false
    if (ingredientStart >= 0 && index > ingredientStart) return false
    if (methodStart >= 0 && index > methodStart) return false
    return Boolean(line.trim())
  }) ?? fallbackTitle

  const ingredientLines = ingredientStart >= 0
    ? lines.slice(ingredientStart + 1, methodStart > ingredientStart ? methodStart : undefined)
    : []
  const methodLines = methodStart >= 0 ? lines.slice(methodStart + 1) : []

  const ingredients = ingredientLines.map((line) => {
    const clean = normalizeLine(line)
    const match = clean.match(/^(\d+(?:\.\d+)?|\d+\/\d+)?\s*([a-zA-Z]+|tsp|tbsp|g|kg|ml|l|cup|cups)?\s+(.+)$/)
    return {
      amount: match?.[1] ?? '1',
      unit: match?.[2] ?? 'pcs',
      name: (match?.[3] ?? clean).trim(),
    }
  })

  const steps = methodLines.length > 0
    ? methodLines.map((line) => ({ instruction: normalizeLine(line), durationMinutes: '' }))
    : lines.filter((line) => !/^ingredients?:?$/i.test(line) && !/^(method|instructions?|directions?):?$/i.test(line) && line !== titleLine).map((line) => ({ instruction: normalizeLine(line), durationMinutes: '' }))

  return {
    title: String(titleLine).replace(/^#+\s*/, ''),
    description: 'Imported from text',
    prepTimeMinutes: '15',
    cookTimeMinutes: '20',
    servings: '2',
    difficulty: inferDifficulty(rawText),
    tags: [],
    ingredients,
    steps,
  }
}
