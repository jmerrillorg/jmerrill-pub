// Engine: Package Engine
// Reusable? Y
// Stage-specific exception? N

import { createHash } from 'node:crypto'

import {
  AUTHOR_PACKAGE_NOTIFICATION_POLICIES,
  AUTHOR_PUBLISHING_COMMUNICATION_POLICY,
  type AttachmentRole,
  type AuthorPackageNotificationInput,
  type AuthorReviewPackageType,
  type GovernedPackageAttachment,
  validateAuthorPackageNotification,
} from './author-package-notification-engine'

export const PACKAGE_ENGINE_EVENTS = {
  commissioningStarted: 'PACKAGE_ENGINE_COMMISSIONING_STARTED',
  policyRegisterActivated: 'PACKAGE_POLICY_REGISTER_ACTIVATED',
  manifestCreated: 'PACKAGE_MANIFEST_CREATED',
  qaCompleted: 'PACKAGE_QA_COMPLETED',
  qaFailed: 'PACKAGE_QA_FAILED',
  cadenceScheduled: 'PACKAGE_CADENCE_SCHEDULED',
  readyForRelease: 'PACKAGE_READY_FOR_RELEASE',
  releaseTransactionStarted: 'PACKAGE_RELEASE_TRANSACTION_STARTED',
  releaseTransactionCompleted: 'PACKAGE_RELEASE_TRANSACTION_COMPLETED',
  versionSuperseded: 'PACKAGE_VERSION_SUPERSEDED',
  stageImplementationMigrated: 'PACKAGE_STAGE_IMPLEMENTATION_MIGRATED',
  historicalReconciliationCompleted: 'PACKAGE_ENGINE_HISTORICAL_RECONCILIATION_COMPLETED',
  engineCommissioned: 'JM1_CANONICAL_PACKAGE_ENGINE_COMMISSIONED',
} as const

export type PackageStageCode =
  | 'EDITORIAL_REVIEW'
  | 'DEVELOPMENTAL_EDITING'
  | 'LINE_EDITING'
  | 'COPYEDITING'
  | 'PROOFREADING'
  | 'INTERIOR_LAYOUT'
  | 'COVER_DESIGN'
  | 'PRODUCTION_PROOF'

export type PackageStatus =
  | 'DRAFT'
  | 'ASSEMBLING'
  | 'VALIDATING'
  | 'QA_FAILED'
  | 'READY_INTERNAL'
  | 'CADENCE_HOLD'
  | 'READY_FOR_RELEASE'
  | 'RELEASING'
  | 'RELEASED'
  | 'AUTHOR_REVIEW'
  | 'CORRECTIONS_REQUESTED'
  | 'APPROVED'
  | 'SUPERSEDED'
  | 'CANCELLED'
  | 'EXCEPTION'

export type PackageQaFailure =
  | 'PACKAGE_QA_FAILED - REQUIRED_ARTIFACT_MISSING'
  | 'PACKAGE_QA_FAILED - CHECKSUM_MISMATCH'
  | 'PACKAGE_QA_FAILED - INVALID_FILE_TYPE'
  | 'PACKAGE_QA_FAILED - ARTIFACT_VERSION_CONFLICT'
  | 'PACKAGE_QA_FAILED - STALE_STAGE_ARTIFACT'
  | 'PACKAGE_QA_FAILED - RENDER_FAILURE'
  | 'PACKAGE_QA_FAILED - AUTHOR_METADATA_MISMATCH'

export type PackageArtifactRole =
  | 'assessment'
  | 'recommendedEditorialPath'
  | 'editedManuscript'
  | 'developmentalMemo'
  | 'lineEditingSummary'
  | 'copyeditingSummary'
  | 'proofreadingCoverNote'
  | 'proofreadManuscript'
  | 'interiorProofPDF'
  | 'approvedConceptOrReviewSet'
  | 'designRationale'
  | 'finalInteriorProof'
  | 'finalCoverProof'
  | 'reviewInstructions'
  | 'productionReviewInstructions'
  | 'authorResponseMechanism'
  | 'packageManifest'
  | 'authorCoverMessage'

export type AuthorDecisionOption =
  | 'APPROVE_AS_PRESENTED'
  | 'APPROVE_WITH_CORRECTIONS'
  | 'QUESTIONS_OR_CLARIFICATION_REQUESTED'

export type CanonicalPackagePolicy = {
  stageCode: PackageStageCode
  packageType: AuthorReviewPackageType
  requiredArtifactRoles: PackageArtifactRole[]
  optionalArtifactRoles: PackageArtifactRole[]
  allowedMimeTypesByRole: Partial<Record<PackageArtifactRole, string[]>>
  qaChecks: string[]
  emailAttachmentRoles: PackageArtifactRole[]
  workspaceDownloadRoles: PackageArtifactRole[]
  cadencePolicyId: string
  authorResponsePeriodCalendarDays: number
  authorDecisionOptions: AuthorDecisionOption[]
  nextStagePolicy: string
}

export type AuthorReviewResponseClock = {
  deliveredAt: string
  responseDueAt: string
  reminderAt: string
  overdueAt: string
  internalEscalationAt: string
  autoApprovalAuthorized: false
}

export type AuthorReviewResponseInput = {
  canonicalContactId: string
  canonicalTitleId: string
  authenticatedContactId: string
  authenticatedIdentityId: string
  stageId: string
  gateId: string
  packageId: string
  packageVersion: string
  manifestChecksum: string
  responseType: AuthorDecisionOption
  authorComments?: string
  correctionListArtifactId?: string
  markedProofArtifactId?: string
  submittedAt: string
  activePackage: CanonicalAuthorReviewPackage
}

export type AuthorReviewResponseValidation =
  | { ok: true; responseRecord: AuthorReviewResponseRecord }
  | { ok: false; blocker: string }

export type AuthorReviewResponseRecord = {
  canonicalContactId: string
  canonicalTitleId: string
  stageId: string
  gateId: string
  packageId: string
  packageVersion: string
  manifestChecksum: string
  responseType: AuthorDecisionOption
  authorComments: string
  correctionListArtifactId: string | null
  markedProofArtifactId: string | null
  submittedAt: string
  authenticatedIdentityId: string
  approvalGateRelationship: string
}

export type CadenceEvidenceCondition = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'

export type CadenceEvidenceStatus = 'PASS' | 'FAIL' | 'NO_EVIDENCE' | 'CONFLICTING_EVIDENCE' | 'NOT_APPLICABLE'

export type CadenceEvidenceRecord = {
  condition: CadenceEvidenceCondition
  status: CadenceEvidenceStatus
  source: string
  recordId: string
  timestamp: string
  correlationId: string
  detail: string
}

export type GovernedCadenceRetestInput = {
  package: CanonicalAuthorReviewPackage
  scheduledReleaseAt: string
  actualStartAt: string
  releasedAt: string
  notification: AuthorPackageNotificationInput
  notificationResult: {
    messageId: string
    providerStatus: string
    sentAt: string
  }
  authorAccess: {
    accessProofId: string
    status: 'AVAILABLE' | 'AUTHENTICATED_ACCESS' | 'BLOCKED'
    timestamp: string
  }
  nextGate: {
    gateId: string
    state: 'AUTHOR_REVIEW_OPENED' | 'AUTHOR_RESPONSE_PENDING'
    createdAt: string
  }
  executionLogRecords: CadenceEvidenceRecord[]
  manualInterventionAfterStart?: boolean
}

export type CadenceCertificationConditionResult = {
  condition: CadenceEvidenceCondition
  status: CadenceEvidenceStatus
  evidenceRecordIds: string[]
  detail: string
}

export type GovernedCadenceRetestCertification = {
  certified: boolean
  classification:
    | 'CADENCE_CERTIFIED'
    | 'CADENCE_REMEDIATED_RETEST_FAILED'
    | 'CADENCE_NOT_CERTIFIED_INTERNAL_DEFECT_REMAINS'
  correlationId: string
  packageId: string
  titleId: string
  conditions: CadenceCertificationConditionResult[]
  finalPackageStatus: PackageStatus
  responseClock: AuthorReviewResponseClock | null
  blockers: string[]
}

export const AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS = 7
export const AUTHOR_REVIEW_REMINDER_DAY = 5
export const AUTHOR_REVIEW_ESCALATION_DAY = 8

export type PackageArtifactInput = {
  artifactId: string
  role: PackageArtifactRole
  filename: string
  mimeType: string
  fileSize: number
  checksum: string
  sourceVersion: string
  createdAt: string
  stageId: string
  titleId: string
  authorVisible?: boolean
  emailAttachment?: boolean
  workspaceDownload?: boolean
  canMaterializeForEmail?: boolean
  canRender?: boolean
  contentBytesBase64?: string
}

export type PackageManifestItem = {
  artifactRole: PackageArtifactRole
  artifactId: string
  filename: string
  mimeType: string
  fileSize: number
  checksum: string
  sourceVersion: string
  createdAt: string
  authorVisible: boolean
  emailAttachment: boolean
  workspaceDownload: boolean
}

export type PackageManifest = {
  packageId: string
  titleId: string
  authorId: string
  stageId: string
  stageCode: PackageStageCode
  gateId: string
  packageType: AuthorReviewPackageType
  packageVersion: string
  manifestVersion: '1.0'
  artifacts: PackageManifestItem[]
  packageChecksum: string
  createdAt: string
}

export type PackageQaResult =
  | { ok: true; status: 'READY_INTERNAL'; completedAt: string; checks: string[] }
  | { ok: false; status: 'QA_FAILED'; completedAt: string; failures: Array<{ code: PackageQaFailure; detail: string }> }

export type CadenceInput = {
  now: string
  wordCount?: number
  titleComplexity?: 'standard' | 'complex'
  rushAuthorized?: boolean
  publisherHold?: boolean
  override?: {
    earliestReleaseAt: string
    identity: string
    reason: string
  }
}

export type CadenceResult = {
  status: 'CADENCE_HOLD' | 'READY_FOR_RELEASE'
  cadenceBasis: string
  earliestReleaseAt: string
  scheduledReleaseAt: string
  overrideIdentity?: string
  overrideReason?: string
}

export type CanonicalAuthorReviewPackage = {
  packageId: string
  titleId: string
  authorId: string
  stageId: string
  stageCode: PackageStageCode
  gateId: string
  packageType: AuthorReviewPackageType
  packageVersion: string
  packageStatus: PackageStatus
  sourceArtifactIds: string[]
  deliverableArtifactIds: string[]
  requiredArtifactRoles: PackageArtifactRole[]
  optionalArtifactRoles: PackageArtifactRole[]
  manifestArtifactId?: string
  manifest: PackageManifest
  packageChecksum: string
  preparedAt: string
  qaStatus: PackageQaResult['status']
  qaCompletedAt?: string
  cadencePolicyId: string
  earliestReleaseAt?: string
  releasedAt?: string
  notificationTransactionId?: string
  completedAt?: string
  supersededByPackageId?: string
  correlationId: string
  idempotencyKey: string
}

export const PACKAGE_STAGE_POLICIES: Record<PackageStageCode, CanonicalPackagePolicy> = {
  EDITORIAL_REVIEW: {
    stageCode: 'EDITORIAL_REVIEW',
    packageType: 'EDITORIAL_REVIEW',
    requiredArtifactRoles: ['assessment', 'recommendedEditorialPath', 'reviewInstructions'],
    optionalArtifactRoles: [],
    allowedMimeTypesByRole: {
      assessment: ['application/pdf', 'application/json'],
      recommendedEditorialPath: ['application/pdf', 'application/json'],
      reviewInstructions: ['application/pdf', 'text/plain'],
    },
    qaChecks: baseQaChecks(),
    emailAttachmentRoles: ['assessment', 'recommendedEditorialPath', 'reviewInstructions'],
    workspaceDownloadRoles: ['assessment', 'recommendedEditorialPath', 'reviewInstructions'],
    cadencePolicyId: 'AUTHOR_REVIEW_STANDARD',
    authorResponsePeriodCalendarDays: AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS,
    authorDecisionOptions: ['APPROVE_AS_PRESENTED', 'APPROVE_WITH_CORRECTIONS', 'QUESTIONS_OR_CLARIFICATION_REQUESTED'],
    nextStagePolicy: 'route-to-developmental-line-copy-or-production-readiness',
  },
  DEVELOPMENTAL_EDITING: {
    stageCode: 'DEVELOPMENTAL_EDITING',
    packageType: 'DEVELOPMENTAL_EDITING_REVIEW',
    requiredArtifactRoles: [
      'editedManuscript',
      'developmentalMemo',
      'reviewInstructions',
      'authorResponseMechanism',
      'packageManifest',
      'authorCoverMessage',
    ],
    optionalArtifactRoles: [],
    allowedMimeTypesByRole: manuscriptMemoInstructionTypes(),
    qaChecks: baseQaChecks(),
    emailAttachmentRoles: [
      'editedManuscript',
      'developmentalMemo',
      'reviewInstructions',
      'authorResponseMechanism',
      'packageManifest',
      'authorCoverMessage',
    ],
    workspaceDownloadRoles: [
      'editedManuscript',
      'developmentalMemo',
      'reviewInstructions',
      'authorResponseMechanism',
      'packageManifest',
      'authorCoverMessage',
    ],
    cadencePolicyId: 'EDITORIAL_AUTHOR_REVIEW_BY_WORD_COUNT',
    authorResponsePeriodCalendarDays: AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS,
    authorDecisionOptions: ['APPROVE_AS_PRESENTED', 'APPROVE_WITH_CORRECTIONS', 'QUESTIONS_OR_CLARIFICATION_REQUESTED'],
    nextStagePolicy: 'line-editing-eligibility',
  },
  LINE_EDITING: {
    stageCode: 'LINE_EDITING',
    packageType: 'LINE_EDITING_REVIEW',
    requiredArtifactRoles: ['editedManuscript', 'lineEditingSummary', 'reviewInstructions'],
    optionalArtifactRoles: [],
    allowedMimeTypesByRole: manuscriptMemoInstructionTypes(),
    qaChecks: baseQaChecks(),
    emailAttachmentRoles: ['editedManuscript', 'lineEditingSummary', 'reviewInstructions'],
    workspaceDownloadRoles: ['editedManuscript', 'lineEditingSummary', 'reviewInstructions'],
    cadencePolicyId: 'EDITORIAL_AUTHOR_REVIEW_BY_WORD_COUNT',
    authorResponsePeriodCalendarDays: AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS,
    authorDecisionOptions: ['APPROVE_AS_PRESENTED', 'APPROVE_WITH_CORRECTIONS', 'QUESTIONS_OR_CLARIFICATION_REQUESTED'],
    nextStagePolicy: 'copyediting-eligibility',
  },
  COPYEDITING: {
    stageCode: 'COPYEDITING',
    packageType: 'COPYEDITING_REVIEW',
    requiredArtifactRoles: ['editedManuscript', 'copyeditingSummary', 'reviewInstructions'],
    optionalArtifactRoles: [],
    allowedMimeTypesByRole: manuscriptMemoInstructionTypes(),
    qaChecks: baseQaChecks(),
    emailAttachmentRoles: ['editedManuscript', 'copyeditingSummary', 'reviewInstructions'],
    workspaceDownloadRoles: ['editedManuscript', 'copyeditingSummary', 'reviewInstructions'],
    cadencePolicyId: 'EDITORIAL_AUTHOR_REVIEW_BY_WORD_COUNT',
    authorResponsePeriodCalendarDays: AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS,
    authorDecisionOptions: ['APPROVE_AS_PRESENTED', 'APPROVE_WITH_CORRECTIONS', 'QUESTIONS_OR_CLARIFICATION_REQUESTED'],
    nextStagePolicy: 'proofreading-eligibility',
  },
  PROOFREADING: {
    stageCode: 'PROOFREADING',
    packageType: 'PROOFREADING_REVIEW',
    requiredArtifactRoles: ['proofreadManuscript', 'proofreadingCoverNote'],
    optionalArtifactRoles: [],
    allowedMimeTypesByRole: {
      proofreadManuscript: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      proofreadingCoverNote: ['application/pdf'],
    },
    qaChecks: baseQaChecks(),
    emailAttachmentRoles: ['proofreadManuscript', 'proofreadingCoverNote'],
    workspaceDownloadRoles: ['proofreadManuscript', 'proofreadingCoverNote'],
    cadencePolicyId: 'AUTHOR_REVIEW_STANDARD',
    authorResponsePeriodCalendarDays: AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS,
    authorDecisionOptions: ['APPROVE_AS_PRESENTED', 'APPROVE_WITH_CORRECTIONS', 'QUESTIONS_OR_CLARIFICATION_REQUESTED'],
    nextStagePolicy: 'interior-layout-eligibility',
  },
  INTERIOR_LAYOUT: {
    stageCode: 'INTERIOR_LAYOUT',
    packageType: 'INTERIOR_LAYOUT_REVIEW',
    requiredArtifactRoles: [
      'interiorProofPDF',
      'reviewInstructions',
      'authorResponseMechanism',
      'packageManifest',
      'authorCoverMessage',
    ],
    optionalArtifactRoles: [],
    allowedMimeTypesByRole: {
      interiorProofPDF: ['application/pdf'],
      reviewInstructions: ['application/pdf', 'text/plain'],
      authorResponseMechanism: ['application/pdf', 'text/plain'],
      packageManifest: ['application/json', 'application/pdf', 'text/plain'],
      authorCoverMessage: ['application/pdf', 'text/plain'],
    },
    qaChecks: baseQaChecks(),
    emailAttachmentRoles: [
      'interiorProofPDF',
      'reviewInstructions',
      'authorResponseMechanism',
      'packageManifest',
      'authorCoverMessage',
    ],
    workspaceDownloadRoles: [
      'interiorProofPDF',
      'reviewInstructions',
      'authorResponseMechanism',
      'packageManifest',
      'authorCoverMessage',
    ],
    cadencePolicyId: 'PRODUCTION_AUTHOR_REVIEW_STANDARD',
    authorResponsePeriodCalendarDays: AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS,
    authorDecisionOptions: ['APPROVE_AS_PRESENTED', 'APPROVE_WITH_CORRECTIONS', 'QUESTIONS_OR_CLARIFICATION_REQUESTED'],
    nextStagePolicy: 'cover-or-production-proof-eligibility',
  },
  COVER_DESIGN: {
    stageCode: 'COVER_DESIGN',
    packageType: 'COVER_DESIGN_REVIEW',
    requiredArtifactRoles: ['approvedConceptOrReviewSet', 'designRationale', 'reviewInstructions'],
    optionalArtifactRoles: [],
    allowedMimeTypesByRole: {
      approvedConceptOrReviewSet: ['application/pdf', 'image/png', 'image/jpeg'],
      designRationale: ['application/pdf', 'text/plain'],
      reviewInstructions: ['application/pdf', 'text/plain'],
    },
    qaChecks: baseQaChecks(),
    emailAttachmentRoles: ['approvedConceptOrReviewSet', 'designRationale', 'reviewInstructions'],
    workspaceDownloadRoles: ['approvedConceptOrReviewSet', 'designRationale', 'reviewInstructions'],
    cadencePolicyId: 'PRODUCTION_AUTHOR_REVIEW_STANDARD',
    authorResponsePeriodCalendarDays: AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS,
    authorDecisionOptions: ['APPROVE_AS_PRESENTED', 'APPROVE_WITH_CORRECTIONS', 'QUESTIONS_OR_CLARIFICATION_REQUESTED'],
    nextStagePolicy: 'production-proof-eligibility',
  },
  PRODUCTION_PROOF: {
    stageCode: 'PRODUCTION_PROOF',
    packageType: 'PRODUCTION_PROOF_REVIEW',
    requiredArtifactRoles: ['finalInteriorProof', 'finalCoverProof', 'productionReviewInstructions'],
    optionalArtifactRoles: [],
    allowedMimeTypesByRole: {
      finalInteriorProof: ['application/pdf'],
      finalCoverProof: ['application/pdf', 'image/png', 'image/jpeg'],
      productionReviewInstructions: ['application/pdf', 'text/plain'],
    },
    qaChecks: baseQaChecks(),
    emailAttachmentRoles: ['finalInteriorProof', 'finalCoverProof', 'productionReviewInstructions'],
    workspaceDownloadRoles: ['finalInteriorProof', 'finalCoverProof', 'productionReviewInstructions'],
    cadencePolicyId: 'FINAL_PRODUCTION_AUTHOR_REVIEW',
    authorResponsePeriodCalendarDays: AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS,
    authorDecisionOptions: ['APPROVE_AS_PRESENTED', 'APPROVE_WITH_CORRECTIONS', 'QUESTIONS_OR_CLARIFICATION_REQUESTED'],
    nextStagePolicy: 'distribution-readiness',
  },
}

export function getPackagePolicy(stageCode: PackageStageCode) {
  return PACKAGE_STAGE_POLICIES[stageCode]
}

export function createPackageManifest(input: {
  packageId: string
  titleId: string
  authorId: string
  stageId: string
  stageCode: PackageStageCode
  gateId: string
  packageVersion: string
  artifacts: PackageArtifactInput[]
  createdAt: string
}): PackageManifest {
  const policy = getPackagePolicy(input.stageCode)
  const items = input.artifacts
    .map((artifact): PackageManifestItem => ({
      artifactRole: artifact.role,
      artifactId: artifact.artifactId,
      filename: artifact.filename,
      mimeType: artifact.mimeType,
      fileSize: artifact.fileSize,
      checksum: normalizeChecksum(artifact.checksum),
      sourceVersion: artifact.sourceVersion,
      createdAt: artifact.createdAt,
      authorVisible: artifact.authorVisible ?? policy.workspaceDownloadRoles.includes(artifact.role),
      emailAttachment: artifact.emailAttachment ?? policy.emailAttachmentRoles.includes(artifact.role),
      workspaceDownload: artifact.workspaceDownload ?? policy.workspaceDownloadRoles.includes(artifact.role),
    }))
    .sort((a, b) => `${a.artifactRole}:${a.artifactId}`.localeCompare(`${b.artifactRole}:${b.artifactId}`))

  const checksumBasis = JSON.stringify({
    packageId: input.packageId,
    titleId: input.titleId,
    authorId: input.authorId,
    stageId: input.stageId,
    stageCode: input.stageCode,
    gateId: input.gateId,
    packageVersion: input.packageVersion,
    artifacts: items.map((item) => ({
      artifactRole: item.artifactRole,
      artifactId: item.artifactId,
      filename: item.filename,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      checksum: item.checksum,
      sourceVersion: item.sourceVersion,
      authorVisible: item.authorVisible,
      emailAttachment: item.emailAttachment,
      workspaceDownload: item.workspaceDownload,
    })),
  })

  return {
    packageId: input.packageId,
    titleId: input.titleId,
    authorId: input.authorId,
    stageId: input.stageId,
    stageCode: input.stageCode,
    gateId: input.gateId,
    packageType: policy.packageType,
    packageVersion: input.packageVersion,
    manifestVersion: '1.0',
    artifacts: items,
    packageChecksum: createHash('sha256').update(checksumBasis).digest('hex'),
    createdAt: input.createdAt,
  }
}

export function validatePackageQa(input: {
  manifest: PackageManifest
  artifacts: PackageArtifactInput[]
  completedAt: string
}): PackageQaResult {
  const policy = getPackagePolicy(input.manifest.stageCode)
  const artifactsByRole = new Map(input.artifacts.map((artifact) => [artifact.role, artifact]))
  const failures: Array<{ code: PackageQaFailure; detail: string }> = []

  for (const role of policy.requiredArtifactRoles) {
    const artifact = artifactsByRole.get(role)
    if (!artifact) {
      failures.push({ code: 'PACKAGE_QA_FAILED - REQUIRED_ARTIFACT_MISSING', detail: role })
      continue
    }
    const allowed = policy.allowedMimeTypesByRole[role] || []
    if (allowed.length && !allowed.includes(artifact.mimeType)) {
      failures.push({ code: 'PACKAGE_QA_FAILED - INVALID_FILE_TYPE', detail: `${role}:${artifact.mimeType}` })
    }
    if (!normalizeChecksum(artifact.checksum)) {
      failures.push({ code: 'PACKAGE_QA_FAILED - CHECKSUM_MISMATCH', detail: `${role}:checksum-missing` })
    }
    if (artifact.stageId !== input.manifest.stageId) {
      failures.push({ code: 'PACKAGE_QA_FAILED - STALE_STAGE_ARTIFACT', detail: `${role}:${artifact.stageId}` })
    }
    if (artifact.titleId !== input.manifest.titleId) {
      failures.push({ code: 'PACKAGE_QA_FAILED - AUTHOR_METADATA_MISMATCH', detail: `${role}:${artifact.titleId}` })
    }
    if (artifact.canRender === false) {
      failures.push({ code: 'PACKAGE_QA_FAILED - RENDER_FAILURE', detail: role })
    }
  }

  const duplicateVersion = input.artifacts.find((artifact, index, all) =>
    all.findIndex((candidate) => candidate.role === artifact.role && candidate.sourceVersion === artifact.sourceVersion) !== index,
  )
  if (duplicateVersion) {
    failures.push({
      code: 'PACKAGE_QA_FAILED - ARTIFACT_VERSION_CONFLICT',
      detail: `${duplicateVersion.role}:${duplicateVersion.sourceVersion}`,
    })
  }

  if (failures.length) return { ok: false, status: 'QA_FAILED', completedAt: input.completedAt, failures }
  return { ok: true, status: 'READY_INTERNAL', completedAt: input.completedAt, checks: policy.qaChecks }
}

export function evaluatePackageCadence(input: {
  stageCode: PackageStageCode
  qaResult: PackageQaResult
  cadence: CadenceInput
}): CadenceResult {
  const policy = getPackagePolicy(input.stageCode)
  if (!input.qaResult.ok) {
    return {
      status: 'CADENCE_HOLD',
      cadenceBasis: `${policy.cadencePolicyId}:qa-not-passed`,
      earliestReleaseAt: '',
      scheduledReleaseAt: '',
    }
  }
  if (input.cadence.publisherHold) {
    return {
      status: 'CADENCE_HOLD',
      cadenceBasis: `${policy.cadencePolicyId}:publisher-hold`,
      earliestReleaseAt: input.cadence.now,
      scheduledReleaseAt: input.cadence.now,
    }
  }
  if (input.cadence.override) {
    return {
      status: releaseReady(input.cadence.now, input.cadence.override.earliestReleaseAt) ? 'READY_FOR_RELEASE' : 'CADENCE_HOLD',
      cadenceBasis: `${policy.cadencePolicyId}:publisher-override`,
      earliestReleaseAt: input.cadence.override.earliestReleaseAt,
      scheduledReleaseAt: input.cadence.override.earliestReleaseAt,
      overrideIdentity: input.cadence.override.identity,
      overrideReason: input.cadence.override.reason,
    }
  }

  const days = input.cadence.rushAuthorized ? 0 : cadenceDays(input.cadence.wordCount, input.cadence.titleComplexity)
  const earliestReleaseAt = addBusinessDays(input.cadence.now, days)
  return {
    status: releaseReady(input.cadence.now, earliestReleaseAt) ? 'READY_FOR_RELEASE' : 'CADENCE_HOLD',
    cadenceBasis: `${policy.cadencePolicyId}:word-count-${input.cadence.wordCount || 0}:days-${days}`,
    earliestReleaseAt,
    scheduledReleaseAt: earliestReleaseAt,
  }
}

export function createAuthorReviewResponseClock(input: {
  deliveredAt?: string
  deliverySucceeded: boolean
  contractResponsePeriodCalendarDays?: number
}): AuthorReviewResponseClock | null {
  if (!input.deliverySucceeded || !input.deliveredAt) return null
  const period = input.contractResponsePeriodCalendarDays || AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS
  return {
    deliveredAt: input.deliveredAt,
    reminderAt: addCalendarDays(input.deliveredAt, AUTHOR_REVIEW_REMINDER_DAY),
    responseDueAt: addCalendarDays(input.deliveredAt, period),
    overdueAt: addCalendarDays(input.deliveredAt, period),
    internalEscalationAt: addCalendarDays(input.deliveredAt, AUTHOR_REVIEW_ESCALATION_DAY),
    autoApprovalAuthorized: false,
  }
}

export function validateAuthorReviewResponseMechanism(input: AuthorReviewResponseInput): AuthorReviewResponseValidation {
  const pkg = input.activePackage
  const policy = getPackagePolicy(pkg.stageCode)
  const comments = input.authorComments?.trim() || ''

  if (!input.canonicalContactId) return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - CANONICAL_CONTACT_MISSING' }
  if (!input.canonicalTitleId) return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - CANONICAL_TITLE_MISSING' }
  if (!input.authenticatedIdentityId) return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - AUTHENTICATED_IDENTITY_MISSING' }
  if (input.authenticatedContactId !== input.canonicalContactId) {
    return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - CROSS_AUTHOR_ACCESS_DENIED' }
  }
  if (pkg.packageStatus === 'SUPERSEDED') return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - SUPERSEDED_PACKAGE' }
  if (pkg.packageStatus !== 'AUTHOR_REVIEW' && pkg.packageStatus !== 'RELEASED') {
    return { ok: false, blocker: `AUTHOR_RESPONSE_BLOCKED - PACKAGE_NOT_OPEN_FOR_AUTHOR_RESPONSE:${pkg.packageStatus}` }
  }
  if (input.canonicalTitleId !== pkg.titleId) return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - TITLE_PACKAGE_MISMATCH' }
  if (input.stageId !== pkg.stageId) return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - STAGE_PACKAGE_MISMATCH' }
  if (input.gateId !== pkg.gateId) return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - GATE_PACKAGE_MISMATCH' }
  if (input.packageId !== pkg.packageId || input.packageVersion !== pkg.packageVersion) {
    return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - PACKAGE_VERSION_MISMATCH' }
  }
  if (input.manifestChecksum !== pkg.packageChecksum) {
    return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - MANIFEST_CHECKSUM_MISMATCH' }
  }
  if (!policy.authorDecisionOptions.includes(input.responseType)) {
    return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - RESPONSE_TYPE_NOT_ALLOWED' }
  }
  if (input.responseType !== 'APPROVE_AS_PRESENTED' && !comments && !input.correctionListArtifactId && !input.markedProofArtifactId) {
    return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - CORRECTION_OR_QUESTION_DETAIL_REQUIRED' }
  }
  if (pkg.stageCode === 'INTERIOR_LAYOUT' && input.responseType === 'APPROVE_WITH_CORRECTIONS' && !input.correctionListArtifactId && !input.markedProofArtifactId && !comments) {
    return { ok: false, blocker: 'AUTHOR_RESPONSE_BLOCKED - INTERIOR_LAYOUT_CORRECTION_METHOD_REQUIRED' }
  }

  return {
    ok: true,
    responseRecord: {
      canonicalContactId: input.canonicalContactId,
      canonicalTitleId: input.canonicalTitleId,
      stageId: input.stageId,
      gateId: input.gateId,
      packageId: input.packageId,
      packageVersion: input.packageVersion,
      manifestChecksum: input.manifestChecksum,
      responseType: input.responseType,
      authorComments: comments,
      correctionListArtifactId: input.correctionListArtifactId || null,
      markedProofArtifactId: input.markedProofArtifactId || null,
      submittedAt: input.submittedAt,
      authenticatedIdentityId: input.authenticatedIdentityId,
      approvalGateRelationship: `${input.gateId}:${input.packageId}:${input.packageVersion}`,
    },
  }
}

export function certifyGovernedCadenceRetest(input: GovernedCadenceRetestInput): GovernedCadenceRetestCertification {
  const pkg = input.package
  const blockers: string[] = []
  const conditions: CadenceCertificationConditionResult[] = []
  const correlationId = pkg.correlationId

  if (input.manualInterventionAfterStart) blockers.push('MANUAL_INTERVENTION_AFTER_RETEST_START')
  if (pkg.packageStatus !== 'READY_FOR_RELEASE') blockers.push(`PACKAGE_NOT_READY_FOR_RELEASE:${pkg.packageStatus}`)
  if (input.notification.packageId !== pkg.packageId) blockers.push('NOTIFICATION_PACKAGE_MISMATCH')
  if (input.notification.correlationId !== correlationId) blockers.push('NOTIFICATION_CORRELATION_MISMATCH')
  if (!releaseReady(input.actualStartAt, input.scheduledReleaseAt)) blockers.push('SCHEDULER_STARTED_BEFORE_RELEASE_TIME')

  const notificationValidation = validateAuthorPackageNotification(input.notification)
  if (!notificationValidation.ok) blockers.push(notificationValidation.blocker || 'AUTHOR_PACKAGE_NOTIFICATION_BLOCKED')

  const deliverySucceeded = ['accepted', 'delivered', 'succeeded'].includes(input.notificationResult.providerStatus.toLowerCase())
  const responseClock = createAuthorReviewResponseClock({
    deliveredAt: input.notificationResult.sentAt,
    deliverySucceeded,
    contractResponsePeriodCalendarDays: getPackagePolicy(pkg.stageCode).authorResponsePeriodCalendarDays,
  })
  if (!responseClock) blockers.push('AUTHOR_RESPONSE_CLOCK_NOT_CREATED')

  if (input.authorAccess.status === 'BLOCKED') blockers.push('AUTHOR_ACCESS_NOT_AVAILABLE')
  if (input.nextGate.gateId !== pkg.gateId) blockers.push('NEXT_GATE_PACKAGE_GATE_MISMATCH')

  const recordsByCondition = new Map<CadenceEvidenceCondition, CadenceEvidenceRecord[]>()
  for (const record of input.executionLogRecords) {
    if (record.correlationId !== correlationId) blockers.push(`EXECUTION_LOG_CORRELATION_MISMATCH:${record.condition}:${record.recordId}`)
    const existing = recordsByCondition.get(record.condition) || []
    existing.push(record)
    recordsByCondition.set(record.condition, existing)
  }

  const required: Array<[CadenceEvidenceCondition, string]> = [
    ['L1', 'Scheduler fired at governed timestamp'],
    ['L2', 'Package left hold and transitioned'],
    ['L3', 'Approved notification delivered or accepted'],
    ['L4', 'Author access available'],
    ['L5', 'Next lifecycle gate created'],
    ['L6', 'Complete transaction preserved in jm1_executionlog'],
  ]

  for (const [condition, detail] of required) {
    const records = recordsByCondition.get(condition) || []
    const passRecords = records.filter((record) => record.status === 'PASS')
    const failingRecords = records.filter((record) => record.status !== 'PASS')
    if (passRecords.length !== 1 || failingRecords.length) {
      conditions.push({
        condition,
        status: records.length ? 'CONFLICTING_EVIDENCE' : 'NO_EVIDENCE',
        evidenceRecordIds: records.map((record) => record.recordId),
        detail,
      })
      blockers.push(`${condition}_EVIDENCE_NOT_CONCLUSIVE`)
      continue
    }
    conditions.push({
      condition,
      status: 'PASS',
      evidenceRecordIds: passRecords.map((record) => record.recordId),
      detail,
    })
  }

  const certified = blockers.length === 0 && conditions.every((condition) => condition.status === 'PASS')
  return {
    certified,
    classification: certified
      ? 'CADENCE_CERTIFIED'
      : blockers.includes('MANUAL_INTERVENTION_AFTER_RETEST_START')
        ? 'CADENCE_REMEDIATED_RETEST_FAILED'
        : 'CADENCE_NOT_CERTIFIED_INTERNAL_DEFECT_REMAINS',
    correlationId,
    packageId: pkg.packageId,
    titleId: pkg.titleId,
    conditions,
    finalPackageStatus: certified ? 'AUTHOR_REVIEW' : pkg.packageStatus,
    responseClock,
    blockers,
  }
}

export function assembleAuthorReviewPackage(input: {
  packageId: string
  titleId: string
  authorId: string
  stageId: string
  stageCode: PackageStageCode
  gateId: string
  packageVersion: string
  artifacts: PackageArtifactInput[]
  preparedAt: string
  cadence: CadenceInput
  correlationId: string
}): CanonicalAuthorReviewPackage {
  const policy = getPackagePolicy(input.stageCode)
  const manifest = createPackageManifest({ ...input, createdAt: input.preparedAt })
  const qaResult = validatePackageQa({ manifest, artifacts: input.artifacts, completedAt: input.preparedAt })
  const cadence = evaluatePackageCadence({ stageCode: input.stageCode, qaResult, cadence: input.cadence })
  const status = qaResult.ok ? cadence.status : qaResult.status

  return {
    packageId: input.packageId,
    titleId: input.titleId,
    authorId: input.authorId,
    stageId: input.stageId,
    stageCode: input.stageCode,
    gateId: input.gateId,
    packageType: policy.packageType,
    packageVersion: input.packageVersion,
    packageStatus: status,
    sourceArtifactIds: input.artifacts.map((artifact) => artifact.artifactId),
    deliverableArtifactIds: manifest.artifacts.filter((artifact) => artifact.authorVisible).map((artifact) => artifact.artifactId),
    requiredArtifactRoles: policy.requiredArtifactRoles,
    optionalArtifactRoles: policy.optionalArtifactRoles,
    manifest,
    packageChecksum: manifest.packageChecksum,
    preparedAt: input.preparedAt,
    qaStatus: qaResult.status,
    qaCompletedAt: qaResult.completedAt,
    cadencePolicyId: policy.cadencePolicyId,
    earliestReleaseAt: cadence.earliestReleaseAt || undefined,
    correlationId: input.correlationId,
    idempotencyKey: buildPackageIdempotencyKey(input),
  }
}

export function buildNotificationInputFromPackage(input: {
  pkg: CanonicalAuthorReviewPackage
  recipientEmail: string
  workspaceAccessLocation: string
  notificationTemplateId: string
  attachments: PackageArtifactInput[]
}): AuthorPackageNotificationInput {
  const policy = getPackagePolicy(input.pkg.stageCode)
  const attachmentRoles = new Set(policy.emailAttachmentRoles)
  const attachmentInputs = input.attachments.filter((artifact) => attachmentRoles.has(artifact.role))
  const notificationRoles = notificationRolesForPackageType(input.pkg.packageType)

  return {
    titleId: input.pkg.titleId,
    authorId: input.pkg.authorId,
    stageCode: input.pkg.packageType,
    gateId: input.pkg.gateId,
    packageId: input.pkg.packageId,
    packageVersion: input.pkg.packageVersion,
    packageArtifactIds: input.pkg.sourceArtifactIds,
    requiredAttachmentArtifactIds: attachmentInputs.map((artifact) => artifact.artifactId),
    workspaceAccessLocation: input.workspaceAccessLocation,
    notificationTemplateId: input.notificationTemplateId,
    cadenceReleaseAt: input.pkg.earliestReleaseAt,
    recipientPolicy: {
      from: AUTHOR_PUBLISHING_COMMUNICATION_POLICY.transactionalFromAddress,
      to: input.recipientEmail,
      replyTo: AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo,
      bcc: [AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCopy],
    },
    correlationId: input.pkg.correlationId,
    idempotencyKey: `package-release:${input.pkg.idempotencyKey}`,
    attachments: attachmentInputs.map((artifact): GovernedPackageAttachment => {
      const role = notificationRoles[artifact.role]
      if (!role) throw new Error(`PACKAGE_NOTIFICATION_ROLE_MISSING:${artifact.role}`)
      return {
        role,
        artifactId: artifact.artifactId,
        fileName: artifact.filename,
        contentType: artifact.mimeType,
        contentBytesBase64: artifact.contentBytesBase64,
        sizeBytes: artifact.fileSize,
        sha256: artifact.checksum,
      }
    }),
    packageChecksum: input.pkg.packageChecksum,
  }
}

export function supersedePackage(input: {
  current: CanonicalAuthorReviewPackage
  revisedPackageId: string
  completedAt: string
}): CanonicalAuthorReviewPackage {
  return {
    ...input.current,
    packageStatus: 'SUPERSEDED',
    completedAt: input.completedAt,
    supersededByPackageId: input.revisedPackageId,
  }
}

export function packageVisibilityForWorkspace(status: PackageStatus) {
  if (status === 'AUTHOR_REVIEW' || status === 'RELEASED') return 'active'
  if (status === 'APPROVED') return 'completed'
  if (status === 'SUPERSEDED') return 'superseded'
  return 'hidden'
}

export function migrateHistoricalPackageEvidence(input: {
  packageId: string
  titleId: string
  authorId: string
  stageId: string
  stageCode: PackageStageCode
  gateId: string
  packageVersion: string
  artifacts: PackageArtifactInput[]
  createdAt: string
}) {
  const manifest = createPackageManifest(input)
  return {
    classification: 'MIGRATION_COMPATIBLE' as const,
    manifest,
    resendRequired: false,
    preservesPriorCommunicationEvidence: true,
  }
}

export function publisherTodayPackageMetrics(packages: CanonicalAuthorReviewPackage[]) {
  return {
    packagesAssembling: count(packages, 'ASSEMBLING'),
    packagesInQa: count(packages, 'VALIDATING'),
    qaFailures: count(packages, 'QA_FAILED'),
    cadenceHolds: count(packages, 'CADENCE_HOLD'),
    readyForRelease: count(packages, 'READY_FOR_RELEASE'),
    notificationExceptions: count(packages, 'EXCEPTION'),
    awaitingAuthors: packages.filter((pkg) => pkg.packageStatus === 'AUTHOR_REVIEW' || pkg.packageStatus === 'RELEASED').length,
    correctionsRequested: count(packages, 'CORRECTIONS_REQUESTED'),
    supersededPackages: count(packages, 'SUPERSEDED'),
  }
}

function baseQaChecks() {
  return [
    'required-artifacts-exist',
    'file-types-valid',
    'checksums-valid',
    'files-renderable',
    'package-version-consistent',
    'metadata-matches-title-stage-author',
    'review-instructions-match-package-type',
    'stale-stage-artifacts-excluded',
    'manifest-reconciles-to-artifacts',
  ]
}

function manuscriptMemoInstructionTypes() {
  return {
    editedManuscript: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    developmentalMemo: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    lineEditingSummary: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    copyeditingSummary: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    reviewInstructions: ['application/pdf', 'text/plain'],
    authorResponseMechanism: ['application/pdf', 'text/plain'],
    packageManifest: ['application/json', 'application/pdf', 'text/plain'],
    authorCoverMessage: ['application/pdf', 'text/plain'],
  } satisfies Partial<Record<PackageArtifactRole, string[]>>
}

function notificationRolesForPackageType(packageType: AuthorReviewPackageType): Partial<Record<PackageArtifactRole, AttachmentRole>> {
  const configured = AUTHOR_PACKAGE_NOTIFICATION_POLICIES[packageType].attachmentsRequired
  return {
    assessment: configured.includes('editorialMemo') ? 'editorialMemo' : 'reviewInstructions',
    recommendedEditorialPath: 'reviewInstructions',
    editedManuscript: configured.includes('editedManuscript') ? 'editedManuscript' : configured[0],
    developmentalMemo: 'editorialMemo',
    lineEditingSummary: 'reviewCoverNote',
    copyeditingSummary: 'reviewCoverNote',
    proofreadingCoverNote: 'reviewCoverNote',
    proofreadManuscript: 'proofreadManuscript',
    interiorProofPDF: 'interiorProof',
    approvedConceptOrReviewSet: 'coverProof',
    designRationale: 'reviewInstructions',
    finalInteriorProof: 'productionProof',
    finalCoverProof: 'reviewInstructions',
    reviewInstructions: 'reviewInstructions',
    productionReviewInstructions: 'reviewInstructions',
    authorResponseMechanism: 'authorResponseMechanism',
    packageManifest: 'packageManifest',
    authorCoverMessage: 'authorCoverMessage',
  }
}

function buildPackageIdempotencyKey(input: {
  titleId: string
  stageCode: PackageStageCode
  gateId: string
  packageId: string
  packageVersion: string
}) {
  return ['package-engine', input.titleId, input.stageCode, input.gateId, input.packageId, input.packageVersion].join(':')
}

function normalizeChecksum(value: string) {
  return /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() : ''
}

function cadenceDays(wordCount = 0, complexity: CadenceInput['titleComplexity'] = 'standard') {
  if (complexity === 'complex') return 2
  if (wordCount > 75000) return 2
  if (wordCount > 35000) return 1
  return 0
}

function addBusinessDays(value: string, days: number) {
  const date = new Date(value)
  let remaining = days
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1)
    const day = date.getUTCDay()
    if (day !== 0 && day !== 6) remaining -= 1
  }
  return date.toISOString()
}

function addCalendarDays(value: string, days: number) {
  const date = new Date(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

function releaseReady(now: string, earliestReleaseAt: string) {
  return new Date(now).getTime() >= new Date(earliestReleaseAt).getTime()
}

function count(packages: CanonicalAuthorReviewPackage[], status: PackageStatus) {
  return packages.filter((pkg) => pkg.packageStatus === status).length
}
