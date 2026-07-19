import { prisma } from '@/lib/prisma'
import { normalizeFoodName } from '@/lib/recipes/enrich'

type MealDbMeal = Record<string, unknown>
export type RecipeSearchResult = {
  id: string
  title?: string
  difficulty?: string
  costLevel?: string
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  pantryMatchCount?: number
  totalIngredients?: number
  ingredients?: { name: string }[]
  [key: string]: unknown
}

function textField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function ingredientSearchTerms(name: string) {
  const normalized = normalizeFoodName(name)
  if (!normalized) return []
  const words = normalized.split(' ')
  const terms = [normalized]
  if (words.length > 1) terms.push(words[words.length - 1])
  if (normalized.endsWith('es')) terms.push(normalized.slice(0, -2))
  if (normalized.endsWith('s')) terms.push(normalized.slice(0, -1))
  return [...new Set(terms)].map((term) => term.replace(/\s+/g, '_'))
}

function parseMeasure(measure: string) {
  const trimmed = measure.trim()
  if (!trimmed) return { amount: 1, unit: 'pcs' }

  const fractionMap: Record<string, number> = {
    '¼': 0.25,
    '½': 0.5,
    '¾': 0.75,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
  }
  const unicodeFraction = fractionMap[trimmed[0]]
  if (unicodeFraction) {
    return { amount: unicodeFraction, unit: trimmed.slice(1).trim() || 'pcs' }
  }

  const match = trimmed.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*(.*)$/)
  if (!match) return { amount: 1, unit: trimmed }

  const rawAmount = match[1]
  const amount = rawAmount.includes('/')
    ? rawAmount.split('/').map(Number).reduce((a, b) => (b ? a / b : a))
    : Number(rawAmount)

  return {
    amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
    unit: match[2].trim() || 'pcs',
  }
}

export function splitInstructionsIntoSteps(text: string): string[] {
  if (!text) return []
  // Split on newlines or sentence endings. Keep it simple and robust.
  return text
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((step) => step && !/^\d+\.?$/.test(step))
}

export function normalizeMealToRecipe(meal: MealDbMeal) {
  const ingredients: { name: string; amount: number; unit: string }[] = []
  for (let i = 1; i <= 20; i++) {
    const name = String(meal[`strIngredient${i}`] ?? '').trim()
    const measure = String(meal[`strMeasure${i}`] ?? '').trim()
    if (name) {
      ingredients.push({ name, ...parseMeasure(measure) })
    }
  }

  const steps = splitInstructionsIntoSteps(textField(meal.strInstructions)).map((instruction, idx) => ({ step: idx + 1, instruction }))
  const tags = textField(meal.strTags).split(',').filter(Boolean)

  return {
    id: `external-${textField(meal.idMeal)}`,
    externalId: textField(meal.idMeal),
    title: textField(meal.strMeal),
    description: `${textField(meal.strCategory)} ${textField(meal.strArea)}`.trim(),
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: Number(meal.servings ?? 2) || 2,
    difficulty: 'medium',
    tags,
    imageUrl: textField(meal.strMealThumb) || undefined,
    costLevel: 'medium',
    ingredients: ingredients.map((ing) => ({ name: ing.name, amount: ing.amount, unit: ing.unit })),
    steps,
    isPublic: true,
  }
}

export async function getRecipeDetail(externalId: string) {
  // Try DB cache first
  try {
    const cached = await prisma.recipe.findFirst({ where: { externalId, source: 'external' }, include: { ingredients: true, steps: true } })
    if (cached) return cached
  } catch (err) {
    console.warn('[recipes:external] cache lookup failed; fetching from TheMealDB only', { externalId, err })
  }

  const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(externalId)}`)
  if (!res.ok) return null
  const data = await res.json()
  const meal = data?.meals?.[0]
  if (!meal) return null
  const normalized = normalizeMealToRecipe(meal)

  // Cache in DB: since `externalId` is not a unique constraint, do a find + create/update
  try {
    const existing = await prisma.recipe.findFirst({ where: { externalId } })
    if (existing) {
      const updated = await prisma.recipe.update({
        where: { id: existing.id },
        data: {
          title: normalized.title,
          description: normalized.description,
          imageUrl: normalized.imageUrl,
          isPublic: true,
          costLevel: normalized.costLevel,
        },
        include: { ingredients: true, steps: true },
      })
      return updated
    }

    const created = await prisma.recipe.create({
      data: {
        title: normalized.title,
        description: normalized.description,
        prepTimeMinutes: normalized.prepTimeMinutes,
        cookTimeMinutes: normalized.cookTimeMinutes,
        servings: normalized.servings,
        difficulty: normalized.difficulty,
        tags: normalized.tags,
        imageUrl: normalized.imageUrl,
        costLevel: normalized.costLevel,
        isPublic: true,
        source: 'external',
        externalId: externalId,
        ingredients: { create: normalized.ingredients.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit })) },
        steps: { create: normalized.steps.map((s) => ({ step: s.step, instruction: s.instruction })) },
      },
      include: { ingredients: true, steps: true },
    })

    return created
  } catch {
    return { ...normalized, ingredients: normalized.ingredients, steps: normalized.steps }
  }
}

/**
 * Recipe ids in list responses can either be a real DB cuid, or a
 * `external-<mealId>` placeholder used before that TheMealDB recipe has
 * ever been cached locally (see normalizeMealToRecipe above). Actions that
 * write rows referencing a recipe (saving, in particular) need the real DB
 * id — this resolves either form to one, caching the external recipe on
 * first use so the foreign key exists.
 */
export async function resolveRecipeId(id: string): Promise<string | null> {
  if (!id.startsWith('external-')) return id
  const mealId = id.replace('external-', '')
  const detail = await getRecipeDetail(mealId)
  return detail?.id ?? null
}

export async function fetchRandomMeals(count = 8): Promise<ReturnType<typeof normalizeMealToRecipe>[]> {
  const results: ReturnType<typeof normalizeMealToRecipe>[] = []
  for (let i = 0; i < count; i++) {
    try {
      const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php')
      if (!res.ok) continue
      const data = await res.json()
      const meal = data?.meals?.[0]
      if (!meal) continue
      results.push(normalizeMealToRecipe(meal))
    } catch {
      // ignore individual failures
    }
  }
  return results
}

export async function searchRecipesByIngredients(ingredients: string[]): Promise<RecipeSearchResult[]> {
  if (!ingredients || ingredients.length === 0) return []

  const idCounts: Record<string, number> = {}

  for (const ing of ingredients.slice(0, 8)) {
    for (const term of ingredientSearchTerms(ing)) {
      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(term)}`)
        const data = await res.json()
        const meals = Array.isArray(data?.meals) ? data.meals : []
        for (const m of meals) {
          const mealId = textField((m as MealDbMeal).idMeal)
          if (mealId) idCounts[mealId] = (idCounts[mealId] || 0) + 1
        }
        if (meals.length > 0) break
      } catch {
        // ignore individual failures
      }
    }
  }

  // Rank by counts
  const ranked = Object.entries(idCounts).sort((a, b) => b[1] - a[1]).slice(0, 20)

  const results: RecipeSearchResult[] = []
  for (const [id, count] of ranked) {
    const detail = await getRecipeDetail(id)
    if (detail) {
      const ingredients = 'ingredients' in detail && Array.isArray(detail.ingredients) ? detail.ingredients : []
      // Annotate pantryMatchCount for ranking later
      results.push({ ...detail, pantryMatchCount: count, totalIngredients: ingredients.length })
    }
  }

  return results
}

export default { splitInstructionsIntoSteps, getRecipeDetail, searchRecipesByIngredients }
