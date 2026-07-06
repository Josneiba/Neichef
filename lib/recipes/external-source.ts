import { prisma } from '@/lib/prisma'

export function splitInstructionsIntoSteps(text: string): string[] {
  if (!text) return []
  // Split on newlines or sentence endings. Keep it simple and robust.
  return text
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function normalizeMealToRecipe(meal: Record<string, any>) {
  const ingredients: { name: string; amount: number; unit: string }[] = []
  for (let i = 1; i <= 20; i++) {
    const name = String(meal[`strIngredient${i}`] ?? '').trim()
    const measure = String(meal[`strMeasure${i}`] ?? '').trim()
    if (name) {
      ingredients.push({ name, amount: 1, unit: measure })
    }
  }

  const steps = splitInstructionsIntoSteps(meal.strInstructions || '').map((instruction, idx) => ({ step: idx + 1, instruction }))

  return {
    id: `external-${meal.idMeal}`,
    externalId: meal.idMeal,
    title: meal.strMeal,
    description: `${meal.strCategory ?? ''} ${meal.strArea ?? ''}`.trim(),
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: Number(meal.servings ?? 2) || 2,
    difficulty: 'medium',
    tags: (meal.strTags || '').split(',').filter(Boolean),
    imageUrl: meal.strMealThumb || undefined,
    costLevel: 'medium',
    ingredients: ingredients.map((ing) => ({ name: ing.name, amount: ing.amount, unit: ing.unit })),
    steps,
    isPublic: true,
  }
}

export async function getRecipeDetail(externalId: string) {
  // Try DB cache first
  const cached = await prisma.recipe.findFirst({ where: { externalId, source: 'external' }, include: { ingredients: true, steps: true } })
  if (cached) return cached

  const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(externalId)}`)
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

export async function fetchRandomMeals(count = 8) {
  const results = []
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

export async function searchRecipesByIngredients(ingredients: string[]) {
  if (!ingredients || ingredients.length === 0) return []

  const idCounts: Record<string, number> = {}

  for (const ing of ingredients.slice(0, 5)) {
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ing)}`)
      const data = await res.json()
      const meals = data?.meals || []
      for (const m of meals) {
        idCounts[m.idMeal] = (idCounts[m.idMeal] || 0) + 1
      }
    } catch {
      // ignore individual failures
    }
  }

  // Rank by counts
  const ranked = Object.entries(idCounts).sort((a, b) => b[1] - a[1]).slice(0, 20)

  const results = []
  for (const [id, count] of ranked) {
    const detail = await getRecipeDetail(id)
    if (detail) {
      // Annotate pantryMatchCount for ranking later
      results.push({ ...detail, pantryMatchCount: count, totalIngredients: detail.ingredients?.length ?? 0 })
    }
  }

  return results
}

export default { splitInstructionsIntoSteps, getRecipeDetail, searchRecipesByIngredients }
