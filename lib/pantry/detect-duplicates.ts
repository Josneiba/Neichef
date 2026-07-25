import { normalizePantryName } from '@/lib/pantry/normalize-ingredient'
import type { PantryItem } from '@/lib/types'

export type DuplicateGroup = {
  normalizedName: string
  items: PantryItem[]
}

export function detectDuplicatePantryItems(items: PantryItem[]) {
  const groups = items.reduce<Record<string, PantryItem[]>>((acc, item) => {
    const normalized = normalizePantryName(item.name)
    if (!normalized) return acc
    acc[normalized] = acc[normalized] ?? []
    acc[normalized].push(item)
    return acc
  }, {})

  return Object.entries(groups)
    .filter(([, group]) => group.length > 1)
    .map(([normalizedName, items]) => ({ normalizedName, items }))
}

export function hasDuplicatePantryItems(items: PantryItem[]) {
  return detectDuplicatePantryItems(items).length > 0
}
