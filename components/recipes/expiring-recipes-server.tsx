import { prisma } from '@/lib/prisma'
import { prioritizeForHome } from '@/lib/recipes/engine'

export default async function ExpiringRecipesServer() {
  try {
    // Simple server-side fetch for pantry items and public recipes
    // Fetch a user's pantry if auth available is out-of-scope here; use recent public recipes
    const recipes = await prisma.recipe.findMany({ where: { isPublic: true }, include: { ingredients: true }, take: 50 })

    // Map recipes to engine type
    const mapped = recipes.map((r) => ({
      id: r.id,
      title: r.title,
      ingredients: r.ingredients.map((ing) => ({ id: ing.id, name: ing.name, amount: Number(ing.amount ?? 1), unit: ing.unit })),
      prepTimeMinutes: r.prepTimeMinutes,
      cookTimeMinutes: r.cookTimeMinutes,
      difficulty: r.difficulty,
    }))

    // For server-side home hero, we won't have a specific user's pantry in SSR without session.
    // So prioritize recipes that generally use common expiring ingredients by passing an empty pantry.
    const prioritized = prioritizeForHome([], mapped, 3)

    if (prioritized.length === 0) return null

    return (
      <div className="mt-4 grid gap-2">
        {prioritized.map((r) => (
          <a key={r.id} href={`/app/recipes/${r.id}`} className="flex items-center gap-3 p-2 rounded-md border border-border hover:bg-muted transition-colors">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-100 to-rose-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v6" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 9c0 2-1 4-3 5" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 9c0 2 1 4 3 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium truncate">{r.title}</p>
              <p className="text-xs text-muted-foreground">Uses {r.pantryMatchCount} items {r.usesExpiringItems ? '· Uses expiring items' : ''}</p>
            </div>
          </a>
        ))}
      </div>
    )
  } catch (err) {
    console.warn('[expiring-recipes-server] failed', err)
    return null
  }
}
