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
        { name: 'Cherry tomatoes', quantity: 300, unit: 'g', category: 'produce' },
        { name: 'Cheddar cheese', quantity: 200, unit: 'g', category: 'dairy' },
      ],
      note: 'TODO: connect a free vision model in a later iteration.',
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
