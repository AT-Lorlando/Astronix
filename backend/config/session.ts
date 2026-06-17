import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, stores } from '@adonisjs/session'

const sessionConfig = defineConfig({
  enabled: true,
  cookieName: 'adonis-session',

  /**
   * When set to true, the session id cookie will be deleted
   * once the user closes the browser.
   */
  clearWithBrowser: false,

  /**
   * Define how long to keep the session data alive without
   * any activity.
   */
  age: '2h',

  /**
   * Configuration for session cookie and the
   * cookie store
   */
  cookie: {
    path: '/',
    httpOnly: true,
    /**
     * A `Secure` cookie is never sent by the browser over plain HTTP, which
     * breaks the admin login when the app is served over http:// (e.g. on a
     * LAN). Defaults to false so it works out of the box; set
     * SESSION_COOKIE_SECURE=true only when serving over HTTPS.
     */
    secure: env.get('SESSION_COOKIE_SECURE', false),
    sameSite: 'lax',
  },

  /**
   * The store to use. Tests use the in-memory store so the Japa session
   * client (`client.loginAs(user)`) and the app share the same session data.
   */
  store: app.inTest ? 'memory' : env.get('SESSION_DRIVER'),

  /**
   * List of configured stores. Refer documentation to see
   * list of available stores and their config.
   */
  stores: {
    cookie: stores.cookie(),
  },
})

export default sessionConfig
