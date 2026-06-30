import type { HttpContext } from '@adonisjs/core/http'
import Recommendation from '#models/recommendation'
import { recommendationValidator } from '#validators/recommendation_validator'
import { recommendationRateLimiter } from '#services/rate_limiter'

export default class RecommendationsController {
  /**
   * GET /recommendations — public list of approved recommendations.
   * Never exposes the `contact` field (admin-only).
   */
  async index({ response }: HttpContext) {
    const recommendations = await Recommendation.query()
      .where('approved', true)
      .orderBy('createdAt', 'desc')

    return response.ok({
      recommendations: recommendations.map((r) => ({
        id: r.id,
        name: r.name,
        content: r.content,
        createdAt: r.createdAt,
      })),
    })
  }

  /**
   * POST /recommendations — public submission, stored unapproved until the
   * site owner validates it from the admin panel.
   */
  async store({ request, response }: HttpContext) {
    const ip = request.ip() ?? 'unknown'
    if (!recommendationRateLimiter.allow(ip)) {
      return response.tooManyRequests({ ok: false, error: 'rate_limited' })
    }

    const { name, content, contact, website } = await request.validateUsing(recommendationValidator)

    // Honeypot: bots fill `website`. Pretend success, persist nothing.
    if (website) {
      return response.ok({ ok: true })
    }

    await Recommendation.create({
      name,
      content,
      contact,
      approved: false,
      ipAddress: request.ip() ?? null,
    })

    return response.ok({ ok: true })
  }
}
