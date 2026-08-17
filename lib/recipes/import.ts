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
  return line.trim().replace(/^[-*•\d.)\s]+/, '').replace(/^#+\s*/, '')
}

function extractTime(text: string): number {
  const match = text.match(/(\d+)\s*(?:to\s*)?(?:\d+\s*)?(?:minutes?|mins?)/i)
  return match ? parseInt(match[1], 10) : 0
}

function inferDifficulty(text: string): RecipeDifficulty {
  const lower = text.toLowerCase()
  if (/(quick|simple|easy|sandwich|salad|pasta|breakfast|snack|dessert|10\s*min|15\s*min)/.test(lower)) return 'easy'
  if (/(complex|advanced|slow|long|braise|wellington|souffle|caramelize|tempering|folding|render|confit|2\s*hours?|3\s*hours?)/.test(lower)) return 'hard'

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const methodStart = lines.findIndex((line) => /^#+?\s*(method|instructions?|directions?):?$/i.test(line))
  const methodLines = (methodStart >= 0 ? lines.slice(methodStart + 1) : lines)
    .filter((line) => !/^#+?\s*ingredients?:?$/i.test(line) && !/^#+?\s*(method|instructions?|directions?):?$/i.test(line))
  if (methodLines.length <= 3) return 'easy'

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

  // Find section markers (markdown headers or plain text labels)
  const sectionPattern = /^#+?\s*(ingredients?|method|instructions?|directions?|for\s+the\s+\w+|dough|filling|icing|frosting|sauce|glaze):?$/i
  const sections: { type: 'title' | 'ingredient' | 'step'; content: string[] }[] = []
  let currentSection: 'title' | 'ingredient' | 'step' | null = null
  let titleLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const sectionMatch = line.match(sectionPattern)

    if (sectionMatch) {
      const sectionType = sectionMatch[1].toLowerCase()
      const isIngredient = /^ingredients?|for\s+the|dough|filling|icing|frosting|sauce|glaze/.test(sectionType)
      const isMethod = /^(method|instructions?|directions?)/.test(sectionType)

      if (currentSection && titleLines.length > 0) {
        sections.push({ type: currentSection, content: titleLines })
        titleLines = []
      }

      currentSection = isIngredient ? 'ingredient' : isMethod ? 'step' : 'title'
    } else if (currentSection) {
      titleLines.push(line)
    } else if (!titleLines.some((l) => /\S/.test(l))) {
      titleLines.push(line)
    }
  }

  if (titleLines.length > 0 && currentSection) {
    sections.push({ type: currentSection, content: titleLines })
  }

  // Extract title from first non-ingredient/step line
  const titleSection = sections.find((s) => s.type === 'title')
  const title = titleSection?.content?.[0] ?? (lines.find((l) => !/^[*•\-\d]/.test(l)) ?? fallbackTitle)

  // Merge all ingredient sections
  const ingredientSections = sections.filter((s) => s.type === 'ingredient')
  const allIngredientLines = ingredientSections.flatMap((s) => s.content)
  const ingredients = allIngredientLines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const clean = normalizeLine(line)
      // Match patterns like "2.5 cups flour" or "100g butter"
      const match = clean.match(/^(\d+(?:[./]\d+)?)\s*([a-z]+|tsp|tbsp|g|kg|ml|l|cup|cups|oz|lb|pcs)?\s+(.+)$/i)
      return {
        amount: match?.[1] ?? '1',
        unit: match?.[2] ?? 'pcs',
        name: (match?.[3] ?? clean).trim().toLowerCase(),
      }
    })

  // Extract steps from all step sections
  const stepSections = sections.filter((s) => s.type === 'step')
  const steps = stepSections
    .flatMap((s) => s.content)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const clean = normalizeLine(line)
      const timeMatch = clean.match(/(\d+)\s*(?:to\s*)?(?:\d+\s*)?(?:minutes?|mins?)/)
      return {
        instruction: clean.replace(/(\d+\s*(?:to\s*)?(?:\d+\s*)?(?:minutes?|mins?))/i, '').trim(),
        durationMinutes: timeMatch?.[1] ?? '',
      }
    })

  // Extract prep/cook time from text if mentioned
  const prepMatch = rawText.match(/prep\s*(?:time)?:?\s*(\d+)\s*(?:to\s*)?(?:\d+\s*)?minutes?/i)
  const cookMatch = rawText.match(/cook\s*(?:time)?:?\s*(\d+)\s*(?:to\s*)?(?:\d+\s*)?minutes?/i)
  const servingsMatch = rawText.match(/servings?:?\s*(\d+)/i)

  return {
    title: String(title).replace(/^#+\s*/, '').replace(/^-+\s*/, ''),
    description: 'Imported from text',
    prepTimeMinutes: prepMatch?.[1] ?? '15',
    cookTimeMinutes: cookMatch?.[1] ?? '20',
    servings: servingsMatch?.[1] ?? '2',
    difficulty: inferDifficulty(rawText),
    tags: [],
    ingredients: ingredients.length > 0 ? ingredients : [{ name: 'ingredient', amount: '1', unit: 'pcs' }],
    steps: steps.length > 0 ? steps : [{ instruction: 'Follow recipe instructions', durationMinutes: '' }],
  }
}
