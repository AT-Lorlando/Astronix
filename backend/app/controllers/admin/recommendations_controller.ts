import type { HttpContext } from '@adonisjs/core/http'
import Recommendation from '#models/recommendation'

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
