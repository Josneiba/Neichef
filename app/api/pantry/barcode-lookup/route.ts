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

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${parsed.data.barcode}.json`)
    const data = await response.json()

    if (!data.product) {
      console.info('[pantry:barcode] product not found', { userId, barcode: parsed.data.barcode })
      return NextResponse.json({ error: 'No product found' }, { status: 404 })
    }

    console.info('[pantry:barcode] product found', { userId, barcode: parsed.data.barcode })
    return NextResponse.json({
      barcode: parsed.data.barcode,
      name: data.product.product_name ?? 'Unknown product',
      category: data.product.categories ?? 'other',
      quantity: data.product.quantity ?? '1',
    })
  } catch (err) {
    console.error('[pantry:barcode] lookup failed', err)
    return NextResponse.json({ error: 'Unable to lookup barcode' }, { status: 400 })
  }
}
