import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

let prismaClient: PrismaClient | undefined = globalForPrisma.prisma

function getPrismaClient() {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      adapter: 'binary',
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient
  }

  return prismaClient
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getPrismaClient(), prop)
  },
  set(_target, prop, value) {
    return Reflect.set(getPrismaClient(), prop, value)
  },
})
