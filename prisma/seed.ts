import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to .env before running the seed script.')
}

function makeDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (process.env.NODE_ENV === 'development' && (host.endsWith('.supabase.co') || host.endsWith('.supabase.com') || process.env.PGSSLMODE === 'no-verify')) {
      parsed.searchParams.set('sslmode', 'no-verify')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

const adapter = new PrismaPg({ connectionString: makeDatabaseUrl(connectionString) })
const prisma = new PrismaClient({ adapter })

async function main() {
  const existing = await prisma.recipe.count({ where: { userId: null, isPublic: true } })
  if (existing > 0) return

  await prisma.recipe.create({
    data: {
      title: 'Lemon Herb Chicken Bowl',
      description: 'A bright bowl with chicken, rice, and roasted vegetables.',
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      servings: 2,
      difficulty: 'easy',
      tags: ['quick', 'high-protein'],
      costLevel: 'medium',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Chicken breast', amount: 300, unit: 'g' },
          { name: 'Rice', amount: 1, unit: 'cup' },
          { name: 'Broccoli', amount: 1, unit: 'head' },
        ],
      },
      steps: {
        create: [
          { step: 1, instruction: 'Cook the rice.' },
          { step: 2, instruction: 'Pan-sear the chicken and roast the broccoli.' },
        ],
      },
    },
  })

  await prisma.recipe.create({
    data: {
      title: 'Tomato Basil Pasta',
      description: 'A simple pantry pasta with a fresh finish.',
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      servings: 2,
      difficulty: 'easy',
      tags: ['comfort-food', 'weeknight'],
      costLevel: 'low',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Pasta', amount: 200, unit: 'g' },
          { name: 'Tomato', amount: 2, unit: 'pcs' },
          { name: 'Basil', amount: 1, unit: 'bunch' },
        ],
      },
      steps: {
        create: [
          { step: 1, instruction: 'Boil the pasta.' },
          { step: 2, instruction: 'Simmer the tomato sauce and fold in basil.' },
        ],
      },
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
