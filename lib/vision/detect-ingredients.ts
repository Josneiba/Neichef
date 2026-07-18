/**
 * VisionProvider interface and a free HuggingFace-backed implementation.
 * This file isolates the provider so a paid/scale-ready service can be swapped
 * in by replacing this single module.
 */
export type DetectedIngredient = { name: string; confidence: number }

export type DetectIngredientsResult =
  | { ok: true; items: DetectedIngredient[] }
  | { ok: false; error: string }

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
  if (!process.env.HF_API_KEY) {
    return {
      ok: false,
      error: 'Photo detection is not configured yet. Add HF_API_KEY to your environment to enable it.',
    }
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${process.env.HF_API_KEY}` }

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

    let res = await callHuggingFace(buffer, contentType, headers)

    // Hosted models "cold start" — HF returns 503 with an estimated_time
    // while it loads. Retry once after a short wait instead of giving up.
    if (res.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 2500))
      res = await callHuggingFace(buffer, contentType, headers)
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `Ingredient detection service error (${res.status}): ${text.slice(0, 200)}` }
    }

    const data = await res.json()
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
    return { ok: false, error: err instanceof Error ? err.message : 'Ingredient detection failed unexpectedly.' }
  }
}

export default { detectIngredients }
