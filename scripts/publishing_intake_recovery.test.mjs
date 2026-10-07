import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createJiti } from 'jiti'
import { NextRequest } from 'next/server.js'
const jiti = createJiti(import.meta.url, { alias: { '@': new URL('..', import.meta.url).pathname } })
const { classifyReceiptWork, recoverReceipt, retryDelay, validateReceiptRecoveryState } = await jiti.import('../lib/publishing/intake/receiptRecovery.ts')
const { intakeFingerprint, intakeRecordId } = await jiti.import('../lib/publishing/intake/receipt.ts')
const { validatePublishingIntakeBody, createNormalizedPublishingIntake } = await jiti.import('../lib/publishing/intake/schema.ts')
const { POST } = await jiti.import('../app/api/publishing/intake/recovery/route.ts')

function fixture() {
  return { schema: 'JMP_INTAKE_RECOVERY_V1', recordId: 'aaaaaaaa-aaaa-5aaa-aaaa-aaaaaaaaaaaa',
    reference: 'JMP-INT-202610-TEST01', fingerprint: 'a'.repeat(64),
    createdAt: new Date(Date.now() - 600_000).toISOString(), updatedAt: new Date().toISOString(),
    phase: 'CUSTODY', retryCount: 0, failedAt: new Date(Date.now() - 1000).toISOString(),
    failureCode: 'DEPENDENCY_UNAVAILABLE', intake: { idempotencyKey: 'fixture', reference: 'JMP-INT-202610-TEST01' },
    acceptedIntake: { reference: 'JMP-INT-202610-TEST01' } }
}
function adapters(state) {
  const effects = { alerts: [], finalizations: 0, notifications: 0, saves: 0, accepted: false }
  const deps = {
    exclusive: async (_id, run) => run(state, async () => { effects.saves++ }),
    alert: async (value, status) => { effects.alerts.push({ reference: value.reference, status }); return `provider-${status}` },
    canonical: async () => ({ status: 'found', recordId: state.recordId, fingerprint: state.fingerprint, reference: state.reference, accepted: effects.accepted }),
    finalize: async () => { effects.finalizations++; effects.accepted = true; return { status: 'success' } },
    upload: async () => assert.fail('Existing custody must not be uploaded again'),
    workspace: async () => assert.fail('Existing workspace must not be recreated'),
    notify: async () => { effects.notifications++; return { status: 'sent' } },
  }
  return { deps, effects }
}

test('pending work is not failure until overdue; completed receipt excludes pending acknowledgment', () => {
  const state = fixture(); delete state.failedAt
  state.createdAt = new Date().toISOString()
  assert.equal(classifyReceiptWork(state), 'LEGITIMATE_PENDING')
  state.createdAt = new Date(Date.now() - 600_000).toISOString()
  assert.equal(classifyReceiptWork(state), 'OVERDUE')
  state.phase = 'COMPLETED'
  assert.equal(classifyReceiptWork(state), 'COMPLETE')
})

test('actual held failure opens once; restored same receipt completes once and resolves once across replay', async () => {
  const state = fixture(); state.acceptanceHold = true
  const { deps, effects } = adapters(state)
  await recoverReceipt(state.recordId, deps)
  await recoverReceipt(state.recordId, deps)
  assert.equal(effects.alerts.length, 1)
  assert.equal(effects.finalizations, 0)
  state.acceptanceHold = false
  const completed = await recoverReceipt(state.recordId, deps)
  await recoverReceipt(state.recordId, deps)
  assert.equal(completed.phase, 'COMPLETED')
  assert.equal(completed.completion.recordId, state.recordId)
  assert.equal(effects.finalizations, 1)
  assert.equal(effects.notifications, 1)
  assert.deepEqual(effects.alerts.map(x => x.status), ['FAILED', 'RESOLVED'])
})

test('retry uses persistent backoff and stops after five failures', async () => {
  const state = fixture(); const { deps, effects } = adapters(state)
  deps.finalize = async () => { effects.finalizations++; throw new Error('DEPENDENCY_UNAVAILABLE') }
  for (let attempt = 1; attempt <= 5; attempt++) {
    delete state.nextAttemptAt
    await recoverReceipt(state.recordId, deps)
    assert.equal(state.retryCount, attempt)
    await recoverReceipt(state.recordId, deps)
    assert.equal(state.retryCount, attempt)
  }
  assert.equal(state.manualHold, 'DEPENDENCY_UNAVAILABLE')
  assert.equal(effects.finalizations, 5)
  assert.equal(effects.notifications, 0)
  assert.equal(effects.alerts.length, 1)
  assert.equal(retryDelay(1), 60_000)
  assert.equal(retryDelay(10), 1_800_000)
})

test('canonical mismatch holds without finalization, uploads or notifications', async () => {
  const state = fixture(); const { deps, effects } = adapters(state)
  deps.canonical = async () => ({ status: 'found', recordId: 'different', fingerprint: state.fingerprint })
  await recoverReceipt(state.recordId, deps)
  assert.equal(state.manualHold, 'CANONICAL_RECEIPT_IDENTITY_UNPROVEN')
  assert.equal(effects.finalizations, 0)
  assert.equal(effects.notifications, 0)
})

test('ambiguous notification is preserved, not sent again', async () => {
  const state = fixture(); const { deps, effects } = adapters(state)
  deps.notify = async () => { effects.notifications++; throw new Error('Timeout') }
  await recoverReceipt(state.recordId, deps)
  delete state.nextAttemptAt
  await recoverReceipt(state.recordId, deps)
  assert.equal(effects.notifications, 1)
  assert.equal(state.manualHold, 'MANUAL_NOTIFICATION_OUTCOME_AMBIGUOUS')
})

test('prior canonical acceptance never resends notifications after restart', async () => {
  const state = fixture(); const { deps, effects } = adapters(state); effects.accepted = true
  await recoverReceipt(state.recordId, deps)
  assert.equal(state.phase, 'COMPLETED')
  assert.equal(effects.finalizations, 0)
  assert.equal(effects.notifications, 0)
})

test('owner endpoint denies anonymous sweep, read and controlled fixture before effects', async () => {
  for (const operation of ['sweep', 'read', 'seed', 'restore']) {
    const response = await POST(new NextRequest('https://jmerrill.pub/api/publishing/intake/recovery', {
      method: 'POST', body: JSON.stringify({ operation }) }))
    assert.equal(response.status, 401)
  }
})

test('acceptance replay returns canonical state before regenerating timestamped fixture bytes', () => {
  const source = readFileSync(new URL('../app/api/publishing/intake/recovery/route.ts', import.meta.url), 'utf8')
  const seed = source.slice(source.indexOf('async function seedAcceptance'))
  assert.ok(seed.indexOf('findPublishingIntakeByIdempotencyKey(key)') < seed.indexOf('zipSync('))
  assert.ok(seed.indexOf('readReceiptRecovery(recordId)') < seed.indexOf('writePublishingIntakeWithRetry('))
  assert.match(seed, /existing\.recordId !== recordId/)
  assert.match(seed, /existing\.status !== 'not_found'/)
})

test('private journal roundtrip retains source authority and rejects altered identity or bytes', () => {
  const key = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
  const validated = validatePublishingIntakeBody({
    firstName: 'Internal', lastName: 'Fixture', email: 'jm1-admin@jmerrill.one',
    streetAddress: '1 Test Street', city: 'Test', stateProvince: 'VA', postalCode: '20000', country: 'United States',
    bookTitle: 'Synthetic recovery fixture', genre: 'Test', wordCount: 1000,
    workType: 'Full-length Book', manuscriptStatus: 'Complete', manuscriptSubmissionChoice: 'now',
    publishedBefore: 'First book', bookDescription: 'Harmless internal fixture for verifying intake receipt and recovery behavior.',
    consent: true, rightsAttestation: true, serviceCommunicationConsent: true, marketingConsent: false,
    turnstileToken: 'synthetic-only', idempotencyKey: key,
  })
  assert.equal(validated.ok, true)
  const state = fixture()
  state.recordId = intakeRecordId(key)
  state.intake = { ...createNormalizedPublishingIntake(validated.data, state.reference), turnstileToken: '' }
  state.acceptedIntake = { ...state.intake, workspaceFolderId: 'synthetic-workspace', manuscriptUrl: 'https://fixture.invalid/source', manuscriptReceived: true }
  state.fingerprint = intakeFingerprint(validated.data)
  assert.equal(validateReceiptRecoveryState(JSON.parse(JSON.stringify(state))).recordId, state.recordId)
  const altered = JSON.parse(JSON.stringify(state)); altered.intake.email = 'other@example.invalid'
  assert.throws(() => validateReceiptRecoveryState(altered), /SOURCE_AUTHORITY_MISMATCH/)
  const different = JSON.parse(JSON.stringify(state)); different.acceptedIntake.email = 'other@example.invalid'
  assert.throws(() => validateReceiptRecoveryState(different), /CUSTODY_IDENTITY_MISMATCH/)
})
