import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const { observedPaymentRequestIdentity, assertObservedRequestReplay, assertObservedAdditionalPaymentSource,
  assertNoObservedSettlementInvoice,
  assertObservedCheckoutSource } = jiti('../lib/server/stripe/publishing-observed-payment-service.ts')
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

test('a paid subscription invoice cannot be imported as an additional payment', () => {
  assert.throws(
    () => assertObservedAdditionalPaymentSource({ subscription: 'sub_attas_schedule' }),
    /OBSERVED_SCHEDULED_INVOICE_NOT_ADDITIONAL/,
  )
  assert.doesNotThrow(() => assertObservedAdditionalPaymentSource({ subscription: null }))
  assert.doesNotThrow(() => assertNoObservedSettlementInvoice([]))
  assert.throws(() => assertNoObservedSettlementInvoice([{ subscription: 'sub_attas_schedule' }]),
    /OBSERVED_SCHEDULED_INVOICE_NOT_ADDITIONAL/)
  assert.throws(() => assertNoObservedSettlementInvoice([{ subscription: null }]),
    /OBSERVED_SETTLEMENT_INVOICE_REVIEW_REQUIRED/)
  assert.throws(() => assertNoObservedSettlementInvoice([{ subscription: null }, { subscription: null }]),
    /OBSERVED_SETTLEMENT_INVOICE_AMBIGUOUS/)
})

test('invoice-free Checkout settlement requires exact additional-payment metadata and paid session', () => {
  const input = {
    request,
    rawPayment: { metadata: {
      jm1_payment_type: 'ADDITIONAL_PAYMENT', jm1_author_id: request.authorId,
      jm1_title_id: request.titleId, jm1_agreement_id: request.agreementId,
      jm1_engagement_id: request.engagementId, jm1_payment_schedule_id: 'schedule-1',
      jm1_balance_version: 'balance-1',
    } },
    session: { livemode: true, mode: 'payment', payment_status: 'paid', payment_intent: 'pi_fixture1',
      customer: 'cus_fixture1', amount_total: 25988, currency: 'usd', created: 1790431200 },
    paymentIntentId: 'pi_fixture1', customerId: 'cus_fixture1', scheduleId: 'schedule-1', amountCents: 25988,
  }
  assert.doesNotThrow(() => assertObservedCheckoutSource(input))
  for (const metadata of [{ jm1_payment_type: 'SCHEDULED_INSTALLMENT' },
    { jm1_title_id: 'another-title' }, { jm1_engagement_id: 'another-engagement' },
    { jm1_scheduled_obligation_id: 'obligation-1' }]) {
    assert.throws(() => assertObservedCheckoutSource({ ...input,
      rawPayment: { metadata: { ...input.rawPayment.metadata, ...metadata } } }),
    /OBSERVED_SETTLEMENT_METADATA_BINDING_DENIED/)
  }
  for (const session of [{ payment_status: 'unpaid' }, { customer: 'cus_other' },
    { payment_intent: 'pi_other' }, { amount_total: 25987 }, { livemode: false }]) {
    assert.throws(() => assertObservedCheckoutSource({ ...input, session: { ...input.session, ...session } }),
      /OBSERVED_SETTLEMENT_SESSION_BINDING_DENIED/)
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
