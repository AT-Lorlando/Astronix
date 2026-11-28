import type { H3Event } from 'h3'
import pino from 'pino'

// JSON Lines on stdout, no transport (worker threads do not bundle well in .output/server).
export const logger = pino({
  base: { app: 'astronix', service: 'frontend', env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev' },
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['password', '*.password', 'token', '*.token', 'authorization', '*.authorization'],
})

/** Request logger: carries request_id (X-Request-Id from nginx, else generated). */
export function useRequestLogger(event: H3Event) {
  return (event.context.log ??= logger.child({
      request_id: event.context.requestId ?? getRequestHeader(event, 'x-request-id'),
    }))
}
