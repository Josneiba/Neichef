'use client'

import { useMemo, useState } from 'react'
import { useShoppingList } from '@/lib/hooks'
import { useT } from '@/lib/i18n'
import { Check, Plus, Trash2, ListChecks } from 'lucide-react'

export default function ShoppingPage() {
  const { items, addItem, addItems, toggleItem, removeItem, checkedCount } = useShoppingList()
  const t = useT()
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const pendingItems = useMemo(() => items.filter((item) => !item.checked), [items])
  const completedItems = useMemo(() => items.filter((item) => item.checked), [items])

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    setIsSubmitting(true)
    try {
      await addItem({ name: trimmed, quantity: Number(quantity) || 1, unit: unit.trim() || null })
      setName('')
      setQuantity('1')
      setUnit('')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleClearCompleted() {
    await Promise.all(completedItems.map((item) => removeItem(item.id)))
  }

  async function handleAddMissing(ingredients: string[]) {
    if (!ingredients.length) return
    await addItems(ingredients.map((ingredient) => ({ name: ingredient })))
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 lg:pb-8">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{t('shoppingList')}</p>
        <h1 className="font-serif text-3xl text-foreground">{t('shoppingList')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('shoppingDescription')}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 text-sm text-muted-foreground">
            <span className="mb-1 block">{t('itemName')}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('addItemPlaceholder')}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0"
            />
          </label>
          <label className="w-24 text-sm text-muted-foreground">
            <span className="mb-1 block">{t('quantity')}</span>
            <input
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              type="number"
              min="1"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0"
            />
          </label>
          <label className="w-28 text-sm text-muted-foreground">
            <span className="mb-1 block">{t('unit')}</span>
            <input
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="g"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" strokeWidth={1.6} />
            {t('addToList')}
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListChecks className="h-4 w-4" strokeWidth={1.5} />
          <span>{pendingItems.length} pending · {checkedCount} done</span>
        </div>
        {completedItems.length > 0 && (
          <button type="button" onClick={() => void handleClearCompleted()} className="text-sm text-muted-foreground hover:text-foreground">
            {t('clearCompleted')}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {t('noItemsInShoppingList')}
        </div>
      ) : (
        <div className="space-y-4">
          {pendingItems.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Pending</h2>
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <button type="button" onClick={() => void toggleItem(item.id)} className="flex flex-1 items-center gap-3 text-left">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border">
                        <Check className="h-3.5 w-3.5 text-transparent" strokeWidth={2.2} />
                      </span>
                      <span className="text-sm text-foreground">
                        {item.name}
                        {item.quantity > 1 ? ` · ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : item.unit ? ` · ${item.unit}` : ''}
                      </span>
                    </button>
                    <button type="button" onClick={() => void removeItem(item.id)} className="text-muted-foreground hover:text-foreground">
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedItems.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Completed</h2>
              <div className="space-y-2">
                {completedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
                    <button type="button" onClick={() => void toggleItem(item.id)} className="flex flex-1 items-center gap-3 text-left">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        {item.name}
                      </span>
                    </button>
                    <button type="button" onClick={() => void removeItem(item.id)} className="text-muted-foreground hover:text-foreground">
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
