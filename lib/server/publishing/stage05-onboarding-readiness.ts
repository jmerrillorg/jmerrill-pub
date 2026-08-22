export type Stage05RequirementClassification =
  | 'REQUIRED_BEFORE_EDITORIAL_PRODUCTION'
  | 'REQUIRED_BEFORE_BOOK_PRODUCTION'
  | 'REQUIRED_BEFORE_METADATA'
  | 'REQUIRED_BEFORE_DISTRIBUTION'
  | 'REQUIRED_BEFORE_FIRST_ROYALTY_PAYMENT'
  | 'OPTIONAL'
  | 'COLLECTED_ELSEWHERE'
  | 'ALREADY_SATISFIED'
  | 'MISSING_GOVERNANCE'
  | 'OBSOLETE'

export type Stage05ReadinessInput = {
  commercialProductionAuthorized: boolean
  agreementExecuted: boolean
  initialPaymentReceived: boolean
  workspaceStatus: 'ACTIVE' | 'PROVISIONING' | 'MISSING'
  authorAccessGrantFound: boolean
  duplicateWorkspaceFound: boolean
  authorProfileKnown: boolean
  manuscriptReceived: boolean
  manuscriptSourceCertified: boolean
  authorReviewDeliveryCertified: boolean
  packageSku: string
  developmentalAddOnApproved: boolean
  paymentObligationComplete: boolean
  payoutEnrollmentComplete: boolean
}

export type Stage05Requirement = {
  item: string
  classification: Stage05RequirementClassification
  blocksEditorialProduction: boolean
  note: string
}

export const stage05OnboardingRequirementLabels = [
  'author profile confirmation',
  'production preferences',
  'metadata/positioning confirmation',
  'royalty/payment setup confirmation',
  'workspace access confirmation',
] as const

export function classifyStage05OnboardingRequirements(input: Stage05ReadinessInput): Stage05Requirement[] {
  return [
    {
      item: 'author profile confirmation',
      classification: input.authorProfileKnown ? 'ALREADY_SATISFIED' : 'REQUIRED_BEFORE_EDITORIAL_PRODUCTION',
      blocksEditorialProduction: !input.authorProfileKnown,
      note: input.authorProfileKnown
        ? 'Author identity is collected from the Contact, executed agreement, and active opportunity.'
        : 'Core author identity must be confirmed before active editorial production.',
    },
    {
      item: 'production preferences',
      classification: 'REQUIRED_BEFORE_BOOK_PRODUCTION',
      blocksEditorialProduction: false,
      note: 'Production preferences are needed before book production decisions, not before editorial work.',
    },
    {
      item: 'metadata/positioning confirmation',
      classification: 'REQUIRED_BEFORE_METADATA',
      blocksEditorialProduction: false,
      note: 'Metadata and positioning support catalog/distribution preparation and should not block editorial production by default.',
    },
    {
      item: 'royalty/payment setup confirmation',
      classification: input.payoutEnrollmentComplete
        ? 'ALREADY_SATISFIED'
        : 'REQUIRED_BEFORE_FIRST_ROYALTY_PAYMENT',
      blocksEditorialProduction: false,
      note: 'Royalty payout setup is required before the first royalty payment, not before editorial production.',
    },
    {
      item: 'workspace access confirmation',
      classification: workspaceAccessSatisfied(input) ? 'ALREADY_SATISFIED' : 'REQUIRED_BEFORE_EDITORIAL_PRODUCTION',
      blocksEditorialProduction: !workspaceAccessSatisfied(input),
      note: workspaceAccessSatisfied(input)
        ? 'Workspace is active and a non-duplicate access entitlement is present.'
        : 'The active workspace state must be paired with a confirmed author access entitlement before relying on workspace-based author action.',
    },
  ]
}

export function deriveStage05Readiness(input: Stage05ReadinessInput) {
  const requirements = classifyStage05OnboardingRequirements(input)
  const editorialRequirementBlocked = requirements.some((item) => item.blocksEditorialProduction)
  const commercialGate =
    input.commercialProductionAuthorized && input.agreementExecuted && input.initialPaymentReceived
  const manuscriptGate = input.manuscriptReceived && input.manuscriptSourceCertified

  return {
    requirements,
    editorialProductionReady:
      commercialGate &&
      manuscriptGate &&
      input.authorReviewDeliveryCertified &&
      !editorialRequirementBlocked,
    bookProductionReady: false,
    metadataReady: false,
    distributionReady: false,
    royaltyPayoutReady: input.payoutEnrollmentComplete,
    finalDeliveryPaymentReady: input.paymentObligationComplete,
    commercialGate,
    manuscriptGate,
    authorReviewDeliveryCertified: input.authorReviewDeliveryCertified,
    nextEditorialStage: resolveStarterEditorialPath(input),
  }
}

export function resolveStarterEditorialPath(input: Pick<Stage05ReadinessInput, 'packageSku' | 'developmentalAddOnApproved'>) {
  return {
    includedStages: ['Editorial Review', 'Line Editing', 'Copy Editing', 'Proofreading'],
    developmentalIncluded: input.developmentalAddOnApproved,
    nextStageAfterEditorialReview: input.developmentalAddOnApproved ? 'Developmental Editing' : 'Line Editing',
  }
}

function workspaceAccessSatisfied(input: Stage05ReadinessInput) {
  return input.workspaceStatus === 'ACTIVE' && input.authorAccessGrantFound && !input.duplicateWorkspaceFound
}
