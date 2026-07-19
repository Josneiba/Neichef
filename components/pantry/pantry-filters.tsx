'use client'

import { Search } from 'lucide-react'
import { useT } from '@/lib/i18n'
import type { Category, StorageLocation } from '@/lib/types'

interface PantryFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  filterCategory: Category | 'all'
  onCategoryChange: (v: Category | 'all') => void
  filterLocation: StorageLocation | 'all'
  onLocationChange: (v: StorageLocation | 'all') => void
}

export function PantryFilters({
  search, onSearchChange,
  filterCategory, onCategoryChange,
  filterLocation, onLocationChange,
}: PantryFiltersProps) {
  const t = useT()
  
  const categories: { value: Category | 'all'; label: string }[] = [
    { value: 'all', label: t('allCategories') },
    { value: 'produce', label: t('produce') },
    { value: 'dairy', label: t('dairy') },
    { value: 'meat', label: t('meat') },
    { value: 'seafood', label: t('seafood') },
    { value: 'grains', label: t('grains') },
    { value: 'condiments', label: t('condiments') },
    { value: 'canned', label: t('canned') },
    { value: 'frozen', label: t('frozen') },
    { value: 'snacks', label: t('snacks') },
    { value: 'other', label: t('other') },
  ]

  const locations: { value: StorageLocation | 'all'; label: string }[] = [
    { value: 'all', label: t('allLocations') },
    { value: 'fridge', label: t('fridge') },
    { value: 'freezer', label: t('freezer') },
    { value: 'pantry', label: t('pantryLocation') },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        <input
          type="text"
          placeholder={t('searchItemsPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Category */}
      <select
        value={filterCategory}
        onChange={(e) => onCategoryChange(e.target.value as Category | 'all')}
        className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none pr-7 cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '16px' }}
      >
        {categories.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {/* Location */}
      <select
        value={filterLocation}
        onChange={(e) => onLocationChange(e.target.value as StorageLocation | 'all')}
        className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none pr-7 cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '16px' }}
      >
        {locations.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  )
}
