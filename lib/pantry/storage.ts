import type { StorageLocation } from '@/lib/types'

export const STORAGE_LOCATIONS: { value: StorageLocation; label: string }[] = [
  { value: 'pantry', label: 'Pantry' },
  { value: 'fridge', label: 'Refrigerator' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'spice_rack', label: 'Spice rack' },
  { value: 'cellar', label: 'Cellar' },
]

export function isStorageLocation(value: string): value is StorageLocation {
  return STORAGE_LOCATIONS.some((location) => location.value === value)
}
