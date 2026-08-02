import assert from 'node:assert/strict'
import test from 'node:test'

const { evaluateExecutiveRecoveryBlockers } = await import('../lib/server/executive-recovery-policy.ts')

test('owner-authored title resolves recipient discovery without creating a new Contact', () => {
  const decision = evaluateExecutiveRecoveryBlockers({
    titleName: 'The Long Watch',
    authorName: 'Jackie Smith Jr.',
    ownerName: 'Jackie Smith Jr.',
    canonicalContactId: 'd38aa56a-882a-f111-88b4-6045bdd69678',
    recipientEmail: 'chosen2k7@gmail.com',
    ownerAuthoredTitle: true,
    blockers: ['RECIPIENT_DISCOVERY_REQUIRED'],
  })

  assert.deepEqual(decision.activeRules, ['OWNER_AUTHORED_TITLE'])
  assert.deepEqual(decision.removedBlockers, ['RECIPIENT_DISCOVERY_REQUIRED'])
  assert.deepEqual(decision.remainingBlockers, [])
  assert.equal(decision.canProceedToPackageCompletion, true)
})

test('internal verification title does not require owner-to-company contract mechanics', () => {
  const decision = evaluateExecutiveRecoveryBlockers({
    titleName: 'Establishing Glory: The Library',
    authorName: 'Jackie Smith Jr.',
    ownerName: 'Jackie Smith Jr.',
    canonicalContactId: 'd38aa56a-882a-f111-88b4-6045bdd69678',
    recipientEmail: 'chosen2k7@gmail.com',
    ownerAuthoredTitle: true,
    internalVerificationTitle: true,
    blockers: ['RECIPIENT_DISCOVERY_REQUIRED', 'CONTRACT_PREREQUISITE_MISSING'],
  })

  assert.deepEqual(decision.activeRules, ['OWNER_AUTHORED_TITLE', 'INTERNAL_VERIFICATION_TITLE'])
  assert.deepEqual(decision.removedBlockers, ['RECIPIENT_DISCOVERY_REQUIRED', 'CONTRACT_PREREQUISITE_MISSING'])
  assert.equal(decision.canProceedToPackageCompletion, true)
})

test('approved disclaimer clears obsolete legal blocker unless a separate legal restriction exists', () => {
  const cleared = evaluateExecutiveRecoveryBlockers({
    titleName: "The General's Will and Last Testament",
    authorName: 'Iyorwuese Hagher',
    approvedDisclaimerPresent: true,
    blockers: ['LEGAL_DISCLAIMER_REQUIRED'],
  })

  assert.deepEqual(cleared.activeRules, ['APPROVED_DISCLAIMER_PRESENT'])
  assert.deepEqual(cleared.remainingBlockers, [])

  const held = evaluateExecutiveRecoveryBlockers({
    titleName: "The General's Will and Last Testament",
    authorName: 'Iyorwuese Hagher',
    approvedDisclaimerPresent: true,
    documentedLegalRestriction: true,
    blockers: ['LEGAL_DISCLAIMER_REQUIRED', 'LEGAL_RESTRICTION_DOCUMENTED'],
  })

  assert.deepEqual(held.activeRules, [])
  assert.deepEqual(held.remainingBlockers, ['LEGAL_DISCLAIMER_REQUIRED', 'LEGAL_RESTRICTION_DOCUMENTED'])
})

test('executive recovery supersedes obsolete internal cadence holds only', () => {
  const decision = evaluateExecutiveRecoveryBlockers({
    titleName: 'Before You Were Born',
    authorName: 'Sean Crowley',
    executiveRecoveryAuthorized: true,
    blockers: ['INTERNAL_CADENCE_HOLD', 'DELIVERY_CREDENTIAL_MISSING'],
  })

  assert.deepEqual(decision.activeRules, ['EXECUTIVE_RECOVERY'])
  assert.deepEqual(decision.removedBlockers, ['INTERNAL_CADENCE_HOLD'])
  assert.deepEqual(decision.remainingBlockers, ['DELIVERY_CREDENTIAL_MISSING'])
  assert.equal(decision.canProceedToPackageCompletion, false)
})
