import { BaseSeeder } from '@adonisjs/lucid/seeders'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import User from '#models/user'

/**
 * Creates (or updates) the admin account used to sign in at /admin,
 * from ADMIN_EMAIL / ADMIN_PASSWORD. Idempotent — safe to re-run.
 */
export default class extends BaseSeeder {
  async run() {
    const email = env.get('ADMIN_EMAIL')
    const password = env.get('ADMIN_PASSWORD')

    if (!email || !password) {
      logger.warn('Skipping admin seeder: set ADMIN_EMAIL and ADMIN_PASSWORD to create the admin.')
      return
    }

    await User.updateOrCreate({ email }, { email, password, fullName: 'Admin' })
    logger.info({ email }, 'Admin account ready')
  }
}
