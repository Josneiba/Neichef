import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { extractNutritionPlan, supportedFileTypes, MAX_PLAN_UPLOAD_BYTES } from '@/lib/nutrition/extract-plan'
import { createRateLimiter } from '@/lib/rate-limit'
import { env } from '@/lib/env'

const limiter = createRateLimiter({ windowMs: 60_000, max: 5 })

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function POST(request: Request) {
  let userId = ''

  try {
    userId = await getUserId()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid upload request' }, { status: 400 })

  const file = formData.get('file')
  const source = formData.get('source')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const sourceValue = source === 'upload_photo' || source === 'upload_file' ? source : null
  if (!sourceValue) {
    return NextResponse.json({ error: 'Missing upload source' }, { status: 400 })
  }

  if (!supportedFileTypes.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type. Use JPEG, PNG, WEBP, or PDF.' }, { status: 400 })
  }

  if (file.size > MAX_PLAN_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File is too large. Maximum size is 10MB.' }, { status: 400 })
  }

  const rateLimitResult = await limiter.check(userId)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  let rawFileUrl: string | undefined
  if (env.SUPABASE_NUTRITION_BUCKET) {
    const uploadPath = `${userId}/${Date.now()}-${file.name}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const supabase = await createSupabaseServerClient()
    const { error: uploadError } = await supabase.storage
      .from(env.SUPABASE_NUTRITION_BUCKET)
      .upload(uploadPath, buffer, { contentType: file.type })

    if (uploadError) {
      return NextResponse.json({ error: 'Unable to save the uploaded file.' }, { status: 500 })
    }

    rawFileUrl = `${env.SUPABASE_NUTRITION_BUCKET}/${uploadPath}`
  }

  const extraction = await extractNutritionPlan(file, sourceValue)
  if (!extraction.ok) {
    return NextResponse.json({ error: extraction.error }, { status: extraction.notConfigured ? 501 : 502 })
  }

  return NextResponse.json({
    draft: {
      ...extraction.draft,
      rawFileUrl,
      rawExtractedText: extraction.rawText,
      extractionStatus: 'done',
    },
  })
}
