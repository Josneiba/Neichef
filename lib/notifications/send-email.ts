import Resend from 'resend'

const resendApiKey = process.env.RESEND_API_KEY || ''
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function sendNotificationEmail(to: string, subject: string, body: string) {
  if (!resend) {
    // No API key configured; log and return
    console.info('Resend not configured — skipping email to', to)
    return
  }

  try {
    await resend.emails.send({
      from: 'no-reply@neichef.example',
      to,
      subject,
      html: `<div>${body}</div>`,
    })
  } catch (err) {
    console.error('Failed to send email', err)
  }
}

export default sendNotificationEmail
