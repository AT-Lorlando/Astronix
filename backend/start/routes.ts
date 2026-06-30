/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

const AuthController = () => import('#controllers/auth_controller')
const ContactController = () => import('#controllers/contact_controller')
const RecommendationsController = () => import('#controllers/recommendations_controller')
const AdminSessionController = () => import('#controllers/admin/session_controller')
const AdminMessagesController = () => import('#controllers/admin/messages_controller')
const AdminRecommendationsController = () => import('#controllers/admin/recommendations_controller')

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

/*
| JSON API. `forceJson` makes validator/auth errors respond as JSON instead
| of the framework's HTML negotiation — kept off the admin panel below.
*/
router
  .group(() => {
    router.post('/signup', [AuthController, 'signup']).use(middleware.guest())
    router.post('/login', [AuthController, 'login']).use(middleware.guest())
    router.post('/logout', [AuthController, 'logout']).use(middleware.auth())
    router.get('/me', [AuthController, 'me']).use(middleware.auth())

    // Public contact form (no auth)
    router.post('/contact', [ContactController, 'store'])

    // Public recommendations: list approved ones, submit a new one (no auth)
    router.get('/recommendations', [RecommendationsController, 'index'])
    router.post('/recommendations', [RecommendationsController, 'store'])
  })
  .use(middleware.forceJson())

/*
| Server-rendered admin panel (Edge views). Lives outside the `forceJson`
| group so it can render HTML and redirect on auth failure.
*/
router
  .group(() => {
    router.get('/login', [AdminSessionController, 'showLogin'])
    router.post('/login', [AdminSessionController, 'login'])

    router
      .group(() => {
        router.post('/logout', [AdminSessionController, 'logout'])
        router.get('/', [AdminMessagesController, 'index'])
        router.get('/messages/:id', [AdminMessagesController, 'show'])
        router.post('/messages/:id/read', [AdminMessagesController, 'markRead'])
        router.post('/messages/:id/unread', [AdminMessagesController, 'markUnread'])
        router.post('/messages/:id/delete', [AdminMessagesController, 'destroy'])

        router.get('/recommendations', [AdminRecommendationsController, 'index'])
        router.get('/recommendations/:id/edit', [AdminRecommendationsController, 'edit'])
        router.post('/recommendations/:id/update', [AdminRecommendationsController, 'update'])
        router.post('/recommendations/:id/approve', [AdminRecommendationsController, 'approve'])
        router.post('/recommendations/:id/unapprove', [AdminRecommendationsController, 'unapprove'])
        router.post('/recommendations/:id/delete', [AdminRecommendationsController, 'destroy'])
      })
      .use(middleware.auth())
  })
  .prefix('/admin')
