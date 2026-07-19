'use client'

import { useState } from 'react'
import { usePantry } from '@/lib/hooks'
import { UrgencyBadge } from '@/components/ui/urgency-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { AddItemModal } from '@/components/pantry/add-item-modal'
import { PantryFilters } from '@/components/pantry/pantry-filters'
import { cn } from '@/lib/utils'
import { Package, Plus, Grid2X2, List } from 'lucide-react'
import type { Category, ItemUrgency, StorageLocation } from '@/lib/types'

type ViewMode = 'list' | 'grid'

export default function PantryPage() {
  const { items, removeItem } = usePantry()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState<'manual' | 'photo' | 'barcode' | 'receipt'>('manual')
  const [filterUrgency, setFilterUrgency] = useState<ItemUrgency | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all')
  const [filterLocation, setFilterLocation] = useState<StorageLocation | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = items.filter((item) => {
    if (filterUrgency !== 'all' && item.urgency !== filterUrgency) return false
    if (filterCategory !== 'all' && item.category !== filterCategory) return false
    if (filterLocation !== 'all' && item.location !== filterLocation) return false
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const expiredCount = items.filter((i) => i.urgency === 'expired').length
  const expiringCount = items.filter((i) => i.urgency === 'expiring').length

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Inventory</p>
          <h1 className="font-serif text-3xl text-foreground">Pantry</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} items total</p>
        </div>
        <button
          onClick={() => { setAddMode('manual'); setShowAdd(true) }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add item
        </button>
      </div>

      {/* Urgency summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Fresh', count: items.filter((i) => i.urgency === 'fresh').length, urgency: 'fresh' as ItemUrgency, color: 'bg-[oklch(0.92_0.04_145)] border-[oklch(0.82_0.06_145)]', textColor: 'text-[oklch(0.28_0.08_145)]', subColor: 'text-[oklch(0.38_0.07_145)]' },
          { label: 'Expiring', count: expiringCount, urgency: 'expiring' as ItemUrgency, color: 'bg-[oklch(0.94_0.07_75)] border-[oklch(0.84_0.09_70)]', textColor: 'text-[oklch(0.42_0.10_55)]', subColor: 'text-[oklch(0.48_0.08_60)]' },
          { label: 'Expired', count: expiredCount, urgency: 'expired' as ItemUrgency, color: 'bg-[oklch(0.93_0.05_25)] border-[oklch(0.83_0.08_25)]', textColor: 'text-[oklch(0.42_0.15_25)]', subColor: 'text-[oklch(0.48_0.12_25)]' },
        ].map(({ label, count, urgency, color, textColor, subColor }) => (
          <button
            key={label}
            onClick={() => setFilterUrgency(filterUrgency === urgency ? 'all' : urgency)}
            className={cn('rounded-xl p-4 border text-left transition-all', color, filterUrgency === urgency ? 'ring-2 ring-primary ring-offset-1' : '')}
          >
            <p className={cn('font-serif text-3xl', textColor)}>{count}</p>
            <p className={cn('text-xs mt-1', subColor)}>{label}</p>
          </button>
        ))}
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">Quick add options</p>
        <p className="text-xs text-muted-foreground mt-1">Choose manual entry, barcode scan, receipt import, or photo capture to log inventory faster.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: 'Manual entry', mode: 'manual' as const },
            { label: 'Scan barcode', mode: 'barcode' as const },
            { label: 'Upload receipt', mode: 'receipt' as const },
            { label: 'Take a photo', mode: 'photo' as const },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { setAddMode(item.mode); setShowAdd(true) }}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters + view toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <PantryFilters
            search={search}
            onSearchChange={setSearch}
            filterCategory={filterCategory}
            onCategoryChange={setFilterCategory}
            filterLocation={filterLocation}
            onLocationChange={setFilterLocation}
          />
        </div>
        <div className="flex items-center border border-border rounded-md overflow-hidden flex-shrink-0">
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}
            aria-label="List view"
          >
            <List className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}
            aria-label="Grid view"
          >
            <Grid2X2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Item list / grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No items found"
          description="Your pantry is empty, or no items match the current filters."
          action={
            <button
              onClick={() => { setAddMode('manual'); setShowAdd(true) }}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Add first item
            </button>
          }
        />
      ) : viewMode === 'list' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border bg-muted/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item</p>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-20">Qty</p>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-20">Location</p>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-28">Expires</p>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">Status</p>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((item) => {
              const exp = new Date(item.expirationDate)
              const today = new Date()
              const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              const expLabel = diff < 0 ? `${Math.abs(diff)}d ago` : diff === 0 ? 'Today' : `${exp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
              return (
                <div
                  key={item.id}
                  className="flex md:grid md:grid-cols-[1fr_auto_auto_auto_auto] md:gap-4 items-center px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{item.category}</p>
                  </div>
                  <p className="text-sm text-muted-foreground w-20 hidden md:block">{item.quantity} {item.unit}</p>
                  <p className="text-sm text-muted-foreground w-20 capitalize hidden md:block">{item.location}</p>
                  <p className="text-sm text-muted-foreground w-28 hidden md:block">{expLabel}</p>
                  <div className="flex items-center gap-2 md:w-24">
                    <UrgencyBadge urgency={item.urgency} daysUntilExpiry={diff > 0 ? diff : undefined} />
                    <button
                      onClick={() => removeItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all ml-1 text-xs"
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const exp = new Date(item.expirationDate)
            const today = new Date()
            const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            const expLabel = diff < 0 ? `Expired ${Math.abs(diff)}d ago` : diff === 0 ? 'Expires today' : `Expires ${exp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-muted-foreground/30 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{item.category}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all text-lg leading-none flex-shrink-0"
                    aria-label="Remove item"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{item.quantity} {item.unit} · <span className="capitalize">{item.location}</span></p>
                  </div>
                  <p className="text-xs text-muted-foreground">{expLabel}</p>
                  <div className="pt-1">
                    <UrgencyBadge urgency={item.urgency} daysUntilExpiry={diff > 0 ? diff : undefined} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add item modal */}
      {showAdd && <AddItemModal initialMode={addMode} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
