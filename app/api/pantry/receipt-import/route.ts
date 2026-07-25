import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createRateLimiter } from '@/lib/rate-limit'
import { callGeminiWithFile } from '@/lib/ai/gemini'

const schema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  mimeType: z.string().optional(),
})
const limiter = createRateLimiter({ windowMs: 60_000, max: 8 })

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

function parseDataUrl(input: string): { base64: string; mimeType: string } {
  const match = /^data:(.+?);base64,(.+)$/.exec(input)
  if (match) {
    return { base64: match[2], mimeType: match[1] }
  }
  return { base64: input, mimeType: 'image/jpeg' }
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

  const imageUrl = parsed.data.imageUrl
  const imageBase64 = parsed.data.imageBase64
  const mimeType = parsed.data.mimeType

  if (!imageUrl && !imageBase64) {
    return NextResponse.json({ error: 'No receipt image provided' }, { status: 400 })
  }

  const rateLimitResult = await limiter.check(userId || 'anonymous')
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  try {
    let buffer: Buffer
    let resolvedMimeType = mimeType || 'image/jpeg'
    let filename = 'receipt.jpg'

    if (imageUrl) {
      const imageRes = await fetch(imageUrl)
      if (!imageRes.ok) {
        return NextResponse.json({ error: 'Unable to download receipt image' }, { status: 502 })
      }
      resolvedMimeType = imageRes.headers.get('content-type') || resolvedMimeType
      buffer = Buffer.from(await imageRes.arrayBuffer())
      filename = imageUrl.split('/').pop() || filename
    } else {
      const parsedData = parseDataUrl(imageBase64)
      buffer = Buffer.from(parsedData.base64, 'base64')
      resolvedMimeType = mimeType || parsedData.mimeType
    }

    const file = new File([buffer], filename, { type: resolvedMimeType })
    const responseText = await callGeminiWithFile(file, 'upload_photo')
    const parsedResult = JSON.parse(responseText)

    const items = Array.isArray(parsedResult.items) ? parsedResult.items.map((item: any) => ({
      name: String(item.name ?? '').trim(),
      quantity: Number(item.quantity ?? 1),
      unit: String(item.unit ?? 'unit'),
      category: String(item.category ?? 'Pantry'),
      estimatedShelfLifeDays: item.estimatedShelfLifeDays != null ? Number(item.estimatedShelfLifeDays) : undefined,
      totalPrice: item.totalPrice != null ? Number(item.totalPrice) : undefined,
      unitPrice: item.unitPrice != null ? Number(item.unitPrice) : undefined,
    })).filter((item) => item.name.length > 0) : []

    return NextResponse.json({
      success: true,
      storeName: String(parsedResult.storeName ?? 'Store Receipt'),
      transactionDate: String(parsedResult.transactionDate ?? new Date().toISOString()),
      totalAmount: Number(parsedResult.totalAmount ?? 0),
      items,
    })
  } catch (err: any) {
    console.error('[pantry:receipt-import] receipt parsing failed', err)
    return NextResponse.json({ error: err.message || 'Failed to parse receipt document' }, { status: 500 })
  }
}
