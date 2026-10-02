import { createHash } from 'node:crypto'
import {
  EDITORIAL_SYSTEM_STAGE_CONTRACTS,
} from './editorial-system-contract'
import type { HumanPipelineStageId } from './human-pipeline-read-model'

export const PUBLISHING_STAGE_EVENT_TYPES = [
  'TITLE_CREATED',
  'STAGE_ELIGIBLE',
  'STAGE_STARTED',
  'STAGE_BLOCKED',
  'HUMAN_ACTION_REQUIRED',
  'HUMAN_ACTION_COMPLETED',
  'EXTERNAL_ACTION_REQUIRED',
  'EXTERNAL_ACTION_COMPLETED',
  'STAGE_COMPLETED',
  'STAGE_FAILED',
  'STAGE_RETRY_SCHEDULED',
  'STAGE_RECONCILED',
  'TITLE_ADVANCED',
  'PUBLICATION_CONFIRMED',
] as const

export type PublishingStageEventType = typeof PUBLISHING_STAGE_EVENT_TYPES[number]
export type PublishingActorClass = 'SYSTEM' | 'HUMAN' | 'EXTERNAL_PROVIDER'

export type PublishingStageEvent = {
  schemaVersion: 1
  eventType: PublishingStageEventType
  titleId: string
  stageId: string
  stageCode: HumanPipelineStageId
  executionId: string
  artifactId?: string
  sourceEventId: string
  idempotencyKey: string
  timestamp: string
  actorClass: PublishingActorClass
  evidenceReference: string
}

type EventInput = Omit<PublishingStageEvent, 'idempotencyKey'>
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EVENT_TYPES = new Set<string>(PUBLISHING_STAGE_EVENT_TYPES)
const ACTOR_CLASSES = new Set<string>(['SYSTEM', 'HUMAN', 'EXTERNAL_PROVIDER'])

function requireExact(value: string | undefined, field: string): string {
  if (!value || value !== value.trim() || /[\r\n]/.test(value)) throw new Error(`PUBLISHING_EVENT_${field}_INVALID`)
  return value
}

export function publishingStageIdempotencyKey(input: EventInput): string {
  return createHash('sha256').update(JSON.stringify([
    input.schemaVersion,
    input.eventType,
    input.titleId.toLowerCase(),
    input.stageId.toLowerCase(),
    input.stageCode,
    input.executionId,
    input.artifactId?.toLowerCase() || '',
    input.sourceEventId,
  ])).digest('hex')
}

export function buildPublishingStageEvent(input: EventInput): PublishingStageEvent {
  if (input.schemaVersion !== 1) throw new Error('PUBLISHING_EVENT_SCHEMA_VERSION_UNSUPPORTED')
  if (!EVENT_TYPES.has(input.eventType)) throw new Error('PUBLISHING_EVENT_TYPE_UNSUPPORTED')
  if (!UUID.test(input.titleId) || !UUID.test(input.stageId) ||
      (input.artifactId && !UUID.test(input.artifactId))) {
    throw new Error('PUBLISHING_EVENT_CORRELATION_INVALID')
  }
  if (!EDITORIAL_SYSTEM_STAGE_CONTRACTS[input.stageCode]) throw new Error('PUBLISHING_EVENT_STAGE_UNGOVERNED')
  requireExact(input.executionId, 'EXECUTION_ID')
  requireExact(input.sourceEventId, 'SOURCE_EVENT_ID')
  requireExact(input.evidenceReference, 'EVIDENCE_REFERENCE')
  if (!ACTOR_CLASSES.has(input.actorClass)) throw new Error('PUBLISHING_EVENT_ACTOR_CLASS_INVALID')
  if ((input.eventType === 'HUMAN_ACTION_COMPLETED' && input.actorClass !== 'HUMAN') ||
      (input.eventType === 'EXTERNAL_ACTION_COMPLETED' && input.actorClass !== 'EXTERNAL_PROVIDER') ||
      (!['HUMAN_ACTION_COMPLETED', 'EXTERNAL_ACTION_COMPLETED'].includes(input.eventType) && input.actorClass !== 'SYSTEM')) {
    throw new Error('PUBLISHING_EVENT_ACTOR_CLASS_MISMATCH')
  }
  if (!Number.isFinite(Date.parse(input.timestamp)) || input.timestamp !== new Date(input.timestamp).toISOString()) {
    throw new Error('PUBLISHING_EVENT_TIMESTAMP_INVALID')
  }
  if (input.eventType === 'PUBLICATION_CONFIRMED' && input.stageCode !== '15_PUBLICATION') {
    throw new Error('PUBLISHING_EVENT_PUBLICATION_STAGE_MISMATCH')
  }
  if (input.eventType === 'TITLE_CREATED' && input.stageCode !== '01_INQUIRY') {
    throw new Error('PUBLISHING_EVENT_TITLE_CREATED_STAGE_MISMATCH')
  }
  return { ...input, idempotencyKey: publishingStageIdempotencyKey(input) }
}

export function validatePublishingStageEvent(event: PublishingStageEvent): PublishingStageEvent {
  const validated = buildPublishingStageEvent(event)
  if (event.idempotencyKey !== validated.idempotencyKey) {
    throw new Error('PUBLISHING_EVENT_IDEMPOTENCY_KEY_MISMATCH')
  }
  return validated
}
