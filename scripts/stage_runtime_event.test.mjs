import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const { buildPublishingStageEvent, validatePublishingStageEvent, PUBLISHING_STAGE_EVENT_TYPES } =
  jiti('../lib/publishing/lifecycle/stage-runtime-event.ts')

const base = {
  eventType: 'STAGE_ELIGIBLE',
  titleId: 'daf8180f-85a3-f111-b8de-000d3a14673b',
  stageId: 'ae3c9d5e-67b5-f111-aaab-000d3a10aa9c',
  stageCode: '07_DEVELOPMENTAL_EDITING',
  executionId: 'execution-1',
  sourceEventId: 'source-event-1',
  timestamp: '2026-10-01T12:00:00.000Z',
  actorClass: 'SYSTEM',
  evidenceReference: 'jm1_executionlogs/execution-1',
}

test('the event envelope defines every required canonical lifecycle event', () => {
  assert.equal(PUBLISHING_STAGE_EVENT_TYPES.length, 14)
  assert.equal(new Set(PUBLISHING_STAGE_EVENT_TYPES).size, 14)
})

test('replay has stable identity while a distinct source event is distinct', () => {
  const first = buildPublishingStageEvent(base)
  assert.equal(validatePublishingStageEvent(first).idempotencyKey, first.idempotencyKey)
  assert.equal(buildPublishingStageEvent({ ...base, timestamp: '2026-10-01T12:05:00.000Z' }).idempotencyKey,
    first.idempotencyKey)
  assert.equal(buildPublishingStageEvent({ ...base, evidenceReference: 'jm1_executionlogs/enriched-evidence' }).idempotencyKey,
    first.idempotencyKey)
  assert.notEqual(buildPublishingStageEvent({ ...base, sourceEventId: 'source-event-2' }).idempotencyKey,
    first.idempotencyKey)
})

test('missing correlation, tampering, and impossible stage events fail closed', () => {
  assert.throws(() => buildPublishingStageEvent({ ...base, titleId: 'Whole' }), /CORRELATION_INVALID/)
  assert.throws(() => buildPublishingStageEvent({ ...base, evidenceReference: '' }), /EVIDENCE_REFERENCE_INVALID/)
  assert.throws(() => buildPublishingStageEvent({ ...base, actorClass: 'AGENT' }), /ACTOR_CLASS_INVALID/)
  assert.throws(() => buildPublishingStageEvent({ ...base, eventType: 'PUBLICATION_CONFIRMED' }), /PUBLICATION_STAGE_MISMATCH/)
  assert.throws(() => validatePublishingStageEvent({ ...buildPublishingStageEvent(base), idempotencyKey: 'wrong' }),
    /IDEMPOTENCY_KEY_MISMATCH/)
})
