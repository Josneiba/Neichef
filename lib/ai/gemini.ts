import { env } from '@/lib/env'
import { GoogleAuth } from 'google-auth-library'

async function fileToBase64(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer())
  return buffer.toString('base64')
}

function parseServiceAccountKey(raw: string) {
  if (raw.trim().startsWith('{')) {
    return JSON.parse(raw)
  }

  return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
}

async function getGoogleAccessToken() {
  if (!env.GOOGLE_SERVICE_ACCOUNT_KEY) return null

  const credentials = parseServiceAccountKey(env.GOOGLE_SERVICE_ACCOUNT_KEY)
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  return typeof token === 'string' ? token : token?.token ?? null
}

export async function callGeminiWithFile(file: File, source: 'upload_photo' | 'upload_file') {
  const model = env.GOOGLE_GEMINI_MODEL ?? 'gemini-2.5-flash'
  const accessToken = await getGoogleAccessToken()

  if (!accessToken && !env.GOOGLE_API_KEY) {
    throw new Error('Google Gemini is not configured. Add GOOGLE_API_KEY or GOOGLE_SERVICE_ACCOUNT_KEY to your environment to enable it.')
  }

  const credentialsHeader = accessToken
    ? `Bearer ${accessToken}`
    : `Bearer ${env.GOOGLE_API_KEY}`

  const instructions = `Extract a nutrition plan from the attached document. Reply with only valid JSON and no explanatory text. Return the following properties when available: title, notes, caloriesTarget, proteinTargetG, carbsTargetG, fatTargetG, mealsPerDay, startDate, endDate, restrictions. Restrictions must be an array of objects with type (allergy|avoid|limit|prefer), ingredientName, and optional note. Use ISO date strings (YYYY-MM-DD) and omit missing fields.`

  // Encode file as base64 and include in the prompt body. This is a pragmatic
  // server-side approach that avoids multipart complexities for now.
  const base64 = await fileToBase64(file)

  const body = {
    contents: [
      {
        parts: [
          {
            text: `${instructions}\n\nSource: ${source}\nFilename: ${file.name}\nMIME-Type: ${file.type}\nFileBase64: ${base64}`,
          },
        ],
      },
    ],
    temperature: 0,
    maxOutputTokens: 1024,
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  } else if (env.GOOGLE_API_KEY) {
    headers['X-Goog-Api-Key'] = env.GOOGLE_API_KEY
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Gemini extraction service error (${res.status}): ${txt.slice(0, 200)}`)
  }

  const json = await res.json()

  // Attempt to extract text from known response shapes.
  // Prefer top-level output if present, else fallback to choices/messages.
  if (typeof json.output === 'string') return json.output
  if (Array.isArray(json.output)) return json.output.map((o: any) => (o?.content ?? o)).join(' ')
  if (Array.isArray(json.candidates)) return json.candidates.map((c: any) => c.content).join(' ')
  if (typeof json.text === 'string') return json.text

  return JSON.stringify(json)
}

function extractTextFromOpenAIResponse(response: any): string | null {
  if (!response || typeof response !== 'object') return null
  if (typeof response.output_text === 'string') return response.output_text
  if (Array.isArray(response.output)) return extractTextFromOutput(response.output)
  if (Array.isArray(response.choices)) return extractTextFromOutput(response.choices.map((choice: any) => choice.message ?? choice))
  return null
}

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
    if (typeof output.message === 'string') return output.message
  }
  return null
}

export async function callOpenAIWithText(text: string): Promise<string> {
  if (!env.OPENAI_API_KEY) throw new Error('OpenAI is not configured.')

  const model = env.OPENAI_API_MODEL ?? 'gpt-4.1-mini'
  const instructions = `Parse the following pantry or grocery text and return only valid JSON. Output an array of items or an object with {\"items\": [...]}. Each item should have name, quantity, unit, category, and optional notes when available. Do not include any extra text.`
  const body = {
    model,
    input: [{ role: 'user', content: `${instructions}\n\nText:\n${text}` }],
    temperature: 0,
    max_output_tokens: 512,
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const txt = await response.text().catch(() => '')
    throw new Error(`OpenAI extraction service error (${response.status}): ${txt.slice(0, 200)}`)
  }

  const json = await response.json()
  const extracted = extractTextFromOpenAIResponse(json)
  if (!extracted) {
    throw new Error('Unable to parse extraction response from the OpenAI provider.')
  }
  return extracted
}

export async function callGeminiWithText(text: string, source: 'manual_entry' | 'receipt_text') {
  const model = env.GOOGLE_GEMINI_MODEL ?? 'gemini-2.5-flash'
  const accessToken = await getGoogleAccessToken()

  if (!accessToken && !env.GOOGLE_API_KEY) {
    throw new Error('Google Gemini is not configured. Add GOOGLE_API_KEY or GOOGLE_SERVICE_ACCOUNT_KEY to your environment to enable it.')
  }

  const credentialsHeader = accessToken
    ? `Bearer ${accessToken}`
    : `Bearer ${env.GOOGLE_API_KEY}`

  const instructions = `Parse the following pantry or grocery item text into valid JSON. Return only JSON and no explanatory text. Output an array of item objects or an object with { items: [...] }. Each item should include name, quantity, unit, category, and optional notes when available.`
  const body = {
    contents: [
      {
        parts: [
          {
            text: `${instructions}\n\nSource: ${source}\nText: ${text}`,
          },
        ],
      },
    ],
    temperature: 0,
    maxOutputTokens: 512,
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  } else if (env.GOOGLE_API_KEY) {
    headers['X-Goog-Api-Key'] = env.GOOGLE_API_KEY
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Gemini extraction service error (${res.status}): ${txt.slice(0, 200)}`)
  }

  const json = await res.json()

  if (typeof json.output === 'string') return json.output
  if (Array.isArray(json.output)) return json.output.map((o: any) => (o?.content ?? o)).join(' ')
  if (Array.isArray(json.candidates)) return json.candidates.map((c: any) => c.content).join(' ')
  if (typeof json.text === 'string') return json.text

  return JSON.stringify(json)
}

export default { callGeminiWithFile, callGeminiWithText, callOpenAIWithText }
