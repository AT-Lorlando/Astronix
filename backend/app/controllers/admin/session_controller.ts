import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@adonisjs/auth'
import User from '#models/user'

export default class AdminSessionController {
  /**
   * GET /admin/login — show the sign-in form (redirect away if already in).
   */
  async showLogin({ auth, response, view }: HttpContext) {
    if (await auth.use('web').check()) {
      return response.redirect('/admin')
    }
    return view.render('admin/login')
  }

  /**
   * POST /admin/login — verify credentials and open a session.
   */
  async login({ request, auth, response, session, view }: HttpContext) {
    const email = request.input('email', '')
    const password = request.input('password', '')

    try {
      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)
      return response.redirect('/admin')
    } catch (error) {
      if (error instanceof errors.E_INVALID_CREDENTIALS) {
        session.flashAll()
        return view.render('admin/login', { error: 'Identifiants invalides.' })
      }
      throw error
    }
  }

  /**
   * POST /admin/logout — destroy the session.
   */
  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect('/admin/login')
  }
}
