import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import { contactValidator } from '#validators/contact_validator'
import { contactRateLimiter } from '#services/rate_limiter'
import ContactNotification from '#mails/contact_notification'

export default class ContactController {
  async store({ request, response }: HttpContext) {
    if (!contactRateLimiter.allow(request.ip())) {
      return response.tooManyRequests({ ok: false, error: 'rate_limited' })
    }

    const { name, email, message, website } = await request.validateUsing(contactValidator)

    // Honeypot: bots fill `website`. Pretend success, send nothing.
    if (website) {
      return response.ok({ ok: true })
    }

    const mailTo = env.get('MAIL_TO')
    const smtpHost = env.get('SMTP_HOST')

    // No SMTP creds configured (e.g. dev): log and succeed instead of crashing.
    // To enable real delivery, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
    // and MAIL_TO in backend/.env (see config/mail.ts).
    if (!smtpHost || !mailTo) {
      logger.info({ name, email, message }, 'Contact message received (SMTP not configured)')
      return response.ok({ ok: true })
    }

    await mail.send(new ContactNotification({ name, email, message }, mailTo))
    return response.ok({ ok: true })
  }
}
