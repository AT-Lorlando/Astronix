import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Recommendation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare content: string

  /**
   * How to reach the author (email, LinkedIn, phone…). Admin-only: never
   * exposed through the public listing.
   */
  @column()
  declare contact: string

  /**
   * `false` until the site owner approves it from the admin panel. Only
   * approved recommendations show up publicly.
   */
  @column()
  declare approved: boolean

  @column()
  declare ipAddress: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
