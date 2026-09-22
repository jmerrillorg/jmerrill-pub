import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const runtime = readFileSync(new URL('lib/server/stripe/publishing-payment-runtime.ts', root), 'utf8')
const adapter = readFileSync(new URL('lib/server/stripe/publishing-payment-adapters.ts', root), 'utf8')
const service = readFileSync(new URL('lib/server/stripe/publishing-additional-payment.ts', root), 'utf8')
const route = readFileSync(new URL('app/api/author/stripe/payment/additional/route.ts', root), 'utf8')
const portal = readFileSync(new URL('app/author/_components/AuthorPortalWorkspace.tsx', root), 'utf8')

test('additional payment capability has a separate fail-closed production gate', () => {
  assert.match(runtime, /JMP_CUSTOMER_INITIATED_ADDITIONAL_PAYMENT_ENABLED/)
  assert.doesNotMatch(runtime.match(/productionAdditionalPaymentGateReadback[\s\S]*?\n}/)?.[0] || '', /QBO|RECURRING/)
})

test('checkout carries deterministic author, title, engagement, obligation, request, and idempotency metadata', () => {
  for (const key of [
    'jm1_author_id', 'jm1_title_id', 'jm1_engagement_id', 'jm1_obligation_id',
    'jm1_payment_type', 'jm1_request_id', 'jm1_idempotency_key', 'jm1_balance_version',
  ]) assert.match(adapter, new RegExp(key))
  assert.match(adapter, /ADDITIONAL_PAYMENT/)
})

test('server resolves author authority and caps checkout at current balance', () => {
  assert.match(route, /context\.projects\.some/)
  assert.match(service, /PAYMENT_EXCEEDS_REMAINING_BALANCE/)
  assert.match(service, /state\.remainingBalanceCents/)
  assert.match(service, /STRIPE_CUSTOMER_BINDING_INVALID/)
  assert.match(service, /PAYMENT_OPERATION_ID_INVALID/)
})

test('author portal exposes customer-selectable additional payment control', () => {
  assert.match(portal, /Make an additional payment/)
  assert.match(portal, /maximumAmountCents/)
  assert.match(portal, /Continue to secure payment/)
})

test('QBO is queued rather than blocking an accepted additional payment', () => {
  assert.match(runtime, /PENDING_RECONCILIATION/)
  assert.match(service, /PENDING_RECONCILIATION/)
})

test('payment request evidence excludes the ephemeral Checkout URL', () => {
  assert.match(adapter, /ADDITIONAL_PAYMENT_REQUEST/)
  assert.match(adapter, /recordAdditionalPaymentRequest/)
  const method = adapter.match(/async recordAdditionalPaymentRequest[\s\S]*?\n  }/)?.[0] || ''
  assert.match(method, /stripeCheckoutSessionId/)
  assert.doesNotMatch(method, /checkoutUrl/)
})

test('full payoff suppresses future obligations and stops the existing Stripe schedule', () => {
  assert.match(adapter, /jmpv2_obligationstatus: 'CANCELLED'/)
  assert.match(adapter, /subscription_schedules\/\$\{encodeURIComponent\(input\.paymentScheduleId\)\}\/cancel/)
  assert.match(runtime, /PAYOFF_SCHEDULE_STOP_FAILED/)
})
