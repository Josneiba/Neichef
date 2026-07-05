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

const bottomNavItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/pantry', label: 'Pantry', icon: Package },
  { href: '/app/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/app/notifications', label: 'Notifications', icon: Bell },
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
}

export function AppShell({ children, unreadCount = 0 }: AppShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border flex-shrink-0 fixed left-0 top-0 bottom-0 z-30">
        {/* Logo */}
        <div className="px-6 py-8 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-serif text-xl text-sidebar-foreground tracking-tight">NeiChef</span>
          </Link>
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
                {label === 'Notifications' && unreadCount > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Search at bottom */}
        <div className="px-3 pb-6">
          <Link
            href="/app/search"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors w-full',
              pathname === '/app/search'
                ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <Search className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
            <span>Search</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" className="font-serif text-xl text-sidebar-foreground tracking-tight">
            NeiChef
          </Link>
          <div className="flex items-center gap-3">
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
                  {label === 'Notifications' && unreadCount > 0 && (
                    <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                      {unreadCount}
                    </span>
                  )}
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
                  {label === 'Notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
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
