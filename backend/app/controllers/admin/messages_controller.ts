import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import ContactMessage from '#models/contact_message'

export default class AdminMessagesController {
  /**
   * GET /admin — list messages, newest first.
   */
  async index({ view }: HttpContext) {
    const messages = await ContactMessage.query().orderBy('createdAt', 'desc')
    const unreadCount = messages.filter((m) => m.readAt === null).length
    return view.render('admin/messages/index', { messages, unreadCount })
  }

  /**
   * GET /admin/messages/:id — message detail.
   */
  async show({ params, view }: HttpContext) {
    const message = await ContactMessage.findOrFail(params.id)
    return view.render('admin/messages/show', { message })
  }

  /**
   * POST /admin/messages/:id/read — mark as read.
   */
  async markRead({ params, response }: HttpContext) {
    const message = await ContactMessage.findOrFail(params.id)
    message.readAt = DateTime.now()
    await message.save()
    return response.redirect(`/admin/messages/${message.id}`)
  }

  /**
   * POST /admin/messages/:id/unread — mark as unread.
   */
  async markUnread({ params, response }: HttpContext) {
    const message = await ContactMessage.findOrFail(params.id)
    message.readAt = null
    await message.save()
    return response.redirect(`/admin/messages/${message.id}`)
  }

  /**
   * POST /admin/messages/:id/delete — delete the message.
   */
  async destroy({ params, response }: HttpContext) {
    const message = await ContactMessage.findOrFail(params.id)
    await message.delete()
    return response.redirect('/admin')
  }
}
