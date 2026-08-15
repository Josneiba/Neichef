import { describe, expect, it } from 'vitest'
import { normalizeMealToRecipe, splitInstructionsIntoSteps } from '@/lib/recipes/external-source'
import { computeDifficulty } from '@/lib/recipes/difficulty'
import { parseImportedRecipeText } from '@/lib/recipes/import'
import { dedupeRecipes, filterAndScoreRecipes } from '@/lib/recipes/engine'

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

  it('classifies a sandwich (quick, many ingredients, few steps) as easy despite ingredient count', () => {
    // Sandwich: bread, butter, ham, lettuce, tomato, cheese, mayo, mustard = 8 ingredients
    // But only 2 steps and < 10 mins total time
    const recipe = normalizeMealToRecipe({
      idMeal: '52845',
      strMeal: 'Sandwich',
      strCategory: 'Lunch',
      strArea: 'American',
      strInstructions: 'Spread mayo and mustard on bread. Layer ham, lettuce, tomato, and cheese.',
      strTags: 'quick',
      strMealThumb: 'https://example.com/sandwich.jpg',
      strIngredient1: 'Bread',
      strMeasure1: '2 slices',
      strIngredient2: 'Butter',
      strMeasure2: '1 tbsp',
      strIngredient3: 'Ham',
      strMeasure3: '3 slices',
      strIngredient4: 'Lettuce',
      strMeasure4: '2 leaves',
      strIngredient5: 'Tomato',
      strMeasure5: '2 slices',
      strIngredient6: 'Cheese',
      strMeasure6: '1 slice',
      strIngredient7: 'Mayo',
      strMeasure7: '2 tbsp',
      strIngredient8: 'Mustard',
      strMeasure8: '1 tbsp',
      estimatedTime: 5,
    } as any)

    // Should be easy because it's quick (< 25 mins) despite having 8 ingredients
    expect(recipe.difficulty).toBe('easy')
    expect(recipe.prepTimeMinutes + recipe.cookTimeMinutes).toBeLessThan(25)
  })

  it('classifies a complex dish (long time, many steps, many ingredients) as hard', () => {
    // Beef Wellington: many steps, long cooking, complex technique
    const recipe = normalizeMealToRecipe({
      idMeal: '52803',
      strMeal: 'Beef Wellington',
      strCategory: 'Beef',
      strArea: 'British',
      strInstructions: 'Sear beef. Make duxelles. Wrap in pâté. Wrap in pastry. Score. Brush with egg. Bake for 40 minutes. Rest.',
      strTags: 'dinner, fancy',
      strMealThumb: 'https://example.com/wellington.jpg',
      strIngredient1: 'Beef tenderloin',
      strMeasure1: '500g',
      strIngredient2: 'Mushrooms',
      strMeasure2: '400g',
      strIngredient3: 'Pâté',
      strMeasure3: '200g',
      strIngredient4: 'Puff pastry',
      strMeasure4: '1 sheet',
      strIngredient5: 'Egg yolk',
      strMeasure5: '1',
      strIngredient6: 'Shallot',
      strMeasure6: '2',
      strIngredient7: 'Garlic',
      strMeasure7: '2 cloves',
      strIngredient8: 'Thyme',
      strMeasure8: '1 tbsp',
      strIngredient9: 'Salt',
      strMeasure9: 'to taste',
      strIngredient10: 'Pepper',
      strMeasure10: 'to taste',
      strIngredient11: 'Butter',
      strMeasure11: '2 tbsp',
      estimatedTime: 120,
    } as any)

    // Should be hard: > 60 mins AND > 10 steps (we count instructions as steps)
    expect(recipe.difficulty).toBe('hard')
    expect(recipe.prepTimeMinutes + recipe.cookTimeMinutes).toBeGreaterThan(60)
  })

  it('uses technique and time, not ingredient count alone, to estimate difficulty', () => {
    expect(computeDifficulty({ ingredientsCount: 9, stepsCount: 2, totalTimeMinutes: 10, instructionsText: 'Mix lettuce, tomato, and cucumber. Dress with olive oil and lemon.' })).toBe('easy')
    expect(computeDifficulty({ ingredientsCount: 4, stepsCount: 4, totalTimeMinutes: 90, instructionsText: 'Whisk eggs, fold in flour, and caramelize the sugar.' })).toBe('hard')
  })

  it('parses text-based recipes into a draft form for the create page', () => {
    const draft = parseImportedRecipeText('Ingredients\n- 2 eggs\n- 1 cup flour\n\nMethod\nMix the batter.\nBake for 20 minutes.', 'Quick breakfast')

    expect(draft.title).toBe('Quick breakfast')
    expect(draft.ingredients).toHaveLength(2)
    expect(draft.steps).toHaveLength(2)
    expect(draft.difficulty).toBe('easy')
  })

  it('keeps useful recipe suggestions when the pantry only matches a few ingredients', () => {
    const pantry = [
      { id: 'p1', name: 'tomato', quantity: 1, unit: 'pcs', expiresAt: new Date('2999-12-31') },
      { id: 'p2', name: 'onion', quantity: 1, unit: 'pcs', expiresAt: new Date('2999-12-31') },
    ]

    const recipes = [{
      id: 'r1',
      title: 'Tomato onion pasta',
      description: 'Quick pasta with tomato and onion.',
      ingredients: [
        { id: 'i1', name: 'pasta', amount: 200, unit: 'g' },
        { id: 'i2', name: 'tomato', amount: 2, unit: 'pcs' },
        { id: 'i3', name: 'onion', amount: 1, unit: 'pcs' },
        { id: 'i4', name: 'garlic', amount: 2, unit: 'cloves' },
        { id: 'i5', name: 'olive oil', amount: 1, unit: 'tbsp' },
      ],
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      difficulty: 'easy',
      costLevel: 'low',
    }]

    const results = filterAndScoreRecipes(pantry, recipes, { minMatchPercentage: 0.12, maxMissingRequired: 10 })

    expect(results).toHaveLength(1)
    expect(results[0].matchedIngredients).toHaveLength(2)
    expect(results[0].missingIngredients).toHaveLength(3)
  })

  it('removes duplicate recipe entries before rendering suggestions', () => {
    const recipes = [
      { id: 'recipe-1', title: 'Seafood rice', description: '', ingredients: [], prepTimeMinutes: 20, cookTimeMinutes: 20, difficulty: 'easy', costLevel: 'low' },
      { id: 'recipe-1', title: 'Seafood rice', description: '', ingredients: [], prepTimeMinutes: 20, cookTimeMinutes: 20, difficulty: 'easy', costLevel: 'low' },
      { id: 'recipe-2', title: 'Tomato pasta', description: '', ingredients: [], prepTimeMinutes: 15, cookTimeMinutes: 10, difficulty: 'easy', costLevel: 'low' },
    ] as any

    expect(dedupeRecipes(recipes)).toHaveLength(2)
    expect(dedupeRecipes(recipes).map((recipe) => recipe.id)).toEqual(['recipe-1', 'recipe-2'])
  })
})
