import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const { observedPaymentRequestIdentity, assertObservedRequestReplay } = jiti('../lib/server/stripe/publishing-observed-payment-service.ts')
const { paymentLedgerGuid } = jiti('../lib/server/stripe/publishing-payment-adapters.ts')

const request = {
  authorId: 'author-1', titleId: 'title-1', agreementId: 'agreement-1', engagementId: 'agreement-1',
  obligationId: 'agreement-1', requestedAmountCents: 25988, requestType: 'ADDITIONAL_PAYMENT_REQUEST',
  operationId: 'operation-1', createdAt: '2026-09-26T14:00:00Z',
  sourceEvent: { kind: 'FOUNDER_RATIFIED_OBSERVATION', authorityReference: 'packet-1',
    originalText: 'Please make my payment available.', sourceDate: '2026-09-24', providerMessageId: null },
  settlementObservations: [{ paymentIntentId: 'pi_fixture1', paymentType: 'ADDITIONAL_PAYMENT', authorityReference: 'packet-2' }],
}

test('observation identity is independent of capture time and does not fabricate a provider message ID', () => {
  const identity = observedPaymentRequestIdentity(request)
  assert.equal(observedPaymentRequestIdentity({ ...request, createdAt: 'later', operationId: 'different' }), identity)
  assert.notEqual(observedPaymentRequestIdentity({ ...request, authorId: 'another-author' }), identity)
  assert.notEqual(observedPaymentRequestIdentity({ ...request, agreementId: 'another-agreement' }), identity)
  assert.equal(request.sourceEvent.providerMessageId, null)
})

test('canonical sequential Dataverse GUIDs are accepted without weakening identifier shape validation', () => {
  const id = '131da28b-919c-f111-b8dc-6045bdd69435'
  assert.equal(paymentLedgerGuid(id), id)
  assert.equal(paymentLedgerGuid(`{${id.toUpperCase()}}`), id)
  for (const invalid of ['name', `${id} or 1 eq 1`, '131da28b-919c-f111-b8dc', 'zzzzzzzz-919c-f111-b8dc-6045bdd69435']) {
    assert.throws(() => paymentLedgerGuid(invalid), /AGREEMENT_ID_INVALID/)
  }
})

test('replay cannot change the amount, title, agreement or settled-payment attribution', () => {
  assert.doesNotThrow(() => assertObservedRequestReplay({ ...request, createdAt: 'later' }, request))
  for (const change of [{ requestedAmountCents: 25989 }, { titleId: 'another-title' },
    { agreementId: 'another-agreement' }, { settlementObservations: [] }]) {
    assert.throws(() => assertObservedRequestReplay({ ...request, ...change }, request), /OBSERVED_REQUEST_BINDING_CONFLICT/)
  }
})

test('uncommissioned prototype fails closed and contains no direct communication provider', () => {
  const route = readFileSync(new URL('../app/api/author/stripe/payment/service/route.ts', import.meta.url), 'utf8')
  const service = readFileSync(new URL('../lib/server/stripe/publishing-observed-payment-service.ts', import.meta.url), 'utf8')
  assert.equal((route.match(/process\.env\.JM1_OBSERVED_PAYMENT_SERVICE_ENABLED !== 'true'/g) || []).length, 2)
  assert.match(route, /timingSafeEqual/)
  assert.doesNotMatch(service, /sendConfiguredAuthorResponse|communication-email|sendMail|\.send\(/)
  assert.match(service, /processConfirmedAgreementPayment/)
  assert.match(service, /OBSERVED_SETTLEMENT_CLASSIFICATION_CONFLICT/)
  assert.match(service, /OBSERVED_SETTLEMENT_PROVIDER_EVENT_REQUIRED/)
})

test('preparation evidence cannot suppress provider-session completion evidence', () => {
  const source = readFileSync(new URL('../lib/server/stripe/publishing-payment-adapters.ts', import.meta.url), 'utf8')
  const method = source.slice(source.indexOf('async recordAdditionalPaymentRequest('), source.indexOf('async markQboReconciliation('))
  assert.match(method, /jmpv2_eventkind eq 'ADDITIONAL_PAYMENT_REQUEST' and jmpv2_paymentevidencekey/)
})

test('provider tail recovers sessions from immutable preparation and never creates a second provider object', () => {
  const source = readFileSync(new URL('../lib/server/stripe/publishing-observed-payment-service.ts', import.meta.url), 'utf8')
  const tail = source.slice(source.indexOf('export async function reconcileAdditionalPaymentTail'), source.indexOf('export async function prepareObservedAdditionalService'))
  assert.match(tail, /client_reference_id === preparation.requestId/)
  assert.match(tail, /PAYMENT_PREPARATION_PROVIDER_AMBIGUOUS/)
  assert.match(tail, /recordAdditionalPaymentRequest/)
  assert.doesNotMatch(tail, /createAdditionalPaymentCheckoutSession|startAdditionalPayment|method: 'POST'/)
})
