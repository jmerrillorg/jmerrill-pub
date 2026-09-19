export type StripePaymentCorrelation = {
  opportunityId: string | null
  engagementId: string | null
  titleId: string | null
  paymentRequestId: string | null
  actionRequestId: string | null
  agreementId: string | null
  invalidMetadataKeys: string[]
}

export type CorrelationCandidate = {
  jm1_sourcerecordid?: unknown
}

const METADATA_KEYS = {
  jm1_opportunity_id: 'opportunityId',
  jm1_engagement_id: 'engagementId',
  jm1_title_id: 'titleId',
  jm1_work_id: 'titleId',
  jm1_payment_request_id: 'paymentRequestId',
  jm1_action_request_id: 'actionRequestId',
  jm1_agreement_id: 'agreementId',
} as const

export function extractStripePaymentCorrelation(metadata: Record<string, string> | null | undefined): StripePaymentCorrelation {
  const result: StripePaymentCorrelation = {
    opportunityId: null,
    engagementId: null,
    titleId: null,
    paymentRequestId: null,
    actionRequestId: null,
    agreementId: null,
    invalidMetadataKeys: [],
  }

  for (const [metadataKey, resultKey] of Object.entries(METADATA_KEYS)) {
    const value = normalizeGuid(metadata?.[metadataKey])
    if (!metadata?.[metadataKey]) continue
    if (!value) {
      result.invalidMetadataKeys.push(metadataKey)
      continue
    }
    if (result[resultKey] && result[resultKey] !== value) {
      result.invalidMetadataKeys.push(metadataKey)
      continue
    }
    result[resultKey] = value
  }

  return result
}

export function selectOpportunityCorrelation(input: {
  directOpportunityId?: string | null
  candidates?: CorrelationCandidate[]
}) {
  const directOpportunityId = normalizeGuid(input.directOpportunityId)
  const candidateIds = [...new Set(
    (input.candidates || [])
      .map((candidate) => normalizeGuid(candidate.jm1_sourcerecordid))
      .filter((value): value is string => Boolean(value)),
  )]

  if (directOpportunityId) {
    if (candidateIds.some((candidateId) => candidateId !== directOpportunityId)) {
      return { ok: false as const, reason: 'PAYMENT_OPPORTUNITY_CORRELATION_CONFLICT', candidateIds }
    }
    return {
      ok: true as const,
      opportunityId: directOpportunityId,
      authority: 'STRIPE_METADATA_OR_GOVERNED_CORRECTION' as const,
      candidateIds,
    }
  }

  if (candidateIds.length === 1) {
    return {
      ok: true as const,
      opportunityId: candidateIds[0],
      authority: 'DURABLE_EXECUTION_LOG_BINDING' as const,
      candidateIds,
    }
  }
  if (candidateIds.length > 1) {
    return { ok: false as const, reason: 'PAYMENT_OPPORTUNITY_CORRELATION_AMBIGUOUS', candidateIds }
  }
  return { ok: false as const, reason: 'PAYMENT_OPPORTUNITY_CORRELATION_NOT_FOUND', candidateIds }
}

export function canonicalInitialPaymentEffectKey(opportunityId: string) {
  const normalizedOpportunityId = normalizeGuid(opportunityId)
  if (!normalizedOpportunityId) throw new Error('invalid_opportunity_id')
  return `INITIAL-PAYMENT-CONFIRMED-${normalizedOpportunityId}-INITIAL`
}

export function stripePaymentBindingName(value: string) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) throw new Error('stripe_payment_binding_value_required')
  const digest = createHash('sha256').update(normalized).digest('hex').slice(0, 32)
  return `STRIPE-PAYMENT-BINDING-${digest}`
}

export function normalizeGuid(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/^\{/, '').replace(/\}$/, '').toLowerCase()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(normalized)
    ? normalized
    : null
}
import { createHash } from 'crypto'
