import { NextRequest, NextResponse } from 'next/server'
import { enqueuePublishingIntakeDeadLetter } from '@/lib/publishing/intake/deadLetter'
import { writePublishingIntakeWithRetry } from '@/lib/publishing/intake/dataverse'
import { getIdempotencyReplay, rememberIdempotencyKey } from '@/lib/publishing/intake/idempotency'
import { checkIntakeRateLimit, getClientIp } from '@/lib/publishing/intake/rateLimit'
import { generateIntakeReference } from '@/lib/publishing/intake/reference'
import {
  createNormalizedPublishingIntake,
  validatePublishingIntakeBody,
  type IntakeValidationError,
} from '@/lib/publishing/intake/schema'
import { maskEmail, maskName } from '@/lib/publishing/intake/sanitize'
import { verifyTurnstileToken } from '@/lib/publishing/intake/turnstile'

export const dynamic = 'force-dynamic'

type IntakeResponseBody =
  | { status: 'received'; reference: string }
  | { status: 'invalid'; errors: IntakeValidationError[] }
  | { status: 'duplicate' }
  | { status: 'rate_limited' }
  | { status: 'error' }

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  const originResult = validateOrigin(origin)

  if (!originResult.allowed) {
    return json({ status: 'error' }, 403)
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(originResult.origin),
  })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const originResult = validateOrigin(origin)

  if (!originResult.allowed) {
    return json({ status: 'error' }, 403)
  }

  let body: unknown

  try {
    body = await req.json()
  } catch {
    return json(
      {
        status: 'invalid',
        errors: [{ field: 'request', message: 'Invalid JSON request body.' }],
      },
      400,
      originResult.origin,
    )
  }

  const token = extractTurnstileToken(body)
  const ip = getClientIp(req.headers)
  const turnstile = await verifyTurnstileToken(token, ip)

  if (!turnstile.ok) {
    console.warn('Publishing intake blocked by Turnstile.', {
      reason: turnstile.reason,
      ip: ip === 'unknown' ? 'unknown' : '[masked-ip]',
    })

    return json(
      {
        status: 'invalid',
        errors: [{ field: 'turnstileToken', message: 'Please complete the verification challenge.' }],
      },
      400,
      originResult.origin,
    )
  }

  const rateLimit = checkIntakeRateLimit(ip)
  if (!rateLimit.allowed) {
    return json(
      { status: 'rate_limited' },
      429,
      originResult.origin,
      rateLimit.retryAfterSeconds ? { 'Retry-After': String(rateLimit.retryAfterSeconds) } : undefined,
    )
  }

  const validation = validatePublishingIntakeBody(body)
  if (!validation.ok) {
    return json({ status: 'invalid', errors: validation.errors }, 400, originResult.origin)
  }

  const replay = getIdempotencyReplay(validation.data.idempotencyKey)
  if (replay) {
    return json({ status: 'duplicate' }, 409, originResult.origin)
  }

  const reference = generateIntakeReference()
  const intake = createNormalizedPublishingIntake(validation.data, reference)

  const dataverse = await writePublishingIntakeWithRetry(intake)
  if (dataverse.status === 'success' || dataverse.status === 'skipped') {
    rememberIdempotencyKey(intake.idempotencyKey, reference)
    return json({ status: 'received', reference }, 201, originResult.origin)
  }

  const deadLetter = await enqueuePublishingIntakeDeadLetter(intake, dataverse.reason)
  if (deadLetter.status === 'enqueued') {
    rememberIdempotencyKey(intake.idempotencyKey, reference)
    console.error('Publishing intake Dataverse write failed; payload dead-lettered.', {
      reason: dataverse.reason,
      reference,
      firstName: maskName(intake.firstName),
      email: maskEmail(intake.email),
    })

    return json({ status: 'received', reference }, 201, originResult.origin)
  }

  console.error('Publishing intake failed without Dataverse write or dead-letter.', {
    dataverseReason: dataverse.reason,
    deadLetterStatus: deadLetter.status,
    reference,
    firstName: maskName(intake.firstName),
    email: maskEmail(intake.email),
  })

  return json({ status: 'error' }, 500, originResult.origin)
}

function json(
  body: IntakeResponseBody,
  status: number,
  origin?: string | null,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...corsHeaders(origin),
      ...extraHeaders,
    },
  })
}

function extractTurnstileToken(body: unknown) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return ''
  const value = (body as Record<string, unknown>).turnstileToken
  return typeof value === 'string' ? value : ''
}

function validateOrigin(origin: string | null): { allowed: true; origin: string | null } | { allowed: false } {
  if (!origin && process.env.NODE_ENV !== 'production') {
    return { allowed: true, origin: null }
  }

  if (!origin) return { allowed: false }

  const allowedOrigins = getAllowedOrigins()
  return allowedOrigins.has(origin)
    ? { allowed: true, origin }
    : { allowed: false }
}

function getAllowedOrigins() {
  const configured = process.env.INTAKE_ALLOWED_ORIGINS
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const defaults = [
    'https://jmerrill.pub',
    'https://www.jmerrill.pub',
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3000']
      : []),
  ]

  return new Set(configured?.length ? configured : defaults)
}

function corsHeaders(origin?: string | null) {
  const headers: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}
