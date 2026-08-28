import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  FOUNDER_DECISIONS,
  buildClosure,
  operationalState,
  renderDocs,
  writeEvidencePackage,
} from './stripe_connect_founder_decisions_postmerge_closure.mjs'

const profileId = '11111111-1111-1111-1111-111111111111'
const contactId = '22222222-2222-2222-2222-222222222222'

function fixture() {
  return buildClosure({
    founderReadback: {
      verifiedAt: '2026-08-28T12:00:00.000Z',
      mode: 'dry-run',
      production: { statusCode: 200, status: 'ready', release: 'release-a' },
      after: {
        active: 2,
        setupComplete: 1,
        completionPercentage: '50.00%',
        missingCanonicalEmail: 0,
        identityReview: 0,
        emailReview: 0,
        unknown: 0,
        duplicateAccountGroups: 0,
        stateCounts: { SETUP_COMPLETE: 1, SUPPORT_REQUIRED: 1 },
        rows: [
          {
            author: 'Daphanny Baker',
            authorProfileId: profileId,
            contactId,
            emailPresent: true,
            emailHash: 'hash-email',
            stripeAccountId: 'acct_redacted',
            stripeAccountHash: 'hash-account',
            state: 'MORE_INFORMATION_NEEDED',
            requirementsDue: 12,
            supportState: 'NONE',
            validDay0At: '2026-08-27T16:55:46Z',
          },
          {
            author: 'Support Complete',
            authorProfileId: '33333333-3333-3333-3333-333333333333',
            contactId: '44444444-4444-4444-4444-444444444444',
            emailPresent: true,
            state: 'SETUP_COMPLETE',
            supportState: 'SUPPORT_REQUIRED',
          },
        ],
      },
      titleReadback: [
        {
          title: 'The Messenger 2',
          expectedAuthor: 'Daphanny Baker',
          currentAuthor: 'Daphanny Baker',
          dataverse: 'PASS',
          publicCatalog: 'PASS',
          wrongRelationshipPresent: false,
        },
      ],
      emailAuthority: { activeAuthorsWithCanonicalEmail: 2, missing: 0, drift: 0 },
      negativeProof: { payment_executed: 0 },
    },
    reminderSummary: {
      classification: 'STRIPE_CONNECT_REMINDER_CADENCE_CONTROLLED',
      verifiedAt: '2026-08-28T12:01:00.000Z',
      release: 'release-a',
      health: 'ready',
      Stripe_readback: 'PASS',
      ACS: 'ready',
      day0: { correctedAnchors: 1, missing: 0, duplicate: 0, oldAnchorsActive: 0 },
      currentEstate: { active: 2, SETUP_COMPLETE: 1, MORE_INFORMATION_NEEDED: 1 },
      firstWave: { evaluated: 2, day3Eligible: 0, sent: 0, failed: 0 },
    },
    pr683: {
      number: 683,
      title: 'JMP: Apply Stripe Connect founder identity decisions',
      state: 'MERGED',
      isDraft: false,
      baseRefName: 'main',
      headRefOid: 'head-sha',
      mergedAt: '2026-08-28T08:16:26Z',
      mergeCommit: { oid: 'merge-sha' },
      url: 'https://github.com/jmerrillorg/jmerrill-pub/pull/683',
      files: [{ path: 'scripts/stripe_connect_founder_identity_decisions.mjs', changeType: 'ADDED' }],
    },
    health: { statusCode: 200, status: 'ready', release: 'release-a', ready: true },
  })
}

test('founder decision set stays fourteen authors', () => {
  assert.equal(FOUNDER_DECISIONS.length, 14)
})

test('support state takes operational precedence over setup complete state', () => {
  assert.equal(operationalState({ state: 'SETUP_COMPLETE', supportState: 'SUPPORT_REQUIRED' }), 'SUPPORT_REQUIRED')
  const result = fixture()
  assert.deepEqual(result.estate.rowStateCounts, { MORE_INFORMATION_NEEDED: 1, SETUP_COMPLETE: 1 })
  assert.deepEqual(result.estate.operationalStateCounts, { MORE_INFORMATION_NEEDED: 1, SUPPORT_REQUIRED: 1 })
})

test('renders required closure package documents and checksums', () => {
  const result = fixture()
  const docs = renderDocs(result)
  assert.equal(Object.keys(docs).length, 13)
  assert.match(docs['00-executive-summary.md'], /PR #683/)
  assert.match(docs['03-daphanny-account-readback.md'], /firstladydbaker@hotmail.com/)

  const dir = mkdtempSync(join(tmpdir(), 'stripe-connect-closure-'))
  try {
    writeEvidencePackage(result, dir)
    const checksums = readFileSync(join(dir, 'checksums.sha256'), 'utf8')
    assert.match(checksums, /00-executive-summary\.md/)
    assert.match(checksums, /12-negative-proof\.md/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
