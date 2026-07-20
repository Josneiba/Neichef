import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY || ''
const resend = resendApiKey ? new Resend(resendApiKey) : null

function normalizeRecipientAddress(to: string) {
  return to.trim().toLowerCase()
}

export async function sendNotificationEmail(to: string, subject: string, body: string) {
  const recipient = normalizeRecipientAddress(to)
  if (!recipient) {
    console.warn('Notification email skipped: empty recipient')
    return
  }

  if (!resend) {
    console.info('Resend not configured — skipping email to', recipient)
    return
  }

  try {
    await resend.emails.send({
      from: 'no-reply@neichef.example',
      to: recipient,
      subject,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">${body}</div>`,
    })
  } catch (err) {
    console.error('Failed to send email', { recipient, subject, error: err })
  }
}

export default sendNotificationEmail
