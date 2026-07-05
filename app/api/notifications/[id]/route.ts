import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    const { id } = await params
    const result = await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
