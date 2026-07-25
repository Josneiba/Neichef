import { prisma } from '@/lib/prisma'

export type ReceiptItem = {
  name: string
  quantity?: number
  unit?: string
  price?: number
  currency?: string
  countryCode?: string
}

export async function upsertReceiptPrices(items: ReceiptItem[]) {
  const results: any[] = []
  for (const it of items) {
    const normalized = it.name.trim().toLowerCase()
    // Upsert ingredient
    const ingredient = await (prisma as any).ingredient.upsert({
      where: { name: it.name },
      update: { estimatedPrice: it.price ?? undefined },
      create: { name: it.name, estimatedPrice: it.price ?? undefined },
    })

    if (it.price && it.countryCode) {
      // Upsert regional price
      const existing = await (prisma as any).ingredientPrice.findUnique({ where: { ingredientId_countryCode: { ingredientId: ingredient.id, countryCode: it.countryCode } } }).catch(() => null)
      if (existing) {
        const total = existing.averagePrice * existing.scanCount + it.price
        const count = existing.scanCount + 1
        const avg = total / count
        await (prisma as any).ingredientPrice.update({ where: { id: existing.id }, data: { averagePrice: avg, scanCount: count, lastUpdated: new Date() } })
        results.push({ ingredient: ingredient.name, country: it.countryCode, averagePrice: avg })
      } else {
        await (prisma as any).ingredientPrice.create({ data: { ingredientId: ingredient.id, countryCode: it.countryCode, currency: it.currency ?? 'USD', averagePrice: it.price, scanCount: 1 } })
        results.push({ ingredient: ingredient.name, country: it.countryCode, averagePrice: it.price })
      }
    }
  }
  return results
}
