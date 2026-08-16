// Engine: Publishing Lifecycle Context Policy
// Reusable? Y
// Stage-specific exception? N

export type PublishingLifecycleContext = 'PROSPECT_INQUIRY' | 'ACTIVE_CONTRACTED_AUTHOR'

export type PublishingDecisionType = 'PROSPECT_PACKAGE_SELECTION' | 'EDITORIAL_STAGE_APPROVAL'

export type PublishingCommunicationClass =
  | 'PROSPECT_EDITORIAL_REVIEW_RECOMMENDATION'
  | 'PROSPECT_PACKAGE_FOLLOWUP'
  | 'COMMERCIAL_AGREEMENT_ACTION'
  | 'ACTIVE_AUTHOR_DEVELOPMENTAL_REVIEW'
  | 'ACTIVE_AUTHOR_LINE_REVIEW'
  | 'ACTIVE_AUTHOR_COPY_REVIEW'
  | 'ACTIVE_AUTHOR_PROOF_REVIEW'
  | 'PRODUCTION_APPROVAL'

export type LifecycleDerivationInput = {
  lifecycleContext?: string | null
  businessStage?: string | null
  commercialStatus?: string | null
  agreementStatus?: string | null
  agreementExecuted?: boolean | null
  paymentStatus?: string | null
  onboardingStatus?: string | null
  projectStatus?: string | null
  opportunityStage?: string | null
  hasOpportunity?: boolean | null
  hasAuthorWorkspace?: boolean | null
  hasDiagnostic?: boolean | null
  hasEditorialGate?: boolean | null
  hasContact?: boolean | null
  hasTitle?: boolean | null
}

export type CommunicationPolicyInput = {
  lifecycleContext: PublishingLifecycleContext
  businessStage?: string | null
  decisionType: PublishingDecisionType
  artifactType?: string | null
}

export type CommunicationPolicy = {
  lifecycleContext: PublishingLifecycleContext
  decisionType: PublishingDecisionType
  communicationClass: PublishingCommunicationClass
  templateName: string
  waitingState: string
  authorFacingCta: string
  responseConsumer: 'PACKAGE_SELECTION_CONSUMER' | 'AUTHOR_REVIEW_RESPONSE_CONSUMER'
  activeAuthorApprovalLanguageAllowed: boolean
}

const ACTIVE_CONTEXT_VALUES = new Set([
  'ACTIVE_CONTRACTED_AUTHOR',
  'ACTIVE_AUTHOR',
  'CONTRACTED_AUTHOR',
  'CONTRACTED',
  'ONBOARDED',
  'PROJECT_ACTIVE',
])

const ACTIVE_BUSINESS_VALUES = new Set([
  'FULFILLMENT_AUTHORIZED',
  'PUBLISHING_AUTHORIZED',
  'ACTIVE_PROJECT',
  'CONTRACT_EXECUTED',
  'AGREEMENT_EXECUTED',
  'AGREEMENT_SIGNED',
  'PAID',
  'PAYMENT_CONFIRMED',
  'ONBOARDING_COMPLETE',
])

export function derivePublishingLifecycleContext(input: LifecycleDerivationInput): PublishingLifecycleContext {
  if (ACTIVE_CONTEXT_VALUES.has(normalizeEnum(input.lifecycleContext))) return 'ACTIVE_CONTRACTED_AUTHOR'

  const agreementActive =
    input.agreementExecuted === true ||
    ACTIVE_BUSINESS_VALUES.has(normalizeEnum(input.agreementStatus)) ||
    ACTIVE_BUSINESS_VALUES.has(normalizeEnum(input.commercialStatus))
  const paymentActive = ACTIVE_BUSINESS_VALUES.has(normalizeEnum(input.paymentStatus))
  const onboardingActive = ACTIVE_BUSINESS_VALUES.has(normalizeEnum(input.onboardingStatus))
  const projectActive =
    ACTIVE_BUSINESS_VALUES.has(normalizeEnum(input.projectStatus)) ||
    ACTIVE_BUSINESS_VALUES.has(normalizeEnum(input.businessStage))

  if (agreementActive && (paymentActive || onboardingActive || projectActive)) return 'ACTIVE_CONTRACTED_AUTHOR'

  return 'PROSPECT_INQUIRY'
}

export function resolveCommunicationPolicy(input: CommunicationPolicyInput): CommunicationPolicy {
  if (input.lifecycleContext === 'PROSPECT_INQUIRY') {
    if (input.decisionType !== 'PROSPECT_PACKAGE_SELECTION') {
      throw new Error('COMMUNICATION_POLICY_BLOCKED:PROSPECT_REQUIRES_PACKAGE_SELECTION_DECISION')
    }
    return {
      lifecycleContext: 'PROSPECT_INQUIRY',
      decisionType: 'PROSPECT_PACKAGE_SELECTION',
      communicationClass: 'PROSPECT_EDITORIAL_REVIEW_RECOMMENDATION',
      templateName: 'EDITORIAL_RECOMMENDATION_LETTER_V1',
      waitingState: 'PROSPECT_PACKAGE_SELECTION',
      authorFacingCta: 'Choose My Publishing Path',
      responseConsumer: 'PACKAGE_SELECTION_CONSUMER',
      activeAuthorApprovalLanguageAllowed: false,
    }
  }

  if (input.decisionType !== 'EDITORIAL_STAGE_APPROVAL') {
    throw new Error('COMMUNICATION_POLICY_BLOCKED:ACTIVE_AUTHOR_REQUIRES_EDITORIAL_STAGE_APPROVAL')
  }
  return {
    lifecycleContext: 'ACTIVE_CONTRACTED_AUTHOR',
    decisionType: 'EDITORIAL_STAGE_APPROVAL',
    communicationClass: activeAuthorCommunicationClass(input.businessStage || input.artifactType || ''),
    templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
    waitingState: 'AWAITING_AUTHOR_RESPONSE',
    authorFacingCta: 'Review Materials',
    responseConsumer: 'AUTHOR_REVIEW_RESPONSE_CONSUMER',
    activeAuthorApprovalLanguageAllowed: true,
  }
}

export function prospectEditorialReviewDispatchBlocker(input: LifecycleDerivationInput & { stageCode?: string | null }) {
  if (normalizeEnum(input.stageCode) !== 'EDITORIAL_REVIEW') return ''
  const context = derivePublishingLifecycleContext(input)
  return context === 'PROSPECT_INQUIRY'
    ? 'PROSPECT_EDITORIAL_REVIEW_REQUIRES_PROSPECT_PACKAGE_SELECTION_PATH'
    : ''
}

function activeAuthorCommunicationClass(stage: string): PublishingCommunicationClass {
  const normalized = normalizeEnum(stage)
  if (normalized.includes('DEVELOPMENTAL')) return 'ACTIVE_AUTHOR_DEVELOPMENTAL_REVIEW'
  if (normalized.includes('LINE')) return 'ACTIVE_AUTHOR_LINE_REVIEW'
  if (normalized.includes('COPY')) return 'ACTIVE_AUTHOR_COPY_REVIEW'
  if (normalized.includes('PROOF')) return 'ACTIVE_AUTHOR_PROOF_REVIEW'
  return 'PRODUCTION_APPROVAL'
}

function normalizeEnum(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
