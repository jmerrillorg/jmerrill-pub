import { createHash } from 'node:crypto'

import {
  allocateIncomingPayment,
  calculateAgreementPaymentState,
  type AgreementPayment,
  type AgreementPaymentAllocation,
  type AgreementPaymentSnapshot,
  type AgreementRefund,
  type IncomingPaymentIntent,
} from './publishing-agreement-payment'

export const PUBLISHING_PAYMENT_RUNTIME_VERSION = 'JMP_PAYMENTS_EXTRA_002_RUNTIME_v1.0'

export type AgreementLedgerRecord = {
  snapshot: AgreementPaymentSnapshot
  stripeCustomerId: string
  qboCustomerReference: string
  qboReceivableReference: string
  etag: string
  status: 'ACTIVE' | 'PAID_IN_FULL' | 'HOLD'
}

export type PaymentEventRecord = {
  paymentEventId: string
  agreementId: string
  paymentType: 'SCHEDULED_INSTALLMENT' | 'ADDITIONAL_PAYMENT'
  stripeEventId: string
  stripePaymentId: string
  stripeInvoiceId: string | null
  grossAmountCents: number
  scheduledAllocationCents: number
  pastDueAllocationCents: number
  additionalAllocationCents: number
  allocations: AgreementPaymentAllocation[]
  balanceBeforeCents: number
  balanceAfterCents: number
  status: 'CONFIRMED' | 'REFUNDED_PARTIAL' | 'REFUNDED_FULL'
  qboReconciliationStatus: 'PENDING' | 'PASS' | 'ATTENTION_REQUIRED'
  qboTransactionId: string | null
  idempotencyKey: string
  occurredAt: string
}

export type CollectionAttempt = {
  executionKey: string
  agreementId: string
  obligationId: string | null
  amountCents: number
  stripeInvoiceId: string
  status: 'CREATED'
  createdAt: string
}

export interface PublishingPaymentLedger {
  getAgreement(agreementId: string): Promise<AgreementLedgerRecord | null>
  listDueAgreements(asOf: string): Promise<AgreementLedgerRecord[]>
  findPaymentEvent(stripeEventId: string, stripePaymentId: string): Promise<PaymentEventRecord | null>
  appendConfirmedPayment(input: {
    agreement: AgreementLedgerRecord
    event: PaymentEventRecord
    payment: AgreementPayment
    expectedEtag: string
  }): Promise<{ applied: boolean; record: AgreementLedgerRecord }>
  appendRefund(input: {
    agreement: AgreementLedgerRecord
    refund: AgreementRefund
    expectedEtag: string
  }): Promise<{ applied: boolean; record: AgreementLedgerRecord }>
  findCollectionAttempt(executionKey: string): Promise<CollectionAttempt | null>
  recordCollectionAttempt(attempt: CollectionAttempt): Promise<void>
  markQboReconciliation(input: {
    paymentEventId: string
    status: 'PASS' | 'ATTENTION_REQUIRED'
    qboTransactionId?: string | null
  }): Promise<void>
}

export interface StripeAgreementCollections {
  createInvoice(input: {
    customerId: string
    amountCents: number
    idempotencyKey: string
    metadata: Record<string, string>
  }): Promise<{ invoiceId: string }>
}

export type QboPaymentEffect = {
  effectType: 'PAYMENT' | 'REFUND'
  idempotencyKey: string
  customerReference: string
  receivableReference: string
  grossAmountCents: number
  stripePaymentId: string
  stripeInvoiceId: string | null
  allocationFingerprint: string
  originalPaymentId: string | null
}

export interface QboPublishingPaymentAdapter {
  postCustomerPayment(effect: QboPaymentEffect): Promise<{ transactionId: string }>
  readCustomerPayment(transactionId: string): Promise<QboPaymentEffect | null>
}

export type PaymentRuntimeTelemetry = (event: {
  name: string
  success: boolean
  code: string
  agreementId?: string
}) => void

export function evaluatePaymentRuntimeHealth(input: {
  now: string
  lastExecutorCompletedAt?: string | null
  webhookFailures: number
  deadLetterCount: number
  balanceProcessingFailures: number
  qboPostingFailures: number
  qboReadbackMismatches: number
  scheduleStopFailures: number
  executorFreshnessHours?: number
}) {
  const now = assertRuntimeDate(input.now)
  const freshnessHours = input.executorFreshnessHours || 26
  const lastExecutor = input.lastExecutorCompletedAt ? Date.parse(input.lastExecutorCompletedAt) : Number.NaN
  const failures = [
    !Number.isFinite(lastExecutor) || now - lastExecutor > freshnessHours * 60 * 60 * 1000 ? 'EXECUTOR_STALE' : null,
    input.webhookFailures > 0 ? 'STRIPE_WEBHOOK_FAILURE' : null,
    input.deadLetterCount > 0 ? 'PAYMENT_DEAD_LETTER_PRESENT' : null,
    input.balanceProcessingFailures > 0 ? 'BALANCE_PROCESSING_FAILURE' : null,
    input.qboPostingFailures > 0 ? 'QBO_POSTING_FAILURE' : null,
    input.qboReadbackMismatches > 0 ? 'QBO_READBACK_MISMATCH' : null,
    input.scheduleStopFailures > 0 ? 'AUTOPAY_TERMINATION_FAILURE' : null,
  ].filter((value): value is string => Boolean(value))
  return { status: failures.length === 0 ? 'PASS' as const : 'ATTENTION_REQUIRED' as const, failures }
}

export function productionPaymentGateReadback(env: NodeJS.ProcessEnv = process.env) {
  const required = [
    'JMP_PAYMENT_LEDGER_COMMISSIONED',
    'JMP_PAYMENT_RECURRING_EXECUTOR_COMMISSIONED',
    'JMP_PAYMENT_STRIPE_RUNTIME_COMMISSIONED',
    'JMP_PAYMENT_QBO_WRITE_COMMISSIONED',
    'JMP_PAYMENT_QBO_READBACK_COMMISSIONED',
    'JMP_PAYMENT_MONITORING_COMMISSIONED',
  ] as const
  const missing = required.filter((key) => clean(env[key]).toLowerCase() !== 'true')
  const requested = clean(env.JMP_AGREEMENT_PAYMENT_GATE_ENABLED).toLowerCase() === 'true'
  return {
    enabled: requested && missing.length === 0,
    requested,
    missing,
    status: requested && missing.length === 0 ? 'PASS' : 'CLOSED',
  } as const
}

export async function runRecurringInstallmentExecutor(input: {
  asOf: string
  ledger: PublishingPaymentLedger
  stripe: StripeAgreementCollections
  telemetry?: PaymentRuntimeTelemetry
}) {
  assertRuntimeDate(input.asOf)
  const agreements = await input.ledger.listDueAgreements(input.asOf)
  const results: Array<Record<string, unknown>> = []
  for (const agreement of agreements) {
    const state = calculateAgreementPaymentState(agreement.snapshot)
    if (agreement.status !== 'ACTIVE' || state.paidInFull) {
      results.push({ agreementId: agreement.snapshot.agreementId, status: 'SKIPPED_NOT_ACTIVE' })
      continue
    }
    const obligation = nextDueObligation(agreement.snapshot, input.asOf)
    if (!obligation) {
      results.push({ agreementId: agreement.snapshot.agreementId, status: 'SKIPPED_NOT_DUE' })
      continue
    }
    const amountCents = Math.min(obligation.amountCents, state.remainingBalanceCents)
    const executionKey = hashKey('scheduled', agreement.snapshot.agreementId, obligation.obligationId)
    const existing = await input.ledger.findCollectionAttempt(executionKey)
    if (existing) {
      results.push({ agreementId: agreement.snapshot.agreementId, status: 'IDEMPOTENT_REPLAY', invoiceId: existing.stripeInvoiceId })
      continue
    }
    try {
      const invoice = await input.stripe.createInvoice({
        customerId: required(agreement.stripeCustomerId, 'STRIPE_CUSTOMER_REQUIRED'),
        amountCents,
        idempotencyKey: executionKey,
        metadata: paymentMetadata(agreement, 'SCHEDULED_INSTALLMENT', obligation.obligationId, state.balanceVersion),
      })
      await input.ledger.recordCollectionAttempt({
        executionKey,
        agreementId: agreement.snapshot.agreementId,
        obligationId: obligation.obligationId,
        amountCents,
        stripeInvoiceId: invoice.invoiceId,
        status: 'CREATED',
        createdAt: input.asOf,
      })
      input.telemetry?.({ name: 'publishing.payment.executor', success: true, code: 'INVOICE_CREATED', agreementId: agreement.snapshot.agreementId })
      results.push({ agreementId: agreement.snapshot.agreementId, status: 'INVOICE_CREATED', amountCents, invoiceId: invoice.invoiceId })
    } catch (error) {
      input.telemetry?.({ name: 'publishing.payment.executor', success: false, code: safeCode(error), agreementId: agreement.snapshot.agreementId })
      results.push({ agreementId: agreement.snapshot.agreementId, status: 'ATTENTION_REQUIRED', code: safeCode(error) })
    }
  }
  return { ok: results.every((row) => row.status !== 'ATTENTION_REQUIRED'), processed: results.length, results }
}

export async function createAdditionalPaymentInvoice(input: {
  agreementId: string
  amountCents: number
  asOf: string
  expectedBalanceVersion: string
  ledger: PublishingPaymentLedger
  stripe: StripeAgreementCollections
}) {
  const agreement = await input.ledger.getAgreement(input.agreementId)
  if (!agreement) return blocked('AGREEMENT_NOT_FOUND')
  const allocation = allocateIncomingPayment({
    snapshot: agreement.snapshot,
    amountCents: input.amountCents,
    intent: 'ADDITIONAL_PAYMENT',
    asOf: input.asOf,
    submittedBalanceVersion: input.expectedBalanceVersion,
  })
  if (!allocation.ok) return allocation
  const executionKey = hashKey('additional', input.agreementId, input.expectedBalanceVersion, String(input.amountCents))
  const existing = await input.ledger.findCollectionAttempt(executionKey)
  if (existing) return { ok: true as const, idempotent: true, invoiceId: existing.stripeInvoiceId, allocation }
  const invoice = await input.stripe.createInvoice({
    customerId: required(agreement.stripeCustomerId, 'STRIPE_CUSTOMER_REQUIRED'),
    amountCents: input.amountCents,
    idempotencyKey: executionKey,
    metadata: paymentMetadata(agreement, 'ADDITIONAL_PAYMENT', null, input.expectedBalanceVersion),
  })
  await input.ledger.recordCollectionAttempt({
    executionKey,
    agreementId: input.agreementId,
    obligationId: null,
    amountCents: input.amountCents,
    stripeInvoiceId: invoice.invoiceId,
    status: 'CREATED',
    createdAt: input.asOf,
  })
  return { ok: true as const, idempotent: false, invoiceId: invoice.invoiceId, allocation }
}

export async function processConfirmedAgreementPayment(input: {
  agreementId: string
  stripeEventId: string
  stripePaymentId: string
  stripeInvoiceId?: string | null
  amountCents: number
  intent: IncomingPaymentIntent
  occurredAt: string
  submittedBalanceVersion: string
  ledger: PublishingPaymentLedger
  qbo: QboPublishingPaymentAdapter
  telemetry?: PaymentRuntimeTelemetry
}) {
  const duplicate = await input.ledger.findPaymentEvent(input.stripeEventId, input.stripePaymentId)
  if (duplicate) {
    if (duplicate.qboReconciliationStatus === 'PASS') return { ok: true as const, idempotent: true, event: duplicate }
    const agreement = await input.ledger.getAgreement(input.agreementId)
    if (!agreement) return blocked('AGREEMENT_NOT_FOUND')
    return reconcileQboEffect({ agreement, event: duplicate, ledger: input.ledger, qbo: input.qbo, telemetry: input.telemetry, idempotent: true })
  }
  const agreement = await input.ledger.getAgreement(input.agreementId)
  if (!agreement) return blocked('AGREEMENT_NOT_FOUND')
  const allocation = allocateIncomingPayment({
    snapshot: agreement.snapshot,
    amountCents: input.amountCents,
    intent: input.intent,
    asOf: input.occurredAt,
    submittedBalanceVersion: input.submittedBalanceVersion,
  })
  if (!allocation.ok) return allocation
  const paymentType = allocation.additionalAllocationCents === input.amountCents ? 'ADDITIONAL_PAYMENT' : 'SCHEDULED_INSTALLMENT'
  const idempotencyKey = hashKey('payment', input.stripePaymentId)
  const paymentEventId = hashKey('event', input.stripeEventId)
  const event: PaymentEventRecord = {
    paymentEventId,
    agreementId: input.agreementId,
    paymentType,
    stripeEventId: input.stripeEventId,
    stripePaymentId: input.stripePaymentId,
    stripeInvoiceId: input.stripeInvoiceId || null,
    grossAmountCents: input.amountCents,
    scheduledAllocationCents: allocation.scheduledAllocationCents,
    pastDueAllocationCents: allocation.pastDueAllocationCents,
    additionalAllocationCents: allocation.additionalAllocationCents,
    allocations: allocation.allocations,
    balanceBeforeCents: allocation.balanceBeforeCents,
    balanceAfterCents: allocation.balanceAfterCents,
    status: 'CONFIRMED',
    qboReconciliationStatus: 'PENDING',
    qboTransactionId: null,
    idempotencyKey,
    occurredAt: input.occurredAt,
  }
  const payment: AgreementPayment = {
    paymentId: input.stripePaymentId,
    eventId: input.stripeEventId,
    paymentType,
    amountCents: input.amountCents,
    status: 'SUCCEEDED',
    allocations: allocation.allocations,
    paidAt: input.occurredAt,
  }
  const committed = await input.ledger.appendConfirmedPayment({ agreement, event, payment, expectedEtag: agreement.etag })
  if (!committed.applied) return blocked('CONCURRENT_BALANCE_WRITE_REJECTED')

  return reconcileQboEffect({ agreement: committed.record, event, ledger: input.ledger, qbo: input.qbo, telemetry: input.telemetry, idempotent: false })
}

async function reconcileQboEffect(input: {
  agreement: AgreementLedgerRecord
  event: PaymentEventRecord
  ledger: PublishingPaymentLedger
  qbo: QboPublishingPaymentAdapter
  telemetry?: PaymentRuntimeTelemetry
  idempotent: boolean
}) {
  try {
    const effect = buildQboEffect(input.agreement, input.event)
    const posted = await input.qbo.postCustomerPayment(effect)
    const readback = await input.qbo.readCustomerPayment(posted.transactionId)
    if (!readback || stable(readback) !== stable(effect)) {
      await input.ledger.markQboReconciliation({ paymentEventId: input.event.paymentEventId, status: 'ATTENTION_REQUIRED', qboTransactionId: posted.transactionId })
      input.telemetry?.({ name: 'publishing.payment.qbo', success: false, code: 'QBO_READBACK_MISMATCH', agreementId: input.agreement.snapshot.agreementId })
      return blocked('QBO_READBACK_MISMATCH', { paymentRecorded: true, paymentEventId: input.event.paymentEventId })
    }
    await input.ledger.markQboReconciliation({ paymentEventId: input.event.paymentEventId, status: 'PASS', qboTransactionId: posted.transactionId })
    input.telemetry?.({ name: 'publishing.payment.qbo', success: true, code: 'QBO_RECONCILED', agreementId: input.agreement.snapshot.agreementId })
    return { ok: true as const, idempotent: input.idempotent, event: { ...input.event, qboReconciliationStatus: 'PASS' as const, qboTransactionId: posted.transactionId } }
  } catch (error) {
    await input.ledger.markQboReconciliation({ paymentEventId: input.event.paymentEventId, status: 'ATTENTION_REQUIRED' })
    input.telemetry?.({ name: 'publishing.payment.qbo', success: false, code: safeCode(error), agreementId: input.agreement.snapshot.agreementId })
    return blocked('QBO_RECONCILIATION_FAILED', { paymentRecorded: true, paymentEventId: input.event.paymentEventId, detail: safeCode(error) })
  }
}

export async function processConfirmedAgreementRefund(input: {
  agreementId: string
  refund: AgreementRefund
  ledger: PublishingPaymentLedger
  qbo: QboPublishingPaymentAdapter
}) {
  const agreement = await input.ledger.getAgreement(input.agreementId)
  if (!agreement) return blocked('AGREEMENT_NOT_FOUND')
  const original = agreement.snapshot.payments.find((row) => row.paymentId === input.refund.originalPaymentId)
  if (!original) return blocked('REFUND_ORIGINAL_PAYMENT_NOT_FOUND')
  const committed = await input.ledger.appendRefund({ agreement, refund: input.refund, expectedEtag: agreement.etag })
  if (!committed.applied) return blocked('CONCURRENT_BALANCE_WRITE_REJECTED')
  const refundEventId = hashKey('refund-event', input.refund.eventId)
  try {
    const effect: QboPaymentEffect = {
      effectType: 'REFUND',
      idempotencyKey: hashKey('refund', input.refund.refundId),
      customerReference: required(agreement.qboCustomerReference, 'QBO_CUSTOMER_REFERENCE_REQUIRED'),
      receivableReference: required(agreement.qboReceivableReference, 'QBO_RECEIVABLE_REFERENCE_REQUIRED'),
      grossAmountCents: input.refund.amountCents,
      stripePaymentId: input.refund.refundId,
      stripeInvoiceId: null,
      allocationFingerprint: hashKey(stable(original.allocations || [])),
      originalPaymentId: input.refund.originalPaymentId,
    }
    const posted = await input.qbo.postCustomerPayment(effect)
    const readback = await input.qbo.readCustomerPayment(posted.transactionId)
    if (!readback || stable(readback) !== stable(effect)) {
      await input.ledger.markQboReconciliation({ paymentEventId: refundEventId, status: 'ATTENTION_REQUIRED', qboTransactionId: posted.transactionId })
      return blocked('QBO_REFUND_READBACK_MISMATCH', { refundRecorded: true })
    }
    await input.ledger.markQboReconciliation({ paymentEventId: refundEventId, status: 'PASS', qboTransactionId: posted.transactionId })
  } catch (error) {
    await input.ledger.markQboReconciliation({ paymentEventId: refundEventId, status: 'ATTENTION_REQUIRED' })
    return blocked('QBO_REFUND_RECONCILIATION_FAILED', { refundRecorded: true, detail: safeCode(error) })
  }
  return { ok: true as const, idempotent: false, state: calculateAgreementPaymentState(committed.record.snapshot) }
}

export function processFailedAgreementPayment(input: { stripeEventId: string; stripePaymentId: string }) {
  return {
    ok: true as const,
    code: 'FAILED_PAYMENT_RECORDED_WITHOUT_BALANCE_EFFECT',
    stripeEventId: required(input.stripeEventId, 'STRIPE_EVENT_ID_REQUIRED'),
    stripePaymentId: required(input.stripePaymentId, 'STRIPE_PAYMENT_ID_REQUIRED'),
    financialEffect: 0,
  }
}

function buildQboEffect(agreement: AgreementLedgerRecord, event: PaymentEventRecord): QboPaymentEffect {
  return {
    effectType: 'PAYMENT',
    idempotencyKey: event.idempotencyKey,
    customerReference: required(agreement.qboCustomerReference, 'QBO_CUSTOMER_REFERENCE_REQUIRED'),
    receivableReference: required(agreement.qboReceivableReference, 'QBO_RECEIVABLE_REFERENCE_REQUIRED'),
    grossAmountCents: event.grossAmountCents,
    stripePaymentId: event.stripePaymentId,
    stripeInvoiceId: event.stripeInvoiceId,
    allocationFingerprint: hashKey(stable(event.allocations)),
    originalPaymentId: null,
  }
}

function nextDueObligation(snapshot: AgreementPaymentSnapshot, asOf: string) {
  const asOfTime = assertRuntimeDate(asOf)
  return (snapshot.scheduledObligations || [])
    .filter((row) => row.status === 'PAST_DUE' || (row.status === 'SCHEDULED' && Date.parse(row.dueDate) <= asOfTime))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.obligationId.localeCompare(b.obligationId))[0] || null
}

function paymentMetadata(
  agreement: AgreementLedgerRecord,
  paymentType: 'SCHEDULED_INSTALLMENT' | 'ADDITIONAL_PAYMENT',
  obligationId: string | null,
  balanceVersion: string,
) {
  return Object.fromEntries(Object.entries({
    jm1_runtime: PUBLISHING_PAYMENT_RUNTIME_VERSION,
    jm1_payment_type: paymentType,
    jm1_author_id: agreement.snapshot.authorId,
    jm1_agreement_id: agreement.snapshot.agreementId,
    jm1_title_id: agreement.snapshot.titleId,
    jm1_payment_schedule_id: agreement.snapshot.paymentScheduleId,
    jm1_balance_version: balanceVersion,
    jm1_scheduled_obligation_id: obligationId || '',
  }).filter(([, value]) => value))
}

function assertRuntimeDate(value: string) {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw new Error('RUNTIME_DATE_INVALID')
  return timestamp
}

function hashKey(...parts: string[]) {
  return `jmp_${createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 40)}`
}

function required(value: string, code: string) {
  const result = clean(value)
  if (!result) throw new Error(code)
  return result
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function stable(value: unknown): string {
  return JSON.stringify(stableValue(value))
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => [key, stableValue(row)]))
}

function safeCode(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 100) : 'UNKNOWN_RUNTIME_FAILURE'
}

function blocked(reason: string, extra: Record<string, unknown> = {}) {
  return { ok: false as const, reason, financialEffect: 0, ...extra }
}
