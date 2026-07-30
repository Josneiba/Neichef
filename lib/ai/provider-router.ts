import { env } from '@/lib/env'

export type AiTask = 'text-parse' | 'item-enrichment' | 'vision'
export type ProviderName = 'groq' | 'openrouter' | 'gemini' | 'openai' | 'huggingface' | 'none'

export type ProviderSelection = {
  task: AiTask
  provider: ProviderName
  fallbackProviders: ProviderName[]
  reason: string
}

function logSelection(task: AiTask, selection: ProviderSelection) {
  const fallback = selection.fallbackProviders.join(' -> ')
  console.info(`[ai-provider] task=${task} provider=${selection.provider} fallback=${fallback} reason=${selection.reason}`)
}

function coerceProviderList(values: Array<ProviderName | 'none'>): ProviderName[] {
  return values.filter((value): value is ProviderName => value !== 'none')
}

export function resolveProviderSelection(task: AiTask, options?: { log?: boolean }): ProviderSelection {
  const hasGroq = Boolean(env.GROQ_API_KEY)
  const hasOpenRouter = Boolean(env.OPENROUTER_API_KEY)
  const hasGemini = Boolean(env.GOOGLE_API_KEY || env.GOOGLE_SERVICE_ACCOUNT_KEY)
  const hasOpenAI = Boolean(env.OPENAI_API_KEY)
  const hasHuggingFace = Boolean(env.HF_API_KEY)

  const selectionByTask: Record<AiTask, ProviderSelection> = {
    'text-parse': {
      task,
      provider: hasGroq ? 'groq' : hasGemini ? 'gemini' : hasOpenAI ? 'openai' : 'none',
      fallbackProviders: coerceProviderList([
        (hasGroq ? 'groq' : 'none') as ProviderName | 'none',
        (hasGemini ? 'gemini' : 'none') as ProviderName | 'none',
        (hasOpenAI ? 'openai' : 'none') as ProviderName | 'none',
      ]),
      reason: hasGroq
        ? 'Groq is preferred for compact structured text parsing.'
        : hasGemini
        ? 'Groq is unavailable, so Gemini is being used as the text parser fallback.'
        : hasOpenAI
        ? 'Groq and Gemini are unavailable, so OpenAI is being used as the fallback.'
        : 'No text parser provider is configured.',
    },
    'item-enrichment': {
      task,
      provider: hasOpenRouter ? 'openrouter' : hasOpenAI ? 'openai' : 'none',
      fallbackProviders: coerceProviderList([
        (hasOpenRouter ? 'openrouter' : 'none') as ProviderName | 'none',
        (hasOpenAI ? 'openai' : 'none') as ProviderName | 'none',
      ]),
      reason: hasOpenRouter
        ? 'OpenRouter is preferred for cleaning up and categorizing pantry/shopping item names.'
        : hasOpenAI
        ? 'OpenRouter is unavailable, so OpenAI is being used as the fallback.'
        : 'No item enrichment provider is configured.',
    },
    vision: {
      task,
      provider: hasGemini ? 'gemini' : hasHuggingFace ? 'huggingface' : 'none',
      fallbackProviders: coerceProviderList([
        (hasGemini ? 'gemini' : 'none') as ProviderName | 'none',
        (hasHuggingFace ? 'huggingface' : 'none') as ProviderName | 'none',
      ]),
      reason: hasGemini
        ? 'Gemini is preferred for image understanding.'
        : hasHuggingFace
        ? 'Gemini is unavailable, so Hugging Face is being used as the fallback.'
        : 'No vision provider is configured.',
    },
  }

  const selection = selectionByTask[task]
  if (options?.log !== false) {
    logSelection(task, selection)
  }
  return selection
}

export default { resolveProviderSelection }
