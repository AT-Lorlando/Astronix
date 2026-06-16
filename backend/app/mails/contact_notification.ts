import { BaseMail } from '@adonisjs/mail'

interface ContactPayload {
  name: string
  email: string
  message: string
}

export default class ContactNotification extends BaseMail {
  constructor(
    private payload: ContactPayload,
    private mailTo: string
  ) {
    super()
  }

  prepare() {
    this.message
      .to(this.mailTo)
      .from(this.mailTo)
      .replyTo(this.payload.email, this.payload.name)
      .subject(`[Portfolio] Nouveau message de ${this.payload.name}`)
      .text(
        `Nom: ${this.payload.name}\n` +
          `Email: ${this.payload.email}\n\n` +
          `${this.payload.message}\n`
      )
  }
}
