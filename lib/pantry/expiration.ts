import type { ItemUrgency } from '@/lib/types'

export function parseDate(value: string | Date): Date | null {
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
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
