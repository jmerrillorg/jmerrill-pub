import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const jsonPath = 'docs/operations/active/the-intentional-leader/CURRENT-STATE.json'
const mdPath = 'docs/operations/active/the-intentional-leader/CURRENT-STATE.md'

test('active initiative handoff exists in machine and human form', () => {
  assert.equal(existsSync(jsonPath), true)
  assert.equal(existsSync(mdPath), true)
})

test('active initiative handoff blocks stale repeated work', () => {
  const handoff = JSON.parse(readFileSync(jsonPath, 'utf8'))
  assert.equal(handoff.initiative, 'The Intentional Leader')
  assert.equal(handoff.authorResponseState, 'APPROVED')
  assert.equal(handoff.approvalState, 'APPROVED')
  assert.equal(handoff.responseClockState, 'NOT STARTED / NOT REQUIRED - AUTHOR RESPONDED')
  assert.equal(handoff.proofGenerated, 'YES')
  assert.equal(handoff.proofDelivered, 'YES')
  assert.equal(handoff.authorApproval, 'YES')
  assert.equal(handoff.protectedArtifactMutation, 'PENDING')
  assert.equal(handoff.interiorLayoutGate, 'PENDING COMPLETION')
  assert.equal(handoff.additionalAuthorEmail, 'NOT AUTHORIZED')
  assert.equal(handoff.staleHandoffFacts, 0)
  assert.equal(handoff.unsupportedLiveStateClaims, 0)
  assert.equal(handoff.currentReleaseSha, null)
  assert.match(handoff.currentReleaseShaReason, /Resolved dynamically/)
  assert.ok(handoff.mustNotBeRepeated.includes('Do not reopen Vellum as a mandatory production engine'))
  assert.ok(handoff.mustNotBeRepeated.includes('Do not resend the approved package to test template changes'))
  assert.match(handoff.explicitStopBoundary, /protected writer is unavailable/)
})
