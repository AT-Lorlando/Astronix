import logger from '@adonisjs/core/services/logger'
import nodemailer, { type Transporter } from 'nodemailer'
import env from '#start/env'

/**
 * Tells the site owner that something arrived (contact message, recommendation).
 * Two independent channels, each enabled only when its env vars are set:
 *  - push on the phone through Yui (`POST /notify`, see Yui's docs/notify-api.md);
 *  - an e-mail sent to the owner's own mailbox over SMTP.
 * Fire-and-forget: never throws and never delays the HTTP response.
 */

export interface OwnerNotice {
  title: string
  text: string
  /** Visitor's address: answering the e-mail replies to them directly. */
  replyTo?: string
}

export function notifyOwner(notice: OwnerNotice): void {
  pushViaYui(notice).catch((error) => logger.warn({ err: error }, 'yui notify failed'))
  sendMail(notice).catch((error) => logger.warn({ err: error }, 'owner mail failed'))
}

/* Push via Yui */

const PUSH_TEXT_MAX = 500

async function pushViaYui({ title, text }: OwnerNotice) {
  const url = env.get('YUI_URL')
  const bearer = env.get('YUI_BEARER')
  if (!url || !bearer) return
  const res = await fetch(`${url.replace(/\/$/, '')}/notify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'Astronix',
      title: title.slice(0, 80),
      text: text.length > PUSH_TEXT_MAX ? `${text.slice(0, PUSH_TEXT_MAX - 1)}…` : text,
    }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) logger.warn({ status: res.status }, 'yui notify rejected')
}

/* E-mail to self */

let transporter: Transporter | null = null

function mailer(): Transporter | null {
  const host = env.get('SMTP_HOST')
  const user = env.get('SMTP_USER')
  const pass = env.get('SMTP_PASSWORD')
  if (!host || !user || !pass) return null
  const port = env.get('SMTP_PORT') ?? 465
  transporter ??= nodemailer.createTransport({
    host,
    port,
    secure: env.get('SMTP_SECURE') ?? port === 465, // 465 = TLS direct ; 587 = STARTTLS
    auth: { user, pass },
  })
  return transporter
}

async function sendMail({ title, text, replyTo }: OwnerNotice) {
  const transport = mailer()
  if (!transport) return
  const from = env.get('SMTP_USER')!
  await transport.sendMail({
    from: `Astronix <${from}>`,
    to: env.get('MAIL_TO') ?? from,
    replyTo,
    subject: `[Astronix] ${title}`,
    text,
  })
}
