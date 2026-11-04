import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'

type Email = { to: string; subject: string; html: string; text: string }

// Two ways to send, picked by which env vars are set:
// - Gmail: GMAIL_USER + GMAIL_APP_PASSWORD (an app password, not the account password). No domain needed.
// - Resend: RESEND_API_KEY + EMAIL_FROM. Needs a verified domain to mail anyone.
// With neither (local development) nothing is sent: the last link per address is kept
// here so the sign-up screen can show it for testing.
const devOutbox = new Map<string, string>()

const gmailUser = () => process.env.GMAIL_USER?.trim()
const gmailPassword = () => process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '')

export function canSendEmail() {
  return !!process.env.RESEND_API_KEY || !!(gmailUser() && gmailPassword())
}

export function devVerificationLink(email: string) {
  if (canSendEmail() || process.env.NODE_ENV === 'production') return undefined
  return devOutbox.get(email.toLowerCase())
}

let gmail: Transporter | null = null

async function sendWithGmail(email: Email) {
  gmail ??= nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser(), pass: gmailPassword() } })
  await gmail.sendMail({
    from: process.env.EMAIL_FROM ?? `BoostSport <${gmailUser()}>`,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}

async function sendWithResend(email: Email) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'BoostSport <onboarding@resend.dev>',
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

// Better Auth sends the verification email in a background task and only logs failures,
// so sign-up would look successful. The last failure per address is kept here for the
// caller to check within the same request.
const failures = new Map<string, string>()

export function takeEmailFailure(email: string) {
  const key = email.toLowerCase()
  const reason = failures.get(key)
  failures.delete(key)
  return reason
}

export function emailProvider() {
  if (process.env.RESEND_API_KEY) return 'Resend'
  if (gmailUser() && gmailPassword()) return `Gmail (${gmailUser()})`
  return null
}

export async function sendEmail(email: Email, devLink?: string) {
  failures.delete(email.to.toLowerCase())
  if (!canSendEmail()) {
    if (process.env.NODE_ENV === 'production') {
      failures.set(email.to.toLowerCase(), 'No hay datos de envío configurados (faltan GMAIL_USER y GMAIL_APP_PASSWORD, o RESEND_API_KEY).')
      throw new Error('No email provider configured (GMAIL_* or RESEND_API_KEY)')
    }
    if (devLink) devOutbox.set(email.to.toLowerCase(), devLink)
    console.info(`[email] not sent (no provider configured) → ${email.to}: ${email.subject}${devLink ? `\n${devLink}` : ''}`)
    return
  }

  try {
    await (process.env.RESEND_API_KEY ? sendWithResend(email) : sendWithGmail(email))
  } catch (error) {
    console.error('[email] sending failed', error)
    failures.set(email.to.toLowerCase(), error instanceof Error ? error.message : String(error))
    throw new Error('No pudimos enviar el mail.')
  }
}
