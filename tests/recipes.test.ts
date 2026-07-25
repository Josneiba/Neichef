import { describe, expect, it } from 'vitest'
import { normalizeMealToRecipe, splitInstructionsIntoSteps } from '@/lib/recipes/external-source'

describe('external recipe normalization', () => {
  it('splits instruction blobs into discrete steps', () => {
    const steps = splitInstructionsIntoSteps('Mix the ingredients.\nCook for five minutes.')

    expect(steps).toHaveLength(2)
    expect(steps[0]).toBe('Mix the ingredients.')
    expect(steps[1]).toBe('Cook for five minutes.')
  })

  it('produces a normalized recipe with image and duration fields', () => {
    const recipe = normalizeMealToRecipe({
      idMeal: '1',
      strMeal: 'Chicken Pasta',
      strCategory: 'Dinner',
      strArea: 'Italian',
      strInstructions: 'Mix ingredients. Cook for five minutes.',
      strTags: 'quick, dinner',
      strMealThumb: 'https://example.com/chicken-pasta.jpg',
      strIngredient1: 'Chicken',
      strMeasure1: '200g',
      strIngredient2: 'Pasta',
      strMeasure2: '200g',
    })

    expect(recipe.title).toBe('Chicken Pasta')
    expect(recipe.imageUrl).toBe('https://example.com/chicken-pasta.jpg')
    expect(recipe.prepTimeMinutes).toBeGreaterThan(0)
    expect(recipe.cookTimeMinutes).toBeGreaterThan(0)
    expect(recipe.steps).toHaveLength(2)
  })
})
