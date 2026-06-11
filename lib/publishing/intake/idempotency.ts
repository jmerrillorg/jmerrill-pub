type IdempotencyEntry = {
  reference: string
  expiresAt: number
}

const store = new Map<string, IdempotencyEntry>()
const WINDOW_MS = 24 * 60 * 60 * 1000

export function getIdempotencyReplay(idempotencyKey: string, now = Date.now()) {
  pruneExpired(now)
  const entry = store.get(idempotencyKey)
  if (!entry || entry.expiresAt <= now) return null
  return entry
}

export function rememberIdempotencyKey(idempotencyKey: string, reference: string, now = Date.now()) {
  pruneExpired(now)
  store.set(idempotencyKey, {
    reference,
    expiresAt: now + WINDOW_MS,
  })
}

function pruneExpired(now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(key)
  }
}
