import { NextResponse } from 'next/server'
import { resolveProviderSelection } from '@/lib/ai/provider-router'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const ingredients = Array.isArray(body?.ingredients) ? body.ingredients : []

    if (ingredients.length === 0) {
      return NextResponse.json({ error: 'Please provide a list of ingredients.' }, { status: 400 })
    }

    const selection = resolveProviderSelection('recipe-generation')
    if (selection.provider !== 'openrouter' && selection.provider !== 'openai') {
      return NextResponse.json({ error: 'Recipe generation provider is not configured.' }, { status: 501 })
    }

    const model = process.env.OPENROUTER_API_MODEL ?? 'meta-llama/llama-3.1-8b-instruct:free'
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Neichef',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert chef. Write a concise recipe using the provided ingredients, with a title, short prep time, ingredients, and numbered steps.',
          },
          {
            role: 'user',
            content: `Create a recipe using these pantry ingredients: ${ingredients.join(', ')}.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`OpenRouter generation service error (${response.status}): ${text.slice(0, 200)}`)
    }

    const completion = await response.json()
    const recipe = completion?.choices?.[0]?.message?.content
    if (!recipe) {
      throw new Error('No recipe was generated.')
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('[pantry:generate-recipe] failed', error)
    return NextResponse.json({ error: 'Failed to generate recipe.' }, { status: 500 })
  }
}
