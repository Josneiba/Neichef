/**
 * VisionProvider interface and a free HuggingFace-backed implementation.
 * This file isolates the provider so a paid/scale-ready service can be swapped
 * in by replacing this single module.
 */
export type DetectedIngredient = { name: string; confidence: number }

export async function detectIngredients(image: string): Promise<DetectedIngredient[]> {
  // image may be a public URL or a data URL/base64 string. We prefer calling
  // a hosted inference endpoint. This implementation uses Hugging Face's
  // inference API for the public "food" classifier when available.

  const hfUrl = 'https://api-inference.huggingface.co/models/nateraw/food'
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.HF_API_KEY) headers.Authorization = `Bearer ${process.env.HF_API_KEY}`

  try {
    // The HF inference expects an object with the inputs key for many models.
    const res = await fetch(hfUrl, { method: 'POST', headers, body: JSON.stringify({ inputs: image }) })
    const data = await res.json()
    if (!Array.isArray(data)) return []
    // Map to our shape
    return data.slice(0, 20).map((d: unknown) => {
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
    })
  } catch {
    // Best-effort fallback: return an empty list so the frontend still works.
    return []
  }
}

export default { detectIngredients }
