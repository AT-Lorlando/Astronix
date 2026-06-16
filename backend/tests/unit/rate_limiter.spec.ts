import { test } from '@japa/runner'
import { RateLimiter } from '#services/rate_limiter'

test.group('RateLimiter', () => {
  test('allows up to the limit then blocks', ({ assert }) => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 60_000 })
    assert.isTrue(limiter.allow('1.1.1.1'))
    assert.isTrue(limiter.allow('1.1.1.1'))
    assert.isTrue(limiter.allow('1.1.1.1'))
    assert.isFalse(limiter.allow('1.1.1.1'))
  })

  test('tracks ips independently', ({ assert }) => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 60_000 })
    assert.isTrue(limiter.allow('1.1.1.1'))
    assert.isFalse(limiter.allow('1.1.1.1'))
    assert.isTrue(limiter.allow('2.2.2.2'))
  })

  test('frees a slot once the window passes', ({ assert }) => {
    let now = 1_000_000
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000, now: () => now })
    assert.isTrue(limiter.allow('1.1.1.1'))
    assert.isFalse(limiter.allow('1.1.1.1'))
    now += 1001
    assert.isTrue(limiter.allow('1.1.1.1'))
  })
})
