import { NextResponse } from 'next/server'
import { z } from 'zod'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { isDbAvailable, reportDbFailure } from '@/lib/dbCircuit'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  householdSize: z.number().int().min(1).max(6),
})

export async function POST(request: Request) {
  if (env.SUPABASE_SERVICE_ROLE_KEY === 'service-role-key') {
    return NextResponse.json({ error: 'Admin signup not configured' }, { status: 403 })
  }

  // Toggle to allow admin create only when explicitly enabled in env
  if (process.env.ENABLE_ADMIN_SIGNUP !== 'true') {
    return NextResponse.json({ error: 'Admin signup disabled' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { name, email, password, householdSize } = parsed.data

  const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, household_size: householdSize },
    }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: payload?.message ?? 'Supabase admin create failed' }, { status: 500 })
  }

  // Try to insert into application DB (best-effort)
  try {
    if (isDbAvailable()) {
      await prisma.user.create({
        data: {
          id: payload.id,
          email,
          name,
          householdSize,
          dietaryPreferences: [],
          notificationDaysAhead: 3,
        },
      })
    } else {
      console.warn('DB unavailable; skipping local user create for admin-create')
    }
  } catch (err: any) {
    console.warn('prisma.user.create failed in admin-create:', err)
    const msg = String((err as any)?.message ?? err)
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
  }

  return NextResponse.json({ success: true, user: { id: payload.id, email } })
}
