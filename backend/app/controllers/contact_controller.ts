import type { HttpContext } from '@adonisjs/core/http'
import ContactMessage from '#models/contact_message'
import { contactValidator } from '#validators/contact_validator'
import { contactRateLimiter } from '#services/rate_limiter'

export default class ContactController {
  async store({ request, response }: HttpContext) {
    const ip = request.ip() ?? 'unknown'
    if (!contactRateLimiter.allow(ip)) {
      return response.tooManyRequests({ ok: false, error: 'rate_limited' })
    }

    const { name, email, message, website } = await request.validateUsing(contactValidator)

    // Honeypot: bots fill `website`. Pretend success, persist nothing.
    if (website) {
      return response.ok({ ok: true })
    }

    await ContactMessage.create({ name, email, message, ipAddress: request.ip() ?? null })

    return response.ok({ ok: true })
  }
}
