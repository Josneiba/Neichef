'use client'

import { useState } from 'react'
import { usePantry } from '@/lib/hooks'
import { X, Camera, ScanBarcode, FileText, Pencil, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category, StorageLocation } from '@/lib/types'

type AddMode = 'manual' | 'photo' | 'barcode' | 'receipt'

interface AddItemModalProps {
  onClose: () => void
}

// Simulated photo detection result
const detectedItems = [
  { id: 'd1', name: 'Cherry Tomatoes', quantity: 300, unit: 'g', category: 'produce' as Category, confirmed: true },
  { id: 'd2', name: 'Cheddar Cheese', quantity: 200, unit: 'g', category: 'dairy' as Category, confirmed: true },
  { id: 'd3', name: 'Fresh Basil', quantity: 30, unit: 'g', category: 'produce' as Category, confirmed: true },
  { id: 'd4', name: 'Olive Oil', quantity: 500, unit: 'ml', category: 'condiments' as Category, confirmed: false },
]

export function AddItemModal({ onClose }: AddItemModalProps) {
  const { addItem } = usePantry()
  const [mode, setMode] = useState<AddMode>('manual')
  const [photoStep, setPhotoStep] = useState<'capture' | 'confirm'>('capture')
  const [confirmedItems, setConfirmedItems] = useState(detectedItems)

  // Manual form state
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('g')
  const [category, setCategory] = useState<Category>('produce')
  const [location, setLocation] = useState<StorageLocation>('fridge')
  const [expiry, setExpiry] = useState('')

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !quantity || !expiry) return
    addItem({ name, quantity: Number(quantity), unit, category, location, expirationDate: expiry })
    onClose()
  }

  function handlePhotoConfirm() {
    const today = new Date()
    const defaultExpiry = new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0]
    confirmedItems
      .filter((i) => i.confirmed)
      .forEach((item) => {
        addItem({ name: item.name, quantity: item.quantity, unit: item.unit, category: item.category, location: 'fridge', expirationDate: defaultExpiry })
      })
    onClose()
  }

  const modes: { id: AddMode; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
    { id: 'manual', label: 'Manual entry', icon: Pencil },
    { id: 'photo', label: 'Take a photo', icon: Camera },
    { id: 'barcode', label: 'Scan barcode', icon: ScanBarcode },
    { id: 'receipt', label: 'Upload receipt', icon: FileText },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/20 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-serif text-lg text-foreground">Add item</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-border overflow-x-auto">
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setMode(id); setPhotoStep('capture') }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex-1 justify-center',
                mode === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>

        <div className="px-6 py-6">
          {/* Manual entry */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Item name <span className="text-destructive">*</span></label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cherry Tomatoes"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Quantity <span className="text-destructive">*</span></label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="400"
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Unit</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    {['g', 'kg', 'ml', 'L', 'pcs', 'tbsp', 'tsp', 'cups', 'loaf'].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring capitalize">
                    {(['produce','dairy','meat','seafood','grains','condiments','canned','frozen','snacks','beverages','other'] as Category[]).map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Location</label>
                  <select value={location} onChange={(e) => setLocation(e.target.value as StorageLocation)} className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring capitalize">
                    {(['fridge','freezer','pantry'] as StorageLocation[]).map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Expiration date <span className="text-destructive">*</span></label>
                <input
                  required
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <button type="submit" className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors mt-2">
                Add to pantry
              </button>
            </form>
          )}

          {/* Photo mode */}
          {mode === 'photo' && (
            <div>
              {photoStep === 'capture' ? (
                <div className="text-center">
                  <div className="w-full h-52 bg-muted rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border mb-4">
                    <Camera className="w-10 h-10 text-muted-foreground mb-3" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground">Camera preview</p>
                    <p className="text-xs text-muted-foreground mt-1">Point at your ingredients or groceries</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-5">NeiChef will detect what is visible and list them for your review.</p>
                  <button
                    onClick={() => setPhotoStep('confirm')}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Detect ingredients
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-foreground">Detected items</p>
                    <p className="text-xs text-muted-foreground">{confirmedItems.filter((i) => i.confirmed).length} selected</p>
                  </div>
                  <div className="space-y-2 mb-5">
                    {confirmedItems.map((item) => (
                      <div key={item.id} className={cn('flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer', item.confirmed ? 'border-primary/40 bg-[oklch(0.97_0.02_145)]' : 'border-border bg-card')}
                        onClick={() => setConfirmedItems((prev) => prev.map((i) => i.id === item.id ? { ...i, confirmed: !i.confirmed } : i))}
                      >
                        <div className={cn('w-5 h-5 rounded border flex items-center justify-center flex-shrink-0', item.confirmed ? 'bg-primary border-primary' : 'border-border')}>
                          {item.confirmed && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={2.5} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} {item.unit} · <span className="capitalize">{item.category}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Expiration dates will be set to 7 days from today by default. Update them in your pantry after adding.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setPhotoStep('capture')} className="flex-1 border border-border text-foreground py-2.5 rounded-md text-sm font-medium hover:bg-muted transition-colors">
                      Retake
                    </button>
                    <button onClick={handlePhotoConfirm} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                      Add {confirmedItems.filter((i) => i.confirmed).length} items
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Barcode mode */}
          {mode === 'barcode' && (
            <div className="text-center">
              <div className="w-full h-52 bg-muted rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border mb-4 relative overflow-hidden">
                <div className="absolute inset-8 border-2 border-primary/50 rounded-md" />
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-primary/60 animate-pulse" />
                <ScanBarcode className="w-10 h-10 text-muted-foreground mb-3 relative z-10" strokeWidth={1} />
                <p className="text-sm text-muted-foreground relative z-10">Align barcode within frame</p>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Point your camera at a product barcode. NeiChef will look up the product name and fill in the details automatically.</p>
              <div className="p-4 bg-muted rounded-lg text-left">
                <p className="text-xs font-medium text-foreground mb-1">Demo: Scanned item</p>
                <p className="text-sm text-foreground">San Pellegrino Sparkling Water</p>
                <p className="text-xs text-muted-foreground mt-0.5">500ml · Beverages</p>
              </div>
              <button className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                Add scanned item
              </button>
            </div>
          )}

          {/* Receipt mode */}
          {mode === 'receipt' && (
            <div className="text-center">
              <div className="w-full h-52 bg-muted rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border mb-4 cursor-pointer hover:border-primary/50 transition-colors">
                <FileText className="w-10 h-10 text-muted-foreground mb-3" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">Upload or photograph a receipt</p>
                <p className="text-xs text-muted-foreground mt-1">JPEG, PNG or PDF</p>
              </div>
              <p className="text-xs text-muted-foreground mb-4">NeiChef will parse the itemised list from your receipt and show it for review before adding anything to your pantry.</p>
              <button className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                Upload receipt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
