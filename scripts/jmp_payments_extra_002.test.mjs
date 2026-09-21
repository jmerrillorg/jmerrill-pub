import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const domain = jiti('../lib/server/stripe/publishing-agreement-payment.ts')
const runtime = jiti('../lib/server/stripe/publishing-payment-runtime.ts')

const AS_OF = '2026-09-21T12:00:00.000Z'

function snapshot(overrides = {}) {
  return {
    agreementId: '11111111-1111-4111-8111-111111111111',
    authorId: 'author-1',
    titleId: 'title-1',
    paymentScheduleId: 'schedule-1',
    currency: 'usd',
    contractualBalanceCents: 200000,
    normalInstallmentCents: 25988,
    nextScheduledDueDate: '2026-09-01T00:00:00.000Z',
    scheduledObligations: [
      { obligationId: 'due-1', dueDate: '2026-08-01T00:00:00.000Z', amountCents: 25988, status: 'PAST_DUE' },
      { obligationId: 'due-2', dueDate: '2026-09-01T00:00:00.000Z', amountCents: 25988, status: 'PAST_DUE' },
      { obligationId: 'next-1', dueDate: '2026-10-01T00:00:00.000Z', amountCents: 25988, status: 'SCHEDULED' },
    ],
    payments: [],
    refunds: [],
    ...overrides,
  }
}

function agreement(snapshotOverride = {}) {
  return {
    snapshot: snapshot(snapshotOverride),
    stripeCustomerId: 'cus_existing',
    qboCustomerReference: 'qbo-customer-1',
    qboReceivableReference: 'qbo-invoice-1',
    etag: 'W/"1"',
    status: 'ACTIVE',
  }
}

class MemoryLedger {
  constructor(record = agreement()) {
    this.record = structuredClone(record)
    this.events = new Map()
    this.attempts = new Map()
    this.reconciliations = new Map()
    this.appendCount = 0
    this.rejectNextConcurrency = false
  }
  async getAgreement(id) { return id === this.record.snapshot.agreementId ? structuredClone(this.record) : null }
  async listDueAgreements() { return [structuredClone(this.record)] }
  async findPaymentEvent(eventId, paymentId) {
    return structuredClone([...this.events.values()].find((row) => row.stripeEventId === eventId || row.stripePaymentId === paymentId) || null)
  }
  async appendConfirmedPayment({ event, payment, expectedEtag }) {
    if (this.rejectNextConcurrency || expectedEtag !== this.record.etag) {
      this.rejectNextConcurrency = false
      return { applied: false, record: structuredClone(this.record) }
    }
    if (this.events.has(event.paymentEventId)) return { applied: true, record: structuredClone(this.record) }
    this.events.set(event.paymentEventId, structuredClone(event))
    this.record.snapshot.payments.push(structuredClone(payment))
    this.appendCount += 1
    this.record.etag = `W/"${this.appendCount + 1}"`
    if (domain.calculateAgreementPaymentState(this.record.snapshot).paidInFull) this.record.status = 'PAID_IN_FULL'
    return { applied: true, record: structuredClone(this.record) }
  }
  async appendRefund({ refund, expectedEtag }) {
    if (expectedEtag !== this.record.etag) return { applied: false, record: structuredClone(this.record) }
    if (!this.record.snapshot.refunds.some((row) => row.refundId === refund.refundId)) {
      this.record.snapshot.refunds.push(structuredClone(refund))
      this.record.etag = `W/"refund-${refund.refundId}"`
    }
    return { applied: true, record: structuredClone(this.record) }
  }
  async findCollectionAttempt(key) { return structuredClone(this.attempts.get(key) || null) }
  async recordCollectionAttempt(attempt) { this.attempts.set(attempt.executionKey, structuredClone(attempt)) }
  async markQboReconciliation({ paymentEventId, status, qboTransactionId = null }) {
    const event = this.events.get(paymentEventId)
    if (event) {
      event.qboReconciliationStatus = status
      event.qboTransactionId = qboTransactionId
    }
    this.reconciliations.set(paymentEventId, status)
  }
}

class FakeStripe {
  constructor() { this.calls = []; this.byKey = new Map() }
  async createInvoice(input) {
    this.calls.push(structuredClone(input))
    if (!this.byKey.has(input.idempotencyKey)) this.byKey.set(input.idempotencyKey, `in_${this.byKey.size + 1}`)
    return { invoiceId: this.byKey.get(input.idempotencyKey) }
  }
}

class FakeQbo {
  constructor() { this.byKey = new Map(); this.effects = new Map(); this.writeAttempts = 0; this.failOnce = false; this.mismatch = false }
  async postCustomerPayment(effect) {
    this.writeAttempts += 1
    if (this.failOnce) { this.failOnce = false; throw new Error('QBO_TRANSIENT_FAILURE') }
    if (!this.byKey.has(effect.idempotencyKey)) {
      const id = `qbo_${this.byKey.size + 1}`
      this.byKey.set(effect.idempotencyKey, id)
      this.effects.set(id, structuredClone(effect))
    }
    return { transactionId: this.byKey.get(effect.idempotencyKey) }
  }
  async readCustomerPayment(id) {
    const value = structuredClone(this.effects.get(id) || null)
    if (value && this.mismatch) value.grossAmountCents += 1
    return value
  }
}

function allocate(amountCents, intent = 'ADDITIONAL_PAYMENT', source = snapshot()) {
  return domain.allocateIncomingPayment({ snapshot: source, amountCents, intent, asOf: AS_OF })
}

async function confirm({ ledger = new MemoryLedger(), qbo = new FakeQbo(), amountCents = 50000, intent = 'ADDITIONAL_PAYMENT', event = 'evt_1', payment = 'pi_1' } = {}) {
  const state = domain.calculateAgreementPaymentState(ledger.record.snapshot)
  const result = await runtime.processConfirmedAgreementPayment({
    agreementId: ledger.record.snapshot.agreementId,
    stripeEventId: event,
    stripePaymentId: payment,
    stripeInvoiceId: 'in_1',
    amountCents,
    intent,
    occurredAt: AS_OF,
    submittedBalanceVersion: state.balanceVersion,
    ledger,
    qbo,
  })
  return { result, ledger, qbo }
}

test('Case A cures oldest past due then classifies remainder as additional', () => {
  const source = snapshot({ scheduledObligations: [snapshot().scheduledObligations[0]] })
  const result = allocate(50000, 'ADDITIONAL_PAYMENT', source)
  assert.equal(result.ok, true)
  assert.equal(result.pastDueAllocationCents, 25988)
  assert.equal(result.additionalAllocationCents, 24012)
})

test('Case B applies all 400.00 to two past-due obligations oldest first', () => {
  const result = allocate(40000)
  assert.equal(result.pastDueAllocationCents, 40000)
  assert.equal(result.additionalAllocationCents, 0)
  assert.deepEqual(result.allocations.map((row) => [row.scheduledObligationId, row.amountCents]), [['due-1', 25988], ['due-2', 14012]])
})

test('Case C current account additional payment preserves next scheduled installment', () => {
  const source = snapshot({ scheduledObligations: [snapshot().scheduledObligations[2]], nextScheduledDueDate: '2026-10-01T00:00:00.000Z' })
  const result = allocate(50000, 'ADDITIONAL_PAYMENT', source)
  assert.equal(result.additionalAllocationCents, 50000)
  assert.equal(result.scheduledAllocationCents, 0)
  assert.equal(domain.calculateAgreementPaymentState(source).nextScheduledInstallmentCents, 25988)
})

test('Case D exact delinquency cure leaves future cadence active', () => {
  const source = snapshot({ scheduledObligations: [snapshot().scheduledObligations[0], snapshot().scheduledObligations[2]] })
  const result = allocate(25988, 'ADDITIONAL_PAYMENT', source)
  assert.equal(result.pastDueAllocationCents, 25988)
  assert.equal(result.additionalAllocationCents, 0)
  assert.equal(result.paidInFullAfter, false)
})

test('current plus additional remains two logical allocations', () => {
  const source = snapshot({ scheduledObligations: [snapshot().scheduledObligations[2]] })
  const result = allocate(50000, 'CURRENT_PLUS_ADDITIONAL', source)
  assert.equal(result.scheduledAllocationCents, 25988)
  assert.equal(result.additionalAllocationCents, 24012)
})

test('final installment is capped at remaining agreement balance', () => {
  const source = snapshot({ contractualBalanceCents: 11742, scheduledObligations: [{ obligationId: 'final', dueDate: '2026-09-01T00:00:00.000Z', amountCents: 25988, status: 'PAST_DUE' }] })
  assert.equal(domain.calculateAgreementPaymentState(source).nextScheduledInstallmentCents, 11742)
  const result = allocate(11742, 'CURRENT_PAYMENT', source)
  assert.equal(result.balanceAfterCents, 0)
  assert.equal(result.paidInFullAfter, true)
})

test('attempted overpayment is denied', () => {
  const result = allocate(200001)
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'PAYMENT_EXCEEDS_REMAINING_BALANCE')
})

test('stale balance version is denied before allocation', () => {
  const result = domain.allocateIncomingPayment({ snapshot: snapshot(), amountCents: 1000, intent: 'ADDITIONAL_PAYMENT', asOf: AS_OF, submittedBalanceVersion: 'stale' })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'STALE_AGREEMENT_BALANCE')
})

test('confirmed payment writes one ledger effect and one QBO effect', async () => {
  const { result, ledger, qbo } = await confirm()
  assert.equal(result.ok, true)
  assert.equal(ledger.appendCount, 1)
  assert.equal(qbo.byKey.size, 1)
  assert.equal(qbo.effects.values().next().value.grossAmountCents, 50000)
})

test('duplicate webhook does not duplicate ledger or QBO payment', async () => {
  const ledger = new MemoryLedger()
  const qbo = new FakeQbo()
  const first = await confirm({ ledger, qbo })
  const replay = await confirm({ ledger, qbo })
  assert.equal(first.result.ok, true)
  assert.equal(replay.result.idempotent, true)
  assert.equal(ledger.appendCount, 1)
  assert.equal(qbo.byKey.size, 1)
})

test('QBO transient failure is retried from durable pending event without another balance effect', async () => {
  const ledger = new MemoryLedger()
  const qbo = new FakeQbo()
  qbo.failOnce = true
  const first = await confirm({ ledger, qbo })
  const retry = await confirm({ ledger, qbo })
  assert.equal(first.result.reason, 'QBO_RECONCILIATION_FAILED')
  assert.equal(retry.result.ok, true)
  assert.equal(ledger.appendCount, 1)
  assert.equal(qbo.byKey.size, 1)
})

test('QBO readback mismatch fails closed after preserving durable payment fact', async () => {
  const qbo = new FakeQbo()
  qbo.mismatch = true
  const { result, ledger } = await confirm({ qbo })
  assert.equal(result.reason, 'QBO_READBACK_MISMATCH')
  assert.equal(result.paymentRecorded, true)
  assert.equal(ledger.appendCount, 1)
})

test('missing QBO customer authority fails closed after preserving durable payment fact', async () => {
  const ledger = new MemoryLedger({ ...agreement(), qboCustomerReference: '' })
  const { result } = await confirm({ ledger })
  assert.equal(result.reason, 'QBO_RECONCILIATION_FAILED')
  assert.equal(result.detail, 'QBO_CUSTOMER_REFERENCE_REQUIRED')
  assert.equal(ledger.appendCount, 1)
})

test('concurrent balance writer loses optimistic concurrency race', async () => {
  const ledger = new MemoryLedger()
  ledger.rejectNextConcurrency = true
  const { result } = await confirm({ ledger })
  assert.equal(result.reason, 'CONCURRENT_BALANCE_WRITE_REJECTED')
  assert.equal(ledger.appendCount, 0)
})

test('failed scheduled and additional payments have zero balance effect', () => {
  const before = domain.calculateAgreementPaymentState(snapshot())
  const failed = runtime.processFailedAgreementPayment({ stripeEventId: 'evt_failed', stripePaymentId: 'pi_failed' })
  const after = domain.calculateAgreementPaymentState(snapshot({ payments: [{ paymentId: 'pi_failed', eventId: 'evt_failed', paymentType: 'SCHEDULED_INSTALLMENT', amountCents: 25988, status: 'FAILED' }] }))
  assert.equal(failed.financialEffect, 0)
  assert.equal(after.remainingBalanceCents, before.remainingBalanceCents)
})

test('partial refund reverses extra principal before reopening a scheduled obligation', () => {
  const source = snapshot({
    scheduledObligations: [snapshot().scheduledObligations[0]],
    payments: [{
      paymentId: 'pi_paid', eventId: 'evt_paid', paymentType: 'SCHEDULED_INSTALLMENT', amountCents: 50000, status: 'SUCCEEDED',
      allocations: [
        { kind: 'PAST_DUE_SCHEDULED_INSTALLMENT', amountCents: 25988, scheduledObligationId: 'due-1' },
        { kind: 'ADDITIONAL_PAYMENT', amountCents: 24012 },
      ],
    }],
    refunds: [{ refundId: 're_1', eventId: 'evt_refund', originalPaymentId: 'pi_paid', amountCents: 10000, status: 'SUCCEEDED' }],
  })
  assert.equal(domain.calculateAgreementPaymentState(source).pastDueBalanceCents, 0)
})

test('larger refund restores only the scheduled portion reached by reversal order', () => {
  const source = snapshot({
    scheduledObligations: [snapshot().scheduledObligations[0]],
    payments: [{
      paymentId: 'pi_paid', eventId: 'evt_paid', paymentType: 'SCHEDULED_INSTALLMENT', amountCents: 50000, status: 'SUCCEEDED',
      allocations: [
        { kind: 'PAST_DUE_SCHEDULED_INSTALLMENT', amountCents: 25988, scheduledObligationId: 'due-1' },
        { kind: 'ADDITIONAL_PAYMENT', amountCents: 24012 },
      ],
    }],
    refunds: [{ refundId: 're_1', eventId: 'evt_refund', originalPaymentId: 'pi_paid', amountCents: 30000, status: 'SUCCEEDED' }],
  })
  assert.equal(domain.calculateAgreementPaymentState(source).pastDueBalanceCents, 5988)
})

test('refund runtime restores balance and posts one idempotent QBO reversal', async () => {
  const paidSnapshot = snapshot({ payments: [{ paymentId: 'pi_paid', eventId: 'evt_paid', paymentType: 'ADDITIONAL_PAYMENT', amountCents: 50000, status: 'SUCCEEDED', allocations: [{ kind: 'ADDITIONAL_PAYMENT', amountCents: 50000 }] }] })
  const ledger = new MemoryLedger(agreement(paidSnapshot))
  const qbo = new FakeQbo()
  const result = await runtime.processConfirmedAgreementRefund({
    agreementId: ledger.record.snapshot.agreementId,
    refund: { refundId: 're_1', eventId: 'evt_re_1', originalPaymentId: 'pi_paid', amountCents: 10000, status: 'SUCCEEDED' },
    ledger,
    qbo,
  })
  assert.equal(result.ok, true)
  assert.equal(result.state.remainingBalanceCents, 160000)
  assert.equal(qbo.effects.values().next().value.effectType, 'REFUND')
  assert.ok([...ledger.reconciliations.values()].includes('PASS'))
})

test('recurring executor caps invoice, uses existing Stripe customer, and survives restart idempotently', async () => {
  const record = agreement({ contractualBalanceCents: 11742, scheduledObligations: [{ obligationId: 'final', dueDate: '2026-09-01T00:00:00.000Z', amountCents: 25988, status: 'PAST_DUE' }] })
  const ledger = new MemoryLedger(record)
  const stripe = new FakeStripe()
  const first = await runtime.runRecurringInstallmentExecutor({ asOf: AS_OF, ledger, stripe })
  const restart = await runtime.runRecurringInstallmentExecutor({ asOf: AS_OF, ledger, stripe })
  assert.equal(first.results[0].amountCents, 11742)
  assert.equal(stripe.calls[0].customerId, 'cus_existing')
  assert.equal(restart.results[0].status, 'IDEMPOTENT_REPLAY')
  assert.equal(stripe.byKey.size, 1)
})

test('recurring executor invoices only the unpaid remainder of a partially satisfied obligation', async () => {
  const record = agreement({
    scheduledObligations: [{ obligationId: 'due-1', dueDate: '2026-08-01T00:00:00.000Z', amountCents: 25988, status: 'PAST_DUE' }],
    payments: [{
      paymentId: 'pi_partial', eventId: 'evt_partial', paymentType: 'SCHEDULED_INSTALLMENT', amountCents: 10000, status: 'SUCCEEDED',
      allocations: [{ kind: 'PAST_DUE_SCHEDULED_INSTALLMENT', amountCents: 10000, scheduledObligationId: 'due-1' }],
    }],
  })
  const ledger = new MemoryLedger(record)
  const stripe = new FakeStripe()
  const result = await runtime.runRecurringInstallmentExecutor({ asOf: AS_OF, ledger, stripe })
  assert.equal(result.results[0].amountCents, 15988)
  assert.equal(stripe.calls[0].amountCents, 15988)
})

test('additional-payment invoice is bounded, versioned, and reuses same Stripe customer', async () => {
  const ledger = new MemoryLedger(agreement({ scheduledObligations: [snapshot().scheduledObligations[2]] }))
  const stripe = new FakeStripe()
  const version = domain.calculateAgreementPaymentState(ledger.record.snapshot).balanceVersion
  const result = await runtime.createAdditionalPaymentInvoice({ agreementId: ledger.record.snapshot.agreementId, amountCents: 50000, asOf: AS_OF, expectedBalanceVersion: version, ledger, stripe })
  assert.equal(result.ok, true)
  assert.equal(stripe.calls[0].customerId, 'cus_existing')
  assert.equal(stripe.calls[0].metadata.jm1_payment_type, 'ADDITIONAL_PAYMENT')
})

test('exact payoff marks durable agreement paid and stops recurring cadence', async () => {
  const ledger = new MemoryLedger(agreement({ contractualBalanceCents: 11742, scheduledObligations: [{ obligationId: 'final', dueDate: '2026-09-01T00:00:00.000Z', amountCents: 11742, status: 'PAST_DUE' }] }))
  const { result } = await confirm({ ledger, amountCents: 11742, intent: 'CURRENT_PAYMENT' })
  assert.equal(result.ok, true)
  assert.equal(ledger.record.status, 'PAID_IN_FULL')
  assert.equal(domain.calculateAgreementPaymentState(ledger.record.snapshot).recurringCadenceActive, false)
})

test('ledger state rebuild is deterministic across event order', () => {
  const p1 = { paymentId: 'pi_1', eventId: 'evt_1', paymentType: 'ADDITIONAL_PAYMENT', amountCents: 10000, status: 'SUCCEEDED' }
  const p2 = { paymentId: 'pi_2', eventId: 'evt_2', paymentType: 'ADDITIONAL_PAYMENT', amountCents: 20000, status: 'SUCCEEDED' }
  const a = domain.calculateAgreementPaymentState(snapshot({ payments: [p1, p2] }))
  const b = domain.calculateAgreementPaymentState(snapshot({ payments: [p2, p1] }))
  assert.equal(a.remainingBalanceCents, b.remainingBalanceCents)
  assert.equal(a.balanceVersion, b.balanceVersion)
})

test('production gate stays closed until every commissioned dependency is explicit', () => {
  const closed = runtime.productionPaymentGateReadback({ JMP_AGREEMENT_PAYMENT_GATE_ENABLED: 'true' })
  assert.equal(closed.enabled, false)
  assert.ok(closed.missing.includes('JMP_PAYMENT_QBO_WRITE_COMMISSIONED'))
  const open = runtime.productionPaymentGateReadback({
    JMP_AGREEMENT_PAYMENT_GATE_ENABLED: 'true',
    JMP_PAYMENT_LEDGER_COMMISSIONED: 'true',
    JMP_PAYMENT_RECURRING_EXECUTOR_COMMISSIONED: 'true',
    JMP_PAYMENT_STRIPE_RUNTIME_COMMISSIONED: 'true',
    JMP_PAYMENT_QBO_WRITE_COMMISSIONED: 'true',
    JMP_PAYMENT_QBO_READBACK_COMMISSIONED: 'true',
    JMP_PAYMENT_MONITORING_COMMISSIONED: 'true',
  })
  assert.equal(open.enabled, true)
})

test('monitoring health fails closed without executor freshness and on QBO mismatch', () => {
  const health = runtime.evaluatePaymentRuntimeHealth({
    now: AS_OF,
    lastExecutorCompletedAt: null,
    webhookFailures: 0,
    deadLetterCount: 0,
    balanceProcessingFailures: 0,
    qboPostingFailures: 0,
    qboReadbackMismatches: 1,
    scheduleStopFailures: 0,
  })
  assert.equal(health.status, 'ATTENTION_REQUIRED')
  assert.deepEqual(health.failures, ['EXECUTOR_STALE', 'QBO_READBACK_MISMATCH'])
})
