export type HumanReviewType =
  | 'COVER_REVIEW'
  | 'INTERIOR_REVIEW'
  | 'PROOF_REVIEW'
  | 'EDITORIAL_ARTIFACT_REVIEW'
  | 'DISTRIBUTION_FILE_QA'
  | 'MARKETING_CREATIVE_REVIEW'

export type ProductionArtifactClass =
  | 'BRIEF'
  | 'SOURCE'
  | 'WORKING_ARTIFACT'
  | 'REVIEW_ARTIFACT'
  | 'APPROVED_ARTIFACT'
  | 'EVIDENCE_ARTIFACT'

export type ReviewReadinessStatus = 'INTERNAL_REVIEW_ELIGIBLE' | 'REVIEW_ARTIFACT_NOT_READY'

export type ReviewArtifact = {
  id: string
  titleId: string
  name: string
  artifactClass: ProductionArtifactClass
  reviewType?: HumanReviewType
  state: 'DRAFT' | 'READY_FOR_REVIEW' | 'APPROVED' | 'SUPERSEDED' | 'ARCHIVED'
  governedReference?: string
  checksum?: string
  version?: string
  reviewerAccess?: boolean
  visualReviewable?: boolean
  current?: boolean
}

export type ReviewReadinessInput = {
  titleId: string
  title: string
  reviewType: HumanReviewType
  assignedReviewer?: string
  decisionRequest?: string
  artifacts: ReviewArtifact[]
}

export type ReviewReadinessDefinition = {
  reviewType: HumanReviewType
  requiredArtifactClass: ProductionArtifactClass
  requiredArtifactState: ReviewArtifact['state']
  reviewerAccessRequirement: 'DIRECT_GOVERNED_SURFACE'
  allowedExtensions: string[]
  normalGovernedLocation: string
}

export type ReviewReadinessResult = {
  status: ReviewReadinessStatus
  eligible: boolean
  reviewType: HumanReviewType
  requiredArtifactClass: ProductionArtifactClass
  requiredArtifactState: ReviewArtifact['state']
  assignedReviewer: string | null
  reviewerAccessGate: 'PASS' | 'FAIL'
  decisionRequestDefined: boolean
  selectedArtifact: ReviewArtifact | null
  blockers: ReviewReadinessBlocker[]
  rootCauses: ReviewReadinessRootCause[]
  artifactCounts: {
    candidates: number
    reviewArtifacts: number
    briefs: number
    evidenceArtifacts: number
  }
  sideEffects: {
    artworkGenerated: 0
    authorCommunications: 0
    marketingActivations: 0
    distributionActivity: 0
    financialActivity: 0
  }
}

export type ReviewReadinessBlocker =
  | 'REVIEW_ARTIFACT_MISSING'
  | 'REVIEW_ARTIFACT_WRONG_CLASS'
  | 'REVIEW_ARTIFACT_WRONG_TITLE'
  | 'REVIEW_ARTIFACT_SUPERSEDED'
  | 'REVIEW_ARTIFACT_NOT_CURRENT'
  | 'REVIEW_ARTIFACT_GOVERNED_REFERENCE_MISSING'
  | 'REVIEW_ARTIFACT_CHECKSUM_OR_VERSION_MISSING'
  | 'REVIEWER_MISSING'
  | 'REVIEWER_ACCESS_NOT_VERIFIED'
  | 'DECISION_REQUEST_MISSING'
  | 'REVIEW_ARTIFACT_NOT_VISUAL_FOR_COVER'
  | 'DUPLICATE_REVIEW_ARTIFACTS_REVIEW_REQUIRED'

export type ReviewReadinessRootCause =
  | 'ARTIFACT_TYPE_MODEL_GAP'
  | 'REVIEW_READINESS_GATE_GAP'
  | 'REVIEWER_SURFACING_GAP'
  | 'PRODUCTION_STATE_MODEL_GAP'
  | 'SINGLE_OPERATOR_SURFACE_GAP'

export const REVIEW_READINESS_CONTRACT_VERSION = 'HUMAN_REVIEW_ARTIFACT_READINESS_V1'

export const reviewReadinessDefinitions: Record<HumanReviewType, ReviewReadinessDefinition> = {
  COVER_REVIEW: {
    reviewType: 'COVER_REVIEW',
    requiredArtifactClass: 'REVIEW_ARTIFACT',
    requiredArtifactState: 'READY_FOR_REVIEW',
    reviewerAccessRequirement: 'DIRECT_GOVERNED_SURFACE',
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
    normalGovernedLocation: '01_Titles/06_Production/02_Cover-Design',
  },
  INTERIOR_REVIEW: {
    reviewType: 'INTERIOR_REVIEW',
    requiredArtifactClass: 'REVIEW_ARTIFACT',
    requiredArtifactState: 'READY_FOR_REVIEW',
    reviewerAccessRequirement: 'DIRECT_GOVERNED_SURFACE',
    allowedExtensions: ['.pdf'],
    normalGovernedLocation: '01_Titles/06_Production/02_Interior-Layout',
  },
  PROOF_REVIEW: {
    reviewType: 'PROOF_REVIEW',
    requiredArtifactClass: 'REVIEW_ARTIFACT',
    requiredArtifactState: 'READY_FOR_REVIEW',
    reviewerAccessRequirement: 'DIRECT_GOVERNED_SURFACE',
    allowedExtensions: ['.pdf'],
    normalGovernedLocation: '01_Titles/05_Proofreading',
  },
  EDITORIAL_ARTIFACT_REVIEW: {
    reviewType: 'EDITORIAL_ARTIFACT_REVIEW',
    requiredArtifactClass: 'REVIEW_ARTIFACT',
    requiredArtifactState: 'READY_FOR_REVIEW',
    reviewerAccessRequirement: 'DIRECT_GOVERNED_SURFACE',
    allowedExtensions: ['.docx', '.pdf', '.md'],
    normalGovernedLocation: '01_Titles/01_Editorial-Review',
  },
  DISTRIBUTION_FILE_QA: {
    reviewType: 'DISTRIBUTION_FILE_QA',
    requiredArtifactClass: 'REVIEW_ARTIFACT',
    requiredArtifactState: 'READY_FOR_REVIEW',
    reviewerAccessRequirement: 'DIRECT_GOVERNED_SURFACE',
    allowedExtensions: ['.pdf', '.epub', '.jpg', '.jpeg', '.png'],
    normalGovernedLocation: '01_Titles/07_Distribution',
  },
  MARKETING_CREATIVE_REVIEW: {
    reviewType: 'MARKETING_CREATIVE_REVIEW',
    requiredArtifactClass: 'REVIEW_ARTIFACT',
    requiredArtifactState: 'READY_FOR_REVIEW',
    reviewerAccessRequirement: 'DIRECT_GOVERNED_SURFACE',
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf', '.mp4'],
    normalGovernedLocation: '01_Titles/08_Marketing',
  },
}

export function evaluateHumanReviewReadiness(input: ReviewReadinessInput): ReviewReadinessResult {
  const definition = reviewReadinessDefinitions[input.reviewType]
  const blockers: ReviewReadinessBlocker[] = []
  const rootCauses = new Set<ReviewReadinessRootCause>()
  const candidatesForTitle = input.artifacts.filter((artifact) => artifact.titleId === input.titleId)
  const wrongTitleReviewArtifacts = input.artifacts.filter(
    (artifact) => artifact.artifactClass === definition.requiredArtifactClass && artifact.titleId !== input.titleId,
  )
  const reviewArtifacts = candidatesForTitle.filter(
    (artifact) => artifact.artifactClass === definition.requiredArtifactClass && (!artifact.reviewType || artifact.reviewType === input.reviewType),
  )

  if (!input.assignedReviewer?.trim()) {
    blockers.push('REVIEWER_MISSING')
    rootCauses.add('REVIEWER_SURFACING_GAP')
  }
  if (!input.decisionRequest?.trim()) {
    blockers.push('DECISION_REQUEST_MISSING')
    rootCauses.add('SINGLE_OPERATOR_SURFACE_GAP')
  }

  if (wrongTitleReviewArtifacts.length > 0 && reviewArtifacts.length === 0) {
    blockers.push('REVIEW_ARTIFACT_WRONG_TITLE')
    rootCauses.add('REVIEW_READINESS_GATE_GAP')
  }
  if (reviewArtifacts.length === 0) {
    blockers.push('REVIEW_ARTIFACT_MISSING')
    rootCauses.add('ARTIFACT_TYPE_MODEL_GAP')
    rootCauses.add('REVIEW_READINESS_GATE_GAP')
  }
  if (reviewArtifacts.length > 1) {
    blockers.push('DUPLICATE_REVIEW_ARTIFACTS_REVIEW_REQUIRED')
    rootCauses.add('REVIEW_READINESS_GATE_GAP')
  }

  const selectedArtifact = reviewArtifacts.length === 1 ? reviewArtifacts[0] : null
  if (selectedArtifact) {
    if (selectedArtifact.state === 'SUPERSEDED' || selectedArtifact.state === 'ARCHIVED') {
      blockers.push('REVIEW_ARTIFACT_SUPERSEDED')
      rootCauses.add('REVIEW_READINESS_GATE_GAP')
    }
    if (selectedArtifact.current === false) {
      blockers.push('REVIEW_ARTIFACT_NOT_CURRENT')
      rootCauses.add('REVIEW_READINESS_GATE_GAP')
    }
    if (selectedArtifact.state !== definition.requiredArtifactState) {
      blockers.push('REVIEW_ARTIFACT_NOT_CURRENT')
      rootCauses.add('PRODUCTION_STATE_MODEL_GAP')
    }
    if (!selectedArtifact.governedReference?.trim()) {
      blockers.push('REVIEW_ARTIFACT_GOVERNED_REFERENCE_MISSING')
      rootCauses.add('REVIEWER_SURFACING_GAP')
    }
    if (!selectedArtifact.checksum?.trim() && !selectedArtifact.version?.trim()) {
      blockers.push('REVIEW_ARTIFACT_CHECKSUM_OR_VERSION_MISSING')
      rootCauses.add('REVIEW_READINESS_GATE_GAP')
    }
    if (selectedArtifact.reviewerAccess !== true) {
      blockers.push('REVIEWER_ACCESS_NOT_VERIFIED')
      rootCauses.add('REVIEWER_SURFACING_GAP')
      rootCauses.add('SINGLE_OPERATOR_SURFACE_GAP')
    }
    if (input.reviewType === 'COVER_REVIEW' && selectedArtifact.visualReviewable !== true) {
      blockers.push('REVIEW_ARTIFACT_NOT_VISUAL_FOR_COVER')
      rootCauses.add('ARTIFACT_TYPE_MODEL_GAP')
    }
    if (artifactExtensionAllowed(selectedArtifact, definition) === false) {
      blockers.push('REVIEW_ARTIFACT_WRONG_CLASS')
      rootCauses.add('ARTIFACT_TYPE_MODEL_GAP')
    }
  } else if (candidatesForTitle.some((artifact) => artifact.artifactClass !== definition.requiredArtifactClass)) {
    blockers.push('REVIEW_ARTIFACT_WRONG_CLASS')
    rootCauses.add('ARTIFACT_TYPE_MODEL_GAP')
  }

  const uniqueBlockers = [...new Set(blockers)]
  const eligible = uniqueBlockers.length === 0 && Boolean(selectedArtifact)

  return {
    status: eligible ? 'INTERNAL_REVIEW_ELIGIBLE' : 'REVIEW_ARTIFACT_NOT_READY',
    eligible,
    reviewType: input.reviewType,
    requiredArtifactClass: definition.requiredArtifactClass,
    requiredArtifactState: definition.requiredArtifactState,
    assignedReviewer: input.assignedReviewer?.trim() || null,
    reviewerAccessGate: selectedArtifact?.reviewerAccess === true && !uniqueBlockers.includes('REVIEWER_ACCESS_NOT_VERIFIED') ? 'PASS' : 'FAIL',
    decisionRequestDefined: Boolean(input.decisionRequest?.trim()),
    selectedArtifact,
    blockers: uniqueBlockers,
    rootCauses: [...rootCauses],
    artifactCounts: {
      candidates: candidatesForTitle.length,
      reviewArtifacts: reviewArtifacts.length,
      briefs: candidatesForTitle.filter((artifact) => artifact.artifactClass === 'BRIEF').length,
      evidenceArtifacts: candidatesForTitle.filter((artifact) => artifact.artifactClass === 'EVIDENCE_ARTIFACT').length,
    },
    sideEffects: {
      artworkGenerated: 0,
      authorCommunications: 0,
      marketingActivations: 0,
      distributionActivity: 0,
      financialActivity: 0,
    },
  }
}

export function determineCoverDesignTruth(input: ReviewReadinessResult) {
  if (input.eligible) {
    return {
      correctState: 'INTERNAL REVIEW' as const,
      internalReviewCurrentlyValid: true,
      nextBoundedPilotAction: 'JACKIE_INTERNAL_COVER_REVIEW' as const,
    }
  }
  return {
    correctState: 'CREATIVE BRIEF COMPLETE / CONCEPT PRODUCTION REQUIRED' as const,
    internalReviewCurrentlyValid: false,
    nextBoundedPilotAction: 'PREPARE/GENERATE THE FIRST GOVERNED COVER CONCEPT - REQUIRES SEPARATE JACKIE AUTHORIZATION' as const,
  }
}

function artifactExtensionAllowed(artifact: ReviewArtifact, definition: ReviewReadinessDefinition) {
  const reference = `${artifact.governedReference || ''} ${artifact.name || ''}`.toLowerCase()
  const extension = reference.match(/\.[a-z0-9]+(?=($|[?#\s]))/)?.[0]
  return extension ? definition.allowedExtensions.includes(extension) : true
}
