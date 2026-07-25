import { z } from 'zod'

export const nutritionPlanSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  caloriesTarget: z.number().int().positive().optional(),
  proteinTargetG: z.number().positive().optional(),
  carbsTargetG: z.number().positive().optional(),
  fatTargetG: z.number().positive().optional(),
  mealsPerDay: z.number().int().min(1).max(10).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  restrictions: z.array(
    z.object({
      type: z.enum(['allergy', 'avoid', 'limit', 'prefer']),
      ingredientName: z.string().min(1),
      note: z.string().optional(),
    }),
  ).optional(),
  source: z.enum(['manual', 'upload_photo', 'upload_file']).default('manual'),
  rawFileUrl: z.string().url().optional(),
  rawExtractedText: z.string().optional(),
  extractionStatus: z.enum(['pending', 'processing', 'done', 'failed', 'needs_review']).optional(),
})

export type NutritionPlanInput = z.infer<typeof nutritionPlanSchema>

export const mealSlotSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout']),
  timeOfDay: z.string().optional(),
  targetCalories: z.number().int().positive().optional(),
  recipeId: z.string().optional(),
  freeText: z.string().optional(),
})

export const mealRoutineSchema = z.object({
  name: z.string().min(1),
  daysOfWeek: z.array(z.string()).min(1),
  slots: z.array(mealSlotSchema).optional(),
  planId: z.string().nullable().optional(),
})

export type MealRoutineInput = z.infer<typeof mealRoutineSchema>
