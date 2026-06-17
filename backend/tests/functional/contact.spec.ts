import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ContactMessage from '#models/contact_message'
import { contactRateLimiter } from '#services/rate_limiter'

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Bonjour, votre travail sur Yui est impressionnant.',
}

test.group('POST /contact', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => contactRateLimiter.reset())

  test('persists a contact message', async ({ client, assert }) => {
    const res = await client.post('/contact').json(valid)
    res.assertStatus(200)
    assert.deepInclude(res.body(), { ok: true })

    const messages = await ContactMessage.all()
    assert.lengthOf(messages, 1)
    assert.include(messages[0].serialize(), {
      name: valid.name,
      email: valid.email,
      message: valid.message,
    })
    assert.isNull(messages[0].readAt)
  })

  test('rejects an invalid payload with 422', async ({ client, assert }) => {
    const res = await client.post('/contact').json({ name: 'x', email: 'nope', message: 'short' })
    res.assertStatus(422)
    assert.lengthOf(await ContactMessage.all(), 0)
  })

  test('silently accepts but persists nothing for honeypot submissions', async ({
    client,
    assert,
  }) => {
    const res = await client.post('/contact').json({ ...valid, website: 'http://spam.example' })
    res.assertStatus(200)
    assert.deepInclude(res.body(), { ok: true })
    assert.lengthOf(await ContactMessage.all(), 0)
  })

  test('rate-limits after 3 requests from the same ip', async ({ client }) => {
    const ip = '203.0.113.7'
    for (let i = 0; i < 3; i++) {
      await client.post('/contact').header('x-forwarded-for', ip).json(valid)
    }
    const res = await client.post('/contact').header('x-forwarded-for', ip).json(valid)
    res.assertStatus(429)
  })
})
