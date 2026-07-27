import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const route = readFileSync('app/api/publishing/intake/route.ts', 'utf8')
const deadLetter = readFileSync('lib/publishing/intake/deadLetter.ts', 'utf8')
const recovery = readFileSync('lib/publishing/intake/recovery.ts', 'utf8')

test('notification failure after durable intake is recoverable and does not block 201 receipt', () => {
  assert.match(route, /const notification = await sendJoinInternalNotification/)
  assert.match(route, /enqueuePublishingIntakeRecovery\(\{/)
  assert.match(route, /failedOperationType: 'PUBLISHING_NOTIFICATION'/)
  assert.match(route, /return json\(\{ status: 'received', reference \}, 201/)
})

test('invalid input failures are handled before any recovery queue enqueue', () => {
  const firstEnqueue = route.indexOf('await enqueuePublishingIntake')
  for (const marker of [
    'turnstile_verification_failed',
    'validatePublishingIntakeBody',
    'validateManuscriptUploadCandidate',
    "{ status: 'duplicate' }",
  ]) {
    const index = route.indexOf(marker)
    assert.ok(index >= 0, `${marker} marker missing`)
    assert.ok(index < firstEnqueue, `${marker} must be before recovery queue use`)
  }
})

test('dead-letter messages are identifier-only and exclude intake payload fields', () => {
  assert.match(deadLetter, /schema: 'JM1_PUBLISHING_INTAKE_DEAD_LETTER_V1'/)
  assert.doesNotMatch(deadLetter, /payload: recoverablePayload/)
  assert.doesNotMatch(deadLetter, /turnstileToken: _turnstileToken/)
  for (const field of ['firstName', 'lastName', 'email', 'bookTitle', 'bookDescription', 'manuscriptUrl']) {
    assert.doesNotMatch(deadLetter, new RegExp(`${field}[?:]`), `${field} must not be part of dead-letter contract`)
    assert.doesNotMatch(deadLetter, new RegExp(`${field}: payload\\.`), `${field} must not be copied from intake payload`)
  }
})

test('dead-letter contract records retry, poison, correlation, operation, and safe deployment context', () => {
  for (const marker of [
    'correlationId',
    'failedOperationType',
    'failureClassification',
    'retryCount',
    'maxRetryCount',
    'sourceDeploymentSha',
    'safeErrorCode',
    'DEAD_LETTER_MAX_QUEUE_RETRIES = 5',
  ]) {
    assert.match(deadLetter, new RegExp(marker))
  }
})

test('replay policy is bounded, idempotent, and operation scoped', () => {
  assert.match(recovery, /retry_exhausted/)
  assert.match(recovery, /buildPublishingIntakeReplayKey/)
  assert.match(recovery, /message\.failedOperationType/)
  assert.match(recovery, /message\.dataverseRecordId \|\| 'pending-record'/)
  assert.doesNotMatch(recovery, /public submission/i)
})
