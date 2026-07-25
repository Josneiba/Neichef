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
