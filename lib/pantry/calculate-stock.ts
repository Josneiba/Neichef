import type { PantryItem } from '@/lib/types'
import { daysUntilExpiration, expiresSoon, isExpired, priorityScore } from '@/lib/pantry/expiration'

function isLowQuantity(item: PantryItem) {
  const unit = item.unit.toLowerCase()
  if (['g', 'gram', 'grams', 'ml', 'milliliter', 'milliliters'].some((suffix) => unit.includes(suffix))) {
    return item.quantity <= 100
  }
  if (['kg', 'kilogram', 'kilograms', 'l', 'liter', 'liters'].some((suffix) => unit.includes(suffix))) {
    return item.quantity <= 0.25
  }
  if (['cup', 'cups', 'tbsp', 'tsp', 'slice', 'slices', 'can', 'jar', 'bottle', 'pack', 'box'].some((suffix) => unit.includes(suffix))) {
    return item.quantity <= 1
  }
  return item.quantity <= 1
}

export function formatPantryQuantity(quantity: number, unit: string) {
  const normalizedUnit = unit?.trim().toLowerCase() ?? ''
  const isGramLike = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms'].includes(normalizedUnit)
  const isVolumeLike = ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'].includes(normalizedUnit)

  if (isGramLike && quantity >= 1000) {
    const kilograms = quantity / 1000
    const formatted = Number.isInteger(kilograms) ? kilograms.toString() : kilograms.toFixed(1).replace(/\.0$/, '')
    return `${formatted} kg`
  }

  if (isVolumeLike && quantity >= 1000) {
    const liters = quantity / 1000
    const formatted = Number.isInteger(liters) ? liters.toString() : liters.toFixed(1).replace(/\.0$/, '')
    return `${formatted} L`
  }

  if (isGramLike) return `${Number.isInteger(quantity) ? quantity : quantity.toFixed(1).replace(/\.0$/, '')} g`
  if (isVolumeLike) return `${Number.isInteger(quantity) ? quantity : quantity.toFixed(1).replace(/\.0$/, '')} mL`

  return `${Number.isInteger(quantity) ? quantity : quantity.toFixed(1).replace(/\.0$/, '')} ${unit || 'pcs'}`
}

function getCompatibleMeasurement(unit: string) {
  const normalizedUnit = unit?.trim().toLowerCase() ?? ''
  if (['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms'].includes(normalizedUnit)) return 'mass'
  if (['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'].includes(normalizedUnit)) return 'volume'
  return 'count'
}

function convertToBaseQuantity(quantity: number, unit: string) {
  const normalizedUnit = unit?.trim().toLowerCase() ?? ''
  if (['g', 'gram', 'grams'].includes(normalizedUnit)) return quantity
  if (['kg', 'kilogram', 'kilograms'].includes(normalizedUnit)) return quantity * 1000
  if (['ml', 'milliliter', 'milliliters'].includes(normalizedUnit)) return quantity
  if (['l', 'liter', 'liters'].includes(normalizedUnit)) return quantity * 1000
  return quantity
}

export function groupPantryStock(items: PantryItem[]) {
  const groups = new Map<string, PantryItem[]>()

  for (const item of items) {
    const baseKey = item.name.trim().toLowerCase()
    const measurement = getCompatibleMeasurement(item.unit)
    const key = measurement === 'count' ? `${baseKey}|${item.category}|count` : `${baseKey}|${item.category}|${measurement}`
    const current = groups.get(key) ?? []
    current.push(item)
    groups.set(key, current)
  }

  return Array.from(groups.values())
    .map((entries) => {
      const first = entries[0]
      const measurement = getCompatibleMeasurement(first.unit)
      const totalQuantity = entries.reduce((sum, entry) => sum + convertToBaseQuantity(entry.quantity, entry.unit), 0)
      const unit = measurement === 'mass' ? (totalQuantity >= 1000 ? 'kg' : 'g') : measurement === 'volume' ? (totalQuantity >= 1000 ? 'L' : 'ml') : first.unit || 'pcs'
      const displayLabel = measurement === 'count' ? `${totalQuantity} ${unit || 'pcs'}`.trim() : formatPantryQuantity(totalQuantity, unit)

      return {
        key: `${first.name.trim().toLowerCase()}|${first.category}|${measurement}`,
        name: first.name,
        category: first.category,
        totalQuantity,
        unit,
        displayLabel,
        entries: entries.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()),
      }
    })
    .sort((a, b) => {
      if (b.totalQuantity !== a.totalQuantity) return b.totalQuantity - a.totalQuantity
      return a.name.localeCompare(b.name)
    })
}

export function estimatePantryValue(items: PantryItem[]) {
  return items.reduce((total, item) => total + (item.estimatedPrice ?? 0), 0)
}

export function countLowStockItems(items: PantryItem[]) {
  return items.filter(isLowQuantity).length
}

export function countExpiringSoon(items: PantryItem[], threshold = 7) {
  return items.filter((item) => expiresSoon(item.expirationDate, threshold)).length
}

export function countExpiredItems(items: PantryItem[]) {
  return items.filter((item) => isExpired(item.expirationDate)).length
}

export function inventorySummary(items: PantryItem[]) {
  return {
    totalItems: items.length,
    lowStockCount: countLowStockItems(items),
    expiringSoonCount: countExpiringSoon(items),
    expiredCount: countExpiredItems(items),
    estimatedValue: estimatePantryValue(items),
    priorityScore: items.reduce((sum, item) => sum + priorityScore(item.expirationDate), 0),
  }
}
