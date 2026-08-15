import type { ItemUrgency } from '@/lib/types'

const SHELF_LIFE_DAYS: Record<string, number> = {
  produce: 5,
  dairy: 10,
  meat: 3,
  seafood: 2,
  grains: 180,
  condiments: 180,
  beverages: 30,
  frozen: 120,
  canned: 365,
  snacks: 90,
  pantry: 120,
  spice_rack: 365,
  fridge: 7,
  freezer: 120,
  cellar: 180,
  other: 14,
}

export function parseDate(value: string | Date): Date | null {
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function estimateExpiryDate(category: string, name?: string) {
  const baseDays = SHELF_LIFE_DAYS[category?.toLowerCase?.() ?? 'other'] ?? SHELF_LIFE_DAYS.other
  const text = (name ?? '').toLowerCase()

  let boostDays = 0
  if (/(milk|yogurt|cheese|butter|cream)/.test(text)) boostDays -= 3
  if (/(salmon|tuna|fish|shrimp|seafood|chicken|beef|pork)/.test(text)) boostDays -= 2
  if (/(rice|beans|lentils|flour|pasta|cereal|oats|coffee|tea)/.test(text)) boostDays += 30
  if (/(tomato|lettuce|spinach|herbs|berries|banana|apple|cucumber|avocado)/.test(text)) boostDays -= 1
  if (/(sauce|oil|vinegar|jam|pickle|soy|honey|mustard)/.test(text)) boostDays += 60
  if (/(frozen|icecream)/.test(text)) boostDays += 30

  const date = new Date()
  date.setDate(date.getDate() + Math.max(1, baseDays + boostDays))
  return date
}

export function daysUntilExpiration(value: string | Date): number | null {
  const date = parseDate(value)
  if (!date) return null
  const today = new Date()
  const diffMs = date.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function isExpired(value: string | Date): boolean {
  const days = daysUntilExpiration(value)
  return days !== null && days < 0
}

export function expiresSoon(value: string | Date, threshold = 3): boolean {
  const days = daysUntilExpiration(value)
  return days !== null && days >= 0 && days <= threshold
}

export function getItemUrgency(value: string | Date): ItemUrgency {
  const days = daysUntilExpiration(value)
  if (days === null) return 'fresh'
  if (days < 0) return 'expired'
  if (days <= 3) return 'expiring'
  return 'fresh'
}

export function priorityScore(value: string | Date): number {
  const days = daysUntilExpiration(value)
  if (days === null) return 0
  if (days < 0) return 100
  if (days <= 1) return 95
  if (days <= 3) return 80
  if (days <= 7) return 60
  if (days <= 14) return 40
  return 20
}
