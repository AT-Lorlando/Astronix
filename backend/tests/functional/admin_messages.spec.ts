import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import ContactMessage from '#models/contact_message'

async function makeAdmin() {
  return User.create({ email: 'admin@example.com', password: 'secret123', fullName: 'Admin' })
}

async function makeMessage() {
  return ContactMessage.create({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    message: 'Bonjour, votre travail sur Yui est impressionnant.',
  })
}

test.group('Admin messages', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('redirects to login when unauthenticated', async ({ client }) => {
    const res = await client.get('/admin').redirects(0)
    res.assertStatus(302)
    res.assertHeader('location', '/admin/login')
  })

  test('lists messages when authenticated', async ({ client }) => {
    const admin = await makeAdmin()
    await makeMessage()

    const res = await client.get('/admin').loginAs(admin)
    res.assertStatus(200)
    res.assertTextIncludes('Ada Lovelace')
  })

  test('marks a message as read', async ({ client, assert }) => {
    const admin = await makeAdmin()
    const message = await makeMessage()

    const res = await client.post(`/admin/messages/${message.id}/read`).loginAs(admin).redirects(0)
    res.assertStatus(302)

    await message.refresh()
    assert.isNotNull(message.readAt)
  })

  test('deletes a message', async ({ client, assert }) => {
    const admin = await makeAdmin()
    const message = await makeMessage()

    const res = await client
      .post(`/admin/messages/${message.id}/delete`)
      .loginAs(admin)
      .redirects(0)
    res.assertStatus(302)

    assert.isNull(await ContactMessage.find(message.id))
  })
})
