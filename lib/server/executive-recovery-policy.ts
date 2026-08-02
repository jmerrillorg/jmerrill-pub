// Engine: Executive Recovery Policy
// Reusable? Y
// Stage-specific exception? N

export type ExecutiveRecoveryRule =
  | 'OWNER_AUTHORED_TITLE'
  | 'INTERNAL_VERIFICATION_TITLE'
  | 'APPROVED_DISCLAIMER_PRESENT'
  | 'EXECUTIVE_RECOVERY'

export type RecoveryBlocker =
  | 'RECIPIENT_DISCOVERY_REQUIRED'
  | 'CONTRACT_PREREQUISITE_MISSING'
  | 'LEGAL_DISCLAIMER_REQUIRED'
  | 'INTERNAL_CADENCE_HOLD'
  | 'CANONICAL_MANUSCRIPT_MISSING'
  | 'RECIPIENT_CONFLICT'
  | 'LEGAL_RESTRICTION_DOCUMENTED'
  | 'DELIVERY_CREDENTIAL_MISSING'

export type ExecutiveRecoveryInput = {
  titleName: string
  authorName: string
  ownerName?: string
  canonicalContactId?: string
  recipientEmail?: string
  executiveRecoveryAuthorized?: boolean
  internalVerificationTitle?: boolean
  ownerAuthoredTitle?: boolean
  approvedDisclaimerPresent?: boolean
  documentedLegalRestriction?: boolean
  blockers: RecoveryBlocker[]
}

export type ExecutiveRecoveryDecision = {
  titleName: string
  activeRules: ExecutiveRecoveryRule[]
  removedBlockers: RecoveryBlocker[]
  remainingBlockers: RecoveryBlocker[]
  canProceedToPackageCompletion: boolean
}

export function evaluateExecutiveRecoveryBlockers(input: ExecutiveRecoveryInput): ExecutiveRecoveryDecision {
  const activeRules: ExecutiveRecoveryRule[] = []
  const removedBlockers = new Set<RecoveryBlocker>()
  const remainingBlockers = new Set(input.blockers)

  if (input.ownerAuthoredTitle && input.canonicalContactId && input.recipientEmail) {
    activeRules.push('OWNER_AUTHORED_TITLE')
    remove('RECIPIENT_DISCOVERY_REQUIRED')
  }

  if (input.internalVerificationTitle && input.ownerAuthoredTitle) {
    activeRules.push('INTERNAL_VERIFICATION_TITLE')
    remove('CONTRACT_PREREQUISITE_MISSING')
  }

  if (input.approvedDisclaimerPresent && !input.documentedLegalRestriction) {
    activeRules.push('APPROVED_DISCLAIMER_PRESENT')
    remove('LEGAL_DISCLAIMER_REQUIRED')
  }

  if (input.executiveRecoveryAuthorized) {
    activeRules.push('EXECUTIVE_RECOVERY')
    remove('INTERNAL_CADENCE_HOLD')
  }

  return {
    titleName: input.titleName,
    activeRules,
    removedBlockers: Array.from(removedBlockers),
    remainingBlockers: Array.from(remainingBlockers),
    canProceedToPackageCompletion: remainingBlockers.size === 0,
  }

  function remove(blocker: RecoveryBlocker) {
    if (!remainingBlockers.has(blocker)) return
    remainingBlockers.delete(blocker)
    removedBlockers.add(blocker)
  }
}
