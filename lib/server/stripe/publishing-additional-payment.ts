import { createHash } from 'node:crypto'

import { calculateAgreementPaymentState } from './publishing-agreement-payment'
import {
  createAdditionalPaymentCheckoutSession,
  readAdditionalPaymentCheckoutSession,
  DataversePublishingPaymentLedger,
} from './publishing-payment-adapters'
import { productionAdditionalPaymentGateReadback } from './publishing-payment-runtime'
import { getDataverseServerConfig } from '../dataverse-server'

export async function resolveAdditionalPaymentEligibility(input: {
  contactId: string
  engagementId?: string | null
}) {
  const gate = productionAdditionalPaymentGateReadback()
  if (!gate.enabled) return { eligible: false as const, reason: 'ADDITIONAL_PAYMENT_GATE_CLOSED', missing: gate.missing }
  const config = getDataverseServerConfig()
  if (!config) return { eligible: false as const, reason: 'DATAVERSE_CONFIG_MISSING' }
  const ledger = new DataversePublishingPaymentLedger(config)
  const agreements = await ledger.findActiveAgreementsForAuthor(input.contactId)
  const engagementId = clean(input.engagementId)
  const matches = engagementId
    ? agreements.filter((agreement) => agreement.snapshot.agreementId === engagementId)
    : agreements
  if (matches.length !== 1) {
    return { eligible: false as const, reason: matches.length === 0 ? 'OBLIGATION_NOT_FOUND' : 'OBLIGATION_AMBIGUOUS' }
  }
  const agreement = matches[0]
  if (!agreement.stripeCustomerId) return { eligible: false as const, reason: 'STRIPE_CUSTOMER_BINDING_INVALID' }
  const state = calculateAgreementPaymentState(agreement.snapshot)
  if (state.remainingBalanceCents <= 0) return { eligible: false as const, reason: 'BALANCE_NOT_OUTSTANDING' }
  return {
    eligible: true as const,
    agreement,
    state,
    obligationId: null,
    engagementId: engagementId || agreement.snapshot.agreementId,
    maximumAmountCents: state.remainingBalanceCents,
  }
}

export async function startAdditionalPayment(input: {
  contactId: string
  engagementId?: string | null
  amountCents: number
  operationId: string
}) {
  const eligibility = await resolveAdditionalPaymentEligibility(input)
  if (!eligibility.eligible) return eligibility
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 100) {
    return { eligible: true as const, started: false as const, reason: 'PAYMENT_AMOUNT_INVALID', maximumAmountCents: eligibility.maximumAmountCents }
  }
  if (input.amountCents > eligibility.maximumAmountCents) {
    return { eligible: true as const, started: false as const, reason: 'PAYMENT_EXCEEDS_REMAINING_BALANCE', maximumAmountCents: eligibility.maximumAmountCents }
  }
  const operationId = clean(input.operationId)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(operationId)) {
    return { eligible: true as const, started: false as const, reason: 'PAYMENT_OPERATION_ID_INVALID', maximumAmountCents: eligibility.maximumAmountCents }
  }
  const requestId = additionalPaymentRequestId(eligibility.agreement.snapshot.agreementId, operationId)
  const idempotencyKey = hash('checkout', requestId)
  const ledger = new DataversePublishingPaymentLedger(getDataverseServerConfig()!)
  const preparation = await ledger.reserveAdditionalPaymentPreparation({
    requestId, idempotencyKey,
    agreementId: eligibility.agreement.snapshot.agreementId,
    authorId: eligibility.agreement.snapshot.authorId,
    titleId: eligibility.agreement.snapshot.titleId,
    engagementId: eligibility.engagementId,
    sourceEvent: { kind: 'AUTHOR_PORTAL', operationId },
    obligationId: null,
    amountCents: input.amountCents,
    balanceBeforeCents: eligibility.state.remainingBalanceCents,
    balanceAfterCents: eligibility.state.remainingBalanceCents - input.amountCents,
    balanceVersion: eligibility.state.balanceVersion,
    createdAt: new Date().toISOString(),
  })
  if (preparation.agreementId !== eligibility.agreement.snapshot.agreementId || preparation.amountCents !== input.amountCents ||
      preparation.idempotencyKey !== idempotencyKey || preparation.obligationId !== null ||
      preparation.authorId !== eligibility.agreement.snapshot.authorId || preparation.titleId !== eligibility.agreement.snapshot.titleId ||
      preparation.engagementId !== eligibility.engagementId || preparation.sourceEvent?.kind !== 'AUTHOR_PORTAL' ||
      preparation.sourceEvent.operationId !== operationId) {
    return { eligible: true as const, started: false as const, reason: 'PAYMENT_OPERATION_BINDING_MISMATCH' }
  }
  const existing = await ledger.findAdditionalPaymentRequest(requestId)
  if (existing) {
    if (existing.agreementId !== preparation.agreementId || existing.amountCents !== preparation.amountCents ||
        existing.idempotencyKey !== preparation.idempotencyKey) throw new Error('PAYMENT_REQUEST_BINDING_MISMATCH')
    const session = await readAdditionalPaymentCheckoutSession({ request: existing, customerId: eligibility.agreement.stripeCustomerId! })
    return { eligible: true as const, started: true as const, idempotent: true as const,
      amountCents: existing.amountCents, maximumAmountCents: eligibility.maximumAmountCents,
      balanceVersion: existing.balanceVersion, requestId, qboSyncState: 'PENDING_RECONCILIATION' as const, ...session }
  }
  const denial = additionalPaymentPreparationDenial(preparation, eligibility.state.balanceVersion, Date.now())
  if (denial) return { eligible: true as const, started: false as const, reason: denial }
  const session = await createAdditionalPaymentCheckoutSession({
    agreement: eligibility.agreement,
    amountCents: input.amountCents,
    requestId,
    idempotencyKey,
    engagementId: eligibility.engagementId,
    obligationId: eligibility.obligationId,
    balanceVersion: preparation.balanceVersion,
  })
  await ledger.recordAdditionalPaymentRequest({
    ...preparation,
    stripeCheckoutSessionId: session.sessionId,
    expiresAt: session.expiresAt,
  })
  return {
    eligible: true as const,
    started: true as const,
    amountCents: input.amountCents,
    maximumAmountCents: eligibility.maximumAmountCents,
    balanceVersion: eligibility.state.balanceVersion,
    requestId,
    qboSyncState: 'PENDING_RECONCILIATION' as const,
    ...session,
  }
}

export function additionalPaymentRequestId(agreementId: string, operationId: string) {
  return hash('request-v2', clean(agreementId), clean(operationId))
}

export function additionalPaymentPreparationDenial(preparation: { createdAt: string; balanceVersion: string }, balanceVersion: string, now: number) {
  const age = now - Date.parse(preparation.createdAt)
  // Stripe may prune idempotency keys after 24 hours; never recreate an ambiguous session beyond that window.
  if (!Number.isFinite(age) || age < 0 || age >= 23 * 60 * 60 * 1000) return 'PAYMENT_PROVIDER_RECONCILIATION_REQUIRED'
  if (preparation.balanceVersion !== balanceVersion) return 'STALE_AGREEMENT_BALANCE'
  return null
}

function hash(...parts: string[]) {
  return `jmp_${createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 40)}`
}

function clean(value?: string | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}
