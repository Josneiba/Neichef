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
  let score = 0

  score += Math.min(input.ingredientsCount / 4, 3)
  score += Math.min(input.stepsCount / 3, 3)

  if (input.totalTimeMinutes > 90) score += 3
  else if (input.totalTimeMinutes > 45) score += 1.5

  score += countMatches(input.instructionsText, HARD_TECHNIQUE_WORDS) * 2.5
  score += countMatches(input.instructionsText, MEDIUM_TECHNIQUE_WORDS) * 1

  if (score >= 8) return 'hard'
  if (score >= 4) return 'medium'
  return 'easy'
}

export default { computeDifficulty }
