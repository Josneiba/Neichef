import { cn } from '@/lib/utils'
import type { ItemUrgency } from '@/lib/types'

interface UrgencyBadgeProps {
  urgency: ItemUrgency
  daysUntilExpiry?: number
  className?: string
}

const config: Record<ItemUrgency, { label: string; className: string }> = {
  fresh: {
    label: 'Fresh',
    className: 'bg-[oklch(0.92_0.04_145)] text-[oklch(0.28_0.08_145)] border-[oklch(0.82_0.06_145)]',
  },
  expiring: {
    label: 'Expiring soon',
    className: 'bg-[oklch(0.94_0.07_75)] text-[oklch(0.42_0.10_55)] border-[oklch(0.84_0.09_70)]',
  },
  expired: {
    label: 'Expired',
    className: 'bg-[oklch(0.93_0.05_25)] text-[oklch(0.42_0.15_25)] border-[oklch(0.83_0.08_25)]',
  },
}

export function UrgencyBadge({ urgency, daysUntilExpiry, className }: UrgencyBadgeProps) {
  const { label, className: badgeClass } = config[urgency]

  let displayLabel = label
  if (urgency === 'expiring' && daysUntilExpiry !== undefined) {
    displayLabel = daysUntilExpiry === 1 ? 'Expires tomorrow' : `Expires in ${daysUntilExpiry}d`
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border tracking-wide',
        badgeClass,
        className
      )}
    >
      {displayLabel}
    </span>
  )
}
