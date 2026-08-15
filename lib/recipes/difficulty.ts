export type DifficultyInput = {
  ingredientsCount: number
  stepsCount: number
  totalTimeMinutes: number
  instructionsText: string
}

const HARD_TECHNIQUE_WORDS = [
  'fold', 'temper', 'deglaze', 'julienne', 'sous.?vide', 'ferment', 'proof',
  'knead', 'caramelize', 'reduce', 'clarify', 'flambe', 'blanch and shock',
  'emulsify', 'laminate', 'brine',
]

const MEDIUM_TECHNIQUE_WORDS = [
  'whisk', 'saute', 'sauté', 'simmer', 'marinate', 'roast', 'grill', 'poach', 'braise',
]

function countMatches(text: string, words: string[]) {
  const lower = text.toLowerCase()
  return words.reduce((count, word) => count + (new RegExp(word, 'i').test(lower) ? 1 : 0), 0)
}

export function computeDifficulty(input: DifficultyInput): 'easy' | 'medium' | 'hard' {
  const hardTechniqueCount = countMatches(input.instructionsText, HARD_TECHNIQUE_WORDS)
  const mediumTechniqueCount = countMatches(input.instructionsText, MEDIUM_TECHNIQUE_WORDS)

  const simpleQuickMeal = input.totalTimeMinutes <= 25 && input.stepsCount <= 3 && input.ingredientsCount <= 7
  const verySimpleMeal = input.totalTimeMinutes <= 40 && input.stepsCount <= 2 && input.ingredientsCount <= 5

  if (simpleQuickMeal || verySimpleMeal) return 'easy'
  if (input.totalTimeMinutes >= 90 && input.stepsCount >= 5) return 'hard'
  if (input.stepsCount >= 7 && input.ingredientsCount >= 8) return 'hard'
  if (hardTechniqueCount >= 2 && (input.totalTimeMinutes >= 45 || input.stepsCount >= 5)) return 'hard'

  let score = 0
  score += Math.min(input.ingredientsCount / 4, 2)
  score += Math.min(input.stepsCount / 3, 2.5)

  if (input.totalTimeMinutes > 90) score += 2.8
  else if (input.totalTimeMinutes > 45) score += 1.6
  else if (input.totalTimeMinutes > 20) score += 0.9

  score += hardTechniqueCount * 2.5
  score += mediumTechniqueCount * 0.9

  if (score >= 7.5) return 'hard'
  if (score >= 4.2) return 'medium'
  return 'easy'
}

export default { computeDifficulty }
