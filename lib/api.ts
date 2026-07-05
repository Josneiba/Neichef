import { NextResponse } from 'next/server'
import { z } from 'zod'

export type ApiErrorBody = {
  error: string
  code?: string
}

export function apiError(message: string, code?: string) {
  const status = code === 'NOT_FOUND' ? 404 : code === 'UNAUTHORIZED' ? 401 : 400
  return NextResponse.json<ApiErrorBody>({ error: message, code }, { status })
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function parseBody<T>(schema: z.ZodType<T>, body: unknown) {
  const result = schema.safeParse(body)
  if (!result.success) {
    return { success: false as const, error: result.error.issues[0]?.message ?? 'Invalid request body' }
  }
  return { success: true as const, data: result.data }
}
