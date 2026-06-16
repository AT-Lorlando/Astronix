interface RateLimiterOptions {
  limit: number
  windowMs: number
  now?: () => number
}

/**
 * Minimal in-memory sliding-window rate limiter, keyed by client IP.
 * Single-instance only (fine for a portfolio); state is lost on restart.
 */
export class RateLimiter {
  #hits = new Map<string, number[]>()
  #limit: number
  #windowMs: number
  #now: () => number

  constructor(options: RateLimiterOptions) {
    this.#limit = options.limit
    this.#windowMs = options.windowMs
    this.#now = options.now ?? (() => Date.now())
  }

  allow(key: string): boolean {
    const now = this.#now()
    const cutoff = now - this.#windowMs
    const recent = (this.#hits.get(key) ?? []).filter((t) => t > cutoff)
    if (recent.length >= this.#limit) {
      this.#hits.set(key, recent)
      return false
    }
    recent.push(now)
    this.#hits.set(key, recent)
    return true
  }
}

// Shared singleton for the contact endpoint: 3 requests / minute per IP.
export const contactRateLimiter = new RateLimiter({ limit: 3, windowMs: 60_000 })
