import { describe, it, expect } from 'vitest'
import { computeUrgency } from '@/components/ui/urgency-badge'

describe('computeUrgency', () => {
  it('returns expired for past dates', () => {
    const past = new Date()
    past.setDate(past.getDate() - 3)
    const res = computeUrgency(past)
    expect(res.urgency).toBe('expired')
  })

  it('returns expiring for within 2 days', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const res = computeUrgency(tomorrow)
    expect(res.urgency).toBe('expiring')
    expect(res.daysLeft).toBe(1)
  })

  it('returns fresh for distant dates', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    const res = computeUrgency(future)
    expect(res.urgency).toBe('fresh')
  })
})
