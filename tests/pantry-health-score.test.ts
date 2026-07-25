import { describe, expect, it } from 'vitest'
import type { PantryItem } from '@/lib/types'
import { calculatePantryHealthScore } from '@/lib/pantry/health-score'

function makeItem(overrides: Partial<PantryItem>): PantryItem {
  return {
    id: 'item-1',
    name: 'Tomatoes',
    category: 'produce',
    quantity: 2,
    unit: 'kg',
    expirationDate: '2026-01-20',
    location: 'fridge',
    urgency: 'fresh',
    addedDate: '2026-01-01',
    ...overrides,
  }
}

describe('calculatePantryHealthScore', () => {
  it('returns a perfect score for a fresh, well-stocked pantry', () => {
    const now = new Date('2026-01-15T12:00:00.000Z')
    const result = calculatePantryHealthScore([
      makeItem({ id: 'fresh-1', expirationDate: '2026-02-01', quantity: 3, unit: 'kg' }),
      makeItem({ id: 'fresh-2', expirationDate: '2026-01-25', quantity: 4, unit: 'bunch' }),
    ], now)

    expect(result.score).toBe(100)
    expect(result.status).toBe('excellent')
    expect(result.freshCount).toBe(2)
    expect(result.expiringSoonCount).toBe(0)
    expect(result.expiredCount).toBe(0)
    expect(result.lowStockCount).toBe(0)
  })

  it('penalizes expiring and low-stock items', () => {
    const now = new Date('2026-01-15T12:00:00.000Z')
    const result = calculatePantryHealthScore([
      makeItem({ id: 'expiring-1', expirationDate: '2026-01-18', quantity: 1, unit: 'bunch' }),
      makeItem({ id: 'expired-1', expirationDate: '2026-01-10', quantity: 2, unit: 'pack' }),
      makeItem({ id: 'low-stock-1', expirationDate: '2026-02-02', quantity: 0.1, unit: 'kg' }),
    ], now)

    expect(result.score).toBe(60)
    expect(result.status).toBe('fair')
    expect(result.expiringSoonCount).toBe(1)
    expect(result.expiredCount).toBe(1)
    expect(result.lowStockCount).toBe(2)
  })
})
