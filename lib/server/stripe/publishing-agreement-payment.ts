import { createHash } from 'node:crypto'

export const PUBLISHING_AGREEMENT_PAYMENT_VERSION = 'JMP_PAYMENTS_EXTRA_002_v1.0'

export const PAYMENT_TYPES = ['SCHEDULED_INSTALLMENT', 'ADDITIONAL_PAYMENT'] as const
export type PublishingPaymentType = (typeof PAYMENT_TYPES)[number]

export type AgreementPayment = {
  paymentId: string
  eventId: string
  paymentType: PublishingPaymentType
  amountCents: number
  status: 'SUCCEEDED' | 'FAILED'
  scheduledObligationId?: string | null
  allocations?: AgreementPaymentAllocation[]
  paidAt?: string | null
}

export type ScheduledObligation = {
  obligationId: string
  dueDate: string
  amountCents: number
  status: 'SCHEDULED' | 'PAST_DUE' | 'SATISFIED' | 'CANCELLED'
}

export type AgreementPaymentAllocation = {
  kind: 'PAST_DUE_SCHEDULED_INSTALLMENT' | 'CURRENT_DUE_SCHEDULED_INSTALLMENT' | 'ADDITIONAL_PAYMENT'
  amountCents: number
  scheduledObligationId?: string | null
}

export type AgreementRefund = {
  refundId: string
  eventId: string
  originalPaymentId: string
  amountCents: number
  status: 'SUCCEEDED' | 'FAILED'
  refundedAt?: string | null
}

export type AgreementPaymentSnapshot = {
  agreementId: string
  authorId: string
  titleId: string
  paymentScheduleId: string
  currency: 'usd'
  contractualBalanceCents: number
  normalInstallmentCents: number
  nextScheduledDueDate?: string | null
  scheduledObligations?: ScheduledObligation[]
  payments: AgreementPayment[]
  refunds?: AgreementRefund[]
}

export type AgreementPaymentState = {
  contractualBalanceCents: number
  grossPaymentsAppliedCents: number
  refundsAppliedCents: number
  netPaymentsAppliedCents: number
  remainingBalanceCents: number
  normalInstallmentCents: number
  nextScheduledInstallmentCents: number
  remainingInstallmentCount: number
  projectedFinalCollectionCents: number
  paidInFull: boolean
  recurringCadenceActive: boolean
  nextScheduledDueDate: string | null
  pastDueBalanceCents: number
  balanceVersion: string
}

export type PaymentAllocation = {
  paymentType: PublishingPaymentType
  amountCents: number
  scheduledObligationId?: string | null
}

export type IncomingPaymentIntent = 'CURRENT_PAYMENT' | 'ADDITIONAL_PAYMENT' | 'CURRENT_PLUS_ADDITIONAL'

export type PublishingPaymentMetadata = {
  jm1_runtime: string
  jm1_payment_type: PublishingPaymentType
  jm1_author_id: string
  jm1_agreement_id: string
  jm1_title_id: string
  jm1_payment_schedule_id: string
  jm1_contract_balance_before: string
  jm1_contract_balance_after: string
  jm1_balance_version: string
  jm1_scheduled_obligation_id?: string
}

export function calculateAgreementPaymentState(snapshot: AgreementPaymentSnapshot): AgreementPaymentState {
  assertSnapshot(snapshot)

  const successfulPayments = uniqueById(
    snapshot.payments.filter((payment) => payment.status === 'SUCCEEDED'),
    (payment) => payment.paymentId,
  )
  const successfulRefunds = uniqueById(
    (snapshot.refunds || []).filter((refund) => refund.status === 'SUCCEEDED'),
    (refund) => refund.refundId,
  )

  const paymentsById = new Map(successfulPayments.map((payment) => [payment.paymentId, payment]))
  const refundedByPayment = new Map<string, number>()
  for (const refund of successfulRefunds) {
    const original = paymentsById.get(refund.originalPaymentId)
    if (!original) throw contractError('REFUND_ORIGINAL_PAYMENT_NOT_FOUND')
    const next = (refundedByPayment.get(refund.originalPaymentId) || 0) + integerCents(refund.amountCents)
    if (next > original.amountCents) throw contractError('REFUND_EXCEEDS_ORIGINAL_PAYMENT')
    refundedByPayment.set(refund.originalPaymentId, next)
  }

  const grossPaymentsAppliedCents = successfulPayments.reduce(
    (sum, payment) => sum + integerCents(payment.amountCents),
    0,
  )
  const refundsAppliedCents = successfulRefunds.reduce(
    (sum, refund) => sum + integerCents(refund.amountCents),
    0,
  )
  const netPaymentsAppliedCents = grossPaymentsAppliedCents - refundsAppliedCents
  if (netPaymentsAppliedCents > snapshot.contractualBalanceCents) {
    throw contractError('PAYMENTS_EXCEED_CONTRACTUAL_BALANCE')
  }

  const remainingBalanceCents = snapshot.contractualBalanceCents - netPaymentsAppliedCents
  const nextScheduledInstallmentCents = Math.min(snapshot.normalInstallmentCents, remainingBalanceCents)
  const paidInFull = remainingBalanceCents === 0
  const obligationState = calculateObligationState(snapshot)

  return {
    contractualBalanceCents: snapshot.contractualBalanceCents,
    grossPaymentsAppliedCents,
    refundsAppliedCents,
    netPaymentsAppliedCents,
    remainingBalanceCents,
    normalInstallmentCents: snapshot.normalInstallmentCents,
    nextScheduledInstallmentCents,
    remainingInstallmentCount: paidInFull
      ? 0
      : Math.ceil(remainingBalanceCents / snapshot.normalInstallmentCents),
    projectedFinalCollectionCents: paidInFull
      ? 0
      : remainingBalanceCents % snapshot.normalInstallmentCents || snapshot.normalInstallmentCents,
    paidInFull,
    recurringCadenceActive: !paidInFull,
    nextScheduledDueDate: paidInFull ? null : clean(snapshot.nextScheduledDueDate) || null,
    pastDueBalanceCents: paidInFull ? 0 : obligationState.pastDueBalanceCents,
    balanceVersion: buildBalanceVersion(snapshot),
  }
}

export function allocateIncomingPayment(input: {
  snapshot: AgreementPaymentSnapshot
  amountCents: number
  intent: IncomingPaymentIntent
  asOf: string
  submittedBalanceVersion?: string | null
}) {
  const state = calculateAgreementPaymentState(input.snapshot)
  if (input.submittedBalanceVersion && input.submittedBalanceVersion !== state.balanceVersion) {
    return blocked('STALE_AGREEMENT_BALANCE')
  }
  if (state.paidInFull) return blocked('AGREEMENT_ALREADY_PAID_IN_FULL')
  const amountCents = integerCents(input.amountCents)
  if (amountCents <= 0) return blocked('PAYMENT_AMOUNT_INVALID')
  if (amountCents > state.remainingBalanceCents) {
    return blocked('PAYMENT_EXCEEDS_REMAINING_BALANCE', { permissibleAmountCents: state.remainingBalanceCents })
  }

  const obligations = listOpenScheduledObligations(input.snapshot)
  const asOf = requiredDate(input.asOf, 'PAYMENT_ALLOCATION_DATE_INVALID')
  const allocations: AgreementPaymentAllocation[] = []
  let unallocatedCents = amountCents

  for (const obligation of obligations.filter((row) => requiredDate(row.dueDate, 'SCHEDULED_DUE_DATE_INVALID') < asOf)) {
    if (unallocatedCents === 0) break
    const allocated = Math.min(obligation.remainingCents, unallocatedCents)
    allocations.push({
      kind: 'PAST_DUE_SCHEDULED_INSTALLMENT',
      amountCents: allocated,
      scheduledObligationId: obligation.obligationId,
    })
    unallocatedCents -= allocated
  }

  if (unallocatedCents > 0 && input.intent !== 'ADDITIONAL_PAYMENT') {
    const current = obligations.find((row) => requiredDate(row.dueDate, 'SCHEDULED_DUE_DATE_INVALID') >= asOf)
    if (current) {
      const allocated = Math.min(current.remainingCents, unallocatedCents)
      allocations.push({
        kind: 'CURRENT_DUE_SCHEDULED_INSTALLMENT',
        amountCents: allocated,
        scheduledObligationId: current.obligationId,
      })
      unallocatedCents -= allocated
    }
  }

  if (unallocatedCents > 0) {
    allocations.push({ kind: 'ADDITIONAL_PAYMENT', amountCents: unallocatedCents })
  }

  return {
    ok: true as const,
    allocations,
    amountCents,
    pastDueAllocationCents: sumAllocation(allocations, 'PAST_DUE_SCHEDULED_INSTALLMENT'),
    scheduledAllocationCents: sumAllocation(allocations, 'CURRENT_DUE_SCHEDULED_INSTALLMENT'),
    additionalAllocationCents: sumAllocation(allocations, 'ADDITIONAL_PAYMENT'),
    balanceBeforeCents: state.remainingBalanceCents,
    balanceAfterCents: state.remainingBalanceCents - amountCents,
    paidInFullAfter: state.remainingBalanceCents === amountCents,
  }
}

export function validatePaymentAllocations(input: {
  state: AgreementPaymentState
  allocations: PaymentAllocation[]
  submittedBalanceVersion?: string | null
}) {
  const allocations = input.allocations || []
  if (allocations.length === 0) return blocked('PAYMENT_ALLOCATION_REQUIRED')
  if (input.submittedBalanceVersion && input.submittedBalanceVersion !== input.state.balanceVersion) {
    return blocked('STALE_AGREEMENT_BALANCE')
  }
  if (input.state.paidInFull) return blocked('AGREEMENT_ALREADY_PAID_IN_FULL')

  let totalCents = 0
  let scheduledCount = 0
  for (const allocation of allocations) {
    if (!isPaymentType(allocation.paymentType)) return blocked('PAYMENT_TYPE_INVALID')
    const amountCents = integerCents(allocation.amountCents)
    if (amountCents <= 0) return blocked('PAYMENT_AMOUNT_INVALID')
    totalCents += amountCents

    if (allocation.paymentType === 'SCHEDULED_INSTALLMENT') {
      scheduledCount += 1
      if (!clean(allocation.scheduledObligationId)) return blocked('SCHEDULED_OBLIGATION_ID_REQUIRED')
      if (amountCents !== input.state.nextScheduledInstallmentCents) {
        return blocked('SCHEDULED_INSTALLMENT_AMOUNT_INVALID', {
          permissibleAmountCents: input.state.nextScheduledInstallmentCents,
        })
      }
    }
  }

  if (scheduledCount > 1) return blocked('MULTIPLE_SCHEDULED_ALLOCATIONS_NOT_ALLOWED')
  if (totalCents > input.state.remainingBalanceCents) {
    return blocked('PAYMENT_EXCEEDS_REMAINING_BALANCE', {
      permissibleAmountCents: input.state.remainingBalanceCents,
    })
  }

  return {
    ok: true as const,
    totalCents,
    allocations: allocations.map((allocation) => ({
      ...allocation,
      amountCents: integerCents(allocation.amountCents),
    })),
    balanceBeforeCents: input.state.remainingBalanceCents,
    balanceAfterCents: input.state.remainingBalanceCents - totalCents,
  }
}

export function applyConfirmedPayment(input: {
  snapshot: AgreementPaymentSnapshot
  payment: AgreementPayment
  expectedBalanceVersion?: string | null
}) {
  const before = calculateAgreementPaymentState(input.snapshot)
  const validation = validatePaymentAllocations({
    state: before,
    submittedBalanceVersion: input.expectedBalanceVersion,
    allocations: [{
      paymentType: input.payment.paymentType,
      amountCents: input.payment.amountCents,
      scheduledObligationId: input.payment.scheduledObligationId,
    }],
  })
  if (!validation.ok) return validation

  const existing = input.snapshot.payments.find((payment) => payment.paymentId === input.payment.paymentId)
  if (existing) {
    if (stableJson(existing) !== stableJson(input.payment)) return blocked('PAYMENT_ID_CONFLICT')
    return { ok: true as const, idempotent: true, before, after: before }
  }

  const after = calculateAgreementPaymentState({
    ...input.snapshot,
    payments: [...input.snapshot.payments, input.payment],
  })
  return { ok: true as const, idempotent: false, before, after }
}

export function applyConfirmedRefund(input: {
  snapshot: AgreementPaymentSnapshot
  refund: AgreementRefund
}) {
  const before = calculateAgreementPaymentState(input.snapshot)
  const existing = (input.snapshot.refunds || []).find((refund) => refund.refundId === input.refund.refundId)
  if (existing) {
    if (stableJson(existing) !== stableJson(input.refund)) return blocked('REFUND_ID_CONFLICT')
    return { ok: true as const, idempotent: true, before, after: before }
  }
  if (input.refund.status !== 'SUCCEEDED') {
    return { ok: true as const, idempotent: false, before, after: before }
  }

  try {
    const after = calculateAgreementPaymentState({
      ...input.snapshot,
      refunds: [...(input.snapshot.refunds || []), input.refund],
    })
    return { ok: true as const, idempotent: false, before, after }
  } catch (error) {
    return blocked(error instanceof Error ? error.message : 'REFUND_INVALID')
  }
}

export function buildPublishingPaymentMetadata(input: {
  snapshot: AgreementPaymentSnapshot
  paymentType: PublishingPaymentType
  amountCents: number
  scheduledObligationId?: string | null
}) {
  const state = calculateAgreementPaymentState(input.snapshot)
  const validation = validatePaymentAllocations({
    state,
    allocations: [{
      paymentType: input.paymentType,
      amountCents: input.amountCents,
      scheduledObligationId: input.scheduledObligationId,
    }],
  })
  if (!validation.ok) return validation

  const metadata: PublishingPaymentMetadata = {
    jm1_runtime: PUBLISHING_AGREEMENT_PAYMENT_VERSION,
    jm1_payment_type: input.paymentType,
    jm1_author_id: input.snapshot.authorId,
    jm1_agreement_id: input.snapshot.agreementId,
    jm1_title_id: input.snapshot.titleId,
    jm1_payment_schedule_id: input.snapshot.paymentScheduleId,
    jm1_contract_balance_before: String(validation.balanceBeforeCents),
    jm1_contract_balance_after: String(validation.balanceAfterCents),
    jm1_balance_version: state.balanceVersion,
  }
  if (input.scheduledObligationId) metadata.jm1_scheduled_obligation_id = input.scheduledObligationId
  return { ok: true as const, metadata, validation }
}

export function parsePublishingPaymentMetadata(metadata: Record<string, string> | null | undefined) {
  const paymentType = clean(metadata?.jm1_payment_type).toUpperCase()
  if (!paymentType) return { ok: false as const, reason: 'PAYMENT_TYPE_MISSING' }
  if (!isPaymentType(paymentType)) return { ok: false as const, reason: 'PAYMENT_TYPE_INVALID' }

  const required = [
    'jm1_author_id',
    'jm1_agreement_id',
    'jm1_title_id',
    'jm1_payment_schedule_id',
    'jm1_balance_version',
  ] as const
  const missing = required.filter((key) => !clean(metadata?.[key]))
  if (missing.length > 0) return { ok: false as const, reason: 'PAYMENT_METADATA_INCOMPLETE', missing }

  return {
    ok: true as const,
    paymentType,
    authorId: clean(metadata?.jm1_author_id),
    agreementId: clean(metadata?.jm1_agreement_id),
    titleId: clean(metadata?.jm1_title_id),
    paymentScheduleId: clean(metadata?.jm1_payment_schedule_id),
    balanceVersion: clean(metadata?.jm1_balance_version),
    scheduledObligationId: clean(metadata?.jm1_scheduled_obligation_id) || null,
    balanceBeforeCents: parseMetadataCents(metadata?.jm1_contract_balance_before),
    balanceAfterCents: parseMetadataCents(metadata?.jm1_contract_balance_after),
  }
}

export function buildBalanceVersion(snapshot: AgreementPaymentSnapshot) {
  const paymentFacts = snapshot.payments
    .map((payment) => [payment.paymentId, payment.paymentType, payment.amountCents, payment.status])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  const refundFacts = (snapshot.refunds || [])
    .map((refund) => [refund.refundId, refund.originalPaymentId, refund.amountCents, refund.status])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  const obligationFacts = (snapshot.scheduledObligations || [])
    .map((obligation) => [obligation.obligationId, obligation.dueDate, obligation.amountCents, obligation.status])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  return createHash('sha256')
    .update(stableJson({
      agreementId: snapshot.agreementId,
      contractualBalanceCents: snapshot.contractualBalanceCents,
      normalInstallmentCents: snapshot.normalInstallmentCents,
      obligationFacts,
      paymentFacts,
      refundFacts,
    }))
    .digest('hex')
    .slice(0, 32)
}

function calculateObligationState(snapshot: AgreementPaymentSnapshot) {
  const obligations = listOpenScheduledObligations(snapshot)
  const pastDueBalanceCents = obligations
    .filter((row) => row.status === 'PAST_DUE')
    .reduce((sum, row) => sum + row.remainingCents, 0)
  return { pastDueBalanceCents }
}

export function listOpenScheduledObligations(snapshot: AgreementPaymentSnapshot) {
  const applied = new Map<string, number>()
  for (const payment of uniqueById(snapshot.payments.filter((row) => row.status === 'SUCCEEDED'), (row) => row.paymentId)) {
    for (const allocation of payment.allocations || []) {
      if (!allocation.scheduledObligationId || allocation.kind === 'ADDITIONAL_PAYMENT') continue
      applied.set(
        allocation.scheduledObligationId,
        (applied.get(allocation.scheduledObligationId) || 0) + integerCents(allocation.amountCents),
      )
    }
  }
  for (const refund of uniqueById((snapshot.refunds || []).filter((row) => row.status === 'SUCCEEDED'), (row) => row.refundId)) {
    const original = snapshot.payments.find((row) => row.paymentId === refund.originalPaymentId)
    let remainingRefund = integerCents(refund.amountCents)
    for (const allocation of [...(original?.allocations || [])].reverse()) {
      if (remainingRefund === 0) break
      const reversed = Math.min(remainingRefund, allocation.amountCents)
      if (allocation.scheduledObligationId && allocation.kind !== 'ADDITIONAL_PAYMENT') {
        applied.set(allocation.scheduledObligationId, Math.max(0, (applied.get(allocation.scheduledObligationId) || 0) - reversed))
      }
      remainingRefund -= reversed
    }
  }
  return (snapshot.scheduledObligations || [])
    .filter((row) => row.status !== 'SATISFIED' && row.status !== 'CANCELLED')
    .map((row) => ({ ...row, remainingCents: Math.max(0, integerCents(row.amountCents) - (applied.get(row.obligationId) || 0)) }))
    .filter((row) => row.remainingCents > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.obligationId.localeCompare(b.obligationId))
}

function sumAllocation(allocations: AgreementPaymentAllocation[], kind: AgreementPaymentAllocation['kind']) {
  return allocations.filter((row) => row.kind === kind).reduce((sum, row) => sum + row.amountCents, 0)
}

function requiredDate(value: string, code: string) {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw contractError(code)
  return timestamp
}

function assertSnapshot(snapshot: AgreementPaymentSnapshot) {
  if (!clean(snapshot.agreementId)) throw contractError('AGREEMENT_ID_REQUIRED')
  if (!clean(snapshot.authorId)) throw contractError('AUTHOR_ID_REQUIRED')
  if (!clean(snapshot.titleId)) throw contractError('TITLE_ID_REQUIRED')
  if (!clean(snapshot.paymentScheduleId)) throw contractError('PAYMENT_SCHEDULE_ID_REQUIRED')
  if (snapshot.currency !== 'usd') throw contractError('PAYMENT_CURRENCY_INVALID')
  if (integerCents(snapshot.contractualBalanceCents) <= 0) throw contractError('CONTRACTUAL_BALANCE_INVALID')
  if (integerCents(snapshot.normalInstallmentCents) <= 0) throw contractError('NORMAL_INSTALLMENT_INVALID')
  const obligationIds = new Set<string>()
  for (const obligation of snapshot.scheduledObligations || []) {
    if (!clean(obligation.obligationId)) throw contractError('SCHEDULED_OBLIGATION_ID_REQUIRED')
    if (obligationIds.has(obligation.obligationId)) throw contractError('SCHEDULED_OBLIGATION_ID_CONFLICT')
    obligationIds.add(obligation.obligationId)
    if (integerCents(obligation.amountCents) <= 0) throw contractError('SCHEDULED_OBLIGATION_AMOUNT_INVALID')
    requiredDate(obligation.dueDate, 'SCHEDULED_DUE_DATE_INVALID')
  }
  for (const payment of snapshot.payments) {
    if (!payment.allocations) continue
    const allocated = payment.allocations.reduce((sum, allocation) => sum + integerCents(allocation.amountCents), 0)
    if (allocated !== integerCents(payment.amountCents)) throw contractError('PAYMENT_ALLOCATION_TOTAL_MISMATCH')
  }
}

function uniqueById<T>(rows: T[], id: (row: T) => string) {
  const values = new Map<string, T>()
  for (const row of rows) {
    const key = clean(id(row))
    if (!key) throw contractError('PAYMENT_EVENT_ID_REQUIRED')
    const current = values.get(key)
    if (current && stableJson(current) !== stableJson(row)) throw contractError('PAYMENT_EVENT_ID_CONFLICT')
    values.set(key, row)
  }
  return [...values.values()]
}

function parseMetadataCents(value: unknown) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function integerCents(value: unknown) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) throw contractError('PAYMENT_AMOUNT_MUST_BE_INTEGER_CENTS')
  return parsed
}

function isPaymentType(value: unknown): value is PublishingPaymentType {
  return PAYMENT_TYPES.includes(value as PublishingPaymentType)
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function stableJson(value: unknown) {
  return JSON.stringify(sortForStableJson(value))
}

function sortForStableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForStableJson)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortForStableJson(nested)]),
  )
}

function contractError(code: string) {
  return Object.assign(new Error(code), { code })
}

function blocked(reason: string, extra: Record<string, unknown> = {}) {
  return { ok: false as const, reason, ...extra }
}
