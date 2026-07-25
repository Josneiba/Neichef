export function sanitizeIngredientName(rawName: string): string {
  return rawName
    .toLowerCase()
    .trim()
    .replace(/\b(organic|fresh|raw|diced|sliced|chopped|canned|frozen|large|small|medium|kg|g|lb|oz|pcs|pieces)\b/gi, '')
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i += 1) matrix[i] = [i]
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

export function calculateSimilarity(str1: string, str2: string): number {
  const clean1 = sanitizeIngredientName(str1)
  const clean2 = sanitizeIngredientName(str2)

  if (clean1 === clean2) return 1.0
  if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.85

  const maxLength = Math.max(clean1.length, clean2.length)
  if (maxLength === 0) return 1.0

  const distance = levenshteinDistance(clean1, clean2)
  return 1.0 - distance / maxLength
}

export function matchCanonicalIngredient<T extends { id: string; name: string }>(
  detectedName: string,
  catalog: T[],
  threshold = 0.65,
): { match: T | null; score: number } {
  let bestMatch: T | null = null
  let highestScore = 0

  for (const item of catalog) {
    const score = calculateSimilarity(detectedName, item.name)
    if (score > highestScore && score >= threshold) {
      highestScore = score
      bestMatch = item
    }
  }

  return { match: bestMatch, score: highestScore }
}
