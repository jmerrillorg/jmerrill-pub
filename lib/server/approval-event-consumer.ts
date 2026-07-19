import {
  dataverseCreate,
  dataverseFirst,
  dataverseFormatted,
  dataverseList,
  dataverseLookupId,
  getDataverseServerConfig,
  stringValue,
  type DataverseServerConfig,
} from './dataverse-server'
import { processProofreadingApprovalEvent, type ApprovalTransitionPayload, type OrchestrationResult } from './publishing-orchestrator'

const EXECUTION_STATUS_SUCCESS = 835500001
const EXECUTION_STATUS_FAILED = 835500002
const BAND_LEVEL_1 = 835500000

const AUTHOR_DECISION_APPROVE = 196650000
const AUTHOR_DECISION_REQUEST_REVISION = 196650001

type DataverseRow = Record<string, unknown>

export type ApprovalConsumerRunResult = {
  runtimeName: 'JM1 Automatic Approval Event Consumer'
  triggerMechanism: 'SCHEDULED_WORKER_OR_EVENT_WEBHOOK'
  queue: 'Dataverse editorial approval gates and execution-log claim records'
  processed: number
  blocked: number
  idempotent: number
  results: Array<{
    eventId: string
    gateId: string
    titleId: string
    stageId: string
    eventType: string
    outcome: 'APPROVAL_CONSUMED_TRANSITION_COMPLETED_NEXT_STAGE_RUNTIME_STARTED' | 'APPROVAL_CONSUMED_TRANSITION_BLOCKED' | 'IDEMPOTENT' | 'BLOCKED'
    detail: string
    executionLogIds: string[]
  }>
}

export async function runAutomaticApprovalEventConsumer(input: {
  maxEvents?: number
  triggerSource?: 'SCHEDULED_WORKER' | 'DATAVERSE_EVENT' | 'ADMIN_RETRY'
  operatorEmail?: string
} = {}): Promise<ApprovalConsumerRunResult> {
  const config = requireDataverseConfig()
  const candidates = await findDurableApprovalCandidates(config, input.maxEvents || 10)
  const results: ApprovalConsumerRunResult['results'] = []

  for (const gate of candidates) {
    const event = await buildApprovalEventFromGate(config, gate, input.triggerSource || 'SCHEDULED_WORKER')
    if (!event) {
      const gateId = stringValue(gate.jm1pub_editorialapprovalgateid)
      const logId = await writeLog(config, {
        actionType: 'EDITORIAL_APPROVAL_EVENT_BLOCKED',
        name: `EDITORIAL_APPROVAL_EVENT_BLOCKED - ${gateId}`,
        description: `Approval gate could not produce a valid event payload. Gate remains queued for exact remediation. Trigger ${input.triggerSource || 'SCHEDULED_WORKER'}.`,
        sourceEntity: 'jm1pub_editorialapprovalgate',
        sourceRecordId: gateId,
        failed: true,
      })
      results.push({
        eventId: '',
        gateId,
        titleId: dataverseLookupId(gate, '_jm1pub_titleid_value'),
        stageId: dataverseLookupId(gate, '_jm1pub_editorialstageid_value'),
        eventType: 'EDITORIAL_STAGE_APPROVED',
        outcome: 'BLOCKED',
        detail: 'payload_missing_required_reference',
        executionLogIds: [extractId(logId)],
      })
      continue
    }

    const existing = await findExecutionLog(config, 'EDITORIAL_APPROVAL_EVENT_CONSUMED', event.idempotencyKey)
    if (existing) {
      results.push({
        eventId: event.eventId,
        gateId: event.gateId,
        titleId: event.titleId,
        stageId: event.currentStageId,
        eventType: event.eventType,
        outcome: 'IDEMPOTENT',
        detail: 'approval_event_already_consumed',
        executionLogIds: [stringValue(existing.jm1_executionlogid)],
      })
      continue
    }

    const claimLog = await writeLog(config, {
      actionType: 'EDITORIAL_APPROVAL_EVENT_CLAIMED',
      name: `EDITORIAL_APPROVAL_EVENT_CLAIMED - ${event.eventType}`,
      description: `Automatic consumer claimed approval event ${event.eventId}. Trigger ${input.triggerSource || 'SCHEDULED_WORKER'}. Idempotency: ${event.idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: event.gateId,
    })

    const result = await consumeApprovalEvent(event)
    const consumedLog = await writeLog(config, {
      actionType: result.status === 'transition-completed' ? 'EDITORIAL_APPROVAL_EVENT_CONSUMED' : 'EDITORIAL_APPROVAL_EVENT_BLOCKED',
      name: `${result.status === 'transition-completed' ? 'EDITORIAL_APPROVAL_EVENT_CONSUMED' : 'EDITORIAL_APPROVAL_EVENT_BLOCKED'} - ${event.eventType}`,
      description: `${describeConsumerOutcome(result)} Event ${event.eventId}. No Publisher Center action required. Idempotency: ${event.idempotencyKey}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: event.gateId,
      failed: result.status === 'blocked',
    })

    results.push({
      eventId: event.eventId,
      gateId: event.gateId,
      titleId: event.titleId,
      stageId: event.currentStageId,
      eventType: event.eventType,
      outcome:
        result.status === 'transition-completed'
          ? 'APPROVAL_CONSUMED_TRANSITION_COMPLETED_NEXT_STAGE_RUNTIME_STARTED'
          : 'APPROVAL_CONSUMED_TRANSITION_BLOCKED',
      detail: describeConsumerOutcome(result),
      executionLogIds: [extractId(claimLog), ...result.executionLogIds, extractId(consumedLog)],
    })
  }

  return {
    runtimeName: 'JM1 Automatic Approval Event Consumer',
    triggerMechanism: 'SCHEDULED_WORKER_OR_EVENT_WEBHOOK',
    queue: 'Dataverse editorial approval gates and execution-log claim records',
    processed: results.filter((result) => result.outcome.includes('TRANSITION_COMPLETED')).length,
    blocked: results.filter((result) => result.outcome === 'BLOCKED' || result.outcome.includes('TRANSITION_BLOCKED')).length,
    idempotent: results.filter((result) => result.outcome === 'IDEMPOTENT').length,
    results,
  }
}

export async function consumeApprovalEvent(event: ApprovalTransitionPayload & { eventId: string; eventType: string; currentStageCode: string }) {
  if (event.currentStageCode === 'PROOFREADING' || event.eventType === 'PROOFREADING_APPROVED') {
    return processProofreadingApprovalEvent(event)
  }
  const config = requireDataverseConfig()
  const logId = await writeLog(config, {
    actionType: 'EDITORIAL_STAGE_TRANSITION_BLOCKED',
    name: `EDITORIAL_STAGE_TRANSITION_BLOCKED - ${event.currentStageCode}`,
    description: `No commissioned transition executor for stage ${event.currentStageCode}. Approval consumed only after executor exists. Idempotency: ${event.idempotencyKey}.`,
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: event.gateId,
    failed: true,
  })
  return { status: 'blocked', blocker: 'NEXT_STAGE_EXECUTOR_MISSING', executionLogIds: [extractId(logId)] } satisfies OrchestrationResult
}

async function findDurableApprovalCandidates(config: DataverseServerConfig, maxEvents: number) {
  return dataverseList(config, 'jm1pub_editorialapprovalgates', {
    $select:
      'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_authorresponsesummary,jm1pub_authordecisionsource,jm1pub_nextstageauthorized,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,modifiedon',
    $filter: `jm1pub_authordecisionon ne null and jm1pub_authordecision eq ${AUTHOR_DECISION_APPROVE}`,
    $orderby: 'jm1pub_authordecisionon asc',
    $top: String(maxEvents),
  })
}

async function buildApprovalEventFromGate(
  config: DataverseServerConfig,
  gate: DataverseRow,
  trigger: 'SCHEDULED_WORKER' | 'DATAVERSE_EVENT' | 'ADMIN_RETRY',
) {
  const gateId = stringValue(gate.jm1pub_editorialapprovalgateid)
  const titleId = dataverseLookupId(gate, '_jm1pub_titleid_value')
  const currentStageId = dataverseLookupId(gate, '_jm1pub_editorialstageid_value')
  const approvedArtifactId = dataverseLookupId(gate, '_jm1pub_deliverableartifactid_value')
  const approvedAt = stringValue(gate.jm1pub_authordecisionon || gate.modifiedon)
  if (!gateId || !titleId || !currentStageId || !approvedArtifactId || !approvedAt) return null

  const [stage, artifact] = await Promise.all([getStage(config, currentStageId), getArtifact(config, approvedArtifactId)])
  const stageName = stringValue(stage.jm1pub_name || dataverseFormatted(stage, 'jm1pub_name'))
  const currentStageCode = normalizeStageCode(stageName)
  const checksum = stringValue(artifact.jm1pub_sha256) || extractChecksum(`${artifact.jm1pub_notes || ''}`)
  if (!checksum) return null

  const notificationEvidence = `${stringValue(gate.jm1pub_authorresponsesummary)} ${stringValue(gate.jm1pub_authordecisionsource)}`.toLowerCase()
  if (!notificationEvidence.includes('corrected-notification') && !notificationEvidence.includes('notification sent with required attachments')) {
    await writeLog(config, {
      actionType: 'EDITORIAL_APPROVAL_EVENT_BLOCKED',
      name: `EDITORIAL_APPROVAL_EVENT_BLOCKED - ${gateId}`,
      description: `Gate approval is not tied to a complete attachment-aware notification transaction. Event not emitted. Gate ${gateId}.`,
      sourceEntity: 'jm1pub_editorialapprovalgate',
      sourceRecordId: gateId,
      failed: true,
    })
    return null
  }

  const eventType = currentStageCode === 'PROOFREADING' ? 'PROOFREADING_APPROVED' : 'EDITORIAL_STAGE_APPROVED'
  const eventId = `${eventType}:${gateId}:${approvedAt}`
  const idempotencyKey = `approval-event:${eventType}:${gateId}:${approvedArtifactId}:${checksum}`
  return {
    eventId,
    eventType,
    titleId,
    currentStageId,
    currentStageCode,
    stageId: currentStageId,
    gateId,
    authorResponseId: stringValue(gate.jm1pub_authordecisionsource) || eventId,
    approvedPackageId: approvedArtifactId,
    approvedArtifactId,
    approvedArtifactChecksum: checksum,
    decision: 'Approve' as const,
    approvedAt,
    triggerSource: 'AUTHOR_APPROVAL' as const,
    correlationId: `${trigger}:${eventId}`.slice(0, 100),
    idempotencyKey,
  }
}

async function getStage(config: DataverseServerConfig, stageId: string) {
  const stage = await dataverseFirst(config, 'jm1pub_editorialstages', {
    $select: 'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagestatus,jm1pub_internaloperationalsummary',
    $filter: `jm1pub_editorialstageid eq ${stageId}`,
  })
  if (!stage) throw new Error('approval_event_stage_not_found')
  return stage
}

async function getArtifact(config: DataverseServerConfig, artifactId: string) {
  const artifact = await dataverseFirst(config, 'jm1pub_editorialartifacts', {
    $select: 'jm1pub_editorialartifactid,jm1pub_sha256,jm1pub_notes,jm1pub_repositoryitemid,jm1pub_repositorypath',
    $filter: `jm1pub_editorialartifactid eq ${artifactId}`,
  })
  if (!artifact) throw new Error('approval_event_artifact_not_found')
  return artifact
}

async function findExecutionLog(config: DataverseServerConfig, actionType: string, idempotencyKey: string) {
  return dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon',
    $filter: `jm1_actiontype eq '${actionType}' and contains(jm1_actiondescription,'${escapeODataText(idempotencyKey)}')`,
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
    jm1_agentname: 'JM1 Automatic Approval Event Consumer',
    jm1_agentmodel: 'jmerrill.pub',
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: input.failed ? EXECUTION_STATUS_FAILED : EXECUTION_STATUS_SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId,
  })
}

function normalizeStageCode(stageName: string) {
  const normalized = stageName.toLowerCase()
  if (normalized.includes('proof')) return 'PROOFREADING'
  if (normalized.includes('copy')) return 'COPYEDITING'
  if (normalized.includes('line')) return 'LINE_EDITING'
  if (normalized.includes('developmental')) return 'DEVELOPMENTAL_EDITING'
  return 'EDITORIAL_STAGE'
}

function describeConsumerOutcome(result: OrchestrationResult) {
  if (result.status === 'transition-completed') return 'APPROVAL_CONSUMED TRANSITION_COMPLETED NEXT_STAGE_RUNTIME_STARTED'
  if (result.status === 'idempotent') return 'APPROVAL_CONSUMED IDEMPOTENT'
  if (result.status === 'notification-sent') return 'APPROVAL_CONSUMED NOTIFICATION_SENT'
  return `APPROVAL_CONSUMED TRANSITION_BLOCKED ${result.blocker}`
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
