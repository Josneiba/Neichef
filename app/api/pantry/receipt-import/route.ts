import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const schema = z.object({ imageUrl: z.string().url().optional() })

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function POST(request: Request) {
  try {
    await getUserId()
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    return NextResponse.json({
      items: [
        { name: 'Whole milk', quantity: 1, unit: 'L', category: 'dairy' },
        { name: 'Bread', quantity: 1, unit: 'loaf', category: 'grains' },
      ],
      note: 'TODO: connect a free receipt parser in a later iteration.',
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
