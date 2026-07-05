import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function GET() {
  try {
    const userId = await getUserId()
    const entries = await prisma.budgetLedgerEntry.findMany({ where: { userId } })

    const stats = {
      itemsSavedCount: entries.filter((entry) => entry.type === 'saved').length,
      estimatedSavedAmount: entries.filter((entry) => entry.type === 'saved').reduce((sum, entry) => sum + entry.amount, 0),
      estimatedWastedAmount: entries.filter((entry) => entry.type === 'wasted').reduce((sum, entry) => sum + entry.amount, 0),
      weeklyData: [],
      monthlyTotals: [],
    }

    return NextResponse.json(stats)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
