import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const schema = z.object({ imageUrl: z.string().url().optional(), imageBase64: z.string().optional() })

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function POST(request: Request) {
  let userId = ''
  try {
    userId = await getUserId()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (!parsed.data.imageUrl && !parsed.data.imageBase64) {
    return NextResponse.json({ error: 'No receipt image provided' }, { status: 400 })
  }

  console.info('[pantry:receipt-import] receipt received; OCR placeholder active', { userId })

  // NOTE: this is intentionally a stub. There is no receipt OCR/parsing
  // service wired in yet — doing this well requires either a paid OCR API
  // (e.g. Google Vision, AWS Textract) or a receipt-specific parser, and
  // needs an API key this project doesn't have configured. The endpoint
  // still accepts and validates the upload (so the client flow that calls
  // it works end-to-end) and returns a clearly-labeled placeholder result
  // instead of failing, so the UI has something real to review/edit. See
  // FIXES.md for how to plug in a real provider.
  return NextResponse.json({
    items: [
      { name: 'Whole milk', quantity: 1, unit: 'L', category: 'dairy' },
      { name: 'Bread', quantity: 1, unit: 'loaf', category: 'grains' },
    ],
    note: 'Receipt OCR is not yet connected — these are placeholder items. Edit before adding to pantry.',
  })
}
