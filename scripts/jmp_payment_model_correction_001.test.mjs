import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const { calculateAgreementPaymentState, allocateIncomingPayment } = jiti('../lib/server/stripe/publishing-agreement-payment.ts')
const { processConfirmedAgreementPayment } = jiti('../lib/server/stripe/publishing-payment-runtime.ts')

function snapshot() {
  return {
    agreementId: 'agreement-1', authorId: 'author-1', titleId: 'title-1', paymentScheduleId: 'schedule-1',
    currency: 'usd', contractualBalanceCents: 207899, normalInstallmentCents: 25988,
    nextScheduledDueDate: '2026-10-27T12:18:59Z',
    scheduledObligations: [{ obligationId: 'october', dueDate: '2026-10-27T12:18:59Z', amountCents: 25988, status: 'SCHEDULED' }],
    payments: [1, 2].map((number) => ({ paymentId: `scheduled-${number}`, eventId: `event-${number}`,
      paymentType: 'SCHEDULED_INSTALLMENT', amountCents: 25988, status: 'SUCCEEDED' })),
    refunds: [],
  }
}

function additional(source, amountCents, number = 1, status = 'SUCCEEDED') {
  return { ...source, payments: [...source.payments, {
    paymentId: `additional-${number}`, eventId: `additional-event-${number}`,
    paymentType: 'ADDITIONAL_PAYMENT', amountCents, status,
    allocations: [{ kind: 'ADDITIONAL_PAYMENT', amountCents }],
  }] }
}

test('additional September payment reduces one contractual balance and tail, not October cadence', () => {
  const source = snapshot()
  const before = calculateAgreementPaymentState(source)
  const allocation = allocateIncomingPayment({ snapshot: source, amountCents: 25988,
    intent: 'ADDITIONAL_PAYMENT', asOf: '2026-09-26T12:00:00Z' })
  assert.equal(allocation.additionalAllocationCents, 25988)
  assert.equal(allocation.scheduledAllocationCents, 0)
  const after = calculateAgreementPaymentState(additional(source, 25988))
  assert.equal(before.remainingBalanceCents, 155923)
  assert.equal(after.remainingBalanceCents, 129935)
  assert.equal(after.contractualBalanceCents, before.contractualBalanceCents)
  assert.equal(after.nextScheduledDueDate, before.nextScheduledDueDate)
  assert.equal(after.remainingInstallmentCount, 5)
  assert.equal(after.projectedFinalCollectionCents, 25983)
  assert.equal(source.scheduledObligations[0].status, 'SCHEDULED')
})

test('multiple additional payments shorten the tail and retain the next scheduled date', () => {
  const source = additional(additional(snapshot(), 25988), 25988, 2)
  const state = calculateAgreementPaymentState(source)
  assert.equal(state.remainingBalanceCents, 103947)
  assert.equal(state.remainingInstallmentCount, 4)
  assert.equal(state.projectedFinalCollectionCents, 25983)
  assert.equal(state.nextScheduledDueDate, snapshot().nextScheduledDueDate)
})

test('failed or unsubmitted payments do not reduce the balance or projected tail', () => {
  const before = calculateAgreementPaymentState(snapshot())
  assert.deepEqual(calculateAgreementPaymentState(additional(snapshot(), 25988, 1, 'FAILED')), {
    ...before, balanceVersion: calculateAgreementPaymentState(additional(snapshot(), 25988, 1, 'FAILED')).balanceVersion,
  })
  assert.equal(calculateAgreementPaymentState(snapshot()).remainingBalanceCents, before.remainingBalanceCents)
})

test('refund preserves payment history and restores balance and tail', () => {
  const source = additional(snapshot(), 25988)
  source.refunds.push({ refundId: 'refund-1', eventId: 'refund-event-1', originalPaymentId: 'additional-1',
    amountCents: 25988, status: 'SUCCEEDED' })
  const state = calculateAgreementPaymentState(source)
  assert.equal(source.payments.length, 3)
  assert.equal(state.remainingBalanceCents, 155923)
  assert.equal(state.remainingInstallmentCount, 6)
  assert.equal(state.projectedFinalCollectionCents, 25983)
})

test('partial final collection and zero balance are exact integer-cent projections', () => {
  const source = snapshot()
  assert.equal(calculateAgreementPaymentState(additional(source, 145923)).projectedFinalCollectionCents, 10000)
  const paid = calculateAgreementPaymentState(additional(source, 155923))
  assert.equal(paid.paidInFull, true)
  assert.equal(paid.recurringCadenceActive, false)
  assert.equal(paid.remainingInstallmentCount, 0)
  assert.equal(paid.projectedFinalCollectionCents, 0)
  assert.throws(() => calculateAgreementPaymentState(additional(source, 155924)), /PAYMENTS_EXCEED_CONTRACTUAL_BALANCE/)
})

test('settlement replay cannot borrow a payment from another agreement or change its amount', async () => {
  let reads = 0
  const event = { agreementId: 'agreement-1', stripePaymentId: 'payment-1', grossAmountCents: 25988 }
  const ledger = { findPaymentEvent: async () => event, getAgreement: async () => { reads++; throw new Error('must not read') } }
  for (const change of [{ agreementId: 'agreement-2' }, { stripePaymentId: 'payment-2' }, { amountCents: 26000 }]) {
    const result = await processConfirmedAgreementPayment({ agreementId: 'agreement-1', stripeEventId: 'event-1',
      stripePaymentId: 'payment-1', amountCents: 25988, ledger, ...change })
    assert.equal(result.ok, false)
    assert.equal(result.reason, 'PAYMENT_REPLAY_BINDING_MISMATCH')
  }
  assert.equal(reads, 0)
})
