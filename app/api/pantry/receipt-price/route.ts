import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { upsertReceiptPrices } from '@/lib/receipt/price-ingest'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const items = Array.isArray(body.items) ? body.items : []
    const results = await upsertReceiptPrices(items)

    return NextResponse.json({ ok: true, results })
  } catch (err: any) {
    console.error('[receipt-price] error', err)
    return NextResponse.json({ error: 'Failed to ingest prices' }, { status: 500 })
  }
}
