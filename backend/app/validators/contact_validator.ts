import vine from '@vinejs/vine'

/**
 * `website` is a honeypot: real users never see/fill it. Any value means spam.
 */
export const contactValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().trim().email(),
    message: vine.string().trim().minLength(10).maxLength(5000),
    website: vine.string().optional(),
  })
)
