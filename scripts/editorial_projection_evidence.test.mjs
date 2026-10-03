import assert from 'node:assert/strict'
import test from 'node:test'
import { boundPublisherReview, sameProjectionTitle, isBoundEditorialTransition, hasDeliveredPendingReview, selectCurrentEditorialStage } from '../lib/publishing/lifecycle/editorial-projection-evidence.ts'

const binding = {
  titleId: 'daf8180f-85a3-f111-b8de-000d3a14673b',
  stageId: 'ae3c9d5e-67b5-f111-aaab-000d3a10aa9c',
  gateId: '4d04daa2-67b5-f111-aaac-000d3a14673b',
}

test('publisher review survives stale awaiting-author summary using exact capture and owner evidence', () => {
  const gate = {jm1pub_editorialapprovalgateid: binding.gateId, _jm1pub_titleid_value: binding.titleId,
    jm1pub_gatestatus: 196650002, jm1pub_authordecision: null, createdon: '2026-09-21T00:00:00Z',
    jm1pub_authorresponsesummary: 'Package sent. Awaiting author response.'}
  const base = {jm1_sourceentity: 'jm1pub_editorialapprovalgate', jm1_sourcerecordid: binding.gateId, createdon: '2026-10-02T19:13:14Z'}
  const captured = {...base, jm1_actiontype: 'AUTHOR_RESPONSE_CAPTURED',
    jm1_actiondescription: `title=${binding.titleId}; Idempotency: author-review-response:abcd.`}
  const review = {...base, jm1_executionlogid: 'evidence1', jm1_actiontype: 'AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW',
    jm1_actiondescription: 'Idempotency: author-review-response:abcd.'}
  assert.equal(boundPublisherReview(gate, [captured,review]), review)
  assert.equal(boundPublisherReview(gate, [review]), null)
  assert.equal(boundPublisherReview(gate, [captured,{...review,jm1_sourcerecordid:binding.stageId}]), null)
  assert.equal(boundPublisherReview(gate, [captured,{...review,jm1_sourceentity:'contact'}]), null)
  assert.equal(boundPublisherReview(gate, [{...captured,jm1_actiondescription:`title=${binding.stageId}; Idempotency: author-review-response:abcd.`},review]), null)
  assert.equal(boundPublisherReview(gate, [captured,{...review,jm1_actiondescription:'Idempotency: author-review-response:aaaa.'}]), null)
  assert.equal(boundPublisherReview({...gate,jm1pub_awaitingsince:'2026-10-03T00:00:00Z'}, [captured,review]), null)
  assert.equal(boundPublisherReview({...gate,jm1pub_authordecision:0}, [captured,review]), null)
  assert.equal(boundPublisherReview({...gate,jm1pub_nextstageauthorized:true}, [captured,review]), null)
  assert.equal(gate.jm1pub_authordecision, null)
})
test('title binding requires an exact canonical GUID, not a name or absent identity', () => {
  assert.equal(sameProjectionTitle(binding.titleId, binding.titleId.toUpperCase()), true)
  assert.equal(sameProjectionTitle('Whole', 'Whole'), false)
  assert.equal(sameProjectionTitle(undefined, undefined), false)
  assert.equal(sameProjectionTitle(binding.titleId, binding.gateId), false)
})
test('unrelated transitions and incidental gate mentions never prove processing', () => {
  assert.equal(isBoundEditorialTransition({ jm1_actiontype: 'STAGE_TRANSITION', jm1_sourcerecordid: binding.titleId }, binding), false)
  assert.equal(isBoundEditorialTransition({ jm1_actiontype: 'QA_PASS', jm1_sourcerecordid: binding.stageId }, binding), false)
  assert.equal(isBoundEditorialTransition({ jm1_actiontype: 'STAGE_TRANSITION', jm1_actiondescription: binding.gateId }, binding), false)
})
test('exact gate or stage transition binds, but conflicting structured title denies', () => {
  const log = { jm1_actiontype: 'STAGE_TRANSITION', jm1_sourcerecordid: binding.gateId }
  assert.equal(isBoundEditorialTransition(log, binding), true)
  assert.equal(isBoundEditorialTransition({ ...log, jm1_actiondescription: JSON.stringify({ titleId: binding.stageId }) }, binding), false)
  assert.equal(isBoundEditorialTransition({ ...log, jm1_sourcerecordid: binding.stageId }, binding), false)
  assert.equal(isBoundEditorialTransition({ ...log, jm1_sourcerecordid: binding.stageId, jm1_actiondescription: JSON.stringify({ gateId: binding.gateId }) }, binding), true)
})

test('failed, requested, and pre-decision transitions cannot prove disposition processing', () => {
  const log = { jm1_actiontype: 'STAGE_TRANSITION', jm1_sourcerecordid: binding.gateId, createdon: '2026-09-27T14:00:00Z' }
  for (const suffix of ['BLOCKED', 'FAILED', 'DENIED', 'REQUESTED', 'PREPARED']) {
    assert.equal(isBoundEditorialTransition({ ...log, jm1_actiontype: `STAGE_TRANSITION_${suffix}` }, binding), false)
  }
  assert.equal(isBoundEditorialTransition(log, { ...binding, decisionOn: '2026-09-27T14:01:00Z' }), false)
  assert.equal(isBoundEditorialTransition(log, { ...binding, decisionOn: '2026-09-27T13:59:00Z' }), true)
})

test('later preparation cannot hide a delivered exact-version pending review', () => {
  const stage = { jm1pub_editorialstageid: binding.stageId, _jm1pub_titleid_value: binding.titleId, jm1pub_authorsafesummary: 'PACKAGE_PREPARATION' }
  const gate = { jm1pub_editorialapprovalgateid: binding.gateId, _jm1pub_editorialstageid_value: binding.stageId, _jm1pub_titleid_value: binding.titleId, jm1pub_gatestatus: 196650002 }
  const delivery = { jm1_actiontype: 'PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT', jm1_sourcerecordid: binding.stageId, jm1_actiondescription: `gate=${binding.gateId}; package=original` }
  assert.equal(hasDeliveredPendingReview(stage, [gate], [delivery]), true)
  assert.equal(hasDeliveredPendingReview(stage, [{ ...gate, jm1pub_authordecisionon: '2026-09-27T14:00:00Z' }], [delivery]), false)
  assert.equal(hasDeliveredPendingReview(stage, [gate], []), false)
  assert.equal(hasDeliveredPendingReview({ ...stage, jm1pub_editorialstageid: binding.gateId }, [gate], [delivery]), false)
  assert.equal(hasDeliveredPendingReview(stage, [{ ...gate, _jm1pub_titleid_value: binding.stageId }], [delivery]), false)
})

test('newer downstream stage outranks stale earlier state without regressing', () => {
  const stale = { jm1pub_editorialstageid: 'earlier', jm1pub_stagesequence: 2, createdon: '2026-09-01T00:00:00Z' }
  const downstream = { jm1pub_editorialstageid: 'downstream', jm1pub_stagesequence: 3, createdon: '2026-09-02T00:00:00Z' }
  assert.equal(selectCurrentEditorialStage([stale, downstream]).jm1pub_editorialstageid, 'downstream')
})

test('a newer governed route-back instance is not hidden by an older higher stage number', () => {
  const downstream = { jm1pub_editorialstageid: 'downstream', jm1pub_stagesequence: 3, createdon: '2026-09-02T00:00:00Z' }
  const rework = { jm1pub_editorialstageid: 'rework', jm1pub_stagesequence: 2, createdon: '2026-09-03T00:00:00Z' }
  assert.equal(selectCurrentEditorialStage([downstream, rework]).jm1pub_editorialstageid, 'rework')
})
