import type { PantryItem } from '@/lib/types'

export type PantryHealthStatus = 'excellent' | 'good' | 'fair' | 'critical'

export interface PantryHealthScore {
  score: number
  status: PantryHealthStatus
  freshCount: number
  expiringSoonCount: number
  expiredCount: number
  lowStockCount: number
}

function isLowQuantity(item: PantryItem) {
  const unit = item.unit.toLowerCase().trim()
  const normalizedUnit = unit.replace(/s$/, '')

  if (['g', 'gram', 'ml', 'milliliter'].includes(normalizedUnit)) {
    return item.quantity <= 100
  }
  if (['kg', 'kilogram', 'l', 'liter'].includes(normalizedUnit)) {
    return item.quantity <= 0.25
  }
  if (['cup', 'tbsp', 'tsp', 'slice', 'can', 'jar', 'bottle', 'pack', 'box'].includes(normalizedUnit)) {
    return item.quantity <= 1
  }
  return item.quantity <= 1
}

function daysUntilExpiration(value: string | Date, now: Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diffMs = date.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function calculatePantryHealthScore(items: PantryItem[], now = new Date()): PantryHealthScore {
  if (items.length === 0) {
    return { score: 100, status: 'excellent', freshCount: 0, expiringSoonCount: 0, expiredCount: 0, lowStockCount: 0 }
  }

  const freshCount = items.filter((item) => {
    const days = daysUntilExpiration(item.expirationDate, now)
    return days !== null && days > 3
  }).length

  const expiringSoonCount = items.filter((item) => {
    const days = daysUntilExpiration(item.expirationDate, now)
    return days !== null && days >= 0 && days <= 3
  }).length

  const expiredCount = items.filter((item) => {
    const days = daysUntilExpiration(item.expirationDate, now)
    return days !== null && days < 0
  }).length

  const lowStockCount = items.filter(isLowQuantity).length

  const penalties = expiringSoonCount * 10 + expiredCount * 20 + lowStockCount * 5
  const score = Math.max(0, Math.min(100, 100 - penalties))

  let status: PantryHealthStatus = 'excellent'
  if (score < 40) {
    status = 'critical'
  } else if (score < 70) {
    status = 'fair'
  } else if (score < 85) {
    status = 'good'
  }

  return { score, status, freshCount, expiringSoonCount, expiredCount, lowStockCount }
}
