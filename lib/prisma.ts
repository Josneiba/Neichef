import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '@/lib/env'

// Prisma 7 removed the built-in query engine — every PrismaClient instance
// now requires an explicit driver adapter. This adapter opens a Postgres
// connection pool (works with Supabase's Postgres connection string) and
// hands it to Prisma. Passing a string like 'binary' here (as the previous
// version of this file did) is not a valid adapter and throws immediately
// on the first import, which is why every database-backed route (sign up,
// pantry, recipes, notifications, budget, ...) was failing.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }

  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getPrismaClient(), prop)
  },
  set(_target, prop, value) {
    return Reflect.set(getPrismaClient(), prop, value)
  },
})
