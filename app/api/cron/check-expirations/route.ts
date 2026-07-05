import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotificationEmail } from '@/lib/notifications/send-email'

// This route is intended to be invoked by Vercel Cron (daily). It checks for
// pantry items that are expiring soon or already expired and creates
// Notification rows and sends email via Resend when configured.

export async function GET() {
  try {
    const now = new Date()

    // Fetch all users
    const users = await prisma.user.findMany()

    for (const user of users) {
      const daysAhead = user.notificationDaysAhead ?? 3
      const threshold = new Date()
      threshold.setDate(now.getDate() + daysAhead)

      // Expiring soon: expirationDate between now (exclusive) and threshold (inclusive)
      const expiring = await prisma.pantryItem.findMany({ where: { userId: user.id, expirationDate: { lte: threshold, gt: now } } })
      for (const item of expiring) {
        // Avoid duplicate expiring_soon notifications for same item
        const existing = await prisma.notification.findFirst({ where: { userId: user.id, itemId: item.id, type: 'expiring_soon' } })
        if (existing) continue

        await prisma.notification.create({ data: {
          userId: user.id,
          type: 'expiring_soon',
          title: `${item.name} expires soon`,
          message: `${item.name} expires on ${item.expirationDate.toISOString().split('T')[0]}`,
          itemId: item.id,
          daysUntilExpiry: Math.ceil((item.expirationDate.getTime() - now.getTime()) / (1000*60*60*24)),
        }})

        if (user.email) {
          // Fire-and-forget
          sendNotificationEmail(user.email, `${item.name} expires soon`, `${item.name} expires on ${item.expirationDate.toISOString().split('T')[0]}`)
        }
      }

      // Expired items
      const expired = await prisma.pantryItem.findMany({ where: { userId: user.id, expirationDate: { lt: now } } })
      for (const item of expired) {
        const existing = await prisma.notification.findFirst({ where: { userId: user.id, itemId: item.id, type: 'expired' } })
        if (existing) continue

        await prisma.notification.create({ data: {
          userId: user.id,
          type: 'expired',
          title: `${item.name} has expired`,
          message: `${item.name} expired on ${item.expirationDate.toISOString().split('T')[0]}`,
          itemId: item.id,
        }})

        if (user.email) {
          sendNotificationEmail(user.email, `${item.name} has expired`, `${item.name} expired on ${item.expirationDate.toISOString().split('T')[0]}`)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Cron check-expirations error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
