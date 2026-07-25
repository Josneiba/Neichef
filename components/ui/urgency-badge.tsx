import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ItemUrgency } from '@/lib/types'

interface UrgencyBadgeProps {
  urgency: ItemUrgency
  daysUntilExpiry?: number
  className?: string
}

export function UrgencyBadge({ urgency, daysUntilExpiry, className }: UrgencyBadgeProps) {
  const today = new Date()
  let label = ''
  let bg = ''
  let text = ''
  let Icon = CheckCircle2

  if (urgency === 'expired') {
    label = 'Expired'
    bg = 'bg-red-100'
    text = 'text-red-800'
    Icon = AlertCircle
  } else if (urgency === 'expiring') {
    const daysLeft = daysUntilExpiry ?? 0
    label = daysLeft <= 0 ? 'Expires today' : daysLeft === 1 ? 'Expires tomorrow' : `${daysLeft}d left`
    bg = 'bg-orange-100'
    text = 'text-orange-800'
    Icon = Clock
  } else {
    label = 'Fresh'
    bg = 'bg-green-100'
    text = 'text-green-800'
    Icon = CheckCircle2
  }

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', bg, text, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

export function computeUrgency(expirationDate?: string | Date | null) {
  if (!expirationDate) return { urgency: 'fresh' as const, label: 'Fresh', daysLeft: undefined }
  const exp = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate
  const today = new Date()
  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { urgency: 'expired' as const, label: 'Expired', daysLeft: diff }
  if (diff <= 2) return { urgency: 'expiring' as const, label: diff === 0 ? 'Expires today' : diff === 1 ? 'Expires tomorrow' : `${diff}d left`, daysLeft: diff }
  return { urgency: 'fresh' as const, label: 'Fresh', daysLeft: diff }
}
