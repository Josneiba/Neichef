import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isDbAvailable, reportDbFailure } from '@/lib/dbCircuit'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId()
    if (!isDbAvailable()) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    const { searchParams } = new URL(request.url)
    const isRead = searchParams.get('isRead')
    const notifications = await prisma.notification.findMany({ where: { userId, ...(isRead ? { isRead: isRead === 'true' } : {}) }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(notifications)
  } catch {
    const msg = String((arguments[0] as any)?.message ?? '')
    if (msg.includes('ECIRCUITBREAKER') || msg.includes('too many authentication')) reportDbFailure()
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
