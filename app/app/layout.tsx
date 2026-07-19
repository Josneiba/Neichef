'use client'

import { AppShell } from '@/components/app-shell'
import { useNotifications } from '@/lib/hooks'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  return <AppShell unreadCount={unreadCount} notifications={notifications} markRead={markRead} markAllRead={markAllRead}>{children}</AppShell>
}
