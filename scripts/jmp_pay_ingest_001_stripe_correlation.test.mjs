import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHmac } from 'node:crypto'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const {
  canonicalInitialPaymentEffectKey,
  extractStripePaymentCorrelation,
  selectOpportunityCorrelation,
  stripePaymentBindingName,
} = jiti('../lib/server/stripe/publishing-payment-correlation.ts')
const { verifyStripeWebhook } = jiti('../lib/server/stripe/author-workspace-webhook.ts')

const OPPORTUNITY_A = '455daa4a-629f-f111-b8dc-6045bdd69678'
const OPPORTUNITY_B = '131da28b-919c-f111-b8dc-6045bdd69435'
const webhookSource = fs.readFileSync('app/api/author/stripe/webhook/route.ts', 'utf8')
const recoverySource = fs.readFileSync('app/api/author/stripe/payment/recover/route.ts', 'utf8')
const consumerSource = fs.readFileSync('lib/server/stripe/publishing-payment-event.ts', 'utf8')

test('allow-listed Stripe metadata resolves a governed Opportunity identity', () => {
  const correlation = extractStripePaymentCorrelation({
    jm1_opportunity_id: OPPORTUNITY_A.toUpperCase(),
    author_email: 'must-not-be-used@example.com',
    title: 'Wrong title must not be used',
  })
  assert.equal(correlation.opportunityId, OPPORTUNITY_A)
  assert.equal(correlation.invalidMetadataKeys.length, 0)
  assert.equal('author_email' in correlation, false)
  assert.equal('title' in correlation, false)
})

test('invalid or conflicting metadata identifiers fail closed', () => {
  const invalid = extractStripePaymentCorrelation({ jm1_opportunity_id: 'not-a-guid' })
  assert.deepEqual(invalid.invalidMetadataKeys, ['jm1_opportunity_id'])

  const conflictingTitle = extractStripePaymentCorrelation({
    jm1_title_id: OPPORTUNITY_A,
    jm1_work_id: OPPORTUNITY_B,
  })
  assert.deepEqual(conflictingTitle.invalidMetadataKeys, ['jm1_work_id'])
})

test('one durable candidate correlates and duplicates collapse', () => {
  const selection = selectOpportunityCorrelation({
    candidates: [
      { jm1_sourcerecordid: OPPORTUNITY_A },
      { jm1_sourcerecordid: OPPORTUNITY_A.toUpperCase() },
    ],
  })
  assert.equal(selection.ok, true)
  assert.equal(selection.opportunityId, OPPORTUNITY_A)
  assert.equal(selection.authority, 'DURABLE_EXECUTION_LOG_BINDING')
})

test('ambiguous and missing correlation evidence fail closed', () => {
  const ambiguous = selectOpportunityCorrelation({
    candidates: [
      { jm1_sourcerecordid: OPPORTUNITY_A },
      { jm1_sourcerecordid: OPPORTUNITY_B },
    ],
  })
  assert.equal(ambiguous.ok, false)
  assert.equal(ambiguous.reason, 'PAYMENT_OPPORTUNITY_CORRELATION_AMBIGUOUS')

  const missing = selectOpportunityCorrelation({ candidates: [] })
  assert.equal(missing.ok, false)
  assert.equal(missing.reason, 'PAYMENT_OPPORTUNITY_CORRELATION_NOT_FOUND')
})

test('wrong title and author text cannot become a business candidate', () => {
  const selection = selectOpportunityCorrelation({
    candidates: [
      { jm1_sourcerecordid: 'Wrong Title' },
      { jm1_sourcerecordid: 'wrong-author@example.com' },
    ],
  })
  assert.equal(selection.ok, false)
  assert.equal(selection.reason, 'PAYMENT_OPPORTUNITY_CORRELATION_NOT_FOUND')
})

test('direct identity cannot override a conflicting durable binding', () => {
  const conflict = selectOpportunityCorrelation({
    directOpportunityId: OPPORTUNITY_A,
    candidates: [{ jm1_sourcerecordid: OPPORTUNITY_B }],
  })
  assert.equal(conflict.ok, false)
  assert.equal(conflict.reason, 'PAYMENT_OPPORTUNITY_CORRELATION_CONFLICT')
})

test('commercial idempotency is stable across event order and Stripe object variants', () => {
  const invoiceFirst = canonicalInitialPaymentEffectKey(OPPORTUNITY_A)
  const paymentIntentLater = canonicalInitialPaymentEffectKey(OPPORTUNITY_A.toUpperCase())
  assert.equal(invoiceFirst, paymentIntentLater)
  assert.equal(invoiceFirst, `INITIAL-PAYMENT-CONFIRMED-${OPPORTUNITY_A}-INITIAL`)
})

test('provider identifiers produce durable non-reversible binding names', () => {
  const paymentIntentBinding = stripePaymentBindingName('pi_example_123')
  assert.match(paymentIntentBinding, /^STRIPE-PAYMENT-BINDING-[0-9a-f]{32}$/)
  assert.doesNotMatch(paymentIntentBinding, /pi_example_123/)
  assert.equal(paymentIntentBinding, stripePaymentBindingName('pi_example_123'))
})

test('already-paid state is not rewritten on semantic replay', () => {
  assert.match(consumerSource, /jm1_m6firstpaymentstatus\) !== FIRST_PAYMENT_STATUS\.PAID_CONFIRMED/)
  assert.match(consumerSource, /findExecutionLogForSource/)
})

test('customer, title, author, and amount are not accepted as identity authorities', () => {
  assert.doesNotMatch(consumerSource, /payment\.customerId,[\s\S]*const fragments/)
  assert.doesNotMatch(consumerSource, /authorName.*findOpportunityForPayment/)
  assert.doesNotMatch(consumerSource, /titleName.*findOpportunityForPayment/)
  assert.match(consumerSource, /PAYMENT_AMOUNT_DOES_NOT_MATCH_SELECTED_INSTALLMENT/)
})

test('recovery uses provider-read identifiers and requires explicit human correction authority', () => {
  assert.doesNotMatch(recoverySource, /body\?\.invoiceId/)
  assert.doesNotMatch(recoverySource, /body\?\.customerId/)
  assert.match(recoverySource, /confirmBinding !== true/)
  assert.match(recoverySource, /GOVERNED_MANUAL_CORRECTION/)
})

test('blocked verified events are durably visible without downstream effects', () => {
  assert.match(webhookSource, /recordPublishingPaymentException/)
  assert.match(consumerSource, /PUBLISHING_PAYMENT_CORRELATION_BLOCKED/)
  assert.match(consumerSource, /No title was selected, no payment state was changed/)
})

test('unverified webhooks are denied and verified payloads remain accepted', () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_only'
  const body = JSON.stringify({ id: 'evt_fixture', type: 'invoice.paid', data: { object: {} } })
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${body}`)
    .digest('hex')

  assert.equal(verifyStripeWebhook(body, `t=${timestamp},v1=wrong`).ok, false)
  assert.equal(verifyStripeWebhook(body, `t=${timestamp},v1=${signature}`).ok, true)

  if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET
  else process.env.STRIPE_WEBHOOK_SECRET = previousSecret
})
