import { test } from '@japa/runner'

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Bonjour, votre travail sur Yui est impressionnant.',
}

test.group('POST /contact', () => {
  test('returns ok without SMTP creds (graceful dev mode)', async ({ client, assert }) => {
    const res = await client.post('/contact').json(valid)
    res.assertStatus(200)
    assert.deepInclude(res.body(), { ok: true })
  })

  test('rejects an invalid payload with 422', async ({ client }) => {
    const res = await client.post('/contact').json({ name: 'x', email: 'nope', message: 'short' })
    res.assertStatus(422)
  })

  test('silently accepts but ignores honeypot submissions', async ({ client, assert }) => {
    const res = await client.post('/contact').json({ ...valid, website: 'http://spam.example' })
    res.assertStatus(200)
    assert.deepInclude(res.body(), { ok: true })
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
