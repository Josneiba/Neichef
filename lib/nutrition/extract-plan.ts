import { env } from '@/lib/env'
import { callGeminiWithFile } from '@/lib/ai/gemini'
import { z } from 'zod'

type NutritionRestrictionDraft = {
  type: 'allergy' | 'avoid' | 'limit' | 'prefer'
  ingredientName: string
  note?: string
}

export type NutritionPlanDraft = {
  source: 'upload_photo' | 'upload_file'
  title?: string
  notes?: string
  caloriesTarget?: number
  proteinTargetG?: number
  carbsTargetG?: number
  fatTargetG?: number
  mealsPerDay?: number
  startDate?: string
  endDate?: string
  restrictions?: NutritionRestrictionDraft[]
  rawFileUrl?: string
  rawExtractedText?: string
  extractionStatus?: 'pending' | 'processing' | 'done' | 'failed' | 'needs_review'
}

export const supportedFileTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

export const MAX_PLAN_UPLOAD_BYTES = 10 * 1024 * 1024

const nutritionPlanResponseSchema = z.object({
  title: z.string().optional(),
  notes: z.string().optional(),
  caloriesTarget: z.number().optional(),
  proteinTargetG: z.number().optional(),
  carbsTargetG: z.number().optional(),
  fatTargetG: z.number().optional(),
  mealsPerDay: z.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  restrictions: z.array(
    z.object({
      type: z.enum(['allergy', 'avoid', 'limit', 'prefer']),
      ingredientName: z.string().min(1),
      note: z.string().optional(),
    }),
  ).optional(),
})

type NutritionPlanResponse = z.infer<typeof nutritionPlanResponseSchema>

function extractTextFromOutput(output: any): string | null {
  if (!output) return null

  if (typeof output === 'string') return output

  if (Array.isArray(output)) {
    return output
      .map((item) => extractTextFromOutput(item))
      .filter(Boolean)
      .join(' ')
  }

  if (typeof output === 'object' && output !== null) {
    if (typeof output.text === 'string') return output.text
    if (Array.isArray(output.content)) return extractTextFromOutput(output.content)
  }

  return null
}

function extractTextFromOpenAIResponse(response: any): string | null {
  if (!response || typeof response !== 'object') return null
  if (typeof response.output_text === 'string') return response.output_text
  if (Array.isArray(response.output)) {
    return extractTextFromOutput(response.output)
  }
  if (Array.isArray(response.choices)) {
    return extractTextFromOutput(response.choices.map((choice: any) => choice.message ?? choice))
  }
  return null
}

function parsePlanDraft(rawText: string, source: 'upload_photo' | 'upload_file'): NutritionPlanDraft | null {
  const cleaned = rawText.replace(/```+/g, '')
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const data = JSON.parse(jsonMatch[0])
    const parsed = nutritionPlanResponseSchema.safeParse(data)
    if (!parsed.success) return null

    return {
      source,
      ...parsed.data,
    }
  } catch {
    return null
  }
}

async function callOpenAIWithFile(file: File, source: 'upload_photo' | 'upload_file'): Promise<string> {
  const model = env.OPENAI_API_MODEL ?? 'gpt-4.1-mini'
  const instructions = `Extract a nutrition plan from the attached document. Reply with only valid JSON and no explanatory text. Return the following properties when available: title, notes, caloriesTarget, proteinTargetG, carbsTargetG, fatTargetG, mealsPerDay, startDate, endDate, restrictions. Restrictions must be an array of objects with type (allergy|avoid|limit|prefer), ingredientName, and optional note. Use ISO date strings (YYYY-MM-DD) and omit missing fields.`

  const formData = new FormData()
  formData.append('model', model)
  formData.append('input', JSON.stringify([{ role: 'user', content: instructions }]))
  formData.append('file', file, file.name)

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: formData,
  })

  const result = await response.json()
  const extracted = extractTextFromOpenAIResponse(result)
  if (!extracted) {
    throw new Error('Unable to parse extraction response from the provider.')
  }

  return extracted
}

async function callPreferredProvider(file: File, source: 'upload_photo' | 'upload_file') {
  // Prefer Gemini for complex file types (PDF) when configured, else OpenAI.
  if (file.type === 'application/pdf' && env.GOOGLE_API_KEY) {
    const text = await callGeminiWithFile(file, source)
    return text
  }

  if (env.OPENAI_API_KEY) {
    return await callOpenAIWithFile(file, source)
  }

  throw new Error('No extraction provider configured')
}

export async function extractNutritionPlan(
  file: File,
  source: 'upload_photo' | 'upload_file',
): Promise<{ ok: true; draft: NutritionPlanDraft; rawText: string } | { ok: false; error: string; notConfigured?: boolean }> {
  if (!env.OPENAI_API_KEY && !env.GOOGLE_API_KEY) {
    return {
      ok: false,
      error: 'Nutrition plan extraction is not configured. Add OPENAI_API_KEY or GOOGLE_API_KEY to your environment to enable this feature.',
      notConfigured: true,
    }
  }

  if (!supportedFileTypes.has(file.type)) {
    return { ok: false, error: 'Unsupported file type. Use JPEG, PNG, WEBP, or PDF.' }
  }

  if (file.size > MAX_PLAN_UPLOAD_BYTES) {
    return { ok: false, error: 'File is too large. Maximum size is 10MB.' }
  }

  try {
    const rawText = await callPreferredProvider(file, source)
    const draft = parsePlanDraft(rawText, source)
    if (!draft) {
      return { ok: false, error: 'Unable to extract a structured nutrition plan from the uploaded document.' }
    }

    return { ok: true, draft, rawText }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Nutrition plan extraction failed.' }
  }
}
