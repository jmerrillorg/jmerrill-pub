import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const webhookSource = fs.readFileSync('app/api/author/stripe/webhook/route.ts', 'utf8')
const classifierSource = fs.readFileSync('lib/server/stripe/author-workspace-webhook.ts', 'utf8')
const consumerSource = fs.readFileSync('lib/server/stripe/publishing-payment-event.ts', 'utf8')
const recoveryRouteSource = fs.readFileSync('app/api/author/stripe/payment/recover/route.ts', 'utf8')

test('Stripe webhook no longer ignores non-commissioning Publishing payment success events', () => {
  assert.match(webhookSource, /classifyCommissioningWebhookEvent/)
  assert.match(webhookSource, /classifyPublishingPaymentSuccessEvent/)
  assert.match(webhookSource, /processPublishingPaymentSuccess/)
  assert.match(classifierSource, /invoice\.paid/)
  assert.match(classifierSource, /invoice\.payment_succeeded/)
  assert.match(classifierSource, /payment_intent\.succeeded/)
})

test('Publishing payment consumer preserves payment and agreement gates separately', () => {
  assert.match(consumerSource, /PUBLISHING_INITIAL_PAYMENT_CONFIRMED/)
  assert.match(consumerSource, /JOINED_THE_FAMILY/)
  assert.match(consumerSource, /JOINED_THE_FAMILY_BLOCKED/)
  assert.match(consumerSource, /AGREEMENT_SIGNED_ACTIVE/)
  assert.match(consumerSource, /AGREEMENT_FULLY_EXECUTED/)
  assert.match(consumerSource, /AGREEMENT_FULLY_EXECUTED_EVENT/)
  assert.match(consumerSource, /PAYMENT_AMOUNT_DOES_NOT_MATCH_SELECTED_INSTALLMENT/)
  assert.match(consumerSource, /PAYMENT_NOTIFICATION_ALREADY_SENT/)
})

test('Publishing payment consumer uses governed labels and no hardcoded author fallback', () => {
  assert.match(consumerSource, /odata\.include-annotations="OData\.Community\.Display\.V1\.FormattedValue"/)
  assert.match(consumerSource, /opportunityNameAuthorFallback/)
  assert.doesNotMatch(consumerSource, /\|\| 'Atta Darko'/)
})

test('Atta grandfathered payment policy is not migrated or recalculated by recovery path', () => {
  assert.match(consumerSource, /changesPaymentArrangement: false/)
  assert.match(consumerSource, /changesPaymentPolicy: false/)
  assert.doesNotMatch(consumerSource, /JMP_FINANCING_EARLY_PAYOFF_v1\.0/)
  assert.doesNotMatch(consumerSource, /0\.06/)
})

test('missed payment recovery route is guarded and verifies live PaymentIntent', () => {
  assert.match(recoveryRouteSource, /JM1_PAYMENT_EVENT_RECOVERY_KEY/)
  assert.match(recoveryRouteSource, /retrieveStripePaymentIntent/)
  assert.match(recoveryRouteSource, /PAYMENT_INTENT_ID_REQUIRED/)
})
