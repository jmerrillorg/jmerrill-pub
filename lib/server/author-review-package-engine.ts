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

export type AuthorDecisionOption =
  | 'APPROVE'
  | 'APPROVE_WITH_MINOR_CORRECTIONS'
  | 'REQUEST_CORRECTIONS'
  | 'QUESTION'

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
  authorDecisionOptions: AuthorDecisionOption[]
  nextStagePolicy: string
}

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
    authorDecisionOptions: ['APPROVE', 'REQUEST_CORRECTIONS', 'QUESTION'],
    nextStagePolicy: 'route-to-developmental-line-copy-or-production-readiness',
  },
  DEVELOPMENTAL_EDITING: {
    stageCode: 'DEVELOPMENTAL_EDITING',
    packageType: 'DEVELOPMENTAL_EDITING_REVIEW',
    requiredArtifactRoles: ['editedManuscript', 'developmentalMemo', 'reviewInstructions'],
    optionalArtifactRoles: [],
    allowedMimeTypesByRole: manuscriptMemoInstructionTypes(),
    qaChecks: baseQaChecks(),
    emailAttachmentRoles: ['editedManuscript', 'developmentalMemo', 'reviewInstructions'],
    workspaceDownloadRoles: ['editedManuscript', 'developmentalMemo', 'reviewInstructions'],
    cadencePolicyId: 'EDITORIAL_AUTHOR_REVIEW_BY_WORD_COUNT',
    authorDecisionOptions: ['APPROVE', 'REQUEST_CORRECTIONS', 'QUESTION'],
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
    authorDecisionOptions: ['APPROVE', 'REQUEST_CORRECTIONS', 'QUESTION'],
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
    authorDecisionOptions: ['APPROVE', 'REQUEST_CORRECTIONS', 'QUESTION'],
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
    authorDecisionOptions: ['APPROVE', 'APPROVE_WITH_MINOR_CORRECTIONS', 'REQUEST_CORRECTIONS', 'QUESTION'],
    nextStagePolicy: 'interior-layout-eligibility',
  },
  INTERIOR_LAYOUT: {
    stageCode: 'INTERIOR_LAYOUT',
    packageType: 'INTERIOR_LAYOUT_REVIEW',
    requiredArtifactRoles: ['interiorProofPDF', 'reviewInstructions'],
    optionalArtifactRoles: [],
    allowedMimeTypesByRole: {
      interiorProofPDF: ['application/pdf'],
      reviewInstructions: ['application/pdf', 'text/plain'],
    },
    qaChecks: baseQaChecks(),
    emailAttachmentRoles: ['interiorProofPDF', 'reviewInstructions'],
    workspaceDownloadRoles: ['interiorProofPDF', 'reviewInstructions'],
    cadencePolicyId: 'PRODUCTION_AUTHOR_REVIEW_STANDARD',
    authorDecisionOptions: ['APPROVE', 'REQUEST_CORRECTIONS', 'QUESTION'],
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
    authorDecisionOptions: ['APPROVE', 'REQUEST_CORRECTIONS', 'QUESTION'],
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
    authorDecisionOptions: ['APPROVE', 'REQUEST_CORRECTIONS', 'QUESTION'],
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
      cc: [AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCc],
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

function releaseReady(now: string, earliestReleaseAt: string) {
  return new Date(now).getTime() >= new Date(earliestReleaseAt).getTime()
}

function count(packages: CanonicalAuthorReviewPackage[], status: PackageStatus) {
  return packages.filter((pkg) => pkg.packageStatus === status).length
}
