import { createHash } from 'node:crypto'

import { calculateAgreementPaymentState } from './publishing-agreement-payment'
import {
  createAdditionalPaymentCheckoutSession,
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
  const obligation = (agreement.snapshot.scheduledObligations || []).find((item) => item.status !== 'SATISFIED' && item.status !== 'CANCELLED')
  if (!obligation) return { eligible: false as const, reason: 'OBLIGATION_NOT_FOUND' }
  return {
    eligible: true as const,
    agreement,
    state,
    obligationId: obligation.obligationId,
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
  const requestId = hash('request', eligibility.agreement.snapshot.agreementId, eligibility.state.balanceVersion, String(input.amountCents), operationId)
  const idempotencyKey = hash('checkout', requestId)
  const session = await createAdditionalPaymentCheckoutSession({
    agreement: eligibility.agreement,
    amountCents: input.amountCents,
    requestId,
    idempotencyKey,
    engagementId: eligibility.engagementId,
    obligationId: eligibility.obligationId,
    balanceVersion: eligibility.state.balanceVersion,
  })
  await new DataversePublishingPaymentLedger(getDataverseServerConfig()!).recordAdditionalPaymentRequest({
    requestId,
    idempotencyKey,
    agreementId: eligibility.agreement.snapshot.agreementId,
    obligationId: eligibility.obligationId,
    amountCents: input.amountCents,
    balanceBeforeCents: eligibility.state.remainingBalanceCents,
    balanceAfterCents: eligibility.state.remainingBalanceCents - input.amountCents,
    balanceVersion: eligibility.state.balanceVersion,
    stripeCheckoutSessionId: session.sessionId,
    expiresAt: session.expiresAt,
    createdAt: new Date().toISOString(),
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

function hash(...parts: string[]) {
  return `jmp_${createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 40)}`
}

function clean(value?: string | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}
