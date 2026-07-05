import { describe, expect, it } from 'vitest'
import { splitInstructionsIntoSteps } from '@/lib/recipes/external-source'

describe('external recipe normalization', () => {
  it('splits instruction blobs into discrete steps', () => {
    const steps = splitInstructionsIntoSteps('Mix the ingredients.\nCook for five minutes.')

    expect(steps).toHaveLength(2)
    expect(steps[0]).toBe('Mix the ingredients.')
    expect(steps[1]).toBe('Cook for five minutes.')
  })
})
