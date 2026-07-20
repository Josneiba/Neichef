import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { detectIngredients } from '@/lib/vision/detect-ingredients'
import { createRateLimiter } from '@/lib/rate-limit'

const schema = z.object({ imageUrl: z.string().url().optional(), imageBase64: z.string().optional() })
const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })

async function getUserId() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) throw new Error('Unauthorized')
    return data.user.id
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const input = parsed.data.imageUrl ?? parsed.data.imageBase64
  if (!input) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const rateLimitResult = await limiter.check(userId ?? 'anonymous')
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  const result = await detectIngredients(input)

  if (!result.ok) {
    console.warn('[pantry:photo-detect] detection failed', { userId, error: result.error })
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  console.info('[pantry:photo-detect] detected ingredients', { userId, count: result.items.length })
  return NextResponse.json({ items: result.items, note: 'Unconfirmed — edit before adding to pantry' })
}
