import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/neichef'),
  DIRECT_URL: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/neichef'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).default('https://example.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default('anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default('service-role-key'),
  UPSTASH_REDIS_REST_URL: z.string().min(1).default('https://example.upstash.io'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).default('token'),
})

export const env = envSchema.parse(process.env)
