'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePantry } from '@/lib/hooks'
import { useT } from '@/lib/i18n'
import { X, Camera, ScanBarcode, FileText, Pencil, Check, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category, StorageLocation } from '@/lib/types'

type AddMode = 'manual' | 'photo' | 'barcode' | 'receipt'

interface AddItemModalProps {
  onClose: () => void
  initialMode?: AddMode
}

type ReviewItem = {
  id: string
  name: string
  quantity: number
  unit: string
  category: Category
  confirmed: boolean
}

const categoryOptions: Category[] = ['produce', 'dairy', 'meat', 'seafood', 'grains', 'condiments', 'canned', 'frozen', 'snacks', 'beverages', 'other']

function newReviewItem(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `item-${Date.now()}-${Math.random()}`,
    name: '',
    quantity: 1,
    unit: 'pcs',
    category: 'other',
    confirmed: true,
    ...overrides,
  }
}

function guessCategory(text: string): Category {
  const t = text.toLowerCase()
  if (/(milk|cheese|yogurt|butter|cream|dairy)/.test(t)) return 'dairy'
  if (/(chicken|beef|pork|meat|sausage|bacon)/.test(t)) return 'meat'
  if (/(fish|salmon|shrimp|seafood|tuna|prawn)/.test(t)) return 'seafood'
  if (/(bread|rice|pasta|cereal|grain|flour|oat)/.test(t)) return 'grains'
  if (/(sauce|condiment|ketchup|mustard|mayo|dressing|oil|vinegar)/.test(t)) return 'condiments'
  if (/(can|canned|tin)/.test(t)) return 'canned'
  if (/(frozen)/.test(t)) return 'frozen'
  if (/(chip|snack|cracker|cookie|candy)/.test(t)) return 'snacks'
  if (/(water|soda|juice|drink|beverage|coffee|tea|sparkling)/.test(t)) return 'beverages'
  if (/(fruit|vegetable|tomato|lettuce|onion|apple|banana|produce|basil|herb)/.test(t)) return 'produce'
  return 'other'
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function defaultExpiryDate(daysAhead = 7): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().split('T')[0]
}

// Minimal ambient typing for the browser's native Barcode Detection API.
// Not yet in all TS DOM lib versions, and not supported in every browser
// (notably Safari/iOS) — we feature-detect at runtime and always offer a
// manual barcode entry fallback so scanning still works everywhere.
interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike
  }
}

function ReviewList({ items, onChange }: { items: ReviewItem[]; onChange: (items: ReviewItem[]) => void }) {
  const t = useT()
  function update(id: string, patch: Partial<ReviewItem>) {
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }
  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id))
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className={cn('rounded-lg border p-3 transition-colors', item.confirmed ? 'border-primary/40 bg-[oklch(0.97_0.02_145)]' : 'border-border bg-card')}>
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => update(item.id, { confirmed: !item.confirmed })}
              className={cn('w-5 h-5 mt-0.5 rounded border flex items-center justify-center flex-shrink-0', item.confirmed ? 'bg-primary border-primary' : 'border-border')}
              aria-label={item.confirmed ? t('excludeItem') : t('includeItem')}
            >
              {item.confirmed && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={2.5} />}
            </button>
            <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
              <input
                value={item.name}
                onChange={(e) => update(item.id, { name: e.target.value })}
                placeholder={t('itemName')}
                className="col-span-2 px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                type="number"
                min="0"
                step="any"
                value={item.quantity}
                onChange={(e) => update(item.id, { quantity: Number(e.target.value) })}
                className="px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                value={item.unit}
                onChange={(e) => update(item.id, { unit: e.target.value })}
                placeholder={t('unit')}
                className="px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <select
                value={item.category}
                onChange={(e) => update(item.id, { category: e.target.value as Category })}
                className="col-span-2 px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground capitalize focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {categoryOptions.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => remove(item.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0" aria-label="Remove item">
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, newReviewItem({ confirmed: true })])}
        className="w-full flex items-center justify-center gap-1.5 border border-dashed border-border rounded-lg py-2 text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2} /> {t('addRowManually')}
      </button>
    </div>
  )
}

export function AddItemModal({ onClose, initialMode = 'manual' }: AddItemModalProps) {
  const { addItem } = usePantry()
  const [mode, setMode] = useState<AddMode>(initialMode)

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

  // ---- Photo mode ----
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoStep, setPhotoStep] = useState<'capture' | 'review'>('capture')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoItems, setPhotoItems] = useState<ReviewItem[]>([])

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    setIsDetecting(true)
    try {
      const base64 = await fileToBase64(file)
      setPhotoPreview(base64)
      const res = await fetch('/api/pantry/photo-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ imageBase64: base64 }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPhotoError(payload.error ?? 'Could not detect ingredients from this photo.')
        setPhotoItems([])
      } else {
        const detected = (payload.items ?? []) as { name: string; confidence: number }[]
        setPhotoItems(
          detected
            .filter((d) => d.name)
            .slice(0, 10)
            .map((d) => newReviewItem({ name: d.name, category: guessCategory(d.name), confirmed: true })),
        )
        if (detected.length === 0) setPhotoError('No ingredients were confidently detected — add items manually below.')
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not process this photo.')
    } finally {
      setIsDetecting(false)
      setPhotoStep('review')
    }
  }

  function handlePhotoConfirm() {
    const expirationDate = defaultExpiryDate(7)
    photoItems
      .filter((i) => i.confirmed && i.name.trim())
      .forEach((item) => {
        addItem({ name: item.name.trim(), quantity: item.quantity, unit: item.unit, category: item.category, location: 'fridge', expirationDate })
      })
    onClose()
  }

  function resetPhoto() {
    setPhotoStep('capture')
    setPhotoPreview(null)
    setPhotoItems([])
    setPhotoError('')
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  // ---- Barcode mode ----
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanFrameRef = useRef<number | null>(null)
  const [barcodeValue, setBarcodeValue] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [barcodeSupported, setBarcodeSupported] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [scannedProduct, setScannedProduct] = useState<{ name: string; category: Category; quantity: string; barcode: string } | null>(null)

  useEffect(() => {
    setBarcodeSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window)
  }, [])

  async function startScanning() {
    if (!window.BarcodeDetector) return
    setBarcodeError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsScanning(true)
      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] })

      const tick = async () => {
        if (!videoRef.current) return
        try {
          const results = await detector.detect(videoRef.current)
          if (results.length > 0) {
            const code = results[0].rawValue
            stopScanning()
            setBarcodeValue(code)
            void lookupBarcode(code)
            return
          }
        } catch {
          // ignore transient detection errors and keep scanning
        }
        scanFrameRef.current = requestAnimationFrame(tick)
      }
      scanFrameRef.current = requestAnimationFrame(tick)
    } catch {
      setBarcodeError('Could not access the camera. Check permissions, or enter the barcode number manually below.')
      setIsScanning(false)
    }
  }

  const stopScanning = useCallback(() => {
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current)
    scanFrameRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsScanning(false)
  }, [])

  useEffect(() => {
    return () => stopScanning()
  }, [stopScanning])

  async function lookupBarcode(code: string) {
    if (!code.trim()) return
    setIsLookingUp(true)
    setBarcodeError('')
    setScannedProduct(null)
    try {
      const res = await fetch('/api/pantry/barcode-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ barcode: code.trim() }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBarcodeError(payload.error ?? 'No product found for that barcode.')
      } else {
        setScannedProduct({
          name: payload.name ?? 'Unknown product',
          category: guessCategory(String(payload.category ?? '')),
          quantity: String(payload.quantity ?? '1'),
          barcode: code.trim(),
        })
      }
    } catch {
      setBarcodeError('Barcode lookup failed. Check your connection and try again.')
    } finally {
      setIsLookingUp(false)
    }
  }

  function handleAddScannedItem() {
    if (!scannedProduct) return
    addItem({
      name: scannedProduct.name,
      quantity: 1,
      unit: scannedProduct.quantity || 'pcs',
      category: scannedProduct.category,
      location: 'pantry',
      expirationDate: defaultExpiryDate(14),
    })
    onClose()
  }

  // ---- Receipt mode ----
  const receiptInputRef = useRef<HTMLInputElement>(null)
  const [receiptStep, setReceiptStep] = useState<'upload' | 'review'>('upload')
  const [isImporting, setIsImporting] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const [receiptNote, setReceiptNote] = useState('')
  const [receiptItems, setReceiptItems] = useState<ReviewItem[]>([])

  async function handleReceiptSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptError('')
    setIsImporting(true)
    try {
      const base64 = await fileToBase64(file)
      const res = await fetch('/api/pantry/receipt-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ imageBase64: base64 }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setReceiptError(payload.error ?? 'Could not read this receipt.')
      } else {
        const items = (payload.items ?? []) as { name: string; quantity: number; unit: string; category: string }[]
        setReceiptItems(
          items.map((i) => newReviewItem({
            name: i.name,
            quantity: i.quantity ?? 1,
            unit: i.unit ?? 'pcs',
            category: (categoryOptions as string[]).includes(i.category) ? (i.category as Category) : guessCategory(i.name),
            confirmed: true,
          })),
        )
        setReceiptNote(payload.note ?? '')
        setReceiptStep('review')
      }
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : 'Could not process this receipt.')
    } finally {
      setIsImporting(false)
    }
  }

  function handleReceiptConfirm() {
    const expirationDate = defaultExpiryDate(7)
    receiptItems
      .filter((i) => i.confirmed && i.name.trim())
      .forEach((item) => {
        addItem({ name: item.name.trim(), quantity: item.quantity, unit: item.unit, category: item.category, location: 'pantry', expirationDate })
      })
    onClose()
  }

  function resetReceipt() {
    setReceiptStep('upload')
    setReceiptItems([])
    setReceiptError('')
    setReceiptNote('')
    if (receiptInputRef.current) receiptInputRef.current.value = ''
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
              onClick={() => { stopScanning(); setMode(id) }}
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
                    {categoryOptions.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
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
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelected} />
              {photoStep === 'capture' ? (
                <div className="text-center">
                  <div className="w-full h-52 bg-muted rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border mb-4 overflow-hidden">
                    {isDetecting ? (
                      <>
                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" strokeWidth={1.5} />
                        <p className="text-sm text-muted-foreground">Detecting ingredients…</p>
                      </>
                    ) : (
                      <>
                        <Camera className="w-10 h-10 text-muted-foreground mb-3" strokeWidth={1} />
                        <p className="text-sm text-muted-foreground">Camera preview</p>
                        <p className="text-xs text-muted-foreground mt-1">Point at your ingredients or groceries</p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-5">NeiChef will detect what is visible and list them for your review.</p>
                  <button
                    type="button"
                    disabled={isDetecting}
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {isDetecting ? 'Detecting…' : 'Take or choose a photo'}
                  </button>
                </div>
              ) : (
                <div>
                  {photoPreview && (
                    <img src={photoPreview} alt="Captured" className="w-full h-36 object-cover rounded-lg mb-4 border border-border" />
                  )}
                  {photoError && (
                    <div className="flex items-start gap-2 mb-4 p-3 rounded-lg border border-[oklch(0.84_0.09_70)] bg-[oklch(0.97_0.03_75)] text-xs text-[oklch(0.42_0.10_55)]">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span>{photoError}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-foreground">Detected items</p>
                    <p className="text-xs text-muted-foreground">{photoItems.filter((i) => i.confirmed).length} selected</p>
                  </div>
                  <div className="mb-5">
                    <ReviewList items={photoItems} onChange={setPhotoItems} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Expiration dates will be set to 7 days from today by default. Update them in your pantry after adding.</p>
                  <div className="flex gap-3">
                    <button onClick={resetPhoto} className="flex-1 border border-border text-foreground py-2.5 rounded-md text-sm font-medium hover:bg-muted transition-colors">
                      Retake
                    </button>
                    <button onClick={handlePhotoConfirm} disabled={photoItems.filter((i) => i.confirmed).length === 0} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                      Add {photoItems.filter((i) => i.confirmed).length} items
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Barcode mode */}
          {mode === 'barcode' && (
            <div>
              <div className="text-center">
                <div className="w-full h-52 bg-muted rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border mb-4 relative overflow-hidden">
                  {isScanning ? (
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                  ) : (
                    <>
                      <div className="absolute inset-8 border-2 border-primary/50 rounded-md" />
                      <ScanBarcode className="w-10 h-10 text-muted-foreground mb-3 relative z-10" strokeWidth={1} />
                      <p className="text-sm text-muted-foreground relative z-10">Align barcode within frame</p>
                    </>
                  )}
                </div>

                {barcodeSupported ? (
                  <button
                    type="button"
                    onClick={isScanning ? stopScanning : startScanning}
                    className="w-full mb-3 border border-border text-foreground py-2.5 rounded-md text-sm font-medium hover:bg-muted transition-colors"
                  >
                    {isScanning ? 'Stop camera' : 'Scan with camera'}
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">Live camera scanning isn&apos;t supported in this browser — enter the barcode number below.</p>
                )}

                <div className="flex gap-2 mb-4">
                  <input
                    value={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value)}
                    placeholder="Enter barcode number"
                    inputMode="numeric"
                    className="flex-1 px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    disabled={isLookingUp || !barcodeValue.trim()}
                    onClick={() => lookupBarcode(barcodeValue)}
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isLookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Look up'}
                  </button>
                </div>

                {barcodeError && (
                  <div className="flex items-start gap-2 mb-4 p-3 rounded-lg border border-[oklch(0.84_0.09_70)] bg-[oklch(0.97_0.03_75)] text-xs text-[oklch(0.42_0.10_55)] text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span>{barcodeError}</span>
                  </div>
                )}

                {scannedProduct && (
                  <div className="p-4 bg-muted rounded-lg text-left mb-4">
                    <p className="text-xs font-medium text-foreground mb-1">Scanned item</p>
                    <p className="text-sm text-foreground">{scannedProduct.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{scannedProduct.quantity} · <span className="capitalize">{scannedProduct.category}</span></p>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!scannedProduct}
                  onClick={handleAddScannedItem}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Add scanned item
                </button>
              </div>
            </div>
          )}

          {/* Receipt mode */}
          {mode === 'receipt' && (
            <div>
              <input ref={receiptInputRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptSelected} />
              {receiptStep === 'upload' ? (
                <div className="text-center">
                  <div
                    onClick={() => !isImporting && receiptInputRef.current?.click()}
                    className="w-full h-52 bg-muted rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border mb-4 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" strokeWidth={1.5} />
                        <p className="text-sm text-muted-foreground">Reading receipt…</p>
                      </>
                    ) : (
                      <>
                        <FileText className="w-10 h-10 text-muted-foreground mb-3" strokeWidth={1} />
                        <p className="text-sm text-muted-foreground">Upload or photograph a receipt</p>
                        <p className="text-xs text-muted-foreground mt-1">JPEG or PNG</p>
                      </>
                    )}
                  </div>
                  {receiptError && (
                    <div className="flex items-start gap-2 mb-4 p-3 rounded-lg border border-[oklch(0.84_0.09_70)] bg-[oklch(0.97_0.03_75)] text-xs text-[oklch(0.42_0.10_55)] text-left">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span>{receiptError}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mb-4">NeiChef will parse the itemised list from your receipt and show it for review before adding anything to your pantry.</p>
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => receiptInputRef.current?.click()}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {isImporting ? 'Reading…' : 'Upload receipt'}
                  </button>
                </div>
              ) : (
                <div>
                  {receiptNote && (
                    <div className="flex items-start gap-2 mb-4 p-3 rounded-lg border border-border bg-muted text-xs text-muted-foreground text-left">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span>{receiptNote}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-foreground">Items found</p>
                    <p className="text-xs text-muted-foreground">{receiptItems.filter((i) => i.confirmed).length} selected</p>
                  </div>
                  <div className="mb-5">
                    <ReviewList items={receiptItems} onChange={setReceiptItems} />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={resetReceipt} className="flex-1 border border-border text-foreground py-2.5 rounded-md text-sm font-medium hover:bg-muted transition-colors">
                      Retry
                    </button>
                    <button onClick={handleReceiptConfirm} disabled={receiptItems.filter((i) => i.confirmed).length === 0} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                      Add {receiptItems.filter((i) => i.confirmed).length} items
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
