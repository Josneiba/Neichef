export const PANTRY_CATEGORY_OPTIONS = ['produce', 'dairy', 'meat', 'seafood', 'grains', 'condiments', 'canned', 'frozen', 'snacks', 'beverages', 'other'] as const

export type PantryCategory = (typeof PANTRY_CATEGORY_OPTIONS)[number]
