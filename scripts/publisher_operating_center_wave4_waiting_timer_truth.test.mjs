#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, symlinkSync, unlinkSync } from 'node:fs'
import { dirname } from 'node:path'
import test, { after } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const shims = [
  ['../lib/publishing/lifecycle/registry', 'registry.ts'],
  ['../lib/publishing/lifecycle/legacy-mapping', 'legacy-mapping.ts'],
  ['../lib/publishing/lifecycle/wave-c1-evidence-authority', 'wave-c1-evidence-authority.ts'],
  ['../lib/publishing/lifecycle/operating-center-read-model', 'operating-center-read-model.ts'],
]
const created = []
for (const [shimPath, target] of shims) {
  const shim = new URL(shimPath, import.meta.url)
  if (!existsSync(shim)) {
    try {
      symlinkSync(target, shim)
      created.push(shim)
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
    }
  }
}
after(() => {
  for (const shim of created) unlinkSync(shim)
})

const { projectCanonicalPublisherLifecycle } = await import('../lib/publishing/lifecycle/operating-center-read-model.ts')
const checksum = 'f'.repeat(64)

function project(overrides = {}) {
  return projectCanonicalPublisherLifecycle({
    author: 'Wave 4 Author',
    bookTitle: 'Wave 4 Title',
    titleId: 'title-wave4-current',
    legacySourceState: 'Line Editing',
    pipelineStage: 'Editorial',
    editorialStage: 'Line Editing',
    canonicalAuthorityClassification: 'CANONICAL_CURRENT_TITLE',
    canonicalTitleReference: 'title-wave4-current',
    canonicalAuthorContactReference: 'contact-wave4',
    sourceAuthority: 'Wave 1 canonical authority fields',
    evidenceLinks: [{ label: 'Approved developmental artifact', href: 'sharepoint://wave4/approved-developmental.docx', checksum, artifactType: 'APPROVED_DEVELOPMENTAL_ARTIFACT', current: true }],
    authorApproved: true,
    projectionAsOf: '2026-09-01T12:00:00Z',
    ...overrides,
  })
}

test('author approval request derives author waiting and trusted timer from delivery event', () => {
  const projection = project({
    legacySourceState: 'Book Production',
    authorApproved: false,
    waitingStartedAt: '2026-08-30T12:00:00Z',
    waitingStartEvent: 'AUTHOR_REVIEW_PACKAGE_DELIVERED',
    waitingStartEventId: 'evt-author-review',
    waitingStartEvidence: 'ACS delivery accepted for author review package',
  })

  assert.equal(projection.waitingTruth.waitingOn, 'Author')
  assert.equal(projection.waitingTruth.waitingReason, 'AUTHOR_EDITORIAL_APPROVAL')
  assert.equal(projection.waitingTruth.waitingTrustClassification, 'TRUSTED_WAITING_ON')
  assert.equal(projection.waitingTruth.timerTrustClassification, 'TRUSTED_TIMER')
  assert.equal(projection.waitingTruth.elapsedDays, 2)
})

test('missing timestamp never falls back to raw ageDays', () => {
  const projection = project({
    legacySourceState: 'Book Production',
    authorApproved: false,
    nextAction: 'Await author review response',
    owner: 'Author',
    ageDays: 381,
  })

  assert.equal(projection.waitingTruth.waitingOn, 'Author')
  assert.equal(projection.waitingTruth.timerTrustClassification, 'INSUFFICIENT_TIMESTAMP_EVIDENCE')
  assert.equal(projection.waitingTruth.elapsedDays, null)
  assert.equal(projection.age, 'Timing evidence unavailable')
})

test('author changes re-anchor responsibility to editor', () => {
  const projection = project({
    changesRequested: true,
    waitingStartedAt: '2026-08-31T12:00:00Z',
    waitingStartEvent: 'AUTHOR_CHANGES_REQUESTED',
    waitingStartEventId: 'evt-changes',
  })

  assert.equal(projection.waitingTruth.waitingOn, 'Editor')
  assert.equal(projection.waitingTruth.waitingReason, 'AUTHOR_CHANGES_REQUESTED')
  assert.equal(projection.waitingTruth.timerTrustClassification, 'TRUSTED_TIMER')
  assert.equal(projection.waitingTruth.elapsedDays, 1)
})

test('author approval ends prior waiting condition', () => {
  const projection = project({
    legacySourceState: 'Line Editing',
    authorApproved: true,
    waitingStartedAt: '2026-08-20T12:00:00Z',
    waitingStartEvent: 'OLD_AUTHOR_REVIEW_DELIVERED',
  })

  assert.equal(projection.waitingTruth.waitingOn, 'Not Waiting')
  assert.equal(projection.waitingTruth.timerTrustClassification, 'NO_ACTIVE_TIMER')
  assert.equal(projection.waitingTruth.elapsedDays, null)
})

test('contract waiting derives from agreement execution transition', () => {
  const projection = project({
    legacySourceState: 'Joined the Family',
    packageState: 'PACKAGE_SELECTED',
    commercialModel: 'CURRENT_MODEL',
    firstPaymentStatus: 'Paid Confirmed',
    firstPaymentConfirmedOn: '2026-08-24T13:55:39Z',
    firstPaymentConfirmationSource: 'Stripe',
  })

  assert.equal(projection.waitingTruth.waitingOn, 'Contract')
  assert.equal(projection.waitingTruth.waitingReason, 'CONTRACT_EXECUTION_REQUIRED')
})

test('payment waiting derives from initial payment transition', () => {
  const projection = project({
    legacySourceState: 'Joined the Family',
    packageState: 'PACKAGE_SELECTED',
    commercialModel: 'CURRENT_MODEL',
    contractStatus: 'Signed',
  })

  assert.equal(projection.waitingTruth.waitingOn, 'Payment')
  assert.equal(projection.waitingTruth.waitingReason, 'INITIAL_PAYMENT_REQUIRED')
})

test('editorial work and publisher review can be trusted only from explicit action evidence', () => {
  const editorial = project({
    nextAction: 'Queue line editing work',
    owner: 'JM1 Automation',
    awaiting: 'editorial worker',
    waitingStartedAt: '2026-09-01T00:00:00Z',
    waitingStartEvent: 'LINE_EDITING_AUTHORIZED',
  })
  const publisher = project({
    nextAction: 'Publisher review required',
    owner: 'Publisher',
    awaiting: 'Jackie',
    waitingStartedAt: '2026-09-01T00:00:00Z',
    waitingStartEvent: 'PUBLISHER_REVIEW_REQUIRED',
  })

  assert.equal(editorial.waitingTruth.waitingOn, 'JMP/System')
  assert.equal(editorial.waitingTruth.waitingReason, 'EDITORIAL_WORK_IN_PROGRESS')
  assert.equal(publisher.waitingTruth.waitingOn, 'JMP')
  assert.equal(publisher.waitingTruth.waitingReason, 'PUBLISHER_REVIEW_REQUIRED')
})

test('external vendor waiting is distinct from system attention', () => {
  const projection = project({
    nextAction: 'External vendor distribution update',
    owner: 'External',
    awaiting: 'Distributor',
    waitingStartedAt: '2026-08-29T12:00:00Z',
    waitingStartEvent: 'VENDOR_REQUEST_SUBMITTED',
  })

  assert.equal(projection.waitingTruth.waitingOn, 'External')
  assert.equal(projection.waitingTruth.waitingReason, 'EXTERNAL_VENDOR_ACTION')
})

test('hold suppresses active wait timer without fabricating elapsed age', () => {
  const projection = project({
    holdRequested: true,
    exactBlocker: 'Author hold requested',
    waitingStartedAt: '2026-08-20T12:00:00Z',
    waitingStartEvent: 'AUTHOR_HOLD_REQUESTED',
  })

  assert.equal(projection.waitingTruth.waitingReason, 'GOVERNED_HOLD')
  assert.equal(projection.waitingTruth.timerTrustClassification, 'NO_ACTIVE_TIMER')
  assert.equal(projection.waitingTruth.activeTimer, 'NO')
})

test('resume establishes a new authoritative timer when evidence is supplied', () => {
  const projection = project({
    nextAction: 'Queue line editing work',
    owner: 'JM1 Automation',
    awaiting: 'editorial worker',
    waitingStartedAt: '2026-09-01T06:00:00Z',
    waitingStartEvent: 'RESUME_AUTHORIZED',
    holdStartedAt: '2026-08-20T12:00:00Z',
    holdEndedAt: '2026-09-01T06:00:00Z',
  })

  assert.equal(projection.waitingTruth.timerTrustClassification, 'TRUSTED_TIMER')
  assert.equal(projection.waitingTruth.elapsedDays, 0)
})

test('legacy completed title has no active waiting timer', () => {
  const projection = project({
    legacySourceState: 'Published catalog royalty review',
    commercialModel: 'GRANDFATHERED',
    evidenceLinks: [],
    ageDays: 120,
  })

  assert.equal(projection.waitingTruth.waitingOn, 'Not Waiting')
  assert.equal(projection.waitingTruth.waitingTrustClassification, 'NOT_WAITING')
  assert.equal(projection.waitingTruth.timerTrustClassification, 'NO_ACTIVE_TIMER')
})

test('unresolved authority gets reconciliation-required without false party assignment', () => {
  const projection = project({
    canonicalAuthorityClassification: 'REQUIRES_RECONCILIATION',
    owner: 'Author',
    awaiting: 'author',
    ageDays: 77,
  })

  assert.equal(projection.waitingTruth.waitingOn, 'Reconciliation Required')
  assert.equal(projection.waitingTruth.waitingTrustClassification, 'RECONCILIATION_REQUIRED')
  assert.equal(projection.waitingTruth.timerTrustClassification, 'RECONCILIATION_REQUIRED')
})

test('duplicate source cannot override waiting state', () => {
  const projection = project({
    canonicalAuthorityClassification: 'DUPLICATE_RECORD',
    owner: 'Author',
    awaiting: 'author',
    nextAction: 'Author review',
    ageDays: 44,
  })

  assert.equal(projection.waitingTruth.waitingOn, 'Not Waiting')
  assert.equal(projection.waitingTruth.timerTrustClassification, 'NO_ACTIVE_TIMER')
})

test('projection is deterministic and performs no title-record mutation', () => {
  const first = project({
    legacySourceState: 'Book Production',
    authorApproved: false,
    waitingStartedAt: '2026-08-30T12:00:00Z',
    waitingStartEvent: 'AUTHOR_REVIEW_PACKAGE_DELIVERED',
  })
  const second = project({
    legacySourceState: 'Book Production',
    authorApproved: false,
    waitingStartedAt: '2026-08-30T12:00:00Z',
    waitingStartEvent: 'AUTHOR_REVIEW_PACKAGE_DELIVERED',
  })
  const serialized = JSON.stringify(first)

  assert.deepEqual(first, second)
  assert.equal(serialized.includes('PATCH'), false)
  assert.equal(serialized.includes('dataverseUpdate'), false)
})
