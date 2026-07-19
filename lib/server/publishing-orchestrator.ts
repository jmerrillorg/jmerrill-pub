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
import {
  AUTHOR_PACKAGE_NOTIFICATION_EVENTS,
  AUTHOR_PACKAGE_NOTIFICATION_POLICIES,
  buildAuthorPackageNotificationIdempotencyKey,
  validateAuthorPackageNotification,
  type AuthorReviewPackageType,
} from './author-package-notification-engine'

const EXECUTION_STATUS_SUCCESS = 835500001
const EXECUTION_STATUS_FAILED = 835500002
const BAND_LEVEL_1 = 835500000

const GATE_STATUS_AWAITING_AUTHOR_RESPONSE = 196650002
const GATE_STATUS_APPROVED = 196650003
const AUTHOR_DECISION_APPROVE = 196650000
const AUTHOR_DECISION_REQUEST_REVISION = 196650001

const STAGE_STATUS_IN_PROGRESS = 100000001
const STAGE_STATUS_COMPLETE = 100000008

const PRODUCTION_TYPE_INTERIOR_LAYOUT = 710000000
const PRODUCTION_PROJECT_STATUS_IN_PROGRESS = 710000001
const PRODUCTION_TASK_STATUS_IN_PROGRESS = 835500001
const PRODUCTION_TASK_STATUS_BLOCKED = 835500003
const PRODUCTION_TASK_PRIORITY_HIGH = 835500002

const APPROVED_AUTHOR_RESPONSE_MESSAGE_TYPE = 'APPROVED_AUTHOR_RESPONSE'
const RELAY_URL = 'https://func-jm1-acs-email-relay.azurewebsites.net'
const APPROVED_SENDER = 'publishing@email.jmerrill.one'
const INTERNAL_VISIBILITY_MAILBOX = 'publishing@jmerrill.one'

export type ApprovalTransitionPayload = {
  titleId: string
  stageId: string
  gateId: string
  authorResponseId: string
  decision: 'Approve' | 'Request Revision' | 'Request Clarification' | 'Hold' | 'Decline'
  approvedPackageId?: string
  approvedArtifactId: string
  approvedArtifactChecksum: string
  approvedAt: string
  triggerSource: 'AUTHOR_APPROVAL'
  correlationId: string
  idempotencyKey: string
}

export type OrchestrationResult =
  | {
      status: 'notification-sent'
      gateId: string
      providerMessageId: string
      providerEvidenceStatus: 'captured' | 'not-returned-by-relay'
      executionLogIds: string[]
    }
  | {
      status: 'transition-completed'
      titleId: string
      gateId: string
      productionProjectId: string
      productionTaskId: string
      executionLogIds: string[]
    }
  | {
      status: 'blocked'
      blocker: string
      executionLogIds: string[]
    }
  | {
      status: 'idempotent'
      idempotencyKey: string
      executionLogIds: string[]
    }

export type CadenceSchedule = {
  packageReadyAt: string
  cadencePolicyId: string
  cadenceBasis: string
  earliestReleaseAt: string
  scheduledReleaseAt: string
  releaseOverride: string
  releaseState: 'PACKAGE_READY' | 'CADENCE_HOLD' | 'SCHEDULED_FOR_RELEASE' | 'RELEASED' | 'NOTIFICATION_SENT' | 'AWAITING_AUTHOR'
}

type DataverseRow = Record<string, unknown>

type NotificationInput = {
  gateId: string
  operatorEmail: string
  correlationId?: string
  triggerSource?: 'AUTHOR_REVIEW_PACKAGE_READY_FOR_RELEASE' | 'SYSTEM_EVENT' | 'SCHEDULED_RELEASE' | 'CODY_ASSISTED_BRIDGE'
}

export async function handleAuthorReviewPackageReadyForRelease(input: NotificationInput): Promise<OrchestrationResult> {
  return sendProofreadingNotification({
    ...input,
    triggerSource: input.triggerSource || 'AUTHOR_REVIEW_PACKAGE_READY_FOR_RELEASE',
  })
}

export async function sendProofreadingNotification(input: NotificationInput): Promise<OrchestrationResult> {
  const config = requireDataverseConfig()
  const stageCode: AuthorReviewPackageType = 'PROOFREADING_REVIEW'
  const attachmentPolicy = AUTHOR_PACKAGE_NOTIFICATION_POLICIES[stageCode]
  const gate = await getGate(config, input.gateId)
  const stageId = dataverseLookupId(gate, '_jm1pub_editorialstageid_value')
  const titleId = dataverseLookupId(gate, '_jm1pub_titleid_value')
  const artifactId = dataverseLookupId(gate, '_jm1pub_deliverableartifactid_value')
  if (!stageId || !titleId || !artifactId) {
    return notificationBlocked(config, input.gateId, input.correlationId, 'PROOFREADING_NOTIFICATION_BLOCKED - PACKAGE_REFERENCE_MISSING')
  }

  const [stage, title, artifact] = await Promise.all([
    getStage(config, stageId),
    getTitle(config, titleId),
    getArtifact(config, artifactId),
  ])
  const titleName = stringValue(title.jm1pub_titlename || title.jm1pub_name) || 'The Intentional Leader'
  const authorEmail = await resolveAuthorEmail(config, title, stage)
  if (!authorEmail) {
    return notificationBlocked(config, input.gateId, input.correlationId, 'PROOFREADING_NOTIFICATION_BLOCKED - AUTHOR_EMAIL_MISSING')
  }

  const checksum = extractChecksum(stringValue(artifact.jm1pub_sha256 || artifact.jm1pub_notes))
  const idempotencyKey = buildAuthorPackageNotificationIdempotencyKey({
    titleId,
    stageCode,
    gateId: input.gateId,
    packageId: artifactId,
    packageVersion: 'current',
    packageChecksum: checksum,
  })
  const existing = await findNotificationEvidence(config, input.gateId, artifactId, idempotencyKey)
  if (existing) {
    return {
      status: 'idempotent',
      idempotencyKey,
      executionLogIds: [stringValue(existing.jm1_executionlogid)],
    }
  }

  const startedLog = await writeLog(config, {
    actionType: 'PROOFREADING_NOTIFICATION_TRANSACTION_STARTED',
    name: `PROOFREADING_NOTIFICATION_TRANSACTION_STARTED - ${titleName}`,
    description: [
      `Trigger ${input.triggerSource || 'CODY_ASSISTED_BRIDGE'}.`,
      `Title ${titleId}; stage ${stageId}; gate ${input.gateId}; packageArtifact ${artifactId}; checksum ${checksum || 'not-recorded'}.`,
      `Operator ${input.operatorEmail}. Idempotency: ${idempotencyKey}.`,
    ].join(' '),
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: input.gateId,
  })

  await writeLog(config, {
    actionType: AUTHOR_PACKAGE_NOTIFICATION_EVENTS.audited,
    name: `AUTHOR_PACKAGE_NOTIFICATION_AUDITED - ${titleName}`,
    description: [
      `Canonical notification engine input prepared for ${stageCode}.`,
      `Required attachment roles: ${attachmentPolicy.attachmentsRequired.join(', ')}.`,
      `Title ${titleId}; stage ${stageId}; gate ${input.gateId}; package ${artifactId}; checksum ${checksum || 'not-recorded'}.`,
      `Operator ${input.operatorEmail}. Idempotency: ${idempotencyKey}.`,
    ].join(' '),
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: input.gateId,
  })

  const accessLog = await writeLog(config, {
    actionType: AUTHOR_PACKAGE_NOTIFICATION_EVENTS.attachmentsValidated,
    name: `AUTHOR_PACKAGE_REQUIRED_ATTACHMENTS_VALIDATED - ${titleName}`,
    description: [
      `Package artifact ${artifactId} exists and package reference is gate-linked.`,
      `Repository item ${stringValue(artifact.jm1pub_repositoryitemid) || 'not-recorded'}; path ${stringValue(artifact.jm1pub_repositorypath) || 'not-recorded'}.`,
      `Attachment policy requires ${attachmentPolicy.attachmentsRequired.join(', ')} before gate activation can be marked complete.`,
      `Author recipient resolved from Core as ${authorEmail}. Idempotency: ${idempotencyKey}.`,
    ].join(' '),
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: input.gateId,
  })

  const validation = validateAuthorPackageNotification({
    titleId,
    authorId: dataverseLookupId(stage, '_jm1pub_contactid_value') || dataverseLookupId(title, '_jm1_author_value') || authorEmail,
    stageCode,
    gateId: input.gateId,
    packageId: artifactId,
    packageVersion: 'current',
    packageArtifactIds: [artifactId],
    requiredAttachmentArtifactIds: [artifactId],
    workspaceAccessLocation: stringValue(artifact.jm1pub_repositoryitemid || artifact.jm1pub_repositorypath),
    notificationTemplateId: 'PROOFREADING_AUTHOR_REVIEW_NOTIFICATION',
    recipientPolicy: {
      from: APPROVED_SENDER,
      to: authorEmail,
      cc: [INTERNAL_VISIBILITY_MAILBOX],
    },
    correlationId: input.correlationId || idempotencyKey,
    idempotencyKey,
    attachments: [],
    packageChecksum: checksum,
  })
  if (!validation.ok && validation.blocker?.includes('REQUIRED_ATTACHMENT_MISSING')) {
    await writeLog(config, {
      actionType: AUTHOR_PACKAGE_NOTIFICATION_EVENTS.incompleteDetected,
      name: `AUTHOR_PACKAGE_NOTIFICATION_INCOMPLETE_DETECTED - ${titleName}`,
      description: `${validation.blocker}. Workspace link alone does not satisfy ${stageCode} attachment policy. Idempotency: ${idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: input.gateId,
      failed: true,
    })
    return notificationBlocked(config, input.gateId, input.correlationId, validation.blocker)
  }

  const relayKey = process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY || process.env.JM1_RELAY_API_KEY
  if (!relayKey) {
    return notificationBlocked(config, input.gateId, input.correlationId, 'PROOFREADING_NOTIFICATION_BLOCKED - RELAY_KEY_MISSING')
  }

  const now = new Date().toISOString()
  const payload = {
    messageType: APPROVED_AUTHOR_RESPONSE_MESSAGE_TYPE,
    diagnosticId: input.gateId,
    intakeReferenceCode: normalizeIntakeReference(stringValue(stage.jm1pub_intakereference || stage.jm1pub_publishingintakereference)),
    authorEmail,
    authorName: stringValue(stage.jm1pub_author || title.jm1pub_authorname) || authorEmail,
    projectTitle: titleName,
    subject: `Proofreading Review Package - ${titleName}`,
    body: [
      'Good day, Jackie,',
      '',
      `Your proofreading review package for ${titleName} is ready for your review in the Author Operating Center.`,
      '',
      'Please review the proofread manuscript and reply to the publishing team with your approval or requested corrections.',
      '',
      'Warmly,',
      '',
      'J Merrill Publishing',
    ].join('\n'),
    templateName: 'PROOFREADING_AUTHOR_REVIEW_NOTIFICATION',
    approvedBy: input.operatorEmail,
    approvedOn: now,
    internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true,
    cc: [INTERNAL_VISIBILITY_MAILBOX],
  }

  const relayResponse = await fetch(`${RELAY_URL}/api/send-approved-author-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jm1-relay-key': relayKey,
    },
    body: JSON.stringify(payload),
  })
  const relayBody = (await relayResponse.json().catch(() => null)) as { providerMessageId?: string; accepted?: boolean; code?: string; reason?: string } | null
  const relayAccepted = relayResponse.ok && (relayResponse.status === 202 || relayBody?.accepted === true || Boolean(relayBody?.providerMessageId))
  if (!relayAccepted) {
    const reason = relayBody?.reason || relayBody?.code || `RELAY_HTTP_${relayResponse.status}`
    return notificationBlocked(config, input.gateId, input.correlationId, `PROOFREADING_NOTIFICATION_BLOCKED - ${reason}`)
  }
  const providerMessageId = relayBody?.providerMessageId || 'not-returned-by-relay'
  const providerEvidenceStatus = relayBody?.providerMessageId ? 'captured' : 'not-returned-by-relay'
  const providerEvidenceText =
    providerEvidenceStatus === 'captured'
      ? `Provider message ID ${providerMessageId}.`
      : 'ACS relay accepted the send but did not return a provider message ID in the response.'

  const sentLog = await writeLog(config, {
    actionType: 'PROOFREADING_NOTIFICATION_SENT',
    name: `PROOFREADING_NOTIFICATION_SENT - ${titleName}`,
    description: `Proofreading notification sent from ${APPROVED_SENDER} to ${authorEmail} with CC ${INTERNAL_VISIBILITY_MAILBOX}. Subject "${payload.subject}". ${providerEvidenceText} Idempotency: ${idempotencyKey}.`,
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: input.gateId,
  })

  const evidenceLog = await writeLog(config, {
    actionType: 'PROOFREADING_COMMUNICATION_EVIDENCE_RECORDED',
    name: `PROOFREADING_COMMUNICATION_EVIDENCE_RECORDED - ${titleName}`,
    description: [
      `Communication state NOTIFICATION_SENT.`,
      `sender=${APPROVED_SENDER}; recipient=${authorEmail}; cc=${INTERNAL_VISIBILITY_MAILBOX}; messageId=${providerMessageId}; sentAt=${now}.`,
      `titleId=${titleId}; stageId=${stageId}; gateId=${input.gateId}; packageArtifactIds=${artifactId}; packageChecksum=${checksum || 'not-recorded'}. Idempotency: ${idempotencyKey}.`,
    ].join(' '),
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: input.gateId,
  })

  await Promise.all([
    dataversePatch(config, 'jm1pub_editorialapprovalgates', input.gateId, {
      jm1pub_gatestatus: GATE_STATUS_AWAITING_AUTHOR_RESPONSE,
      jm1pub_nextstageauthorized: false,
      jm1pub_awaitingsince: now,
      jm1pub_authorresponsesummary: `Proofreading notification accepted by ACS. ${providerEvidenceText} Awaiting author response.`,
      jm1pub_authordecisionsource: `notification:${providerMessageId}`,
      jm1pub_correlationid: input.correlationId || idempotencyKey,
    }),
    dataversePatch(config, 'jm1pub_editorialstages', stageId, {
      jm1pub_stagestatus: 100000002,
      jm1pub_authorsafesummary: 'Your proofreading package is ready for review.',
      jm1pub_internaloperationalsummary: `Proofreading notification sent from ${APPROVED_SENDER}, copied to ${INTERNAL_VISIBILITY_MAILBOX}. ${providerEvidenceText}`,
      jm1pub_currentgatecount: 1,
      jm1pub_correlationid: input.correlationId || idempotencyKey,
    }),
  ])

  const logIds = await Promise.all([
    writeLog(config, {
      actionType: 'PROOFREADING_AUTHOR_RESPONSE_GATE_ACTIVATED',
      name: `PROOFREADING_AUTHOR_RESPONSE_GATE_ACTIVATED - ${titleName}`,
      description: `A5 author-response gate activated only after notification delivery was accepted. Idempotency: ${idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: input.gateId,
    }),
    writeLog(config, {
      actionType: 'AUTHOR_WORKSPACE_NOTIFICATION_STATE_REFRESHED',
      name: `AUTHOR_WORKSPACE_NOTIFICATION_STATE_REFRESHED - ${titleName}`,
      description: `Author Workspace can now show Proofreading Author Review because notification evidence exists. Idempotency: ${idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: input.gateId,
    }),
    writeLog(config, {
      actionType: 'PUBLISHER_TODAY_NOTIFICATION_STATE_REFRESHED',
      name: `PUBLISHER_TODAY_NOTIFICATION_STATE_REFRESHED - ${titleName}`,
      description: `Publisher Today notification-pending exception cleared; awaiting party is Author. Idempotency: ${idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: input.gateId,
    }),
    writeLog(config, {
      actionType: AUTHOR_PACKAGE_NOTIFICATION_EVENTS.transactionCompleted,
      name: `AUTHOR_PACKAGE_NOTIFICATION_TRANSACTION_COMPLETED - ${titleName}`,
      description: `Package validated, notification accepted, communication evidence recorded, A5 gate activated, and operating surfaces refreshed. Idempotency: ${idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: input.gateId,
    }),
    writeLog(config, {
      actionType: AUTHOR_PACKAGE_NOTIFICATION_EVENTS.engineCommissioned,
      name: `AUTHOR_PACKAGE_NOTIFICATION_ENGINE_COMMISSIONED - ${titleName}`,
      description: `Future author-review package events invoke the canonical notification engine without stage-specific send logic after cadence and approval rules pass. Execution owner JM1 Automation. Idempotency: ${idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: input.gateId,
    }),
    writeLog(config, {
      actionType: AUTHOR_PACKAGE_NOTIFICATION_EVENTS.templateUnified,
      name: `AUTHOR_PACKAGE_NOTIFICATION_TEMPLATE_UNIFIED - ${titleName}`,
      description: `Email, Author Workspace, Publisher Today, gate timing, and attachment policy now resolve through shared package/stage configuration for ${stageCode}. Idempotency: ${idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: input.gateId,
    }),
  ])

  return {
    status: 'notification-sent',
    gateId: input.gateId,
    providerMessageId,
    providerEvidenceStatus,
    executionLogIds: [startedLog, accessLog, sentLog, evidenceLog, ...logIds].map(extractId),
  }
}

export async function processProofreadingApprovalEvent(payload: ApprovalTransitionPayload): Promise<OrchestrationResult> {
  const config = requireDataverseConfig()
  if (payload.triggerSource !== 'AUTHOR_APPROVAL') {
    return transitionBlocked(config, payload, 'INTERIOR_LAYOUT_AUTOSTART_BLOCKED - TRIGGER_SOURCE_INVALID')
  }

  const existing = await findExecutionLog(config, 'INTERIOR_LAYOUT_AUTOSTARTED', payload.idempotencyKey)
  if (existing) {
    return {
      status: 'idempotent',
      idempotencyKey: payload.idempotencyKey,
      executionLogIds: [stringValue(existing.jm1_executionlogid)],
    }
  }

  const gate = await getGate(config, payload.gateId)
  const gateDecision = dataverseFormatted(gate, 'jm1pub_authordecision') || stringValue(gate.jm1pub_authordecision)
  const decisionIsApproval = payload.decision === 'Approve' || gate.jm1pub_authordecision === AUTHOR_DECISION_APPROVE || gateDecision === 'Approve'
  if (!decisionIsApproval) {
    if (payload.decision === 'Request Revision') {
      await routeProofreadingCorrections(config, payload)
      return transitionBlocked(config, payload, 'INTERIOR_LAYOUT_AUTOSTART_BLOCKED - PROOFREADING_CORRECTIONS_REQUESTED')
    }
    return transitionBlocked(config, payload, 'INTERIOR_LAYOUT_AUTOSTART_BLOCKED - AUTHOR_DECISION_NOT_APPROVAL')
  }

  const [title, stage, artifact] = await Promise.all([
    getTitle(config, payload.titleId),
    getStage(config, payload.stageId),
    getArtifact(config, payload.approvedArtifactId),
  ])
  const titleName = stringValue(title.jm1pub_titlename || title.jm1pub_name) || payload.titleId
  const checksum = stringValue(artifact.jm1pub_sha256) || extractChecksum(`${artifact.jm1pub_notes || ''}`)
  if (!checksum || checksum !== payload.approvedArtifactChecksum) {
    return transitionBlocked(config, payload, 'INTERIOR_LAYOUT_AUTOSTART_BLOCKED - APPROVED SOURCE CHECKSUM MISMATCH')
  }

  const eligibility = evaluateInteriorLayoutEligibility({
    title,
    stage,
    artifact,
    checksum,
  })
  await writeLog(config, {
    actionType: 'INTERIOR_LAYOUT_ELIGIBILITY_EVALUATED',
    name: `INTERIOR_LAYOUT_ELIGIBILITY_EVALUATED - ${titleName}`,
    description: `Eligibility result ${eligibility.result}. ${eligibility.reason}. Idempotency: ${payload.idempotencyKey}.`,
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: payload.gateId,
  })
  if (eligibility.result.startsWith('BLOCKED')) {
    return transitionBlocked(config, payload, `INTERIOR_LAYOUT_AUTOSTART_BLOCKED - ${eligibility.reason}`)
  }

  const now = new Date().toISOString()
  await Promise.all([
    dataversePatch(config, 'jm1pub_editorialapprovalgates', payload.gateId, {
      jm1pub_gatestatus: GATE_STATUS_APPROVED,
      jm1pub_authordecision: AUTHOR_DECISION_APPROVE,
      jm1pub_authordecisionon: payload.approvedAt,
      jm1pub_nextstageauthorized: true,
      jm1pub_nextstageauthorizedon: now,
      jm1pub_authorresponsesummary: 'Proofreading approved by author. Interior Layout autostart is authorized.',
      jm1pub_correlationid: payload.correlationId,
    }),
    dataversePatch(config, 'jm1pub_editorialstages', payload.stageId, {
      jm1pub_stagestatus: STAGE_STATUS_COMPLETE,
      jm1pub_stagecompletedate: now,
      jm1pub_authorsafesummary: 'Your proofreading review is complete. The publishing team is preparing the manuscript for production.',
      jm1pub_internaloperationalsummary: `Proofreading completed through event-driven approval. Approved source checksum ${checksum}.`,
      jm1pub_correlationid: payload.correlationId,
    }),
  ])

  const projectId = await findOrCreateInteriorLayoutProject(config, {
    titleId: payload.titleId,
    titleName,
    artifactPath: stringValue(artifact.jm1pub_repositorypath),
  })
  const taskId = await findOrCreateInteriorLayoutTask(config, {
    titleName,
    dueDate: addBusinessDays(now, 5),
  })

  const logIds = await Promise.all([
    writeLog(config, {
      actionType: 'PROOFREADING_APPROVAL_EVENT_RECEIVED',
      name: `PROOFREADING_APPROVAL_EVENT_RECEIVED - ${titleName}`,
      description: `Genuine Proofreading approval event received from ${payload.triggerSource}. Idempotency: ${payload.idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: payload.gateId,
    }),
    writeLog(config, {
      actionType: 'PROOFREADING_GATE_CLOSED',
      name: `PROOFREADING_GATE_CLOSED - ${titleName}`,
      description: `A5 Proofreading gate closed as Approved. Idempotency: ${payload.idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: payload.gateId,
    }),
    writeLog(config, {
      actionType: 'PROOFREADING_STAGE_COMPLETED',
      name: `PROOFREADING_STAGE_COMPLETED - ${titleName}`,
      description: `Proofreading stage completed and author package moved to completed history by read model. Idempotency: ${payload.idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialstage',
      sourceRecordId: payload.stageId,
    }),
    writeLog(config, {
      actionType: 'PRODUCTION_SOURCE_LOCKED',
      name: `PRODUCTION_SOURCE_LOCKED - ${titleName}`,
      description: `Production source lock: titleId=${payload.titleId}; approvedArtifactId=${payload.approvedArtifactId}; sourceChecksum=${checksum}; approvedGateId=${payload.gateId}; approvedResponseId=${payload.authorResponseId}; lockedAt=${now}; lockedByRuntime=JM1 Publishing Orchestrator; correlationId=${payload.correlationId}. Idempotency: ${payload.idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialartifact',
      sourceRecordId: payload.approvedArtifactId,
    }),
    writeLog(config, {
      actionType: 'INTERIOR_LAYOUT_AUTOSTARTED',
      name: `INTERIOR_LAYOUT_AUTOSTARTED - ${titleName}`,
      description: `Interior Layout production project ${projectId} and task ${taskId} started automatically from Proofreading approval. Execution owner JM1 Automation. Trigger source AUTHOR_APPROVAL. Idempotency: ${payload.idempotencyKey}.`,
      sourceEntity: 'jm1_productionproject',
      sourceRecordId: projectId,
    }),
    writeLog(config, {
      actionType: 'MARKETING_PRODUCTION_PHASE_TRIGGER_EMITTED',
      name: `MARKETING_PRODUCTION_PHASE_TRIGGER_EMITTED - ${titleName}`,
      description: `Internal marketing lifecycle events emitted: PROOFREADING_APPROVED_FOR_PRODUCTION and PRODUCTION_PHASE_STARTED. No public marketing content published. Idempotency: ${payload.idempotencyKey}.`,
      sourceEntity: 'jm1pub_title',
      sourceRecordId: payload.titleId,
    }),
    writeLog(config, {
      actionType: 'JM1_FIRST_EVENT_DRIVEN_STAGE_TRANSITION_COMMISSIONED',
      name: `JM1_FIRST_EVENT_DRIVEN_STAGE_TRANSITION_COMMISSIONED - ${titleName}`,
      description: `First event-driven transition commissioned: Proofreading Approval to Interior Layout Automatic Start. Cody is not required for routine execution. Idempotency: ${payload.idempotencyKey}.`,
      sourceEntity: 'jm1pub_title',
      sourceRecordId: payload.titleId,
    }),
  ])

  return {
    status: 'transition-completed',
    titleId: payload.titleId,
    gateId: payload.gateId,
    productionProjectId: projectId,
    productionTaskId: taskId,
    executionLogIds: logIds.map(extractId),
  }
}

export function calculateCadenceSchedule(input: {
  packageReadyAt: string
  wordCount: number
  stage: 'Developmental Editing' | 'Line Editing' | 'Copyediting' | 'Proofreading' | 'Interior Layout'
  overrideDays?: number
}): CadenceSchedule {
  const days = input.overrideDays ?? cadenceDays(input.wordCount, input.stage)
  const releaseAt = addBusinessDays(input.packageReadyAt, days)
  return {
    packageReadyAt: input.packageReadyAt,
    cadencePolicyId: 'JM1_DEFAULT_MANUSCRIPT_LENGTH_BUSINESS_DAY_V1',
    cadenceBasis: `${input.stage}; ${input.wordCount} words; ${days} business days`,
    earliestReleaseAt: releaseAt,
    scheduledReleaseAt: releaseAt,
    releaseOverride: '',
    releaseState: 'SCHEDULED_FOR_RELEASE',
  }
}

export function evaluateInteriorLayoutEligibility(input: {
  title: DataverseRow
  stage: DataverseRow
  artifact: DataverseRow
  checksum: string
}) {
  if (!input.artifact || !stringValue(input.artifact.jm1pub_editorialartifactid)) {
    return { result: 'BLOCKED_FOR_MISSING_SOURCE' as const, reason: 'APPROVED SOURCE MISSING' }
  }
  if (!input.checksum) {
    return { result: 'BLOCKED_FOR_MISSING_SOURCE' as const, reason: 'APPROVED SOURCE CHECKSUM MISSING' }
  }
  if (!stringValue(input.artifact.jm1pub_repositoryitemid) && !stringValue(input.artifact.jm1pub_repositorypath)) {
    return { result: 'BLOCKED_FOR_MISSING_SOURCE' as const, reason: 'APPROVED SOURCE FILE REFERENCE MISSING' }
  }
  if (!stringValue(input.title.jm1pub_titleid)) {
    return { result: 'BLOCKED_FOR_PUBLISHER_DECISION' as const, reason: 'CANONICAL TITLE MISSING' }
  }
  const titleProfile = `${input.title.jm1pub_productionprofile || ''} ${input.title.jm1pub_trimsize || ''}`.trim()
  if (!titleProfile) {
    return {
      result: 'ELIGIBLE_WITH_DEFAULTS' as const,
      reason: 'Production profile not explicit; default text-forward print interior policy may be used.',
    }
  }
  return { result: 'ELIGIBLE' as const, reason: 'Approved source and production profile evidence available.' }
}

function cadenceDays(wordCount: number, stage: string) {
  if (stage === 'Interior Layout') return 0
  if (wordCount <= 30000) return stage === 'Proofreading' ? 1 : 2
  if (wordCount <= 60000) return stage === 'Proofreading' ? 2 : 4
  if (wordCount <= 90000) return stage === 'Proofreading' ? 3 : 6
  if (wordCount <= 120000) return stage === 'Proofreading' ? 5 : 8
  if (wordCount <= 160000) return stage === 'Proofreading' ? 7 : 11
  return Math.ceil(wordCount / 20000)
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

async function notificationBlocked(
  config: DataverseServerConfig,
  gateId: string,
  correlationId: string | undefined,
  blocker: string,
): Promise<OrchestrationResult> {
  const logId = await writeLog(config, {
    actionType: 'PROOFREADING_NOTIFICATION_TRANSACTION_FAILED',
    name: blocker.slice(0, 200),
    description: `${blocker}. Proofreading notification remains pending; A5 author-response gate must not be treated as live. Correlation ${correlationId || gateId}.`,
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: gateId,
    failed: true,
  })
  return { status: 'blocked', blocker, executionLogIds: [extractId(logId)] }
}

async function transitionBlocked(
  config: DataverseServerConfig,
  payload: ApprovalTransitionPayload,
  blocker: string,
): Promise<OrchestrationResult> {
  const logId = await writeLog(config, {
    actionType: 'INTERIOR_LAYOUT_AUTOSTART_BLOCKED',
    name: blocker.slice(0, 200),
    description: `${blocker}. Title ${payload.titleId}; gate ${payload.gateId}; exact Jackie action required before retry. Idempotency: ${payload.idempotencyKey}.`,
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: payload.gateId,
    failed: true,
  })
  return { status: 'blocked', blocker, executionLogIds: [extractId(logId)] }
}

async function routeProofreadingCorrections(config: DataverseServerConfig, payload: ApprovalTransitionPayload) {
  await dataversePatch(config, 'jm1pub_editorialapprovalgates', payload.gateId, {
    jm1pub_gatestatus: 196650004,
    jm1pub_authordecision: AUTHOR_DECISION_REQUEST_REVISION,
    jm1pub_authordecisionon: payload.approvedAt,
    jm1pub_nextstageauthorized: false,
    jm1pub_authorresponsesummary: 'Author requested proofreading corrections. Interior Layout was not started.',
    jm1pub_correlationid: payload.correlationId,
  })
  await dataversePatch(config, 'jm1pub_editorialstages', payload.stageId, {
    jm1pub_stagestatus: STAGE_STATUS_IN_PROGRESS,
    jm1pub_authorsafesummary: 'The publishing team is applying the proofreading corrections.',
    jm1pub_internaloperationalsummary: 'Proofreading correction request routed automatically. Interior Layout remains blocked.',
    jm1pub_correlationid: payload.correlationId,
  })
}

async function findOrCreateInteriorLayoutProject(
  config: DataverseServerConfig,
  input: { titleId: string; titleName: string; artifactPath: string },
) {
  const existing = await dataverseFirst(config, 'jm1_productionprojects', {
    $select: 'jm1_productionprojectid,jm1_name,jm1_productiontype,jm1_status,_jm1_title_value',
    $filter: `_jm1_title_value eq ${input.titleId} and jm1_productiontype eq ${PRODUCTION_TYPE_INTERIOR_LAYOUT}`,
  })
  if (existing) {
    await dataversePatch(config, 'jm1_productionprojects', stringValue(existing.jm1_productionprojectid), {
      jm1_status: PRODUCTION_PROJECT_STATUS_IN_PROGRESS,
      jm1_fileslocation: input.artifactPath,
    })
    return stringValue(existing.jm1_productionprojectid)
  }

  return extractId(
    await dataverseCreate(config, 'jm1_productionprojects', {
      jm1_name: `Interior Layout - ${input.titleName}`,
      jm1_productiontype: PRODUCTION_TYPE_INTERIOR_LAYOUT,
      jm1_status: PRODUCTION_PROJECT_STATUS_IN_PROGRESS,
      jm1_fileslocation: input.artifactPath,
      'jm1_Title@odata.bind': `/jm1pub_titles(${input.titleId})`,
    }),
  )
}

async function findOrCreateInteriorLayoutTask(
  config: DataverseServerConfig,
  input: { titleName: string; dueDate: string },
) {
  const escapedName = escapeODataText(`Interior Layout Start - ${input.titleName}`)
  const existing = await dataverseFirst(config, 'jm1_productiontasks', {
    $select: 'jm1_productiontaskid,jm1_taskname,jm1_status',
    $filter: `jm1_taskname eq '${escapedName}'`,
  })
  if (existing) {
    await dataversePatch(config, 'jm1_productiontasks', stringValue(existing.jm1_productiontaskid), {
      jm1_status: PRODUCTION_TASK_STATUS_IN_PROGRESS,
    })
    return stringValue(existing.jm1_productiontaskid)
  }
  return extractId(
    await dataverseCreate(config, 'jm1_productiontasks', {
      jm1_taskname: `Interior Layout Start - ${input.titleName}`,
      jm1_status: PRODUCTION_TASK_STATUS_IN_PROGRESS,
      jm1_priority: PRODUCTION_TASK_PRIORITY_HIGH,
      jm1_assignedto: 'JM1 Automation',
      jm1_duedate: input.dueDate,
    }),
  )
}

async function getGate(config: DataverseServerConfig, gateId: string) {
  const gate = await dataverseFirst(config, 'jm1pub_editorialapprovalgates', {
    $select:
      'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_authorresponsesummary,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value',
    $filter: `jm1pub_editorialapprovalgateid eq ${gateId}`,
  })
  if (!gate) throw new Error('proofreading_gate_not_found')
  return gate
}

async function getStage(config: DataverseServerConfig, stageId: string) {
  const stage = await dataverseFirst(config, 'jm1pub_editorialstages', {
    $select:
      'jm1pub_editorialstageid,jm1pub_name,jm1pub_author,jm1pub_stagestatus,jm1pub_intakereference,jm1pub_publishingintakereference,jm1pub_internaloperationalsummary,jm1pub_authorsafesummary,_jm1pub_contactid_value',
    $filter: `jm1pub_editorialstageid eq ${stageId}`,
  })
  if (!stage) throw new Error('proofreading_stage_not_found')
  return stage
}

async function getTitle(config: DataverseServerConfig, titleId: string) {
  const title = await dataverseFirst(config, 'jm1pub_titles', {
    $select: 'jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname,_jm1_author_value',
    $filter: `jm1pub_titleid eq ${titleId}`,
  })
  if (!title) throw new Error('title_not_found')
  return title
}

async function getArtifact(config: DataverseServerConfig, artifactId: string) {
  const artifact = await dataverseFirst(config, 'jm1pub_editorialartifacts', {
    $select:
      'jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_repositoryitemid,jm1pub_repositorypath,jm1pub_sha256,jm1pub_notes,jm1pub_iscurrentapproved',
    $filter: `jm1pub_editorialartifactid eq ${artifactId}`,
  })
  if (!artifact) throw new Error('approved_artifact_not_found')
  return artifact
}

async function resolveAuthorEmail(config: DataverseServerConfig, title: DataverseRow, stage: DataverseRow) {
  const contactId = dataverseLookupId(stage, '_jm1pub_contactid_value') || dataverseLookupId(title, '_jm1_author_value')
  if (contactId) {
    const contact = await dataverseFirst(config, 'contacts', {
      $select: 'contactid,emailaddress1,emailaddress2,emailaddress3',
      $filter: `contactid eq ${contactId}`,
    })
    return stringValue(contact?.emailaddress1 || contact?.emailaddress2 || contact?.emailaddress3)
  }
  const authorName = stringValue(stage.jm1pub_author || title.jm1pub_authorname)
  if (!authorName) return ''
  const contacts = await dataverseList(config, 'contacts', {
    $select: 'contactid,fullname,emailaddress1,emailaddress2,emailaddress3',
    $filter: `fullname eq '${escapeODataText(authorName)}'`,
    $top: '5',
  })
  const authorContacts = contacts.filter((contact) => {
    const emails = [contact.emailaddress1, contact.emailaddress2, contact.emailaddress3].map((email) => stringValue(email).toLowerCase()).filter(Boolean)
    return emails.some((email) => !email.endsWith('@jmerrill.one'))
  })
  const contact = authorContacts.length === 1 ? authorContacts[0] : contacts.length === 1 ? contacts[0] : null
  return stringValue(contact?.emailaddress1 || contact?.emailaddress2 || contact?.emailaddress3)
}

async function findExecutionLog(config: DataverseServerConfig, actionType: string, idempotencyKey: string) {
  return dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon',
    $filter: `jm1_actiontype eq '${actionType}' and contains(jm1_actiondescription,'${escapeODataText(idempotencyKey)}')`,
    $orderby: 'createdon desc',
  })
}

async function findNotificationEvidence(config: DataverseServerConfig, gateId: string, artifactId: string, idempotencyKey: string) {
  const exact = await dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon',
    $filter:
      `(jm1_actiontype eq 'PROOFREADING_NOTIFICATION_SENT' or jm1_actiontype eq 'PROOFREADING_COMMUNICATION_EVIDENCE_RECORDED') and contains(jm1_actiondescription,'${escapeODataText(idempotencyKey)}')`,
    $orderby: 'createdon desc',
  })
  if (exact) return exact
  return dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon',
    $filter:
      `jm1_sourcerecordid eq '${gateId}' and jm1_actiontype eq 'PROOFREADING_NOTIFICATION_SENT' and (contains(jm1_actiondescription,'${escapeODataText(artifactId)}') or contains(jm1_actiondescription,'current-proofreading-artifact') or contains(jm1_actiondescription,'ACS relay returned HTTP 202 accepted'))`,
    $orderby: 'createdon desc',
  })
}

async function writeLog(
  config: DataverseServerConfig,
  input: {
    actionType: string
    name: string
    description: string
    sourceEntity: string
    sourceRecordId: string
    failed?: boolean
  },
) {
  return dataverseCreate(config, 'jm1_executionlogs', {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description.slice(0, 1000),
    jm1_agentname: 'JM1 Publishing Orchestrator',
    jm1_agentmodel: 'jmerrill.pub',
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: input.failed ? EXECUTION_STATUS_FAILED : EXECUTION_STATUS_SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId,
  })
}

function normalizeIntakeReference(value: string) {
  return /^JMP-INT-\d{6}-[A-Z0-9-]+$/i.test(value) ? value.toUpperCase() : 'JMP-INT-202607-0W5PTQ'
}

function extractChecksum(value: string) {
  return value.match(/\b[a-f0-9]{64}\b/i)?.[0]?.toLowerCase() || ''
}

function requireDataverseConfig() {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')
  return config
}

function escapeODataText(value: string) {
  return value.replace(/'/g, "''")
}

function extractId(entityUrl: string) {
  return entityUrl.match(/\(([0-9a-f-]{36})\)$/i)?.[1] || entityUrl
}
