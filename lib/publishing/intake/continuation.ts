import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export type IntakeContinuationClaims = {
  intakeId: string
  reference: string
  exp: number
  nonce: string
}

const TOKEN_VERSION = 'v1'
const DEFAULT_TTL_SECONDS = 14 * 24 * 60 * 60

export function createIntakeContinuationToken(input: {
  intakeId: string
  reference: string
  ttlSeconds?: number
  now?: number
}) {
  if (!getSecret()) return ''
  const now = input.now || Math.floor(Date.now() / 1000)
  const claims: IntakeContinuationClaims = {
    intakeId: input.intakeId,
    reference: input.reference,
    exp: now + (input.ttlSeconds || DEFAULT_TTL_SECONDS),
    nonce: randomBytes(16).toString('hex'),
  }
  const payload = base64UrlEncode(JSON.stringify(claims))
  const signature = sign(payload)
  return `${TOKEN_VERSION}.${payload}.${signature}`
}

export function verifyIntakeContinuationToken(token: string, now = Math.floor(Date.now() / 1000)):
  | { ok: true; claims: IntakeContinuationClaims }
  | { ok: false; reason: 'missing_secret' | 'invalid_token' | 'expired' } {
  const secret = getSecret()
  if (!secret) return { ok: false, reason: 'missing_secret' }

  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return { ok: false, reason: 'invalid_token' }

  const [, payload, signature] = parts
  const expected = sign(payload)
  if (!safeEqual(signature, expected)) return { ok: false, reason: 'invalid_token' }

  const claims = parseClaims(payload)
  if (!claims) return { ok: false, reason: 'invalid_token' }
  if (claims.exp <= now) return { ok: false, reason: 'expired' }

  return { ok: true, claims }
}

export function buildContinuationUrl(token: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.JM1_PUBLIC_SITE_URL || 'https://jmerrill.pub').replace(/\/+$/, '')
  return `${baseUrl}/join/continue/${encodeURIComponent(token)}`
}

function sign(payload: string) {
  const secret = getSecret()
  if (!secret) return ''
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function getSecret() {
  return process.env.INTAKE_CONTINUATION_TOKEN_SECRET?.trim() || process.env.AUTHOR_PORTAL_SESSION_SECRET?.trim() || ''
}

function parseClaims(payload: string): IntakeContinuationClaims | null {
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<IntakeContinuationClaims>
    if (
      typeof parsed.intakeId !== 'string' ||
      typeof parsed.reference !== 'string' ||
      typeof parsed.exp !== 'number' ||
      typeof parsed.nonce !== 'string'
    ) return null
    return parsed as IntakeContinuationClaims
  } catch {
    return null
  }
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
