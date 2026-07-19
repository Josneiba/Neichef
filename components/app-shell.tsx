'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  BookOpen,
  Bell,
  User,
  Search,
  Menu,
  X,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import type { Notification } from '@/lib/types'

const bottomNavItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/pantry', label: 'Pantry', icon: Package },
  { href: '/app/recipes', label: 'Recipes', icon: BookOpen },
]

const moreMenuItems = [
  { href: '/app/budget', label: 'Budget', icon: TrendingUp },
  { href: '/app/profile', label: 'Profile', icon: User },
  { href: '/app/search', label: 'Search', icon: Search },
]

const desktopNavItems = [...bottomNavItems, ...moreMenuItems]

interface AppShellProps {
  children: React.ReactNode
  unreadCount?: number
  notifications?: Notification[]
  markRead?: (id: string) => Promise<void>
  markAllRead?: () => Promise<void>
}

export function AppShell({ children, unreadCount = 0, notifications = [], markRead, markAllRead }: AppShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const recentNotifications = notifications.slice(0, 6)

  function AlertsButton() {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setAlertsOpen((open) => !open)}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {alertsOpen && (
          <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-3 shadow-lg lg:left-0 lg:right-auto">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-serif text-base text-foreground">Alerts</p>
              {unreadCount > 0 && markAllRead && (
                <button type="button" onClick={() => void markAllRead()} className="text-xs text-muted-foreground hover:text-foreground">
                  Mark all read
                </button>
              )}
            </div>
            {recentNotifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No notifications right now.</p>
            ) : (
              <div className="max-h-80 overflow-auto">
                {recentNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => notification.isRead ? undefined : void markRead?.(notification.id)}
                    className="block w-full border-b border-border px-1 py-2.5 text-left last:border-0 hover:bg-muted/40"
                  >
                    <div className="flex items-start gap-2">
                      {!notification.isRead && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">{notification.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{notification.message}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border flex-shrink-0 fixed left-0 top-0 bottom-0 z-30">
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-8 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-serif text-xl text-sidebar-foreground tracking-tight">NeiChef</span>
          </Link>
          <AlertsButton />
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {desktopNavItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/app' ? pathname === '/app' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors relative',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" className="font-serif text-xl text-sidebar-foreground tracking-tight">
            NeiChef
          </Link>
          <div className="flex items-center gap-3">
            <AlertsButton />
            <Link href="/app/search" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <Search className="w-5 h-5" strokeWidth={1.5} />
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileOpen && (
          <nav className="px-3 pb-4 space-y-0.5 border-t border-sidebar-border pt-2">
            {[...bottomNavItems, ...moreMenuItems].map(({ href, label, icon: Icon }) => {
              const isActive = href === '/app' ? pathname === '/app' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-60 min-h-screen">
        <div className="pt-16 lg:pt-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border">
        <div className="flex items-center justify-around px-2 py-2">
          {bottomNavItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/app' ? pathname === '/app' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors relative',
                  isActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/40'
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
