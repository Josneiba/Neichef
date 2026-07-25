import { normalizeFoodName } from '@/lib/recipes/enrich'

export function normalizePantryName(value: string) {
  return normalizeFoodName(value)
}
