// Engine: Author Final Approval Gate
// Reusable? Y
// Stage-specific exception? N

export type AuthorFinalApprovalSemantic =
  | 'PENDING'
  | 'CHANGES_REQUESTED'
  | 'APPROVED_WITH_CORRECTIONS'
  | 'REVISED_FOR_AUTHOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'QUESTIONS'
  | 'REVIEW_REQUIRED'

export type InternalVerificationState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'

export type AuthorFinalApprovalGateInput = {
  requiresAuthorApproval: boolean
  responseSemantic: AuthorFinalApprovalSemantic
  currentStageArtifactVersion?: string | null
  approvedArtifactVersion?: string | null
  unresolvedAuthorCorrections?: number
  requiredInternalVerification?: InternalVerificationState
  updatedArtifactReturnedToAuthor?: boolean
  manualOverride?: boolean
}

export type AuthorFinalApprovalGateResult = {
  authorResponseReceived: boolean
  finalAuthorApprovalReceived: boolean
  stageCloseEligible: boolean
  nextStageEligible: boolean
  revisionLoopRequired: boolean
  blockers: string[]
}

const RESPONSE_RECEIVED_SEMANTICS = new Set<AuthorFinalApprovalSemantic>([
  'CHANGES_REQUESTED',
  'APPROVED_WITH_CORRECTIONS',
  'REVISED_FOR_AUTHOR_REVIEW',
  'APPROVED',
  'REJECTED',
  'QUESTIONS',
])

const REVISION_LOOP_SEMANTICS = new Set<AuthorFinalApprovalSemantic>([
  'CHANGES_REQUESTED',
  'APPROVED_WITH_CORRECTIONS',
  'REVISED_FOR_AUTHOR_REVIEW',
  'REJECTED',
  'QUESTIONS',
])

export function evaluateAuthorFinalApprovalGate(input: AuthorFinalApprovalGateInput): AuthorFinalApprovalGateResult {
  if (!input.requiresAuthorApproval) {
    return {
      authorResponseReceived: input.responseSemantic !== 'PENDING' && input.responseSemantic !== 'REVIEW_REQUIRED',
      finalAuthorApprovalReceived: input.responseSemantic === 'APPROVED',
      stageCloseEligible: true,
      nextStageEligible: true,
      revisionLoopRequired: false,
      blockers: [],
    }
  }

  const blockers: string[] = []
  const authorResponseReceived = RESPONSE_RECEIVED_SEMANTICS.has(input.responseSemantic)
  const finalAuthorApprovalReceived = input.responseSemantic === 'APPROVED'
  const currentVersion = input.currentStageArtifactVersion?.trim() || ''
  const approvedVersion = input.approvedArtifactVersion?.trim() || ''
  const unresolvedAuthorCorrections = input.unresolvedAuthorCorrections ?? 0
  const internalVerification = input.requiredInternalVerification || 'NOT_STARTED'

  if (input.manualOverride) blockers.push('MANUAL_OVERRIDE_IS_NOT_AUTHOR_APPROVAL')
  if (!authorResponseReceived) blockers.push('AUTHOR_RESPONSE_NOT_RECEIVED')
  if (!finalAuthorApprovalReceived) blockers.push('FINAL_AUTHOR_APPROVAL_NOT_RECEIVED')
  if (!currentVersion) blockers.push('CURRENT_STAGE_ARTIFACT_VERSION_MISSING')
  if (!approvedVersion) blockers.push('APPROVED_ARTIFACT_VERSION_MISSING')
  if (currentVersion && approvedVersion && currentVersion !== approvedVersion) {
    blockers.push('APPROVAL_ARTIFACT_VERSION_MISMATCH')
  }
  if (unresolvedAuthorCorrections > 0) blockers.push('UNRESOLVED_AUTHOR_CORRECTIONS')
  if (internalVerification !== 'COMPLETE') blockers.push('INTERNAL_VERIFICATION_INCOMPLETE')

  const stageCloseEligible = blockers.length === 0
  return {
    authorResponseReceived,
    finalAuthorApprovalReceived,
    stageCloseEligible,
    nextStageEligible: stageCloseEligible,
    revisionLoopRequired: REVISION_LOOP_SEMANTICS.has(input.responseSemantic) && !stageCloseEligible,
    blockers,
  }
}
