import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { aiRateLimiter, rateLimitHeaders } from '@/lib/rate-limit'
import { callGeminiWithText, callOpenAIWithText } from '@/lib/ai/gemini'

const schema = z.object({ text: z.string().min(1) })
const limiter = aiRateLimiter

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

function normalizeItem(raw: unknown) {
  const item = raw as Record<string, unknown>
  return {
    name: String(item.name ?? '').trim(),
    quantity: Number(item.quantity ?? 1),
    unit: String(item.unit ?? 'pcs').trim() || 'pcs',
    category: String(item.category ?? 'other').trim().toLowerCase() || 'other',
    notes: String(item.notes ?? '').trim() || undefined,
  }
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

  const rateLimitResult = await limiter.check(userId)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rateLimitResult) },
    )
  }

  try {
    let extracted: string
    if (process.env.GOOGLE_API_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      extracted = await callGeminiWithText(parsed.data.text, 'manual_entry')
    } else if (process.env.OPENAI_API_KEY) {
      extracted = await callOpenAIWithText(parsed.data.text)
    } else {
      return NextResponse.json({ error: 'No AI extraction provider configured.' }, { status: 501 })
    }

    const cleaned = extracted.replace(/```+/g, '')
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Unable to parse extracted text as JSON.' }, { status: 502 })
    }

    const payload = JSON.parse(jsonMatch[0])
    const items = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : []
    const normalized = (items as unknown[]).map((item) => normalizeItem(item)).filter((item) => item.name.length > 0)

    const response = NextResponse.json({ items: normalized })
    const headers = rateLimitHeaders(rateLimitResult)
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
    return response
  } catch (err: any) {
    console.error('[pantry:manual-entry] parsing failed', err)
    return NextResponse.json({ error: err.message ?? 'Could not parse pantry text.' }, { status: 500 })
  }
}
