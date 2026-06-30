import vine from '@vinejs/vine'

/**
 * `website` is a honeypot: real users never see/fill it. Any value means spam.
 * `contact` is free text (email, LinkedIn, phone…).
 */
export const recommendationValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    content: vine.string().trim().minLength(10).maxLength(6000),
    contact: vine.string().trim().minLength(2).maxLength(200),
    website: vine.string().optional(),
  })
)

/**
 * Admin edit form (no honeypot; `createdAt` is an editable ISO/`datetime-local`
 * string parsed with Luxon in the controller).
 */
export const recommendationUpdateValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    content: vine.string().trim().minLength(10).maxLength(6000),
    contact: vine.string().trim().minLength(2).maxLength(200),
    createdAt: vine.string().trim(),
  })
)
