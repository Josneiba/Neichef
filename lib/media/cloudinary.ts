import crypto from 'node:crypto'
import { env } from '@/lib/env'

export type CloudinaryUploadResult = {
  secureUrl: string
  publicId: string
  bytes: number
  width: number
  height: number
}

function isCloudinaryConfigured() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)
}

export async function uploadRecipeImage(buffer: Buffer, opts: { folder: string; publicIdPrefix: string }): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Add CLOUDINARY_* env vars to enable image uploads.')
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const publicId = `${opts.publicIdPrefix}-${crypto.randomUUID()}`
  const paramsToSign: Record<string, string> = {
    folder: opts.folder,
    public_id: publicId,
    timestamp: String(timestamp),
    transformation: 'c_limit,w_1600,h_1600,q_auto,f_auto',
  }
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&')
  const signature = crypto.createHash('sha1').update(toSign + env.CLOUDINARY_API_SECRET).digest('hex')

  const form = new FormData()
  form.append('file', new Blob([buffer]))
  form.append('api_key', env.CLOUDINARY_API_KEY!)
  form.append('timestamp', String(timestamp))
  form.append('signature', signature)
  Object.entries(paramsToSign).forEach(([key, value]) => form.append(key, value))

  const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Cloudinary upload failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const json = await res.json()
  return {
    secureUrl: String(json.secure_url),
    publicId: String(json.public_id),
    bytes: Number(json.bytes ?? 0),
    width: Number(json.width ?? 0),
    height: Number(json.height ?? 0),
  }
}

export default { uploadRecipeImage }
