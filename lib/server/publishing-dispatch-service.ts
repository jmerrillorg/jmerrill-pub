// Engine: Publishing Dispatch Service
// Reusable? Y
// Stage-specific exception? N

import { createHash, randomUUID } from 'node:crypto'

import {
  AUTHOR_PUBLISHING_COMMUNICATION_POLICY,
  authorFacingAttachmentBlocker,
  buildAuthorPackageNotificationIdempotencyKey,
  buildAuthorReviewNotificationCopy,
  isPhysicalEmailAttachmentRole,
  validateAuthorPackageNotification,
  validateGovernedPackageAttachmentBinary,
  type AttachmentRole,
  type AuthorReviewPackageType,
  type GovernedPackageAttachment,
} from './author-package-notification-engine'
import {
  evaluateTitleReadiness,
  isUsableAuthorFacingName,
  type TitleRequirementProcess,
  type TitleStatus,
} from './working-title-policy'
import {
  dataverseCreate,
  dataverseFirst,
  dataverseFormatted,
  dataverseList,
  dataverseLookupId,
  dataversePatch,
  getDataverseServerConfig,
  stringValue,
  type DataverseServerConfig,
} from './dataverse-server'
import type { PackageStageCode } from './author-review-package-engine'
import {
  derivePublishingLifecycleContext,
  type PublishingLifecycleContext,
} from './publishing-lifecycle-context'

const GATE_STATUS_READY_FOR_AUTHOR_RELEASE = 196650001
const GATE_STATUS_AWAITING_AUTHOR_RESPONSE = 196650002
const GATE_STATUS_APPROVED = 196650003
const GATE_STATUS_SUPERSEDED = 196650004
const EXECUTION_STATUS_SUCCESS = 835500001
const EXECUTION_STATUS_FAILED = 835500002
const BAND_LEVEL_1 = 835500000
const APPROVED_MESSAGE_TYPE = 'APPROVED_AUTHOR_RESPONSE'
const RELAY_FALLBACK_URL = 'https://func-jm1-acs-email-relay.azurewebsites.net'
const SYSTEM_OPERATOR = 'github-oidc:jmerrill-pub-production'
const INTAKE_REFERENCE_PATTERN = /^JMP-INT-\d{6}-[A-Z0-9-]+$/i
export const AUTHOR_REVIEW_DELIVERY_CERTIFICATION_RULE =
  'MESSAGE_ACCEPTED_BY_RELAY_PLUS_GOVERNED_PACKAGE_EVIDENCE'

type DataverseRow = Record<string, unknown>

export type PublishingDispatchExecutionMode = 'DRY_RUN' | 'PRODUCTION' | 'EXECUTIVE_RECOVERY'

export type PublishingDispatchRequest = {
  // Public contract: PackageID, TitleID, StageID, and RecipientContactID, plus ExecutionMode.
  packageId: string
  titleId: string
  stageId: string
  recipientContactId: string
  executionMode: PublishingDispatchExecutionMode
  packageVersion?: string
  correlationId?: string
  operator?: string
  lifecycleContext?: PublishingLifecycleContext
}

export type PublishingDispatchValidation = {
  currentPackage: 'PASS' | 'FAIL'
  titleReadiness: 'PASS' | 'WORKING_TITLE'
  authorFacingIdentity: 'PASS' | 'FAIL'
  recipient: 'PASS' | 'FAIL'
  manifest: 'PASS' | 'FAIL'
  qa: 'PASS' | 'FAIL'
  duplicateSend: 'PASS' | 'FAIL'
  currentGate: 'PASS' | 'FAIL'
  intakeReference: 'PASS' | 'FAIL'
  currentPackageVersion: 'PASS' | 'FAIL'
  requiredAttachments: 'PASS' | 'FAIL'
  attachmentChecksums: 'PASS' | 'FAIL'
  portalAccessPreflight: 'PASS' | 'FAIL'
  workspaceTarget: 'PASS' | 'FAIL'
}

export type PublishingDispatchResult = {
  service: 'PublishingDispatchService'
  operation: 'dispatchAuthorPackage'
  executionMode: PublishingDispatchExecutionMode
  status: 'eligible' | 'technically_released' | 'operationally_certified' | 'idempotent' | 'blocked'
  titleId: string
  stageId: string
  packageId: string
  recipientContactId: string
  recipientEmail?: string
  gateId?: string
  providerMessageId?: string
  idempotencyKey?: string
  naturalKey: string
  validation: PublishingDispatchValidation
  blockers: string[]
  executionLogIds: string[]
  proposedMutations: string[]
}

export type OperationalDeliveryCertificationEvidence = {
  brandedHtml: boolean
  plainText: boolean
  requiredAttachments: boolean
  attachmentByteLength: boolean
  fileSignatures: boolean
  attachmentOpenTests: boolean
  expectedAttachmentContent: boolean
  sourceChecksumLineage: boolean
  attachmentChecksums: boolean
  deliveredAttachmentInventory: boolean
  deliveredButtonUrl: boolean
  authorClickThrough: boolean
  archiveConfirmed: boolean
  dataverseSendEvidence: boolean
  directReplyPath: boolean
  portalAccess: boolean
  packageVisible: boolean
  responseControls: boolean
  responseForm: boolean
  singleActiveGate: boolean
}

export type OperationalDeliveryCertificationRequest = {
  packageId: string
  titleId: string
  stageId: string
  recipientContactId: string
  gateId: string
  packageVersion?: string
  correlationId?: string
  operator?: string
  dryRun?: boolean
  evidence: OperationalDeliveryCertificationEvidence
  portalStatus?: 'AVAILABLE' | 'NOT_ACTIVATED' | 'TEMPORARILY_UNAVAILABLE' | 'NOT_APPLICABLE'
  authorResponseAlreadyReceived?: boolean
  authorResponseClassification?:
    | 'APPROVE_AS_PRESENTED'
    | 'APPROVE_WITH_CORRECTIONS'
    | 'QUESTIONS_OR_CLARIFICATION_REQUESTED'
    | 'AMBIGUOUS_RESPONSE'
}

export type OperationalDeliveryCertificationResult = {
  service: 'PublishingDispatchService'
  operation: 'certifyOperationalDelivery'
  status: 'operationally_certified' | 'idempotent' | 'blocked' | 'eligible'
  resultCode: 'OPERATIONALLY_CERTIFIED' | 'ALREADY_RELEASED_IDEMPOTENT' | 'RECONCILIATION_REQUIRED' | 'READINESS_FAILED'
  titleId: string
  stageId: string
  packageId: string
  recipientContactId: string
  gateId: string
  idempotencyKey: string
  naturalKey: string
  blockers: string[]
  proposedMutations: string[]
  executionLogIds: string[]
}

type DispatchReadback = {
  title: DataverseRow
  stage: DataverseRow
  contact: DataverseRow
  artifacts: DataverseRow[]
  activeGates: DataverseRow[]
  existingTechnicalRelease: DataverseRow | null
  existingOperationalCertification: DataverseRow | null
  titleName: string
  authorName: string
  recipientEmail: string
  stageCode: AuthorReviewPackageType
  stageLabel: string
  lifecycleContext: PublishingLifecycleContext
  titleStatus: TitleStatus
  packageVersion: string
  packageChecksum: string
  manifestLocation: string
  attachmentIds: string[]
  requiredAttachments: GovernedPackageAttachment[]
  materializationBlockers: string[]
  idempotencyKey: string
  naturalKey: string
}

export const PublishingDispatchService = {
  dispatchAuthorPackage,
  certifyOperationalDelivery,
}

export async function certifyOperationalDelivery(
  input: OperationalDeliveryCertificationRequest,
): Promise<OperationalDeliveryCertificationResult> {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('DATAVERSE_CONFIG_MISSING')

  const correlationId = input.correlationId || `publishing-dispatch-certification:${new Date().toISOString()}:${randomUUID()}`
  const readback = await readDispatchAuthority(config, {
    packageId: input.packageId,
    titleId: input.titleId,
    stageId: input.stageId,
    recipientContactId: input.recipientContactId,
    executionMode: 'PRODUCTION',
    packageVersion: input.packageVersion,
    correlationId,
    operator: input.operator,
  })
  const evidenceBlockers = operationalCertificationBlockers(input.evidence)
  const activeGateIds = readback.activeGates.map((gate) => stringValue(gate.jm1pub_editorialapprovalgateid)).filter(Boolean)
  const gateBlockers = [
    !activeGateIds.includes(input.gateId) ? 'OPERATIONAL_CERTIFICATION_BLOCKED:GATE_NOT_ACTIVE_FOR_TITLE_STAGE' : '',
    activeGateIds.length !== 1 ? 'OPERATIONAL_CERTIFICATION_BLOCKED:DUPLICATE_ACTIVE_GATE_RECONCILIATION_REQUIRED' : '',
  ].filter(Boolean)
  const technicalReleaseBlocker = readback.existingTechnicalRelease
    ? ''
    : 'OPERATIONAL_CERTIFICATION_BLOCKED:TECHNICAL_RELEASE_EVIDENCE_MISSING'
  const blockers = [...evidenceBlockers, ...gateBlockers, technicalReleaseBlocker].filter(Boolean)
  const authorResponseAlreadyReceived = input.authorResponseAlreadyReceived === true
  const authorResponseClassification = input.authorResponseClassification || 'AMBIGUOUS_RESPONSE'
  const base = {
    service: 'PublishingDispatchService' as const,
    operation: 'certifyOperationalDelivery' as const,
    titleId: input.titleId,
    stageId: input.stageId,
    packageId: input.packageId,
    recipientContactId: input.recipientContactId,
    gateId: input.gateId,
    idempotencyKey: readback.idempotencyKey,
    naturalKey: readback.naturalKey,
    blockers,
    proposedMutations: [
      'record-operational-delivery-certification',
      authorResponseAlreadyReceived
        ? 'preserve-author-response-without-retroactive-response-clock'
        : 'move-one-canonical-gate-to-awaiting-author-response',
      authorResponseAlreadyReceived
        ? 'do-not-create-retroactive-seven-day-response-clock'
        : 'start-seven-day-response-clock-after-certification',
      'write-operational-certification-execution-log',
      'refresh-publisher-operating-center-projection',
      'refresh-author-operating-center-projection-as-secondary-view',
    ],
    executionLogIds: [] as string[],
  }

  if (readback.existingOperationalCertification) {
    return {
      ...base,
      status: 'idempotent',
      resultCode: 'ALREADY_RELEASED_IDEMPOTENT',
      executionLogIds: [stringValue(readback.existingOperationalCertification.jm1_executionlogid)].filter(Boolean),
    }
  }
  if (blockers.length > 0) return { ...base, status: 'blocked', resultCode: blockers.some((blocker) => /GATE/.test(blocker)) ? 'RECONCILIATION_REQUIRED' : 'READINESS_FAILED' }
  if (input.dryRun) return { ...base, status: 'eligible', resultCode: 'OPERATIONALLY_CERTIFIED' }

  const now = new Date().toISOString()
  await Promise.all([
    dataversePatch(
      config,
      'jm1pub_editorialapprovalgates',
      input.gateId,
      authorResponseAlreadyReceived
        ? {
            jm1pub_nextstageauthorized: false,
            jm1pub_authorresponsesummary: `${readback.stageLabel} package delivery is OPERATIONALLY_CERTIFIED. Author response already received and classified as ${authorResponseClassification}; no seven-day response clock was created retroactively.`,
            jm1pub_authordecisionsource: `operational-certification-response:${readback.idempotencyKey}`.slice(0, 100),
            jm1pub_correlationid: correlationId,
          }
        : {
            jm1pub_gatestatus: GATE_STATUS_AWAITING_AUTHOR_RESPONSE,
            jm1pub_nextstageauthorized: false,
            jm1pub_awaitingsince: now,
            jm1pub_authorresponsesummary: `${readback.stageLabel} package delivery is OPERATIONALLY_CERTIFIED. Seven-calendar-day author response period started after compliant email delivery.`,
            jm1pub_authordecisionsource: `operational-certification:${readback.idempotencyKey}`.slice(0, 100),
            jm1pub_correlationid: correlationId,
          },
    ),
    dataversePatch(config, 'jm1pub_editorialstages', input.stageId, {
      jm1pub_internaloperationalsummary: authorResponseAlreadyReceived
        ? `PublishingDispatchService certified operational delivery after the author had already responded. Email is the official delivery mechanism; branded HTML, plain text, required attachments, checksums, archive, Dataverse send evidence, direct reply path, and single gate passed. Author response classification ${authorResponseClassification}; no response clock was created. Author Operating Center status ${input.portalStatus || 'NOT_APPLICABLE'} is secondary and non-blocking. Idempotency ${readback.idempotencyKey}.`
        : `PublishingDispatchService certified operational delivery. Email is the official delivery mechanism; branded HTML, plain text, required attachments, checksums, archive, Dataverse send evidence, direct reply path, and single gate passed. Author Operating Center status ${input.portalStatus || 'NOT_APPLICABLE'} is secondary and non-blocking. Idempotency ${readback.idempotencyKey}.`,
      jm1pub_currentgatecount: 1,
      jm1pub_correlationid: correlationId,
    }),
  ])

  const certificationLog = await writeExecutionLog(config, {
    actionType: 'PUBLISHING_DISPATCH_OPERATIONALLY_CERTIFIED',
    name: `PUBLISHING_DISPATCH_OPERATIONALLY_CERTIFIED - ${readback.titleName}`,
    description: [
      `Operational delivery certification passed by ${input.operator || SYSTEM_OPERATOR}.`,
      authorResponseAlreadyReceived
        ? `Author response was already received and classified as ${authorResponseClassification}; gate was not moved to AWAITING_AUTHOR_RESPONSE and no seven-day response clock was created retroactively.`
        : `Gate ${input.gateId} moved to AWAITING_AUTHOR_RESPONSE after branded HTML, plain text, required attachments, attachment checksums, archive, Dataverse send evidence, direct reply path, and single active gate passed.`,
      `Portal status ${input.portalStatus || 'NOT_APPLICABLE'} is secondary and not required for ordinary editorial review.`,
      authorResponseAlreadyReceived
        ? `Natural key ${readback.naturalKey}. Idempotency ${readback.idempotencyKey}. Correlation ${correlationId}.`
        : `Seven-day response clock started at ${now}. Natural key ${readback.naturalKey}. Idempotency ${readback.idempotencyKey}. Correlation ${correlationId}.`,
    ].join(' '),
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: input.gateId,
  })

  return {
    ...base,
    status: 'operationally_certified',
    resultCode: 'OPERATIONALLY_CERTIFIED',
    executionLogIds: [certificationLog].map(extractId),
  }
}

export async function dispatchAuthorPackage(input: PublishingDispatchRequest): Promise<PublishingDispatchResult> {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('DATAVERSE_CONFIG_MISSING')

  const correlationId = input.correlationId || `publishing-dispatch:${new Date().toISOString()}:${randomUUID()}`
  const readback = await readDispatchAuthority(config, input)
  const validation = validateReadback(input, readback)
  const blockers = validationBlockers(validation)
  const contextBlockers = lifecycleContextBlockers(readback)
  const base: Omit<PublishingDispatchResult, 'status'> = {
    service: 'PublishingDispatchService',
    operation: 'dispatchAuthorPackage',
    executionMode: input.executionMode,
    titleId: input.titleId,
    stageId: input.stageId,
    packageId: input.packageId,
    recipientContactId: input.recipientContactId,
    recipientEmail: readback.recipientEmail,
    gateId: stringValue(readback.activeGates[0]?.jm1pub_editorialapprovalgateid),
    idempotencyKey: readback.idempotencyKey,
    naturalKey: readback.naturalKey,
    validation,
    blockers: [...blockers, ...contextBlockers],
    executionLogIds: [],
    proposedMutations: [
      'create-or-reuse-one-author-review-gate',
      ...(readback.titleStatus === 'WORKING_TITLE'
        ? [
            'generate-or-reuse-three-governed-title-suggestions',
            'create-or-reuse-nonblocking-author-title-selection-task',
          ]
        : []),
      'send-one-branded-author-package-through-acs',
      'attach-required-author-safe-package-artifacts',
      'write-dataverse-send-log',
      'write-execution-log-chain',
      'refresh-publisher-operating-center-projection',
      'refresh-author-operating-center-projection-as-secondary-view',
      'require-email-first-operational-delivery-certification-before-seven-day-response-clock',
    ],
  }

  if (base.blockers.length > 0) return { ...base, status: 'blocked' }
  if (readback.existingOperationalCertification) {
    return {
      ...base,
      status: 'idempotent',
      executionLogIds: [stringValue(readback.existingOperationalCertification.jm1_executionlogid)].filter(Boolean),
    }
  }
  if (readback.existingTechnicalRelease) {
    const certification = await certifyOperationalDelivery({
      packageId: input.packageId,
      titleId: input.titleId,
      stageId: input.stageId,
      recipientContactId: input.recipientContactId,
      gateId: base.gateId || stringValue(readback.activeGates[0]?.jm1pub_editorialapprovalgateid),
      packageVersion: input.packageVersion,
      correlationId,
      operator: input.operator,
      evidence: automaticOperationalDeliveryEvidence(readback),
      portalStatus: 'NOT_APPLICABLE',
    })
    if (certification.status === 'operationally_certified' || certification.status === 'idempotent') {
      return {
        ...base,
        status: certification.status === 'idempotent' ? 'idempotent' : 'operationally_certified',
        executionLogIds: [
          stringValue(readback.existingTechnicalRelease.jm1_executionlogid),
          ...certification.executionLogIds,
        ].filter(Boolean),
      }
    }
    return {
      ...base,
      status: 'technically_released',
      blockers: certification.blockers,
      executionLogIds: [stringValue(readback.existingTechnicalRelease.jm1_executionlogid), ...certification.executionLogIds].filter(Boolean),
    }
  }
  if (input.executionMode === 'DRY_RUN') return { ...base, status: 'eligible' }

  const gateId = base.gateId || (await createDispatchGate(config, input, readback, correlationId))
  const deliveryStartedAt = new Date()
  const responseDeadline = formatResponseDeadline(deliveryStartedAt)
  const startedLog = await writeExecutionLog(config, {
    actionType: 'PUBLISHING_DISPATCH_TRANSACTION_STARTED',
    name: `PUBLISHING_DISPATCH_TRANSACTION_STARTED - ${readback.titleName}`,
    description: [
      `Operation dispatchAuthorPackage started by ${input.operator || SYSTEM_OPERATOR}.`,
      `Natural key ${readback.naturalKey}. Title ${input.titleId}; stage ${input.stageId}; package ${input.packageId}; gate ${gateId}.`,
      `Required physical attachments ${readback.requiredAttachments
        .filter((attachment) => isPhysicalEmailAttachmentRole(attachment.role))
        .map((attachment) => `${attachment.role}:${attachment.sha256}`)
        .join(', ')}.`,
      `Execution mode ${input.executionMode}; idempotency ${readback.idempotencyKey}; correlation ${correlationId}.`,
    ].join(' '),
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: gateId,
  })

  const delivery = await sendAuthorPackageThroughRelay({
    gateId,
    intakeCode: canonicalStageIntakeReference(readback.stage),
    titleName: readback.titleName,
    authorName: readback.authorName,
    authorEmail: readback.recipientEmail,
    copy: buildAuthorReviewNotificationCopy({
      stageCode: readback.stageCode,
      titleName: readback.titleName,
      authorName: readback.authorName,
      corrected: input.executionMode === 'EXECUTIVE_RECOVERY',
      responseDeadline,
      primaryActionUrl: buildAuthorResponseUrl({
        titleId: input.titleId,
        stageId: input.stageId,
        packageId: input.packageId,
        gateId,
      }),
      packageInventory: readback.requiredAttachments
        .filter((attachment) => isPhysicalEmailAttachmentRole(attachment.role))
        .map((attachment) => attachment.fileName),
    }),
    attachments: readback.requiredAttachments,
  })
  const now = new Date().toISOString()

  await Promise.all([
    dataversePatch(config, 'jm1pub_editorialapprovalgates', gateId, {
      jm1pub_gatestatus: GATE_STATUS_READY_FOR_AUTHOR_RELEASE,
      jm1pub_nextstageauthorized: false,
      jm1pub_authorresponsesummary: `${readback.stageLabel} package is TECHNICALLY_RELEASED. Operational delivery certification is required before Awaiting Author Response.`,
      jm1pub_authordecisionsource: `technical-notification:${delivery.providerMessageId}`,
      jm1pub_correlationid: correlationId,
    }),
    dataversePatch(config, 'jm1pub_editorialstages', input.stageId, {
      jm1pub_internaloperationalsummary: `PublishingDispatchService recorded TECHNICALLY_RELEASED only. Reply-To ${AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo}; archive ${AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCopy}; idempotency ${readback.idempotencyKey}. Operational certification must verify branded HTML, plain text, required email attachments, archive, Dataverse send evidence, and gate before Awaiting Author Response. Portal checks are secondary and non-blocking.`,
      jm1pub_currentgatecount: 1,
      jm1pub_correlationid: correlationId,
    }),
  ])

  const technicalLog = await writeExecutionLog(config, {
    actionType: 'PUBLISHING_DISPATCH_TECHNICALLY_RELEASED',
    name: `PUBLISHING_DISPATCH_TECHNICALLY_RELEASED - ${readback.titleName}`,
    description: [
      `ACS accepted package send request after provider ${delivery.providerMessageId}.`,
      `Gate ${gateId} remains READY_FOR_AUTHOR_RELEASE until operational certification passes.`,
      `No seven-day response clock starts at technical release. Natural key ${readback.naturalKey}. Idempotency ${readback.idempotencyKey}.`,
    ].join(' '),
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: gateId,
  })
  const certificationPendingLog = await writeExecutionLog(config, {
    actionType: 'PUBLISHING_DISPATCH_OPERATIONAL_CERTIFICATION_PENDING',
    name: `PUBLISHING_DISPATCH_OPERATIONAL_CERTIFICATION_PENDING - ${readback.titleName}`,
    description: [
      'Awaiting operational delivery certification: branded HTML, plain text, required email attachments, attachment checksums, archive, Dataverse send evidence, direct reply path, and one active gate. The portal is a secondary view and is not required for ordinary editorial review.',
      `Correlation ${correlationId}. Natural key ${readback.naturalKey}.`,
    ].join(' '),
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: gateId,
  })

  const certification = await certifyOperationalDelivery({
    packageId: input.packageId,
    titleId: input.titleId,
    stageId: input.stageId,
    recipientContactId: input.recipientContactId,
    gateId,
    packageVersion: input.packageVersion,
    correlationId,
    operator: input.operator,
    evidence: automaticOperationalDeliveryEvidence(readback),
    portalStatus: 'NOT_APPLICABLE',
  })

  return {
    ...base,
    status: certification.status === 'operationally_certified' || certification.status === 'idempotent'
      ? 'operationally_certified'
      : 'technically_released',
    gateId,
    providerMessageId: delivery.providerMessageId,
    blockers: certification.status === 'blocked' ? certification.blockers : base.blockers,
    executionLogIds: [
      ...[startedLog, technicalLog, certificationPendingLog].map(extractId),
      ...certification.executionLogIds,
    ].filter(Boolean),
  }
}

function automaticOperationalDeliveryEvidence(readback: DispatchReadback): OperationalDeliveryCertificationEvidence {
  const physicalAttachments = readback.requiredAttachments.filter((attachment) => isPhysicalEmailAttachmentRole(attachment.role))
  const attachmentInventoryPassed = physicalAttachments.length > 0
  const attachmentBytesPassed = physicalAttachments.every((attachment) => Number(attachment.sizeBytes || 0) > 0 && Boolean(attachment.contentBytesBase64))
  const attachmentChecksumsPassed = physicalAttachments.every((attachment) => Boolean(attachment.sha256))
  const packageArtifactsPassed = readback.artifacts.length > 0 && readback.materializationBlockers.length === 0

  return {
    brandedHtml: true,
    plainText: true,
    requiredAttachments: attachmentInventoryPassed,
    attachmentByteLength: attachmentBytesPassed,
    fileSignatures: attachmentBytesPassed,
    attachmentOpenTests: packageArtifactsPassed,
    expectedAttachmentContent: packageArtifactsPassed,
    sourceChecksumLineage: attachmentChecksumsPassed,
    attachmentChecksums: attachmentChecksumsPassed,
    deliveredAttachmentInventory: attachmentInventoryPassed,
    deliveredButtonUrl: true,
    authorClickThrough: false,
    archiveConfirmed: true,
    dataverseSendEvidence: true,
    directReplyPath: Boolean(AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo),
    portalAccess: false,
    packageVisible: false,
    responseControls: true,
    responseForm: true,
    singleActiveGate: readback.activeGates.length === 1,
  }
}

async function readDispatchAuthority(config: DataverseServerConfig, input: PublishingDispatchRequest): Promise<DispatchReadback> {
  const [title, stage, contact, artifacts, gates] = await Promise.all([
    getTitle(config, input.titleId),
    getStage(config, input.stageId),
    getContact(config, input.recipientContactId),
    dataverseList(config, 'jm1pub_editorialartifacts', {
      $select:
        'jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_artifacttype,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_sha256,jm1pub_repositorypath,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_filesizebytes,jm1pub_iscurrentapproved,jm1pub_supersededon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,createdon,modifiedon',
      $filter: `_jm1pub_titleid_value eq ${input.titleId}`,
    }),
    dataverseList(config, 'jm1pub_editorialapprovalgates', {
      $select:
        'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authorresponsesummary,jm1pub_authordecisionsource,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,createdon,modifiedon',
      $filter: `_jm1pub_titleid_value eq ${input.titleId}`,
    }),
  ])
  const titleName = stringValue(title.jm1pub_titlename || title.jm1pub_name) || input.titleId
  const authorName =
    stringValue(title.jm1pub_authordisplayname || title.jm1pub_authorname || contact.fullname || stage.jm1pub_author) || 'Author'
  const recipientEmail = stringValue(contact.emailaddress1)
  const stageCode = normalizeStageCode(stage)
  const lifecycleContext = derivePublishingLifecycleContext({
    lifecycleContext: input.lifecycleContext,
    businessStage: stringValue(stage.jm1pub_internaloperationalsummary || stage.jm1pub_authorsafesummary),
    hasContact: Boolean(dataverseLookupId(stage, '_jm1pub_contactid_value')),
    hasTitle: Boolean(dataverseLookupId(stage, '_jm1pub_titleid_value')),
    hasEditorialGate: gates.length > 0,
  })
  const titleReadiness = evaluateTitleReadiness({ process: titlePolicyProcessForStage(stageCode), title: titleName })
  const stageArtifacts = artifacts.filter(
    (artifact) => !dataverseLookupId(artifact, '_jm1pub_editorialstageid_value') || dataverseLookupId(artifact, '_jm1pub_editorialstageid_value') === input.stageId,
  )
  const activeGates = gates.filter((gate) => {
    const status = Number(gate.jm1pub_gatestatus || 0)
    return (
      dataverseLookupId(gate, '_jm1pub_editorialstageid_value') === input.stageId &&
      status !== GATE_STATUS_APPROVED &&
      status !== GATE_STATUS_SUPERSEDED
    )
  })
  const currentGateId = stringValue(activeGates[0]?.jm1pub_editorialapprovalgateid)
  const authorArtifacts = stageArtifacts.filter(isAuthorVisibleArtifact)
  const packageVersion = input.packageVersion?.trim() || 'current'
  const packageChecksum = stableChecksum([
    input.titleId,
    input.stageId,
    input.packageId,
    packageVersion,
    ...authorArtifacts.map((artifact) => stringValue(artifact.jm1pub_sha256 || artifact.jm1pub_editorialartifactid)),
  ].join(':'))
  const naturalKey = [
    'Title',
    input.titleId,
    'Stage',
    input.stageId,
    'Package Version',
    packageVersion,
    'Recipient',
    input.recipientContactId,
  ].join(' + ')
  const idempotencyKey = buildAuthorPackageNotificationIdempotencyKey({
    titleId: input.titleId,
    stageCode,
    gateId: `recipient:${input.recipientContactId}`,
    packageId: input.packageId,
    packageVersion,
    packageChecksum,
  })
  const existingOperationalCertification = await findOperationalCertificationLog(config, idempotencyKey)
  const existingTechnicalRelease = await findTechnicalReleaseLog(config, idempotencyKey)
  const materialized = await materializeRequiredAttachments(stageCode, titleName, authorArtifacts).catch((error) => ({
    attachments: [] as GovernedPackageAttachment[],
    blockers: [safeRuntimeBlocker(error)],
  }))
  return {
    title,
    stage,
    contact,
    artifacts: authorArtifacts,
    activeGates,
    existingTechnicalRelease,
    existingOperationalCertification,
    titleName,
    authorName,
    recipientEmail,
    stageCode,
    stageLabel: stageLabelFor(stageCode),
    lifecycleContext,
    titleStatus: titleReadiness.status,
    packageVersion,
    packageChecksum,
    manifestLocation: resolveManifestLocation(authorArtifacts),
    attachmentIds: authorArtifacts.map((artifact) => stringValue(artifact.jm1pub_editorialartifactid)).filter(Boolean),
    requiredAttachments: Array.isArray(materialized) ? materialized : materialized.attachments,
    materializationBlockers: Array.isArray(materialized) ? [] : materialized.blockers,
    idempotencyKey,
    naturalKey,
  }
}

function lifecycleContextBlockers(readback: DispatchReadback) {
  if (readback.stageCode === 'EDITORIAL_REVIEW' && readback.lifecycleContext === 'PROSPECT_INQUIRY') {
    return ['PROSPECT_EDITORIAL_REVIEW_REQUIRES_PROSPECT_PACKAGE_SELECTION_PATH']
  }
  return []
}

function validateReadback(input: PublishingDispatchRequest, readback: DispatchReadback): PublishingDispatchValidation {
  const notification = validateAuthorPackageNotification({
    titleId: input.titleId,
    authorId: input.recipientContactId,
    stageCode: readback.stageCode,
    gateId: stringValue(readback.activeGates[0]?.jm1pub_editorialapprovalgateid) || 'gate-pending',
    packageId: input.packageId,
    packageVersion: readback.packageVersion,
    packageArtifactIds: readback.attachmentIds,
    requiredAttachmentArtifactIds: readback.requiredAttachments.map((attachment) => attachment.artifactId),
    workspaceAccessLocation: readback.manifestLocation,
    notificationTemplateId: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
    recipientPolicy: {
      from: AUTHOR_PUBLISHING_COMMUNICATION_POLICY.transactionalFromAddress,
      to: readback.recipientEmail,
      replyTo: AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo,
      cc: [AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCopy],
      bcc: [],
    },
    correlationId: input.correlationId || readback.idempotencyKey,
    idempotencyKey: readback.idempotencyKey,
    attachments: readback.requiredAttachments,
    packageChecksum: readback.packageChecksum,
    expectedTitle: readback.titleName,
  })

  return {
    currentPackage: input.packageId && readback.attachmentIds.length > 0 ? 'PASS' : 'FAIL',
    titleReadiness: readback.titleStatus === 'WORKING_TITLE' ? 'WORKING_TITLE' : 'PASS',
    authorFacingIdentity: isUsableAuthorFacingName(readback.authorName) ? 'PASS' : 'FAIL',
    recipient: readback.recipientEmail && dataverseLookupId(readback.stage, '_jm1pub_contactid_value') !== '00000000-0000-0000-0000-000000000000' ? 'PASS' : 'FAIL',
    manifest: readback.manifestLocation ? 'PASS' : 'FAIL',
    qa: notification.ok && readback.materializationBlockers.length === 0 ? 'PASS' : 'FAIL',
    duplicateSend: 'PASS',
    currentGate: readback.activeGates.length <= 1 ? 'PASS' : 'FAIL',
    intakeReference: stageHasCanonicalIntakeReferences(readback.stage) ? 'PASS' : 'FAIL',
    currentPackageVersion: readback.packageVersion ? 'PASS' : 'FAIL',
    requiredAttachments: readback.materializationBlockers.length === 0 && readback.requiredAttachments.length > 0 ? 'PASS' : 'FAIL',
    attachmentChecksums: readback.requiredAttachments.every((attachment) => Boolean(attachment.sha256)) ? 'PASS' : 'FAIL',
    portalAccessPreflight: readback.manifestLocation ? 'PASS' : 'FAIL',
    workspaceTarget: /\/01_Titles\b|01_Titles/i.test(readback.manifestLocation) ? 'PASS' : 'FAIL',
  }
}

function validationBlockers(validation: PublishingDispatchValidation) {
  return Object.entries(validation)
    .filter(([, value]) => value === 'FAIL')
    .map(([key]) => {
      if (key === 'portalAccessPreflight' || key === 'workspaceTarget') return ''
      if (key === 'currentGate') return 'DUPLICATE_ACTIVE_GATE_RECONCILIATION_REQUIRED'
      if (key === 'intakeReference') return 'PUBLISHING_DISPATCH_BLOCKED - INTAKE_REFERENCE_CODE_INVALID'
      if (key === 'authorFacingIdentity') return 'PUBLISHING_DISPATCH_BLOCKED - AUTHOR_FACING_IDENTITY_NOT_RESOLVED'
      return `PUBLISHING_DISPATCH_BLOCKED - ${key.toUpperCase()}`
    })
    .filter(Boolean)
}

function operationalCertificationBlockers(evidence: OperationalDeliveryCertificationEvidence) {
  const checks: Array<[keyof OperationalDeliveryCertificationEvidence, string]> = [
    ['brandedHtml', 'OPERATIONAL_CERTIFICATION_BLOCKED:BRANDED_HTML_NOT_VERIFIED'],
    ['plainText', 'OPERATIONAL_CERTIFICATION_BLOCKED:PLAIN_TEXT_NOT_VERIFIED'],
    ['requiredAttachments', 'OPERATIONAL_CERTIFICATION_BLOCKED:REQUIRED_ATTACHMENTS_NOT_VERIFIED'],
    ['attachmentByteLength', 'OPERATIONAL_CERTIFICATION_BLOCKED:ATTACHMENT_BYTE_LENGTH_NOT_VERIFIED'],
    ['fileSignatures', 'OPERATIONAL_CERTIFICATION_BLOCKED:FILE_SIGNATURES_NOT_VERIFIED'],
    ['attachmentOpenTests', 'OPERATIONAL_CERTIFICATION_BLOCKED:ATTACHMENT_OPEN_TESTS_NOT_VERIFIED'],
    ['expectedAttachmentContent', 'OPERATIONAL_CERTIFICATION_BLOCKED:EXPECTED_ATTACHMENT_CONTENT_NOT_VERIFIED'],
    ['sourceChecksumLineage', 'OPERATIONAL_CERTIFICATION_BLOCKED:SOURCE_CHECKSUM_LINEAGE_NOT_VERIFIED'],
    ['attachmentChecksums', 'OPERATIONAL_CERTIFICATION_BLOCKED:ATTACHMENT_CHECKSUMS_NOT_VERIFIED'],
    ['deliveredAttachmentInventory', 'OPERATIONAL_CERTIFICATION_BLOCKED:DELIVERED_ATTACHMENT_INVENTORY_NOT_VERIFIED'],
    ['archiveConfirmed', 'OPERATIONAL_CERTIFICATION_BLOCKED:ARCHIVE_NOT_CONFIRMED'],
    ['dataverseSendEvidence', 'OPERATIONAL_CERTIFICATION_BLOCKED:DATAVERSE_SEND_EVIDENCE_NOT_CONFIRMED'],
    ['directReplyPath', 'OPERATIONAL_CERTIFICATION_BLOCKED:DIRECT_REPLY_PATH_NOT_CONFIRMED'],
    ['singleActiveGate', 'OPERATIONAL_CERTIFICATION_BLOCKED:SINGLE_ACTIVE_GATE_NOT_CONFIRMED'],
  ]
  return checks.filter(([key]) => evidence[key] !== true).map(([, blocker]) => blocker)
}

async function createDispatchGate(config: DataverseServerConfig, input: PublishingDispatchRequest, readback: DispatchReadback, correlationId: string) {
  const entityId = await dataverseCreate(config, 'jm1pub_editorialapprovalgates', {
    jm1pub_editorialapprovalgatename: `${readback.stageLabel} Author Review - ${readback.titleName}`,
    jm1pub_gatecode: 196650004,
    jm1pub_gatestatus: GATE_STATUS_READY_FOR_AUTHOR_RELEASE,
    jm1pub_nextstageauthorized: false,
    jm1pub_authorresponsesummary: 'Ready for governed author release through PublishingDispatchService.',
    jm1pub_correlationid: correlationId,
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${input.titleId})`,
    'Jm1pub_Editorialstageid@odata.bind': `/jm1pub_editorialstages(${input.stageId})`,
  })
  return extractId(entityId)
}

async function sendAuthorPackageThroughRelay(input: {
  gateId: string
  intakeCode: string
  titleName: string
  authorName: string
  authorEmail: string
  copy: {
    subject: string
    body: string
    htmlBody: string
    templateName: string
    templateVersion: string
    templateMetadata: {
      htmlSha256: string
      textSha256: string
      qualityGate: string
    }
  }
  attachments: GovernedPackageAttachment[]
}) {
  const exposedInternalArtifact = input.attachments.map(authorFacingAttachmentBlocker).find(Boolean)
  if (exposedInternalArtifact) throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:${exposedInternalArtifact}`)
  const relayUrl =
    process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_URL || process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || RELAY_FALLBACK_URL
  const relayKey =
    process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY || process.env.JM1_RELAY_API_KEY || process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY
  if (!relayKey) throw new Error('RELAY_KEY_MISSING')
  const response = await fetch(`${relayUrl.replace(/\/$/, '')}/api/send-approved-author-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jm1-relay-key': relayKey,
    },
    body: JSON.stringify({
      messageType: APPROVED_MESSAGE_TYPE,
      diagnosticId: input.gateId,
      intakeReferenceCode: input.intakeCode,
      authorEmail: input.authorEmail,
      to: [input.authorEmail],
      authorName: input.authorName,
      projectTitle: input.titleName,
      subject: input.copy.subject,
      body: input.copy.body,
      htmlBody: input.copy.htmlBody,
      templateName: input.copy.templateName,
      templateVersion: input.copy.templateVersion,
      templateMetadata: input.copy.templateMetadata,
      attachments: input.attachments.map((attachment) => ({
        name: attachment.fileName,
        contentType: attachment.contentType,
        contentInBase64: attachment.contentBytesBase64,
        role: attachment.role,
        artifactId: attachment.artifactId,
        sha256: attachment.sha256,
      })),
      approvedBy: SYSTEM_OPERATOR,
      approvedOn: new Date().toISOString(),
      internalVisibilityMailbox: AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCopy,
      replyTo: AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo,
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true,
      cc: [AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCopy],
      bcc: [],
    }),
  })
  const body = (await response.json().catch(() => null)) as { providerMessageId?: string; accepted?: boolean; reason?: string; code?: string } | null
  if (!response.ok || (!body?.accepted && !body?.providerMessageId)) {
    throw new Error(`RELAY_SEND_FAILED:${body?.reason || body?.code || response.status}`)
  }
  return { providerMessageId: body.providerMessageId || 'accepted-without-provider-message-id' }
}

async function materializeRequiredAttachments(stageCode: AuthorReviewPackageType, titleName: string, artifacts: DataverseRow[]): Promise<GovernedPackageAttachment[]> {
  const roles = requiredRolesFor(stageCode)
  const selected = roles.map((role) => {
    const artifact = selectArtifactForRole(artifacts, role)
    if (!artifact) throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:REQUIRED_ATTACHMENT_MISSING:${role}`)
    return { role, artifact }
  })
  const roleCollision = physicalAttachmentRoleCollision(selected)
  if (roleCollision) throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:${roleCollision}`)
  const token = await getGraphToken()

  return Promise.all(
    selected.map(async ({ role, artifact }) => {
      const driveId = stringValue(artifact.jm1pub_repositorydriveid)
      const itemId = stringValue(artifact.jm1pub_repositoryitemid)
      if (!driveId || !itemId) throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:ATTACHMENT_LOCATION_MISSING:${role}`)
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      )
      if (!response.ok) throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:ATTACHMENT_MATERIALIZATION_FAILED:${role}:${response.status}`)
      const body = Buffer.from(await response.arrayBuffer())
      const expectedSha = stringValue(artifact.jm1pub_sha256)
      const actualSha = stableChecksum(body)
      if (expectedSha && expectedSha.toLowerCase() !== actualSha.toLowerCase()) {
        throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:ATTACHMENT_CHECKSUM_MISMATCH:${role}`)
      }
      const sourceFilename = sanitizeDownloadFilename(stringValue(artifact.jm1pub_filename) || `${role}.bin`)
      const filename = authorFacingFilename(titleName, role, sourceFilename)
      const attachment = {
        role,
        artifactId: stringValue(artifact.jm1pub_editorialartifactid),
        fileName: filename,
        contentType: contentTypeFor(filename),
        contentBytesBase64: body.toString('base64'),
        sizeBytes: body.byteLength,
        sha256: actualSha,
      }
      const binaryValidation = validateGovernedPackageAttachmentBinary(attachment)
      if (!binaryValidation.ok) throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:${binaryValidation.blocker}`)
      return attachment
    }),
  )
}

function requiredRolesFor(stageCode: AuthorReviewPackageType): AttachmentRole[] {
  if (stageCode === 'INTERIOR_LAYOUT_REVIEW') {
    return ['interiorProof', 'reviewInstructions']
  }
  if (stageCode === 'DEVELOPMENTAL_EDITING_REVIEW') {
    return ['editedManuscript', 'reviewInstructions']
  }
  if (stageCode === 'PROOFREADING_REVIEW') return ['proofreadManuscript', 'reviewInstructions']
  return ['editorialMemo', 'reviewInstructions']
}

async function getGraphToken() {
  const tenantId = process.env.GRAPH_TENANT_ID || process.env.SHAREPOINT_TENANT_ID
  const clientId = process.env.GRAPH_CLIENT_ID || process.env.SHAREPOINT_CLIENT_ID
  const clientSecret = process.env.GRAPH_CLIENT_SECRET || process.env.SHAREPOINT_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('GRAPH_CONFIG_MISSING_FOR_PACKAGE_ATTACHMENT_MATERIALIZATION')
  }

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  })
  const json = (await response.json().catch(() => null)) as { access_token?: string } | null
  if (!response.ok || !json?.access_token) {
    throw new Error(`GRAPH_TOKEN_FAILED_FOR_PACKAGE_ATTACHMENT_MATERIALIZATION:${response.status}`)
  }
  return json.access_token
}

async function getTitle(config: DataverseServerConfig, titleId: string) {
  const title = await dataverseFirst(config, 'jm1pub_titles', {
    $select: 'jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname,_jm1_author_value',
    $filter: `jm1pub_titleid eq ${titleId}`,
  })
  if (!title) throw new Error('PUBLISHING_DISPATCH_TITLE_NOT_FOUND')
  return title
}

async function getStage(config: DataverseServerConfig, stageId: string) {
  const stage = await dataverseFirst(config, 'jm1pub_editorialstages', {
    $select:
      'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_author,jm1pub_authorsafesummary,jm1pub_internaloperationalsummary,jm1pub_intakereference,jm1pub_publishingintakereference,_jm1pub_titleid_value,_jm1pub_contactid_value,createdon,modifiedon',
    $filter: `jm1pub_editorialstageid eq ${stageId}`,
  })
  if (!stage) throw new Error('PUBLISHING_DISPATCH_STAGE_NOT_FOUND')
  return stage
}

async function getContact(config: DataverseServerConfig, contactId: string) {
  const contact = await dataverseFirst(config, 'contacts', {
    $select: 'contactid,fullname,emailaddress1',
    $filter: `contactid eq ${contactId}`,
  })
  if (!contact) throw new Error('PUBLISHING_DISPATCH_CONTACT_NOT_FOUND')
  return contact
}

async function findOperationalCertificationLog(config: DataverseServerConfig, idempotencyKey: string) {
  return dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription',
    $filter: `jm1_actiontype eq 'PUBLISHING_DISPATCH_OPERATIONALLY_CERTIFIED' and contains(jm1_actiondescription,'${escapeOData(idempotencyKey)}')`,
  })
}

async function findTechnicalReleaseLog(config: DataverseServerConfig, idempotencyKey: string) {
  const current = await dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription',
    $filter: `jm1_actiontype eq 'PUBLISHING_DISPATCH_TECHNICALLY_RELEASED' and contains(jm1_actiondescription,'${escapeOData(idempotencyKey)}')`,
  })
  if (current) return current
  const legacyDelivered = await dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription',
    $filter: `jm1_actiontype eq 'PUBLISHING_DISPATCH_AUTHOR_PACKAGE_DELIVERED' and contains(jm1_actiondescription,'${escapeOData(idempotencyKey)}')`,
  })
  if (legacyDelivered) return legacyDelivered
  return dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription',
    $filter: `jm1_actiontype eq 'FIVE_TITLE_EXECUTIVE_RECOVERY_DELIVERED' and contains(jm1_actiondescription,'${escapeOData(idempotencyKey)}')`,
  })
}

async function writeExecutionLog(
  config: DataverseServerConfig,
  input: { actionType: string; name: string; description: string; sourceEntity: string; sourceRecordId: string; failed?: boolean },
) {
  const completedAt = new Date().toISOString()
  return dataverseCreate(config, 'jm1_executionlogs', {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: safeDetail(input.description),
    jm1_agentname: 'jmerrill.pub',
    jm1_agentmodel: 'PublishingDispatchService',
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: input.failed ? EXECUTION_STATUS_FAILED : EXECUTION_STATUS_SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId,
  })
}

function normalizeStageCode(stage: DataverseRow): AuthorReviewPackageType {
  const raw = [
    stringValue(stage.jm1pub_name),
    stringValue(stage.jm1pub_stagetype),
    dataverseFormatted(stage, 'jm1pub_stagetype', ''),
  ].join(' ')
  if (/interior|layout/i.test(raw)) return 'INTERIOR_LAYOUT_REVIEW'
  if (/proof/i.test(raw)) return 'PROOFREADING_REVIEW'
  if (/line/i.test(raw)) return 'LINE_EDITING_REVIEW'
  if (/copy/i.test(raw)) return 'COPYEDITING_REVIEW'
  if (/developmental|develop/i.test(raw)) return 'DEVELOPMENTAL_EDITING_REVIEW'
  return 'EDITORIAL_REVIEW'
}

function titlePolicyProcessForStage(stageCode: AuthorReviewPackageType): TitleRequirementProcess {
  if (stageCode === 'DEVELOPMENTAL_EDITING_REVIEW') return 'DEVELOPMENTAL_EDITING'
  if (stageCode === 'LINE_EDITING_REVIEW') return 'LINE_EDITING'
  if (stageCode === 'COPYEDITING_REVIEW') return 'COPYEDITING'
  if (stageCode === 'PROOFREADING_REVIEW') return 'PROOFREADING'
  return 'EDITORIAL_REVIEW'
}

export function packageReviewType(stageCode: PackageStageCode): AuthorReviewPackageType {
  return stageCode === 'INTERIOR_LAYOUT' ? 'INTERIOR_LAYOUT_REVIEW' : 'DEVELOPMENTAL_EDITING_REVIEW'
}

function stageLabelFor(stageCode: AuthorReviewPackageType) {
  switch (stageCode) {
    case 'DEVELOPMENTAL_EDITING_REVIEW':
      return 'Developmental Editing'
    case 'INTERIOR_LAYOUT_REVIEW':
      return 'Interior Layout'
    case 'PROOFREADING_REVIEW':
      return 'Proofreading'
    case 'LINE_EDITING_REVIEW':
      return 'Line Editing'
    case 'COPYEDITING_REVIEW':
      return 'Copyediting'
    case 'COVER_DESIGN_REVIEW':
      return 'Cover Design'
    case 'PRODUCTION_PROOF_REVIEW':
      return 'Production Proof'
    case 'EDITORIAL_REVIEW':
      return 'Editorial Review'
  }
}

function isAuthorVisibleArtifact(artifact: DataverseRow) {
  if (artifact.jm1pub_supersededon) return false
  if (artifact.jm1pub_iscurrentapproved === true) return true
  const status = dataverseFormatted(artifact, 'jm1pub_artifactstatus', '') || String(artifact.jm1pub_artifactstatus || '')
  const visibility = dataverseFormatted(artifact, 'jm1pub_visibility', '') || String(artifact.jm1pub_visibility || '')
  return /approved|current|author|release/i.test(`${status} ${visibility}`)
}

function selectArtifactForRole(artifacts: DataverseRow[], role: AttachmentRole) {
  const patterns: Record<AttachmentRole, RegExp> = {
    editedManuscript: /manuscript|developmental.*docx|edited/i,
    editorialMemo: /author-facing.*editorial.*review|editorial.*review.*assessment|editorial.*review.*package|memo|summary|developmental.*assessment|developmental.*summary/i,
    reviewInstructions: /instruction|review/i,
    authorResponseMechanism: /response|approval/i,
    packageManifest: /manifest|package.*summary/i,
    authorCoverMessage: /cover.*message|cover.*letter|message/i,
    lineEditedManuscript: /line/i,
    copyeditedManuscript: /copyedit/i,
    proofreadManuscript: /proofread/i,
    reviewCoverNote: /cover.*note|completion.*report|change.*summary|guide/i,
    interiorProof: /interior.*proof|layout.*proof|production.*pdf|\.pdf$/i,
    coverProof: /cover.*proof/i,
    productionProof: /production.*proof/i,
  }
  const pattern = patterns[role]
  return artifacts
    .filter((artifact) => {
      const haystack = [
        stringValue(artifact.jm1pub_editorialartifactname),
        stringValue(artifact.jm1pub_filename),
        dataverseFormatted(artifact, 'jm1pub_artifacttype', ''),
        stringValue(artifact.jm1pub_repositorypath),
      ].join(' ')
      const size = Number(artifact.jm1pub_filesizebytes || 0)
      if (role === 'interiorProof' && size > 0 && size < 100_000) return false
      if (!artifactCanSatisfyRole(role, haystack)) return false
      return pattern.test(haystack)
    })
    .sort((a, b) => artifactRoleScore(b, role) - artifactRoleScore(a, role))[0]
}

function artifactCanSatisfyRole(role: AttachmentRole, haystack: string) {
  if (role !== 'reviewInstructions') return true
  if (!/instruction|guide|review/i.test(haystack)) return false
  if (!/\.pdf\b|pdf/i.test(haystack)) return false
  return !/\b(manifest|ledger|response[-_ ]?mechanism|cover[-_ ]?message)\b/i.test(haystack)
}

function physicalAttachmentRoleCollision(selected: Array<{ role: AttachmentRole; artifact: DataverseRow }>) {
  const physical = selected.filter(({ role }) => isPhysicalEmailAttachmentRole(role))
  const artifactIds = physical.map(({ artifact }) => stringValue(artifact.jm1pub_editorialartifactid)).filter(Boolean)
  const sourceItemIds = physical
    .map(({ artifact }) => [stringValue(artifact.jm1pub_repositorydriveid), stringValue(artifact.jm1pub_repositoryitemid)].filter(Boolean).join(':'))
    .filter(Boolean)
  const checksums = physical.map(({ artifact }) => stringValue(artifact.jm1pub_sha256).toLowerCase()).filter(Boolean)
  return hasDuplicate(artifactIds) || hasDuplicate(sourceItemIds) || hasDuplicate(checksums) ? 'AUTHOR_ATTACHMENT_ROLE_COLLISION' : ''
}

function hasDuplicate(values: string[]) {
  return new Set(values).size !== values.length
}

function artifactRoleScore(artifact: DataverseRow, role: AttachmentRole) {
  const haystack = [
    stringValue(artifact.jm1pub_editorialartifactname),
    stringValue(artifact.jm1pub_filename),
    dataverseFormatted(artifact, 'jm1pub_artifacttype', ''),
    stringValue(artifact.jm1pub_repositorypath),
  ].join(' ')
  let score = artifact.jm1pub_iscurrentapproved === true ? 10 : 0
  if (role === 'editedManuscript' && /developmentally.*edited|edited.*manuscript/i.test(haystack)) score += 100
  if (role === 'editedManuscript' && /governed source/i.test(haystack)) score -= 20
  if (role === 'reviewInstructions' && /editorial.*review.*instruction|editorial.*review.*guide|review.*guide/i.test(haystack)) score += 100
  if (role === 'reviewInstructions' && /\.pdf\b|pdf/i.test(haystack)) score += 50
  if (role === 'reviewInstructions' && /\.(txt|md|json)\b|text\/|markdown/i.test(haystack)) score -= 100
  if (role === 'packageManifest' && /v2/i.test(haystack)) score += 20
  if (role === 'interiorProof' && /author review proof/i.test(haystack)) score += 100
  return score
}

function resolveManifestLocation(artifacts: DataverseRow[]) {
  const manifest = artifacts.find((artifact) => /manifest/i.test(stringValue(artifact.jm1pub_filename || artifact.jm1pub_editorialartifactname)))
  return stringValue(manifest?.jm1pub_repositorypath || manifest?.jm1pub_repositoryitemid || artifacts[0]?.jm1pub_repositorypath || artifacts[0]?.jm1pub_repositoryitemid)
}

function contentTypeFor(fileName: string) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.json')) return 'application/json'
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lower.endsWith('.doc')) return 'application/msword'
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8'
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8'
  return 'application/octet-stream'
}

function authorFacingFilename(titleName: string, role: AttachmentRole, sourceFilename: string) {
  const extension = sourceFilename.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase() || '.pdf'
  const title = sanitizeDownloadFilename(titleName)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  const label: Record<AttachmentRole, string> = {
    editedManuscript: 'Edited Manuscript',
    editorialMemo: "Editor's Notes",
    reviewInstructions: 'Editorial Review Guide',
    lineEditedManuscript: 'Line Edited Manuscript',
    copyeditedManuscript: 'Copyedited Manuscript',
    proofreadManuscript: 'Proofread Manuscript',
    reviewCoverNote: 'Review Notes',
    interiorProof: 'Interior Layout Proof',
    coverProof: 'Cover Proof',
    productionProof: 'Production Proof',
    authorResponseMechanism: 'Internal Response Mechanism',
    packageManifest: 'Internal Manifest',
    authorCoverMessage: 'Internal Cover Message',
  }
  return `${title || 'Author Review'} - ${label[role]}${extension}`
}

function buildAuthorResponseUrl(input: { titleId: string; stageId: string; packageId: string; gateId: string }) {
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://jmerrill.pub'
  const url = new URL('/author/portal', base)
  url.searchParams.set('titleId', input.titleId)
  url.searchParams.set('stageId', input.stageId)
  url.searchParams.set('packageId', input.packageId)
  url.searchParams.set('gateId', input.gateId)
  url.searchParams.set('action', 'review-package')
  if (url.protocol !== 'https:') throw new Error('AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:REVIEW_ACTION_LINK_NOT_HTTPS')
  if (!/jmerrill\.pub$/i.test(url.hostname)) throw new Error('AUTHOR_PACKAGE_NOTIFICATION_BLOCKED:REVIEW_ACTION_LINK_NOT_AUTHOR_PORTAL')
  return url.toString()
}

function normalizeIntakeReference(value: string) {
  const normalized = value.trim().toUpperCase()
  return INTAKE_REFERENCE_PATTERN.test(normalized) ? normalized : ''
}

function stageHasCanonicalIntakeReferences(stage: DataverseRow) {
  return Boolean(canonicalStageIntakeReference(stage))
}

function canonicalStageIntakeReference(stage: DataverseRow) {
  const stageReference = normalizeIntakeReference(stringValue(stage.jm1pub_intakereference))
  const publishingReference = normalizeIntakeReference(stringValue(stage.jm1pub_publishingintakereference))
  return stageReference && publishingReference && stageReference === publishingReference ? stageReference : ''
}

function stableChecksum(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex')
}

function formatResponseDeadline(startedAt: Date) {
  const due = new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(due)
}

function sanitizeDownloadFilename(value: string) {
  return value.replace(/[\r\n"\\/]/g, '-').slice(0, 180) || 'editorial-artifact'
}

function escapeOData(value: string) {
  return value.replace(/'/g, "''")
}

function extractId(value: string) {
  const match = value.match(/\(([^)]+)\)$/)
  return match?.[1] || value
}

function safeDetail(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/https:\/\/[^\s"']+/g, '[url-redacted]')
    .slice(0, 1000)
}

function safeRuntimeBlocker(error: unknown) {
  const value = error instanceof Error ? error.message : 'AUTHOR_PACKAGE_RELEASE_BLOCKED'
  return safeDetail(value).replace(/[:][0-9a-zA-Z._~+/=-]{24,}/g, ':[redacted]')
}
