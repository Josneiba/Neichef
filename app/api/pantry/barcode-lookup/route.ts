import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const schema = z.object({ barcode: z.string().min(1) })

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

function parseUnit(quantityStr: string | null | undefined): string {
  if (!quantityStr) return 'unit'
  const str = String(quantityStr).toLowerCase()
  if (str.includes('kg')) return 'kg'
  if (str.includes('g')) return 'g'
  if (str.includes('ml')) return 'ml'
  if (str.includes('l')) return 'l'
  if (str.includes('oz')) return 'oz'
  if (str.includes('lb')) return 'lb'
  if (str.includes('pack')) return 'pack'
  if (str.includes('slice')) return 'slice'
  return 'unit'
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const barcode = parsed.data.barcode.trim()
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      headers: {
        'User-Agent': 'NeichefApp/1.0 (support@neichef.com)',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Lookup service unavailable' }, { status: 502 })
    }

    const data = await response.json().catch(() => null)
    if (!data?.product) {
      console.info('[pantry:barcode] product not found', { userId, barcode })
      return NextResponse.json({ error: 'Product not found', barcode }, { status: 404 })
    }

    const product = data.product
    const item = {
      barcode,
      name: product.product_name || product.product_name_en || 'Unknown Item',
      brand: product.brands || 'Generic',
      category: Array.isArray(product.categories_tags) && product.categories_tags.length > 0
        ? String(product.categories_tags[0]).replace(/^en:/, '')
        : 'Pantry',
      imageUrl: product.image_url || product.image_front_url || null,
      quantity: 1,
      unit: parseUnit(product.quantity),
      nutriments: {
        calories: product.nutriments?.['energy-kcal_100g'] ?? null,
        proteins: product.nutriments?.proteins_100g ?? null,
        carbs: product.nutriments?.carbohydrates_100g ?? null,
        fats: product.nutriments?.fat_100g ?? null,
      },
    }

    console.info('[pantry:barcode] product found', { userId, barcode, name: item.name })
    return NextResponse.json({ success: true, item })
  } catch (err) {
    console.error('[pantry:barcode] lookup failed', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unable to lookup barcode' }, { status: 500 })
  }
}
