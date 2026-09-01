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

const checksum = 'e'.repeat(64)

function project(overrides = {}) {
  return projectCanonicalPublisherLifecycle({
    author: 'Wave 3 Author',
    bookTitle: 'Wave 3 Title',
    titleId: 'title-wave3-current',
    legacySourceState: 'Line Editing',
    pipelineStage: 'Editorial',
    editorialStage: 'Line Editing',
    canonicalAuthorityClassification: 'CANONICAL_CURRENT_TITLE',
    canonicalTitleReference: 'title-wave3-current',
    canonicalAuthorContactReference: 'contact-wave3',
    sourceAuthority: 'Wave 1 canonical authority fields',
    evidenceLinks: [{
      label: 'Approved developmental artifact',
      href: 'sharepoint://drive/items/wave3-approved-developmental',
      artifactId: 'wave3-approved-developmental',
      titleId: 'title-wave3-current',
      checksum,
      artifactType: 'APPROVED_DEVELOPMENTAL_ARTIFACT',
      version: 'v1',
      current: true,
      stageCode: 'EDITORIAL_PRODUCTION',
    }],
    authorApproved: true,
    ...overrides,
  })
}

test('commercial gate blocks current-model advancement without package acceptance', () => {
  const projection = project({
    legacySourceState: 'J4 Onboarding',
    packageState: '',
    commercialModel: 'CURRENT_MODEL',
  })

  assert.equal(projection.stageTruth.trustClassification, 'COMMERCIAL_GATE_BLOCKED')
  assert.equal(projection.stageTruth.blockingTransition, 'PACKAGE_ACCEPTED')
  assert.equal(projection.titleLifecycleStage.code, 'EDITORIAL_REVIEW_RECOMMENDATION')
})

test('executed agreement requirement is enforced where Joined the Family is claimed', () => {
  const projection = project({
    legacySourceState: 'Joined the Family',
    packageState: 'PACKAGE_SELECTED',
    commercialModel: 'CURRENT_MODEL',
    paymentEvidenceText: 'Paid Confirmed',
    firstPaymentStatus: 'Paid Confirmed',
    firstPaymentConfirmedOn: '2026-08-24T13:55:39Z',
    firstPaymentConfirmationSource: 'Stripe',
  })

  assert.equal(projection.stageTruth.trustClassification, 'COMMERCIAL_GATE_BLOCKED')
  assert.equal(projection.stageTruth.blockingTransition, 'AGREEMENT_EXECUTED')
  assert.equal(projection.titleLifecycleStage.code, 'COMMERCIAL_ACTIVATION')
})

test('payment requirement is enforced where applicable', () => {
  const projection = project({
    legacySourceState: 'Joined the Family',
    packageState: 'PACKAGE_SELECTED',
    commercialModel: 'CURRENT_MODEL',
    contractStatus: 'Signed',
  })

  assert.equal(projection.stageTruth.trustClassification, 'COMMERCIAL_GATE_BLOCKED')
  assert.equal(projection.stageTruth.blockingTransition, 'INITIAL_PAYMENT_RECEIVED')
})

test('grandfathered project is not falsely blocked by modern commercial gate', () => {
  const projection = project({
    legacySourceState: 'Published catalog royalty review',
    commercialModel: 'GRANDFATHERED',
    evidenceLinks: [],
  })

  assert.equal(projection.stageTruth.trustClassification, 'LEGACY_GOVERNED_EXCEPTION')
  assert.equal(projection.titleLifecycleStage.code, 'POST_PUBLICATION')
})

test('artifact existence alone does not advance into Line Editing', () => {
  const projection = project({
    evidenceLinks: [{ label: 'Line artifact', href: 'sharepoint://drive/items/wave3-line', artifactId: 'wave3-line', titleId: 'title-wave3-current', checksum, artifactType: 'LINE_ARTIFACT', version: 'v1', current: true, stageCode: 'EDITORIAL_PRODUCTION' }],
    authorApproved: false,
    transitionAuthorized: false,
  })

  assert.equal(projection.stageTruth.trustClassification, 'EDITORIAL_GATE_BLOCKED')
  assert.equal(projection.stageTruth.blockingTransition, 'PRIOR_AUTHOR_GATE_RESOLVED')
  assert.equal(projection.titleLifecycleSubstage.code, 'DEVELOPMENTAL_AUTHOR_REVIEW')
})

test('author authentication alone does not approve', () => {
  const projection = project({
    evidenceLinks: [{ label: 'Developmental artifact', href: 'sharepoint://drive/items/wave3-developmental', artifactId: 'wave3-developmental', titleId: 'title-wave3-current', checksum, artifactType: 'DEVELOPMENTAL_ARTIFACT', version: 'v1', current: true, stageCode: 'EDITORIAL_PRODUCTION' }],
    authorApproved: false,
    transitionAuthorized: false,
    authorAuthenticationEvidenceText: 'Author authenticated in portal',
  })

  assert.equal(projection.stageTruth.blockingTransition, 'AUTHOR_APPROVAL_NOT_AUTHENTICATION')
  assert.equal(projection.stageTruth.trustClassification, 'EDITORIAL_GATE_BLOCKED')
})

test('requested changes prevent inappropriate advancement', () => {
  const projection = project({
    changesRequested: true,
    authorApproved: true,
  })

  assert.equal(projection.stageTruth.blockingTransition, 'AUTHOR_CHANGES_REQUESTED')
  assert.equal(projection.titleLifecycleSubstage.code, 'DEVELOPMENTAL_AUTHOR_REVIEW')
})

test('prior editorial stage prerequisite is enforced for Copyediting', () => {
  const projection = project({
    legacySourceState: 'Copyediting',
    editorialStage: 'Copyediting',
    evidenceLinks: [{ label: 'Copy artifact', href: 'sharepoint://drive/items/wave3-copy', artifactId: 'wave3-copy', titleId: 'title-wave3-current', checksum, artifactType: 'COPY_ARTIFACT', version: 'v1', current: true, stageCode: 'EDITORIAL_PRODUCTION' }],
    authorApproved: false,
    transitionAuthorized: false,
  })

  assert.equal(projection.stageTruth.trustClassification, 'EDITORIAL_GATE_BLOCKED')
  assert.equal(projection.stageTruth.blockingTransition, 'PRIOR_AUTHOR_GATE_RESOLVED')
  assert.equal(projection.titleLifecycleSubstage.code, 'LINE_AUTHOR_REVIEW')
})

test('later-stage artifact cannot skip earlier transition', () => {
  const projection = project({
    legacySourceState: 'Proofreading',
    editorialStage: 'Proofreading',
    evidenceLinks: [{ label: 'Proof artifact', href: 'sharepoint://drive/items/wave3-proof', artifactId: 'wave3-proof', titleId: 'title-wave3-current', checksum, artifactType: 'PROOF_ARTIFACT', version: 'v1', current: true, stageCode: 'BOOK_PRODUCTION' }],
    authorApproved: false,
  })

  assert.equal(projection.stageTruth.trustClassification, 'EDITORIAL_GATE_BLOCKED')
  assert.equal(projection.titleLifecycleStage.code, 'BOOK_PRODUCTION')
  assert.equal(projection.titleLifecycleSubstage.code, 'DATA_GAP')
})

test('canonical authority remains required and unresolved authority fails closed', () => {
  const duplicate = project({ canonicalAuthorityClassification: 'DUPLICATE_RECORD' })
  const unresolved = project({ canonicalAuthorityClassification: 'REQUIRES_RECONCILIATION' })

  assert.equal(duplicate.titleLifecycleStage.code, 'DATA_GAP')
  assert.equal(duplicate.stageTruth.trustClassification, 'INSUFFICIENT_TRANSITION_EVIDENCE')
  assert.equal(unresolved.stageTruth.trustClassification, 'RECONCILIATION_REQUIRED')
})

test('replay is deterministic and projection performs no title-record mutation', () => {
  const first = project()
  const second = project()
  const serialized = JSON.stringify(first)

  assert.deepEqual(first, second)
  assert.equal(serialized.includes('PATCH'), false)
  assert.equal(serialized.includes('dataverseUpdate'), false)
})
