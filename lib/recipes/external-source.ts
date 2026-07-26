import { prisma } from '@/lib/prisma'
import { normalizeFoodName, estimateRecipeCostLevel } from '@/lib/recipes/enrich'
import { isDbAvailable, reportDbFailure, markDbSuccess } from '@/lib/dbCircuit'

// In-process cache to avoid unnecessary DB calls for recently-seen external
// recipes. This complements the shared DB circuit breaker above.
const inMemoryRecipeCache = new Map<string, Record<string, unknown>>()
// Queue of normalized external recipes to persist when DB recovers.
const writeQueue: Array<{ externalId: string; normalized: ReturnType<typeof normalizeMealToRecipe> }> = []

async function flushWriteQueue() {
  if (!isDbAvailable() || writeQueue.length === 0) return
  // process one item at a time to avoid spikes
  const item = writeQueue.shift()
  if (!item) return
  try {
    const { externalId, normalized } = item
    const existing = await prisma.recipe.findFirst({ where: { externalId } })
    if (existing) {
      await prisma.recipe.update({ where: { id: existing.id }, data: {
        title: normalized.title,
        description: normalized.description,
        imageUrl: normalized.imageUrl,
        isPublic: true,
        costLevel: normalized.costLevel,
      }})
    } else {
      await prisma.recipe.create({ data: {
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
      }})
    }
    markDbSuccess()
  } catch (err: unknown) {
    console.warn('[recipes:external] flushWriteQueue failed', err)
    reportDbFailure()
    // put the item back for later retry
    // careful: avoid unbounded growth — cap queue size
    if (writeQueue.length < 500) writeQueue.unshift(item)
  }
}

// Try draining the queue periodically
setInterval(flushWriteQueue, 5000)

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
  const words = normalized.split(' ').filter(Boolean)
  const terms = [normalized]
  if (words.length > 1) {
    terms.push(...words)
    terms.push(words[0])
    terms.push(words[words.length - 1])
    terms.push(words.slice(0, 2).join(' '))
    terms.push(words.slice(-2).join(' '))
    for (let i = 0; i < words.length - 1; i += 1) {
      terms.push(`${words[i]} ${words[i + 1]}`)
    }
  }
  if (normalized.endsWith('es')) terms.push(normalized.slice(0, -2))
  if (normalized.endsWith('s')) terms.push(normalized.slice(0, -1))
  return [...new Set(terms)].filter(Boolean)
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
  const estimatedCost = estimateRecipeCostLevel(ingredients)
  const estimatedTime = Number(meal.estimatedTime) || Math.max(10, ingredients.length * 6 + 10)
  const estimatedDifficulty = ingredients.length > 8 ? 'hard' : ingredients.length > 5 ? 'medium' : 'easy'

  return {
    id: `external-${textField(meal.idMeal)}`,
    externalId: textField(meal.idMeal),
    title: textField(meal.strMeal),
    description: `${textField(meal.strCategory)} ${textField(meal.strArea)}`.trim(),
    prepTimeMinutes: Math.max(5, Math.round(estimatedTime * 0.4)),
    cookTimeMinutes: Math.max(5, Math.round(estimatedTime * 0.6)),
    servings: Number(meal.servings ?? 2) || 2,
    difficulty: estimatedDifficulty,
    tags,
    imageUrl: textField(meal.strMealThumb) || undefined,
    costLevel: estimatedCost,
    ingredients: ingredients.map((ing) => ({ name: ing.name, amount: ing.amount, unit: ing.unit })),
    steps,
    isPublic: true,
  }
}

export async function getRecipeDetail(externalId: string) {
  // In-memory cache first
  if (inMemoryRecipeCache.has(externalId)) return inMemoryRecipeCache.get(externalId)

  // Try DB cache first (skip if circuit-breaker active)
  try {
    if (isDbAvailable()) {
      const cached = await prisma.recipe.findFirst({ where: { externalId, source: 'external' }, include: { ingredients: true, steps: true } })
      if (cached) {
        inMemoryRecipeCache.set(externalId, cached)
        return cached
      }
    }
  } catch (err: unknown) {
    console.warn('[recipes:external] cache lookup failed; fetching from TheMealDB only', { externalId, err })
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('self-signed certificate') || msg.includes('TlsConnectionError') || msg.includes('too many authentication')) {
      // report failure to backoff with exponential jitter
      reportDbFailure()
    }
  }

  const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(externalId)}`)
  if (!res.ok) return null
  const data = await res.json()
  const meal = data?.meals?.[0]
  if (!meal) return null
  const normalized = normalizeMealToRecipe(meal)

  // Cache in DB: since `externalId` is not a unique constraint, do a find + create/update
    try {
    if (!isDbAvailable()) {
      // Skip DB writes while circuit-breaker is active; enqueue for later
      if (writeQueue.length < 500) writeQueue.push({ externalId, normalized })
      return { ...normalized, ingredients: normalized.ingredients, steps: normalized.steps }
    }

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
      inMemoryRecipeCache.set(externalId, updated)
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

    inMemoryRecipeCache.set(externalId, created)
    // DB write succeeded — reset failure count
    markDbSuccess()
    // attempt to flush one queued item now that DB is healthy
    void flushWriteQueue()
    return created
  } catch (err: unknown) {
    // On DB write error, report failure and return the normalized external object
    console.warn('[recipes:external] db write failed; disabling DB for a short window', err)
    reportDbFailure()
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
  const resolvedId = detail?.id
  return typeof resolvedId === 'string' ? resolvedId : null
}

export async function fetchRandomMeals(count = 8): Promise<ReturnType<typeof normalizeMealToRecipe>[]> {
  const results: ReturnType<typeof normalizeMealToRecipe>[] = []
  const seen = new Set<string>()
  for (let i = 0; i < Math.max(count, 5) * 2; i++) {
    try {
      const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php')
      if (!res.ok) continue
      const data = await res.json()
      const meal = data?.meals?.[0]
      if (!meal) continue
      const normalized = normalizeMealToRecipe(meal)
      const key = normalized.title?.toLowerCase() ?? ''
      if (!key || seen.has(key)) continue
      seen.add(key)
      results.push(normalized)
      if (results.length >= count) break
    } catch {
      // ignore individual failures
    }
  }
  return results
}

export async function searchRecipesByIngredients(
  ingredients: string[],
  searchMode: 'ingredients' | 'recipes' = 'ingredients',
): Promise<RecipeSearchResult[]> {
  if (!ingredients || ingredients.length === 0) return []

  const idCounts: Record<string, number> = {}
  const nameResults: Record<string, ReturnType<typeof normalizeMealToRecipe>> = {}
  const seenIds = new Set<string>()

  const queryText = ingredients.join(' ').trim()
  const shouldTryNameSearch = searchMode === 'recipes' && queryText.length >= 3 && queryText.length <= 60 && /^[a-zA-Z\s]+$/.test(queryText)
  if (shouldTryNameSearch) {
    const nameSearchQueries = new Set<string>()
    nameSearchQueries.add(queryText)
    for (const term of queryText.split(/\s+/).filter((term) => term.length >= 3)) {
      nameSearchQueries.add(term)
    }

    const normalizedQuery = normalizeFoodName(queryText)
    const queryTokens = normalizedQuery.split(' ').filter(Boolean)
    const recipeCategoryKeywords: Record<string, string[]> = {
      Pasta: ['pasta', 'spaghetti', 'lasagna', 'penne', 'macaroni', 'ravioli', 'fettuccine', 'farfalle', 'linguine'],
      Beef: ['beef', 'steak', 'roast', 'brisket'],
      Chicken: ['chicken'],
      Seafood: ['seafood', 'fish', 'shrimp', 'prawn', 'salmon', 'tuna', 'crab', 'lobster'],
      Dessert: ['dessert', 'cake', 'cookie', 'pie', 'brownie', 'tart', 'pudding'],
      Breakfast: ['breakfast', 'brunch', 'omelette', 'pancake', 'waffle', 'cereal'],
      Side: ['side', 'salad', 'sandwich', 'fries', 'chips'],
      Starter: ['starter', 'appetizer', 'dip', 'finger food'],
    }

    for (const [category, keywords] of Object.entries(recipeCategoryKeywords)) {
      if (!keywords.some((keyword) => queryTokens.includes(keyword))) continue

      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`)
        if (!res.ok) continue
        const data = await res.json()
        const categoryMeals: MealDbMeal[] = Array.isArray(data?.meals) ? data.meals : []
        for (const meal of categoryMeals) {
          const mealId = textField(meal.idMeal)
          if (!mealId || nameResults[mealId]) continue
          const normalized = normalizeMealToRecipe(meal)
          nameResults[mealId] = normalized
          idCounts[mealId] = (idCounts[mealId] || 0) + 5
        }
      } catch {
        // ignore category fetch failures
      }
    }

    for (const searchQuery of nameSearchQueries) {
      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchQuery)}`)
        if (!res.ok) continue
        const data = await res.json()
        const meals: MealDbMeal[] = Array.isArray(data?.meals) ? data.meals : []
        for (const m of meals) {
          const mealId = textField(m.idMeal)
          if (!mealId) continue
          if (nameResults[mealId]) continue
          const normalized = normalizeMealToRecipe(m)
          nameResults[mealId] = normalized
          idCounts[mealId] = (idCounts[mealId] || 0) + 10
        }
      } catch {
        // ignore name-search failures
      }
    }
  }

  const shouldSearchByIngredients = searchMode === 'ingredients' || searchMode === 'recipes' || Object.keys(nameResults).length === 0
  if (shouldSearchByIngredients) {
    const ingredientFilterTerms = new Set<string>()
    for (const ing of ingredients.slice(0, 8)) {
      for (const term of ingredientSearchTerms(ing)) {
        ingredientFilterTerms.add(term)
      }
      for (const word of normalizeFoodName(ing).split(' ').filter(Boolean)) {
        ingredientFilterTerms.add(word)
      }
    }

    for (const term of ingredientFilterTerms) {
      let foundMeals: MealDbMeal[] = []
      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(term)}`)
        const data = await res.json()
        foundMeals = Array.isArray(data?.meals) ? data.meals : []
      } catch {
        // ignore individual failures
      }

      for (const m of foundMeals) {
        const mealId = textField((m as MealDbMeal).idMeal)
        if (mealId) {
          idCounts[mealId] = (idCounts[mealId] || 0) + 2
          seenIds.add(mealId)
        }
      }
    }
  }

  // Rank by counts
  const ranked = Object.entries(idCounts).sort((a, b) => b[1] - a[1]).slice(0, 60)

  // Batch-resolve DB-cached recipes for the top candidates to avoid many
  // sequential DB calls (this greatly reduces connection churn).
  const topIds = ranked.map(([id]) => id)
  let cachedById: Record<string, Record<string, unknown>> = {}
  try {
    if (isDbAvailable()) {
      const cached = await prisma.recipe.findMany({ where: { externalId: { in: topIds }, source: 'external' }, include: { ingredients: true, steps: true } })
      cachedById = Object.fromEntries(cached.map((c) => [String((c as any).externalId), c as Record<string, unknown>]))
      // prime in-memory cache
      for (const c of cached) inMemoryRecipeCache.set(String((c as any).externalId), c as Record<string, unknown>)
    }
  } catch (err: unknown) {
    console.warn('[recipes:external] batch cache lookup failed', err)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
  }

  const results: RecipeSearchResult[] = []
  for (const [id, count] of ranked.slice(0, searchMode === 'recipes' ? 40 : 24)) {
    let detail: Record<string, unknown> | null | undefined = null
    if (inMemoryRecipeCache.has(id)) detail = inMemoryRecipeCache.get(id) as Record<string, unknown>
    else if (cachedById[id]) detail = cachedById[id]
    else if (nameResults[id]) detail = nameResults[id]
    else {
      // Resolve on-demand; respects circuit-breaker inside getRecipeDetail
      detail = await getRecipeDetail(id)
    }

    if (detail && typeof (detail as any).id === 'string') {
      const ingredientsArr = Array.isArray((detail as any).ingredients) ? (detail as any).ingredients : []
      results.push({ ...(detail as any), pantryMatchCount: count, totalIngredients: ingredientsArr.length })
    }
  }

  return results
}

export default { splitInstructionsIntoSteps, getRecipeDetail, searchRecipesByIngredients }
