import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { uploadRecipeImage } from '@/lib/media/cloudinary'
import { createRateLimiter, rateLimitHeaders } from '@/lib/rate-limit'

const uploadLimiter = createRateLimiter({ windowMs: 60_000, max: 6, prefix: 'upload' })
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

async function getUserId() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Unauthorized')
  return data.user.id
}

export async function POST(request: Request) {
  let userId: string
  try {
    userId = await getUserId()
  } catch {
    return NextResponse.json({ error: 'Sign in to upload an image.' }, { status: 401 })
  }

  const rl = await uploadLimiter.check(userId)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many uploads. Try again shortly.' }, { status: 429, headers: rateLimitHeaders(rl) })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images are supported.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image is too large (max 5MB).' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await uploadRecipeImage(buffer, { folder: `neichef/recipes/${userId}`, publicIdPrefix: 'recipe' })
    const response = NextResponse.json({ imageUrl: uploaded.secureUrl, imagePublicId: uploaded.publicId })
    Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => response.headers.set(k, v))
    return response
  } catch (err) {
    console.error('[recipes:image] upload failed', { userId, err })
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Image upload failed.' }, { status: 502 })
  }
}
