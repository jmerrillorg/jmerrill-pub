type RateLimitEntry = {
  count: number
  resetAt: number
}

const hourWindow = new Map<string, RateLimitEntry>()
const dayWindow = new Map<string, RateLimitEntry>()

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export type RateLimitResult = {
  allowed: boolean
  limit: 'hour' | 'day' | null
  retryAfterSeconds?: number
}

export function isRateLimitEnabled() {
  return process.env.INTAKE_RATE_LIMIT_ENABLED !== 'false'
}

export function getClientIp(headers: Headers) {
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

export function checkIntakeRateLimit(ip: string, now = Date.now()): RateLimitResult {
  if (!isRateLimitEnabled()) {
    return { allowed: true, limit: null }
  }

  const hour = incrementWindow(hourWindow, `hour:${ip}`, HOUR_MS, now)
  if (hour.count > 5) {
    return {
      allowed: false,
      limit: 'hour',
      retryAfterSeconds: Math.ceil((hour.resetAt - now) / 1000),
    }
  }

  const day = incrementWindow(dayWindow, `day:${ip}`, DAY_MS, now)
  if (day.count > 20) {
    return {
      allowed: false,
      limit: 'day',
      retryAfterSeconds: Math.ceil((day.resetAt - now) / 1000),
    }
  }

  return { allowed: true, limit: null }
}

function incrementWindow(store: Map<string, RateLimitEntry>, key: string, ttlMs: number, now: number) {
  const current = store.get(key)
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + ttlMs }
    store.set(key, next)
    return next
  }

  current.count += 1
  store.set(key, current)
  return current
}
