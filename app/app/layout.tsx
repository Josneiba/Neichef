'use client'

import { AppShell } from '@/components/app-shell'
import { useNotifications } from '@/lib/hooks'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { unreadCount } = useNotifications()
  return <AppShell unreadCount={unreadCount}>{children}</AppShell>
}
