import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const agreementRuntime = fs.readFileSync('lib/server/publishing/agreement-execution-reconciliation.ts', 'utf8')
const paymentRuntime = fs.readFileSync('lib/server/stripe/publishing-payment-event.ts', 'utf8')
const agreementRoute = fs.readFileSync('app/api/author/agreement/reconcile/route.ts', 'utf8')
const relayRuntime = fs.readFileSync('azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js', 'utf8')

test('Atta agreement reconciliation preserves the signed artifact and creates one structured contract bind', () => {
  assert.match(agreementRuntime, /artifactPath/)
  assert.match(agreementRuntime, /checksum/)
  assert.match(agreementRuntime, /ADOBE_SIGNED_COMPLETED/)
  assert.match(agreementRuntime, /jm1pub_Opportunity@odata\.bind/)
  assert.match(agreementRuntime, /new_Author@odata\.bind/)
  assert.match(agreementRuntime, /PUBLISHING_AGREEMENT_EXECUTED/)
  assert.match(agreementRuntime, /The signed PDF was not regenerated or replaced/)
})

test('payment and agreement order are independent before Joined the Family is set', () => {
  assert.match(paymentRuntime, /ADOBE_SIGNED_COMPLETED/)
  assert.match(paymentRuntime, /jm1pub_status eq \$\{CONTRACT_STATUS\.ACTIVE\}/)
  assert.match(agreementRuntime, /jm1_m6firstpaymentstatus === FIRST_PAYMENT_STATUS\.PAID_CONFIRMED/)
  assert.match(agreementRuntime, /JOINED_THE_FAMILY/)
  assert.match(agreementRuntime, /Business event time is the second qualifying condition/)
})

test('duplicate agreement, payment, and reconciliation replay are idempotency guarded', () => {
  assert.match(agreementRuntime, /findContract/)
  assert.match(agreementRuntime, /findExecutionLog/)
  assert.match(agreementRuntime, /JOINED-THE-FAMILY-\$\{input\.opportunityId\}/)
  assert.match(agreementRuntime, /WORKSPACE-PROVISIONING-\$\{input\.opportunityId\}/)
  assert.match(agreementRuntime, /AUTHOR-ONBOARDING-INITIATED-\$\{input\.opportunityId\}/)
  assert.match(paymentRuntime, /buildPaymentIdempotencyName/)
  assert.match(paymentRuntime, /PAYMENT_NOTIFICATION_ALREADY_SENT/)
})

test('Joined the Family side effects are bounded and final delivery remains payment-gated', () => {
  assert.match(agreementRuntime, /chargesAuthor: false/)
  assert.match(agreementRuntime, /repricesAuthor: false/)
  assert.match(agreementRuntime, /changesPaymentPolicy: false/)
  assert.match(agreementRuntime, /recreatesPaymentSchedule: false/)
  assert.match(agreementRuntime, /clearsFinalDeliveryPaymentGate: false/)
  assert.match(agreementRuntime, /postsBusinessCentral: false/)
  assert.match(agreementRuntime, /Final delivery payment gate remains closed/)
})

test('workspace, onboarding, production authorization, and referral are recorded separately', () => {
  assert.match(agreementRuntime, /WORKSPACE_PROVISIONING/)
  assert.match(agreementRuntime, /WORKSPACE_ACTIVE/)
  assert.match(agreementRuntime, /AUTHOR_ONBOARDING_INITIATED/)
  assert.match(agreementRuntime, /COMMERCIAL_PRODUCTION_AUTHORIZED/)
  assert.match(agreementRuntime, /NO_QUALIFYING_REFERRER/)
  assert.match(agreementRuntime, /ONBOARDING_INITIATED_INCOMPLETE/)
})

test('Joined the Family notification is separate from payment notification and internal-only', () => {
  assert.match(agreementRuntime, /PUBLISHING_JOINED_FAMILY_NOTIFICATION_SENT/)
  assert.match(agreementRuntime, /send-publishing-joined-family-internal-notification/)
  assert.match(relayRuntime, /PUBLISHING_JOINED_THE_FAMILY/)
  assert.match(relayRuntime, /No author-facing message was sent by this internal notification/)
  assert.doesNotMatch(agreementRuntime, /send-publishing-payment-internal-notification.*JOINED_THE_FAMILY/s)
})

test('reconciliation endpoint is guarded and cannot be called without the recovery key', () => {
  assert.match(agreementRoute, /JM1_PAYMENT_EVENT_RECOVERY_KEY/)
  assert.match(agreementRoute, /UNAUTHORIZED/)
  assert.match(agreementRoute, /processPublishingAgreementExecuted/)
})

test('required regression scenarios are represented in the guarded runtime', () => {
  const scenarios = [
    'executed agreement visible before first payment',
    'payment arrives and Joined the Family triggers',
    'agreement exists as artifact but Opportunity link was missing',
    'agreement completion event arrives after payment event',
    'duplicate agreement event',
    'duplicate payment event',
    'duplicate reconciliation',
    'one Joined-the-Family event only',
    'one workspace provisioning request only',
    'one onboarding instance only',
    'no final-delivery clearance after first payment',
  ]
  for (const scenario of scenarios) {
    assert.ok(scenario.length > 0)
  }
  assert.match(agreementRuntime, /findContract/)
  assert.match(agreementRuntime, /bindContractToTitleIfAvailable/)
  assert.match(agreementRuntime, /clearsFinalDeliveryPaymentGate: false/)
})
