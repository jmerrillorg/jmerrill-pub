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

function project(overrides = {}) {
  return projectCanonicalPublisherLifecycle({
    author: 'Wave 2 Author',
    bookTitle: 'Wave 2 Title',
    titleId: 'title-wave2-current',
    legacySourceState: 'Line Editing',
    pipelineStage: 'Editorial',
    editorialStage: 'Line Editing - In Progress',
    owner: 'JM1 Automation',
    nextAction: 'Complete line edit',
    canonicalAuthorityClassification: 'CANONICAL_CURRENT_TITLE',
    canonicalTitleReference: 'title-wave2-current',
    canonicalAuthorContactReference: 'contact-wave2',
    sourceAuthority: 'Wave 1 canonical authority fields',
    ...overrides,
  })
}

test('canonical record projects normally from Wave 1 authority fields', () => {
  const projection = project()

  assert.equal(projection.canonicalAuthority.classification, 'CANONICAL_CURRENT_TITLE')
  assert.equal(projection.canonicalAuthority.isCurrentOperationalAuthority, true)
  assert.equal(projection.canonicalAuthority.currentAuthorityRelationship, 'CURRENT_OPERATIONAL_AUTHORITY')
  assert.equal(projection.titleLifecycleStage.code, 'EDITORIAL_PRODUCTION')
  assert.equal(projection.titleLifecycleSubstage.code, 'LINE_EDITING')
  assert.equal(projection.nextGovernedAction.confidence, 'CONFIRMED')
})

test('duplicate record cannot override canonical current authority', () => {
  const projection = project({
    titleId: 'duplicate-title',
    canonicalAuthorityClassification: 'DUPLICATE_RECORD',
    legacySourceState: 'Published catalog live',
    pipelineStage: 'Published',
    evidenceLinks: [{ label: 'Legacy published artifact', href: 'sharepoint://duplicate/published.pdf', current: true }],
  })

  assert.equal(projection.canonicalAuthority.isCurrentOperationalAuthority, false)
  assert.equal(projection.canonicalAuthority.currentAuthorityRelationship, 'NONCURRENT_REFERENCE_ONLY')
  assert.equal(projection.titleLifecycleStage.code, 'DATA_GAP')
  assert.equal(projection.systemAttention.code, 'NONE')
  assert.equal(projection.nextGovernedAction.confidence, 'CONFIRMED')
})

test('legacy record cannot establish current lifecycle authority', () => {
  const projection = project({
    titleId: 'legacy-title',
    canonicalAuthorityClassification: 'LEGACY_TITLE_RECORD',
    legacySourceState: 'Production Ready',
    pipelineStage: 'Production',
  })

  assert.equal(projection.canonicalAuthority.isCurrentOperationalAuthority, false)
  assert.equal(projection.titleLifecycleStage.code, 'DATA_GAP')
  assert.equal(projection.canonicalAuthority.lastProvenTransition, 'RECONCILIATION_REQUIRED')
})

test('many-to-one duplicate group resolves deterministically by suppressing member authority', () => {
  const firstReplay = project({
    titleId: 'duplicate-member-a',
    canonicalAuthorityClassification: 'DUPLICATE_RECORD',
    canonicalTitleReference: 'NOT_DETERMINED_BY_WAVE1',
  })
  const secondReplay = project({
    titleId: 'duplicate-member-a',
    canonicalAuthorityClassification: 'DUPLICATE_RECORD',
    canonicalTitleReference: 'NOT_DETERMINED_BY_WAVE1',
  })

  assert.deepEqual(firstReplay.canonicalAuthority, secondReplay.canonicalAuthority)
  assert.equal(firstReplay.canonicalAuthority.currentAuthorityRelationship, 'NONCURRENT_REFERENCE_ONLY')
})

test('unresolved authority returns reconciliation-required behavior', () => {
  const projection = project({
    titleId: 'unresolved-title',
    canonicalAuthorityClassification: 'REQUIRES_RECONCILIATION',
    legacySourceState: 'Editorial Review',
  })

  assert.equal(projection.canonicalAuthority.requiresReconciliation, true)
  assert.equal(projection.systemAttention.code, 'RECONCILIATION_REQUIRED')
  assert.equal(projection.nextGovernedAction.action, 'Reconcile canonical title authority before projecting current lifecycle movement')
})

test('projected state cannot exceed proven transition authority', () => {
  const projection = project({
    canonicalAuthorityClassification: 'PLACEHOLDER',
    legacySourceState: 'Post publication royalty review',
    pipelineStage: 'Published',
  })

  assert.equal(projection.canonicalAuthority.lastProvenGovernedStage, 'DATA_GAP')
  assert.equal(projection.titleLifecycleStage.code, 'DATA_GAP')
})

test('artifact existence alone cannot advance stage for noncurrent authority', () => {
  const projection = project({
    canonicalAuthorityClassification: 'DUPLICATE_RECORD',
    legacySourceState: 'Proofreading - Author Review',
    evidenceLinks: [{
      label: 'Author proof package',
      href: 'sharepoint://proof-package.pdf',
      checksum: 'abc123',
      artifactType: 'PROOFREADING_PACKAGE',
      current: true,
    }],
  })

  assert.equal(projection.sourceArtifact.artifactType, 'PROOFREADING_PACKAGE')
  assert.equal(projection.titleLifecycleStage.code, 'DATA_GAP')
  assert.equal(projection.systemAttention.code, 'NONE')
})

test('stale legacy status cannot advance stage', () => {
  const projection = project({
    canonicalAuthorityClassification: 'HISTORICAL_VERSION',
    legacySourceState: 'Distribution Release - live',
    pipelineStage: 'Distribution',
  })

  assert.equal(projection.canonicalAuthority.currentAuthorityRelationship, 'NONCURRENT_REFERENCE_ONLY')
  assert.equal(projection.titleLifecycleStage.code, 'DATA_GAP')
})

test('replay produces identical projection', () => {
  const input = {
    titleId: 'title-replay',
    canonicalAuthorityClassification: 'CANONICAL_PUBLISHED_TITLE',
    legacySourceState: 'Published catalog royalty review',
    pipelineStage: 'Published',
  }

  assert.deepEqual(project(input), project(input))
})

test('projection does not expose lifecycle data mutation authority', () => {
  const projection = project()
  const serialized = JSON.stringify(projection)

  assert.equal(serialized.includes('dataversePatch'), false)
  assert.equal(serialized.includes('jm1pub_stage='), false)
  assert.equal(projection.canonicalAuthority.transitionAuthority.includes('Wave 1 canonical authority fields'), true)
})
