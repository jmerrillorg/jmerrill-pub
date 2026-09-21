import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'
import fs from 'node:fs'

const jiti = createJiti(import.meta.url)
const {
  applyConfirmedPayment,
  applyConfirmedRefund,
  buildPublishingPaymentMetadata,
  calculateAgreementPaymentState,
  parsePublishingPaymentMetadata,
  validatePaymentAllocations,
} = jiti('../lib/server/stripe/publishing-agreement-payment.ts')
const { classifyPublishingPaymentSuccessEvent } = jiti('../lib/server/stripe/author-workspace-webhook.ts')
const paymentConsumerSource = fs.readFileSync('lib/server/stripe/publishing-payment-event.ts', 'utf8')

const base = (overrides = {}) => ({
  agreementId: 'agreement-1',
  authorId: 'author-1',
  titleId: 'title-1',
  paymentScheduleId: 'schedule-1',
  currency: 'usd',
  contractualBalanceCents: 200000,
  normalInstallmentCents: 25988,
  nextScheduledDueDate: '2026-10-01',
  payments: [],
  refunds: [],
  ...overrides,
})

const payment = (paymentId, paymentType, amountCents, overrides = {}) => ({
  paymentId,
  eventId: `evt-${paymentId}`,
  paymentType,
  amountCents,
  status: 'SUCCEEDED',
  scheduledObligationId: paymentType === 'SCHEDULED_INSTALLMENT' ? `due-${paymentId}` : null,
  paidAt: '2026-09-21T12:00:00Z',
  ...overrides,
})

test('scheduled payment only preserves cadence and reduces balance', () => {
  const result = applyConfirmedPayment({
    snapshot: base(),
    payment: payment('scheduled-1', 'SCHEDULED_INSTALLMENT', 25988),
  })
  assert.equal(result.ok, true)
  assert.equal(result.after.remainingBalanceCents, 174012)
  assert.equal(result.after.nextScheduledInstallmentCents, 25988)
  assert.equal(result.after.recurringCadenceActive, true)
})

test('additional payment only reduces balance without replacing the scheduled obligation', () => {
  const result = applyConfirmedPayment({
    snapshot: base(),
    payment: payment('extra-1', 'ADDITIONAL_PAYMENT', 50000),
  })
  assert.equal(result.ok, true)
  assert.equal(result.after.remainingBalanceCents, 150000)
  assert.equal(result.after.nextScheduledInstallmentCents, 25988)
  assert.equal(result.after.nextScheduledDueDate, '2026-10-01')
})

test('scheduled and additional allocations may share a session while retaining semantics', () => {
  const state = calculateAgreementPaymentState(base())
  const result = validatePaymentAllocations({
    state,
    allocations: [
      { paymentType: 'SCHEDULED_INSTALLMENT', amountCents: 25988, scheduledObligationId: 'due-1' },
      { paymentType: 'ADDITIONAL_PAYMENT', amountCents: 50000 },
    ],
  })
  assert.equal(result.ok, true)
  assert.equal(result.totalCents, 75988)
  assert.deepEqual(result.allocations.map((item) => item.paymentType), ['SCHEDULED_INSTALLMENT', 'ADDITIONAL_PAYMENT'])
})

test('multiple additional payments shorten payoff', () => {
  const state = calculateAgreementPaymentState(base({
    payments: [
      payment('extra-1', 'ADDITIONAL_PAYMENT', 50000),
      payment('extra-2', 'ADDITIONAL_PAYMENT', 50000),
    ],
  }))
  assert.equal(state.remainingBalanceCents, 100000)
  assert.equal(state.remainingInstallmentCount, 4)
})

test('additional payment before scheduled payment keeps scheduled amount due', () => {
  const state = calculateAgreementPaymentState(base({
    payments: [payment('extra-1', 'ADDITIONAL_PAYMENT', 50000)],
  }))
  assert.equal(state.nextScheduledInstallmentCents, 25988)
})

test('additional payment after scheduled payment keeps the following cadence active', () => {
  const state = calculateAgreementPaymentState(base({
    payments: [
      payment('scheduled-1', 'SCHEDULED_INSTALLMENT', 25988),
      payment('extra-1', 'ADDITIONAL_PAYMENT', 50000),
    ],
  }))
  assert.equal(state.remainingBalanceCents, 124012)
  assert.equal(state.nextScheduledInstallmentCents, 25988)
})

test('failed additional payment leaves plan and balance unchanged', () => {
  const state = calculateAgreementPaymentState(base({
    payments: [payment('extra-failed', 'ADDITIONAL_PAYMENT', 50000, { status: 'FAILED' })],
  }))
  assert.equal(state.remainingBalanceCents, 200000)
  assert.equal(state.nextScheduledDueDate, '2026-10-01')
})

test('successful extra payment does not satisfy a failed scheduled installment', () => {
  const state = calculateAgreementPaymentState(base({
    payments: [
      payment('scheduled-failed', 'SCHEDULED_INSTALLMENT', 25988, { status: 'FAILED' }),
      payment('extra-1', 'ADDITIONAL_PAYMENT', 50000),
    ],
  }))
  assert.equal(state.remainingBalanceCents, 150000)
  assert.equal(state.nextScheduledInstallmentCents, 25988)
  assert.equal(state.nextScheduledDueDate, '2026-10-01')
})

test('duplicate Stripe payment replay is idempotent', () => {
  const existing = payment('extra-1', 'ADDITIONAL_PAYMENT', 50000)
  const result = applyConfirmedPayment({ snapshot: base({ payments: [existing] }), payment: existing })
  assert.equal(result.ok, true)
  assert.equal(result.idempotent, true)
  assert.equal(result.after.remainingBalanceCents, 150000)
})

test('stale remaining balance version fails closed', () => {
  const stale = calculateAgreementPaymentState(base()).balanceVersion
  const result = applyConfirmedPayment({
    snapshot: base({ payments: [payment('scheduled-1', 'SCHEDULED_INSTALLMENT', 25988)] }),
    payment: payment('extra-1', 'ADDITIONAL_PAYMENT', 50000),
    expectedBalanceVersion: stale,
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'STALE_AGREEMENT_BALANCE')
})

test('final installment is capped at the remaining balance', () => {
  const state = calculateAgreementPaymentState(base({
    contractualBalanceCents: 100000,
    payments: [payment('extra-1', 'ADDITIONAL_PAYMENT', 77964)],
  }))
  assert.equal(state.remainingBalanceCents, 22036)
  assert.equal(state.nextScheduledInstallmentCents, 22036)
})

test('payment equal to exact payoff stops future billing', () => {
  const result = applyConfirmedPayment({
    snapshot: base({ contractualBalanceCents: 50000 }),
    payment: payment('extra-payoff', 'ADDITIONAL_PAYMENT', 50000),
  })
  assert.equal(result.ok, true)
  assert.equal(result.after.paidInFull, true)
  assert.equal(result.after.recurringCadenceActive, false)
  assert.equal(result.after.nextScheduledInstallmentCents, 0)
  assert.equal(result.after.nextScheduledDueDate, null)
})

test('attempted overpayment is rejected with the permissible maximum', () => {
  const state = calculateAgreementPaymentState(base({ contractualBalanceCents: 22036 }))
  const result = validatePaymentAllocations({
    state,
    allocations: [{ paymentType: 'ADDITIONAL_PAYMENT', amountCents: 25988 }],
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'PAYMENT_EXCEEDS_REMAINING_BALANCE')
  assert.equal(result.permissibleAmountCents, 22036)
})

test('refund of additional payment restores agreement balance and audit history', () => {
  const original = payment('extra-1', 'ADDITIONAL_PAYMENT', 50000)
  const result = applyConfirmedRefund({
    snapshot: base({ payments: [original] }),
    refund: {
      refundId: 'refund-1',
      eventId: 'evt-refund-1',
      originalPaymentId: original.paymentId,
      amountCents: 20000,
      status: 'SUCCEEDED',
      refundedAt: '2026-09-22T12:00:00Z',
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.after.remainingBalanceCents, 170000)
  assert.equal(result.after.refundsAppliedCents, 20000)
})

test('refund of scheduled payment restores balance without manufacturing another payment', () => {
  const original = payment('scheduled-1', 'SCHEDULED_INSTALLMENT', 25988)
  const result = applyConfirmedRefund({
    snapshot: base({ payments: [original] }),
    refund: {
      refundId: 'refund-1',
      eventId: 'evt-refund-1',
      originalPaymentId: original.paymentId,
      amountCents: 25988,
      status: 'SUCCEEDED',
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.after.remainingBalanceCents, 200000)
  assert.equal(result.after.grossPaymentsAppliedCents, 25988)
})

test('Stripe metadata carries stable governed IDs, payment type, and balance version', () => {
  const result = buildPublishingPaymentMetadata({
    snapshot: base(),
    paymentType: 'ADDITIONAL_PAYMENT',
    amountCents: 50000,
  })
  assert.equal(result.ok, true)
  assert.equal(result.metadata.jm1_payment_type, 'ADDITIONAL_PAYMENT')
  assert.equal(result.metadata.jm1_agreement_id, 'agreement-1')
  assert.equal(result.metadata.jm1_contract_balance_before, '200000')
  assert.equal(result.metadata.jm1_contract_balance_after, '150000')

  const parsed = parsePublishingPaymentMetadata(result.metadata)
  assert.equal(parsed.ok, true)
  assert.equal(parsed.paymentType, 'ADDITIONAL_PAYMENT')
  assert.equal(parsed.balanceBeforeCents, 200000)
  assert.equal(parsed.balanceAfterCents, 150000)
})

test('Stripe processor fees never reduce the gross agreement-balance effect', () => {
  const grossPaymentCents = 50000
  const stripeFeeCents = 1750
  const netSettlementCents = grossPaymentCents - stripeFeeCents
  const state = calculateAgreementPaymentState(base({
    payments: [payment('extra-1', 'ADDITIONAL_PAYMENT', grossPaymentCents)],
  }))
  assert.equal(netSettlementCents, 48250)
  assert.equal(state.remainingBalanceCents, 150000)
})

test('verified Stripe webhook carries governed payment semantics into the consumer boundary', () => {
  const metadata = buildPublishingPaymentMetadata({
    snapshot: base(),
    paymentType: 'ADDITIONAL_PAYMENT',
    amountCents: 50000,
  })
  assert.equal(metadata.ok, true)
  const classification = classifyPublishingPaymentSuccessEvent({
    id: 'evt-extra-1',
    type: 'payment_intent.succeeded',
    created: 1789992000,
    data: {
      object: {
        id: 'pi-extra-1',
        object: 'payment_intent',
        amount_received: 50000,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          ...metadata.metadata,
          jm1_opportunity_id: '455daa4a-629f-f111-b8dc-6045bdd69678',
        },
      },
    },
  })
  assert.equal(classification.process, true)
  assert.equal(classification.safeEvent.agreementPayment.paymentType, 'ADDITIONAL_PAYMENT')
  assert.equal(classification.safeEvent.agreementPayment.balanceBeforeCents, 200000)
})

test('typed agreement payments fail closed until durable ledger and QBO handoff are commissioned', () => {
  assert.match(paymentConsumerSource, /AGREEMENT_PAYMENT_RUNTIME_NOT_COMMISSIONED/)
  assert.match(paymentConsumerSource, /AGREEMENT_PAYMENT_METADATA_INVALID/)
  assert.match(paymentConsumerSource, /accountingAuthority: 'QBO'/)
  assert.match(paymentConsumerSource, /financialEffect: 0/)
})
