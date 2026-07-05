'use client'

import Link from 'next/link'
import { useNotifications } from '@/lib/hooks'
import { Bell, BellOff, ChefHat, AlertTriangle, X, ArrowRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationType } from '@/lib/types'

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'Just now'
}

const typeIcon: Record<NotificationType, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  expiring_soon: AlertTriangle,
  expired: X,
  unused_long: Clock,
  recipe_suggestion: ChefHat,
}

const typeBg: Record<NotificationType, string> = {
  expiring_soon: 'bg-[oklch(0.94_0.07_75)] border-[oklch(0.84_0.09_70)]',
  expired: 'bg-[oklch(0.93_0.05_25)] border-[oklch(0.83_0.08_25)]',
  unused_long: 'bg-muted border-border',
  recipe_suggestion: 'bg-[oklch(0.97_0.02_145)] border-[oklch(0.87_0.04_145)]',
}

const typeIconColor: Record<NotificationType, string> = {
  expiring_soon: 'text-[oklch(0.42_0.10_55)]',
  expired: 'text-[oklch(0.42_0.15_25)]',
  unused_long: 'text-muted-foreground',
  recipe_suggestion: 'text-[oklch(0.32_0.08_145)]',
}

export default function NotificationsPage() {
  const { notifications, markRead, markAllRead, dismiss, unreadCount } = useNotifications()

  const unread = notifications.filter((n) => !n.isRead)
  const read = notifications.filter((n) => n.isRead)

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Alerts</p>
          <h1 className="font-serif text-3xl text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border px-3 py-1.5 rounded-md hover:bg-muted"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <BellOff className="w-6 h-6 text-muted-foreground" strokeWidth={1} />
          </div>
          <p className="font-serif text-xl text-foreground mb-2">All clear</p>
          <p className="text-sm text-muted-foreground">No notifications right now. Check back when something is about to expire.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Unread section */}
          {unread.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Unread</p>
              <div className="space-y-2">
                {unread.map((n) => {
                  const Icon = typeIcon[n.type]
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer hover:opacity-90',
                        typeBg[n.type]
                      )}
                      onClick={() => markRead(n.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && markRead(n.id)}
                    >
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-card/60')}>
                        <Icon className={cn('w-4 h-4', typeIconColor[n.type])} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground leading-snug">{n.title}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); dismiss(n.id) }}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                        {n.recipeId && (
                          <Link
                            href={`/app/recipes/${n.recipeId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                          >
                            View recipe <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                        {n.itemId && !n.recipeId && (
                          <Link
                            href="/app/pantry"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                          >
                            Go to pantry <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Read section */}
          {read.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Earlier</p>
              <div className="space-y-2">
                {read.map((n) => {
                  const Icon = typeIcon[n.type]
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card transition-colors hover:bg-muted/30"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-muted-foreground leading-snug">{n.title}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                            <button
                              onClick={() => dismiss(n.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notification settings callout */}
      <div className="mt-10 p-4 rounded-xl bg-muted border border-border">
        <div className="flex items-center gap-3">
          <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Notification preferences</p>
            <p className="text-xs text-muted-foreground mt-0.5">Change how far ahead you get warned about expiring items.</p>
          </div>
          <Link
            href="/app/profile"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 flex-shrink-0"
          >
            Settings <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
