import { z } from 'zod'
import { callOpenRouter } from '@/lib/ai/openrouter'
import { resolveProviderSelection } from '@/lib/ai/provider-router'

/**
 * Cleans up messy item names coming from receipt OCR / manual entry
 * (e.g. "ORG BANANA 3CT" -> "Organic Bananas") and assigns a pantry
 * category + a typical US supermarket aisle, using OpenRouter as a
 * classification/normalization engine (not a recipe writer).
 *
 * Designed to never break the caller: if no provider is configured, or
 * the call fails for any reason, every item falls back to its original
 * name with a best-effort category and an "Household & Other" aisle.
 */

export const GROCERY_CATEGORIES = [
  'produce',
  'dairy',
  'meat',
  'seafood',
  'grains',
  'condiments',
  'beverages',
  'frozen',
  'canned',
  'snacks',
  'other',
] as const

export const GROCERY_AISLES = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Pantry & Dry Goods',
  'Canned Goods',
  'Condiments & Sauces',
  'Beverages',
  'Snacks',
  'Household & Other',
] as const

export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number]
export type GroceryAisle = (typeof GROCERY_AISLES)[number]

export type ItemToEnrich = { name: string; category?: string }

export type EnrichedItem = {
  originalName: string
  name: string
  category: GroceryCategory
  aisle: GroceryAisle
}

const enrichedItemSchema = z.object({
  originalName: z.string(),
  name: z.string().min(1),
  category: z.enum(GROCERY_CATEGORIES),
  aisle: z.enum(GROCERY_AISLES),
})

const enrichedResponseSchema = z.object({ items: z.array(enrichedItemSchema) })

const MAX_BATCH_SIZE = 25

function isKnownCategory(value: string | undefined): value is GroceryCategory {
  return Boolean(value) && (GROCERY_CATEGORIES as readonly string[]).includes(value as string)
}

function fallbackEnrich(item: ItemToEnrich): EnrichedItem {
  return {
    originalName: item.name,
    name: item.name,
    category: isKnownCategory(item.category) ? item.category : 'other',
    aisle: 'Household & Other',
  }
}

function buildSystemPrompt() {
  return [
    'You clean up grocery item names for a pantry-management app.',
    'For each input item name, return:',
    '- "name": a clean, human-friendly product name (e.g. "ORG BANANA 3CT" -> "Organic Bananas"). Fix abbreviations and casing, drop pack-size/SKU noise, keep it short.',
    `- "category": exactly one of ${GROCERY_CATEGORIES.join(', ')}.`,
    `- "aisle": exactly one of ${GROCERY_AISLES.join(', ')} (the typical US supermarket aisle for this item).`,
    'Always echo the original input string back in "originalName", unchanged, so items can be matched back up.',
    'Return only valid JSON in this exact shape, with no commentary: {"items":[{"originalName":"...","name":"...","category":"...","aisle":"..."}]}',
  ].join('\n')
}

async function enrichBatch(rawItems: ItemToEnrich[]): Promise<EnrichedItem[]> {
  const selection = resolveProviderSelection('item-enrichment')
  if (!selection || (selection.provider !== 'openrouter' && selection.provider !== 'openai')) {
    return rawItems.map(fallbackEnrich)
  }

  try {
    if (!selection || (selection.provider !== 'openrouter' && selection.provider !== 'openai')) {
      return rawItems.map(fallbackEnrich)
    }

    const content = await callOpenRouter(
      [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: JSON.stringify({ items: rawItems.map((item) => item.name) }) },
      ],
      { jsonMode: true, temperature: 0.1, maxTokens: 60 * rawItems.length + 200 },
    )

    const cleaned = content.replace(/```+(json)?/gi, '')
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON object found in OpenRouter response.')

    const parsed = enrichedResponseSchema.parse(JSON.parse(jsonMatch[0]))

    return rawItems.map((item) => {
      const match = parsed.items.find((candidate) => candidate.originalName === item.name)
      return match ?? fallbackEnrich(item)
    })
  } catch (err) {
    console.error('[pantry:enrich-items] OpenRouter enrichment failed, using fallback', err)
    return rawItems.map(fallbackEnrich)
  }
}

export async function enrichItems(items: ItemToEnrich[]): Promise<EnrichedItem[]> {
  if (items.length === 0) return []

  const batches: ItemToEnrich[][] = []
  for (let i = 0; i < items.length; i += MAX_BATCH_SIZE) {
    batches.push(items.slice(i, i + MAX_BATCH_SIZE))
  }

  const results = await Promise.all(batches.map((batch) => enrichBatch(batch)))
  return results.flat()
}

export default { enrichItems }
