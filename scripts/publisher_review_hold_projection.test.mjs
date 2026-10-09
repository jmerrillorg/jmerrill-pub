import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'
const { buildAuthorResponseQueue } = createJiti(import.meta.url)('../lib/server/publisher-operating-center.ts')
const gateId = '00000001-1111-4111-8111-111111111111'
const titleId = '00000002-1111-4111-8111-111111111111'
const gate = {jm1pub_editorialapprovalgateid:gateId,_jm1pub_titleid_value:titleId,
  _jm1pub_editorialstageid_value:'00000003-1111-4111-8111-111111111111',
  jm1pub_gatestatus:196650002,jm1pub_authordecision:null,createdon:'2026-09-21T00:00:00Z',
  jm1pub_authorresponsesummary:'Package sent. Awaiting author response.'}
const base = {jm1_sourceentity:'jm1pub_editorialapprovalgate',jm1_sourcerecordid:gateId,createdon:'2026-10-02T19:13:14Z'}
const logs = [
  {...base,jm1_executionlogid:'capture',jm1_actiontype:'AUTHOR_RESPONSE_CAPTURED',
    jm1_actiondescription:`title=${titleId}; Idempotency: author-review-response:abcd.`},
  {...base,jm1_executionlogid:'review',jm1_actiontype:'AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW',
    jm1_actiondescription:'Idempotency: author-review-response:abcd.'},
]
test('captured unresolved response is visible without editing the awaiting-author gate', () => {
  const before=JSON.stringify(gate)
  const [item]=buildAuthorResponseQueue([gate],[{jm1pub_titleid:titleId,jm1pub_titlename:'Example'}],logs)
  assert.equal(item.processingStatus,'AMBIGUOUS — REVIEW')
  assert.equal(item.classifiedDecision,'AMBIGUOUS — HUMAN REVIEW')
  assert.equal(item.responseReceived,base.createdon)
  assert.equal(item.threadEvidence,'Governed response review: review')
  assert.equal(item.gateId,gateId)
  assert.equal(JSON.stringify(gate),before)
})
test('unbound capture does not surface another title as having responded', () => {
  const rows=buildAuthorResponseQueue([{...gate,_jm1pub_titleid_value:gateId}],[],logs)
  assert.deepEqual(rows,[])
})
