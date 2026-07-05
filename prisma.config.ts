import { defineConfig } from 'prisma/config'

declare module 'prisma/config' {
  interface PrismaConfig {
    datasourceUrl?: string
    directUrl?: string
  }
}

export default defineConfig({
  earlyAccess: true,
  datasourceUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
})
