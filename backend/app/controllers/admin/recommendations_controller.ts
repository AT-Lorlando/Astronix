import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import Recommendation from '#models/recommendation'
import { recommendationUpdateValidator } from '#validators/recommendation_validator'

export default class AdminRecommendationsController {
  /**
   * GET /admin/recommendations — list all, pending first then newest.
   */
  async index({ view }: HttpContext) {
    const recommendations = await Recommendation.query()
      .orderBy('approved', 'asc')
      .orderBy('createdAt', 'desc')
    const pendingCount = recommendations.filter((r) => !r.approved).length
    return view.render('admin/recommendations/index', { recommendations, pendingCount })
  }

  /**
   * GET /admin/recommendations/:id/edit — edit form.
   */
  async edit({ params, view }: HttpContext) {
    const recommendation = await Recommendation.findOrFail(params.id)
    // Value for <input type="datetime-local"> (no timezone suffix).
    const createdAtLocal = recommendation.createdAt.toFormat("yyyy-MM-dd'T'HH:mm")
    return view.render('admin/recommendations/edit', { recommendation, createdAtLocal })
  }

  /**
   * POST /admin/recommendations/:id/update — save edits (name, contact, content, date).
   */
  async update({ params, request, response }: HttpContext) {
    const recommendation = await Recommendation.findOrFail(params.id)
    const { name, content, contact, createdAt } = await request.validateUsing(
      recommendationUpdateValidator
    )

    const parsed = DateTime.fromISO(createdAt)

    recommendation.name = name
    recommendation.content = content
    recommendation.contact = contact
    if (parsed.isValid) {
      recommendation.createdAt = parsed
    }
    await recommendation.save()

    return response.redirect('/admin/recommendations')
  }

  /**
   * POST /admin/recommendations/:id/approve — make it public.
   */
  async approve({ params, response }: HttpContext) {
    const recommendation = await Recommendation.findOrFail(params.id)
    recommendation.approved = true
    await recommendation.save()
    return response.redirect('/admin/recommendations')
  }

  /**
   * POST /admin/recommendations/:id/unapprove — hide it again.
   */
  async unapprove({ params, response }: HttpContext) {
    const recommendation = await Recommendation.findOrFail(params.id)
    recommendation.approved = false
    await recommendation.save()
    return response.redirect('/admin/recommendations')
  }

  /**
   * POST /admin/recommendations/:id/delete — remove it.
   */
  async destroy({ params, response }: HttpContext) {
    const recommendation = await Recommendation.findOrFail(params.id)
    await recommendation.delete()
    return response.redirect('/admin/recommendations')
  }
}
