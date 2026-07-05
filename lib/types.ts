export type ItemUrgency = 'fresh' | 'expiring' | 'expired'
export type StorageLocation = 'fridge' | 'freezer' | 'pantry'
export type Category =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'grains'
  | 'condiments'
  | 'beverages'
  | 'frozen'
  | 'canned'
  | 'snacks'
  | 'other'

export interface PantryItem {
  id: string
  name: string
  category: Category
  quantity: number
  unit: string
  expirationDate: string // ISO date string
  location: StorageLocation
  urgency: ItemUrgency
  addedDate: string
  imageUrl?: string
}

export type RecipeDifficulty = 'easy' | 'medium' | 'hard'

export interface RecipeIngredient {
  name: string
  amount: number
  unit: string
  inPantry: boolean
  substitution?: string
}

export interface RecipeStep {
  step: number
  instruction: string
  durationMinutes?: number
}

export interface Recipe {
  id: string
  title: string
  description: string
  prepTimeMinutes: number
  cookTimeMinutes: number
  servings: number
  difficulty: RecipeDifficulty
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  pantryMatchCount: number
  totalIngredients: number
  usesExpiringItems: boolean
  tags: string[]
  imageUrl?: string
  isSaved: boolean
  costLevel: 'low' | 'medium' | 'high'
}

export type NotificationType = 'expiring_soon' | 'expired' | 'unused_long' | 'recipe_suggestion'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  itemId?: string
  recipeId?: string
  createdAt: string
  isRead: boolean
  daysUntilExpiry?: number
}

export interface BudgetStats {
  itemsSavedCount: number
  estimatedSavedAmount: number
  estimatedWastedAmount: number
  weeklyData: { week: string; saved: number; wasted: number }[]
  monthlyTotals: { month: string; saved: number; wasted: number }[]
}

export interface UserProfile {
  id: string
  name: string
  email: string
  householdSize: number
  dietaryPreferences: string[]
  notificationDaysAhead: number
}
