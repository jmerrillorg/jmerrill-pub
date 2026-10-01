import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const { buildPublishingStageEvent } = jiti('../lib/publishing/lifecycle/stage-runtime-event.ts')
const { reducePublishingStageEvent } = jiti('../lib/publishing/lifecycle/stage-runtime-reducer.ts')

const base = {
  schemaVersion: 1,
  titleId: 'daf8180f-85a3-f111-b8de-000d3a14673b',
  stageId: 'ae3c9d5e-67b5-f111-aaab-000d3a10aa9c',
  stageCode: '07_DEVELOPMENTAL_EDITING',
  executionId: 'execution-1',
  sourceEventId: 'source-1',
  timestamp: '2026-10-01T12:00:00.000Z',
  actorClass: 'SYSTEM',
  evidenceReference: 'jm1_executionlogs/source-1',
}
const initial = { titleId: base.titleId, stageId: base.stageId, stageCode: base.stageCode,
  executionId: base.executionId, phase: 'WAITING' }
const event = (eventType, sourceEventId) => buildPublishingStageEvent({
  ...base, eventType, sourceEventId,
  actorClass: eventType === 'HUMAN_ACTION_COMPLETED' ? 'HUMAN' :
    eventType === 'EXTERNAL_ACTION_COMPLETED' ? 'EXTERNAL_PROVIDER' : 'SYSTEM',
})

test('human gate pauses and resumes the same stage without author decision inference', () => {
  const eligible = reducePublishingStageEvent(initial, event('STAGE_ELIGIBLE', 'eligible'))
  const running = reducePublishingStageEvent(eligible, event('STAGE_STARTED', 'started'))
  const held = reducePublishingStageEvent(running, event('HUMAN_ACTION_REQUIRED', 'gate-open'))
  assert.equal(held.phase, 'HUMAN_HOLD')
  assert.throws(() => reducePublishingStageEvent(held, event('STAGE_COMPLETED', 'complete')), /INVALID_TRANSITION/)
  const resumed = reducePublishingStageEvent(held, event('HUMAN_ACTION_COMPLETED', 'gate-close'))
  assert.equal(resumed.phase, 'RUNNING')
  assert.equal(resumed.gateEvidenceReference, undefined)
  assert.equal(reducePublishingStageEvent(resumed, event('HUMAN_ACTION_COMPLETED', 'gate-close')), resumed)
})

test('cross-title replay and advancement without completion evidence are denied', () => {
  const eligible = reducePublishingStageEvent(initial, event('STAGE_ELIGIBLE', 'eligible'))
  assert.throws(() => reducePublishingStageEvent(eligible,
    buildPublishingStageEvent({ ...base, titleId: '106a78d0-fb9a-f111-b8dc-6045bdd69738',
      eventType: 'STAGE_STARTED', sourceEventId: 'wrong-title' })), /CORRELATION_MISMATCH/)
  assert.throws(() => reducePublishingStageEvent(eligible, event('TITLE_ADVANCED', 'advance')), /INVALID_TRANSITION/)
  const running = reducePublishingStageEvent(eligible, event('STAGE_STARTED', 'started'))
  assert.throws(() => reducePublishingStageEvent(running, event('STAGE_COMPLETED', 'complete')),
    /COMPLETION_EVIDENCE_MISSING/)
})

test('failed work requires a scheduled retry before another start', () => {
  const eligible = reducePublishingStageEvent(initial, event('STAGE_ELIGIBLE', 'eligible'))
  const running = reducePublishingStageEvent(eligible, event('STAGE_STARTED', 'started'))
  const failed = reducePublishingStageEvent(running, event('STAGE_FAILED', 'failed'))
  assert.throws(() => reducePublishingStageEvent(failed, event('STAGE_STARTED', 'restart')), /INVALID_TRANSITION/)
  const retry = reducePublishingStageEvent(failed, event('STAGE_RETRY_SCHEDULED', 'retry'))
  assert.equal(reducePublishingStageEvent(retry, event('STAGE_STARTED', 'restart')).phase, 'RUNNING')
})
