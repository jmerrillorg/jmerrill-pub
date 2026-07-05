import { createHmac, timingSafeEqual } from 'crypto'

import {
  COMMISSIONING_AMOUNT_CENTS,
  COMMISSIONING_PACKAGE_CODE,
  COMMISSIONING_REFERENCE,
  COMMISSIONING_STANDARD_AMOUNT_CENTS,
  COMMISSIONING_TITLE,
} from './author-workspace-stripe'

export type StripeWebhookVerification =
  | { ok: true; event: StripeWebhookEvent }
  | { ok: false; status: number; code: string }

export type StripeWebhookEvent = {
  id?: string
  type?: string
  created?: number
  data?: {
    object?: StripeWebhookObject
  }
}

type StripeWebhookObject = {
  id?: string
  object?: string
  amount?: number
  amount_received?: number
  amount_total?: number
  currency?: string
  metadata?: Record<string, string>
  payment_intent?: string
  payment_status?: string
  status?: string
}

const WEBHOOK_TOLERANCE_SECONDS = 300

export function verifyStripeWebhook(rawBody: string, signatureHeader: string | null): StripeWebhookVerification {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || ''
  if (!secret) return { ok: false, status: 500, code: 'stripe_webhook_secret_missing' }
  if (!signatureHeader) return { ok: false, status: 400, code: 'stripe_signature_missing' }

  const parsedHeader = parseStripeSignatureHeader(signatureHeader)
  if (!parsedHeader.timestamp || parsedHeader.signatures.length === 0) {
    return { ok: false, status: 400, code: 'stripe_signature_malformed' }
  }

  const timestampAgeSeconds = Math.abs(Date.now() / 1000 - Number(parsedHeader.timestamp))
  if (!Number.isFinite(timestampAgeSeconds) || timestampAgeSeconds > WEBHOOK_TOLERANCE_SECONDS) {
    return { ok: false, status: 400, code: 'stripe_signature_timestamp_out_of_range' }
  }

  const expected = createHmac('sha256', secret)
    .update(`${parsedHeader.timestamp}.${rawBody}`)
    .digest('hex')

  const valid = parsedHeader.signatures.some((candidate) => compareSignature(candidate, expected))
  if (!valid) return { ok: false, status: 400, code: 'stripe_signature_invalid' }

  try {
    return { ok: true, event: JSON.parse(rawBody) }
  } catch {
    return { ok: false, status: 400, code: 'stripe_payload_invalid_json' }
  }
}

export function classifyCommissioningWebhookEvent(event: StripeWebhookEvent) {
  const object = event.data?.object || {}
  const metadata = object.metadata || {}
  const reference = metadata.jm1_reference || ''
  const commissioningOverride = String(metadata.jm1_commissioning_override || '').toLowerCase() === 'true'
  const packageCode = metadata.jm1_package_code || ''
  const eventType = event.type || ''

  if (!['checkout.session.completed', 'payment_intent.succeeded'].includes(eventType)) {
    return { process: false, code: 'event_type_ignored' }
  }

  if (reference !== COMMISSIONING_REFERENCE || !commissioningOverride || packageCode !== COMMISSIONING_PACKAGE_CODE) {
    return { process: false, code: 'event_not_commissioning_title' }
  }

  const amount = getEventAmountCents(eventType, object)
  const currency = String(object.currency || '').toLowerCase()
  const paymentComplete =
    eventType === 'checkout.session.completed'
      ? object.payment_status === 'paid' || object.status === 'complete'
      : object.status === 'succeeded'

  if (amount !== COMMISSIONING_AMOUNT_CENTS || currency !== 'usd' || !paymentComplete) {
    return { process: false, code: 'commissioning_payment_not_confirmed' }
  }

  return {
    process: true,
    code: 'commissioning_payment_confirmed',
    safeEvent: {
      eventId: event.id || null,
      eventType,
      objectId: object.id || null,
      objectType: object.object || null,
      reference,
      title: COMMISSIONING_TITLE,
      packageCode,
      standardAmountCents: COMMISSIONING_STANDARD_AMOUNT_CENTS,
      commissioningAmountCents: COMMISSIONING_AMOUNT_CENTS,
      currency,
    },
  }
}

function getEventAmountCents(eventType: string, object: StripeWebhookObject) {
  if (eventType === 'checkout.session.completed') return object.amount_total
  return object.amount_received || object.amount
}

function parseStripeSignatureHeader(header: string) {
  const parts = header.split(',').map((part) => part.trim())
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2) || ''
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))
    .filter(Boolean)
  return { timestamp, signatures }
}

function compareSignature(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(actualBuffer, expectedBuffer)
}
