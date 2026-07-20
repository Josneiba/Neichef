import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '@/lib/env'
import { isDbAvailable, reportDbFailure } from '@/lib/dbCircuit'

// Prisma 7 removed the built-in query engine — every PrismaClient instance
// now requires an explicit driver adapter. This adapter opens a Postgres
// connection pool (works with Supabase's Postgres connection string) and
// hands it to Prisma. Passing a string like 'binary' here (as the previous
// version of this file did) is not a valid adapter and throws immediately
// on the first import, which is why every database-backed route (sign up,
// pantry, recipes, notifications, budget, ...) was failing.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function makeDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const shouldDisableTls = process.env.PGSSLMODE === 'no-verify' || host.endsWith('.supabase.co') || host.endsWith('.supabase.com')
    if (shouldDisableTls) {
      parsed.searchParams.set('sslmode', 'no-verify')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    // Respect the in-process circuit: if DB is currently marked unavailable,
    // avoid attempting to initialize Prisma (which opens connections).
    if (!isDbAvailable()) {
      // Provide a throwing proxy so callers get a predictable error they can catch.
      const thrower = new Proxy({}, {
        get() {
          return () => { throw new Error('DB unavailable') }
        },
      }) as unknown as PrismaClient
      globalForPrisma.prisma = thrower
      return globalForPrisma.prisma
    }

    try {
      if (process.env.PGSSLMODE === 'no-verify') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      }
      const adapter = new PrismaPg({ connectionString: makeDatabaseUrl(env.DATABASE_URL) })

      globalForPrisma.prisma = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
    } catch (err: any) {
      // If Prisma fails to initialize (invalid creds, driver issues), mark
      // the DB as unavailable and return a throwing proxy to avoid repeated
      // connection attempts from the running server.
      console.warn('[prisma] initialization failed, disabling DB access', err)
      reportDbFailure()
      const thrower = new Proxy({}, {
        get() {
          return () => { throw new Error('DB initialization failed') }
        },
      }) as unknown as PrismaClient
      globalForPrisma.prisma = thrower
    }
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
