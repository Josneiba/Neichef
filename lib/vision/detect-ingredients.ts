/**
 * VisionProvider interface and a free HuggingFace-backed implementation.
 * This file isolates the provider so a paid/scale-ready service can be swapped
 * in by replacing this single module.
 */
import { z } from 'zod'

export type DetectedIngredient = { name: string; confidence: number }

const detectedIngredientSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
})

const detectedIngredientsSchema = z.array(detectedIngredientSchema)

export type DetectIngredientsResult =
  | { ok: true; items: DetectedIngredient[] }
  | { ok: false; error: string }

async function callGeminiVision(buffer: Buffer, contentType: string) {
  if (!process.env.GOOGLE_API_KEY && !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return null
  }

  const model = process.env.GOOGLE_GEMINI_MODEL ?? 'gemini-2.5-flash'
  const prompt = `Extract ingredient names from the following image. Return a JSON array of objects with { name, confidence } only.`
  const base64 = buffer.toString('base64')

  const body = {
    prompt: `${prompt}\n\nMIME-Type: ${contentType}\nImageBase64: ${base64}`,
    temperature: 0,
    maxOutputTokens: 512,
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    headers.Authorization = await getGoogleAuthToken() ?? ''
  } else if (process.env.GOOGLE_API_KEY) {
    headers.Authorization = `Bearer ${process.env.GOOGLE_API_KEY}`
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) return null

  const json = await res.json()
  const text = typeof json.output === 'string'
    ? json.output
    : Array.isArray(json.output)
    ? json.output.map((o: any) => o?.content ?? '').join(' ')
    : typeof json.text === 'string'
    ? json.text
    : null

  return text
}

function parseGeminiDetectedIngredients(text: string) {
  try {
    const parsed = JSON.parse(text)
    const validated = detectedIngredientsSchema.safeParse(parsed)
    if (!validated.success) return null
    return validated.data
  } catch {
    return null
  }
}

async function getGoogleAuthToken() {
  const { GoogleAuth } = await import('google-auth-library')
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return null

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  return typeof token === 'string' ? `Bearer ${token}` : token?.token ? `Bearer ${token.token}` : null
}

function dataUrlToBuffer(input: string): { buffer: Buffer; contentType: string } {
  const match = /^data:(.+?);base64,(.+)$/.exec(input)
  if (match) {
    return { buffer: Buffer.from(match[2], 'base64'), contentType: match[1] }
  }
  // Not a data URL — assume it's already raw base64 without the prefix.
  return { buffer: Buffer.from(input, 'base64'), contentType: 'image/jpeg' }
}

async function callHuggingFace(buffer: Buffer, contentType: string, headers: Record<string, string>) {
  const hfUrl = 'https://api-inference.huggingface.co/models/nateraw/food'
  return fetch(hfUrl, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': contentType },
    // The HF Serverless Inference API's image-classification task expects
    // the raw image bytes as the request body — NOT a JSON envelope like
    // `{ inputs: base64String }`. Sending JSON here (the previous
    // implementation) causes HF to reject or misinterpret the payload, so
    // detection silently returned nothing.
    body: buffer,
  })
}

export async function detectIngredients(image: string): Promise<DetectIngredientsResult> {
  const hasHf = Boolean(process.env.HF_API_KEY)
  const hasGemini = Boolean(process.env.GOOGLE_API_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)

  if (!hasHf && !hasGemini) {
    return {
      ok: false,
      error: 'Photo detection is not configured yet. Add HF_API_KEY or GOOGLE_API_KEY / GOOGLE_SERVICE_ACCOUNT_KEY to your environment to enable it.',
    }
  }

  const headers: Record<string, string> = hasHf
    ? { Authorization: `Bearer ${process.env.HF_API_KEY}` }
    : {}

  try {
    // `image` may be a remote URL (fetch bytes first) or a base64/data URL.
    let buffer: Buffer
    let contentType = 'image/jpeg'
    if (/^https?:\/\//.test(image)) {
      const imgRes = await fetch(image)
      if (!imgRes.ok) return { ok: false, error: 'Could not download the provided image URL.' }
      contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
      buffer = Buffer.from(await imgRes.arrayBuffer())
    } else {
      const parsed = dataUrlToBuffer(image)
      buffer = parsed.buffer
      contentType = parsed.contentType
    }

    let items: DetectedIngredient[] = []
    let hfError: string | null = null

    if (hasHf) {
      const hfResult = await runHuggingFaceDetection(buffer, contentType, headers)
      if (hfResult.ok) items = hfResult.items
      else hfError = hfResult.error
    }

    const lowConfidence = items.length > 0 && items.every((item) => item.confidence < 0.65)
    if ((items.length === 0 || lowConfidence) && hasGemini) {
      const geminiResult = await runGeminiDetection(buffer, contentType)
      if (geminiResult.ok) {
        items = geminiResult.items
      } else if (!hasHf) {
        return { ok: false, error: geminiResult.error }
      }
    }

    if (items.length === 0) {
      return {
        ok: false,
        error: hfError ?? 'Unable to detect ingredients from the photo.',
      }
    }

    return { ok: true, items }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Ingredient detection failed unexpectedly.' }
  }
}

async function runHuggingFaceDetection(buffer: Buffer, contentType: string, headers: Record<string, string>) {
  try {
    let res = await callHuggingFace(buffer, contentType, headers)

    if (res.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 2500))
      res = await callHuggingFace(buffer, contentType, headers)
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `Ingredient detection service error (${res.status}): ${text.slice(0, 200)}` }
    }

    const data = await res.json().catch(() => null)
    if (!Array.isArray(data)) {
      return { ok: false, error: 'Unexpected response from the ingredient detection service.' }
    }

    const items = data.slice(0, 20).map((d: unknown) => {
      const item = d as unknown
      let label = ''
      let confidence = 0
      if (Array.isArray(item)) {
        label = String(item[0] ?? '')
        confidence = Number(item[1] ?? 0)
      } else if (typeof item === 'object' && item !== null) {
        const rec = item as Record<string, unknown>
        label = String(rec.label ?? rec.class ?? '')
        confidence = Number(rec.score ?? 0)
      } else {
        label = String(item ?? '')
      }
      return { name: label.toLowerCase(), confidence }
    }).filter((item) => item.name.length > 0)

    return { ok: true, items }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Hugging Face detection failed unexpectedly.' }
  }
}

async function runGeminiDetection(buffer: Buffer, contentType: string) {
  const text = await callGeminiVision(buffer, contentType)
  if (!text) {
    return { ok: false, error: 'Gemini ingredient detection failed or returned no text.' }
  }

  const parsedItems = parseGeminiDetectedIngredients(text)
  if (!parsedItems) {
    return { ok: false, error: 'Unable to parse or validate Gemini ingredient detection output.' }
  }

  const items = parsedItems.slice(0, 20)
  return { ok: true, items }
}

export default { detectIngredients }
