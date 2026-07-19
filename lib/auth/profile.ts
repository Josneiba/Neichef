import type { User as SupabaseUser } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

type ProfileFallback = {
  name?: string
  email?: string
  householdSize?: number
}

function userName(user: SupabaseUser, fallback?: ProfileFallback) {
  const metadata = user.user_metadata ?? {}
  return (
    fallback?.name ||
    (typeof metadata.name === 'string' ? metadata.name : '') ||
    (typeof metadata.full_name === 'string' ? metadata.full_name : '') ||
    user.email?.split('@')[0] ||
    'NeiChef user'
  )
}

function householdSize(user: SupabaseUser, fallback?: ProfileFallback) {
  const metadata = user.user_metadata ?? {}
  const raw = fallback?.householdSize ?? metadata.household_size ?? metadata.householdSize ?? 1
  const size = Number(raw)
  return Number.isInteger(size) && size >= 1 && size <= 6 ? size : 1
}

export async function ensureUserProfile(user: SupabaseUser, fallback?: ProfileFallback) {
  const email = fallback?.email || user.email
  if (!email) throw new Error('Authenticated user has no email address')

  const data = {
    email,
    name: userName(user, fallback),
    householdSize: householdSize(user, fallback),
    dietaryPreferences: [],
    notificationDaysAhead: 3,
  }

  const existingById = await prisma.user.findUnique({ where: { id: user.id } })
  if (existingById) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        name: existingById.name || data.name,
        householdSize: existingById.householdSize || data.householdSize,
      },
    })
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email } })
  if (existingByEmail) {
    try {
      return await prisma.user.update({
        where: { email },
        data: { id: user.id, ...data },
      })
    } catch (err) {
      console.error('[profile:repair] could not reassign existing email profile to auth user', {
        authUserId: user.id,
        profileUserId: existingByEmail.id,
        err,
      })
      throw err
    }
  }

  return prisma.user.create({
    data: {
      id: user.id,
      ...data,
    },
  })
}
