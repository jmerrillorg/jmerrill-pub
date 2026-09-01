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
const checksum = 'a'.repeat(64)

function project(overrides = {}) {
  return projectCanonicalPublisherLifecycle({
    author: 'Wave 5 Author',
    bookTitle: 'Wave 5 Title',
    titleId: 'title-wave5-current',
    legacySourceState: 'Line Editing',
    pipelineStage: 'Editorial',
    editorialStage: 'Line Editing',
    substage: 'Line Editing',
    canonicalAuthorityClassification: 'CANONICAL_CURRENT_TITLE',
    canonicalTitleReference: 'title-wave5-current',
    canonicalAuthorContactReference: 'contact-wave5',
    sourceAuthority: 'Wave 1 canonical authority fields',
    authorApproved: false,
    evidenceLinks: [{
      label: 'Line edit v2',
      href: 'sharepoint://drive/items/item-wave5-line-v2',
      artifactId: 'artifact-wave5-line-v2',
      publishingAssetId: 'asset-wave5',
      titleId: 'title-wave5-current',
      checksum,
      artifactType: 'LINE_EDIT',
      version: 'v2',
      current: true,
      stageCode: 'EDITORIAL_PRODUCTION',
      substageCode: 'LINE_EDITING',
    }],
    projectionAsOf: '2026-09-01T12:00:00Z',
    ...overrides,
  })
}

test('immutable title binding wins over filename match', () => {
  const projection = project({
    evidenceLinks: [{
      label: 'Wrong-title filename match',
      href: 'sharepoint://drive/items/item-other-title',
      artifactId: 'artifact-other-title',
      titleId: 'other-title',
      checksum,
      artifactType: 'LINE_EDIT',
      version: 'v1',
      current: true,
      stageCode: 'EDITORIAL_PRODUCTION',
    }],
  })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'AMBIGUOUS_TITLE_BINDING')
  assert.equal(projection.artifactTruth.artifactTitleBinding, 'AMBIGUOUS_TITLE_BINDING')
})

test('filename-only match is rejected', () => {
  const projection = project({
    evidenceLinks: [{
      label: 'Wave 5 Title line edit',
      href: 'Wave 5 Title - Line Edit.docx',
      checksum,
      artifactType: 'LINE_EDIT',
      version: 'v1',
      current: true,
    }],
  })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'AMBIGUOUS_TITLE_BINDING')
})

test('path-only match is rejected', () => {
  const projection = project({
    evidenceLinks: [{
      label: 'Stage folder file',
      href: '/Publishing/Wave 5 Title/Line Editing/current.docx',
      checksum,
      artifactType: 'LINE_EDIT',
      version: 'v1',
      current: true,
    }],
  })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'AMBIGUOUS_TITLE_BINDING')
})

test('newest timestamp does not automatically establish current version', () => {
  const projection = project({
    evidenceLinks: [{
      label: 'Newest line edit',
      href: 'sharepoint://drive/items/item-newest',
      artifactId: 'artifact-newest',
      titleId: 'title-wave5-current',
      checksum,
      artifactType: 'LINE_EDIT',
      version: 'modified-2026-09-01',
    }],
  })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'AMBIGUOUS_VERSION')
})

test('superseded artifact cannot become current', () => {
  const projection = project({
    evidenceLinks: [{
      label: 'Superseded line edit',
      href: 'sharepoint://drive/items/item-old',
      artifactId: 'artifact-old',
      titleId: 'title-wave5-current',
      checksum,
      artifactType: 'SUPERSEDED_LINE_EDIT',
      version: 'v1',
      current: true,
      stageCode: 'EDITORIAL_PRODUCTION',
    }],
  })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'LEGACY_ARTIFACT_ONLY')
})

test('duplicate-title artifact cannot override canonical title', () => {
  const projection = project({
    canonicalAuthorityClassification: 'DUPLICATE_RECORD',
  })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'LEGACY_ARTIFACT_ONLY')
  assert.equal(projection.artifactTruth.currentArtifactId, 'artifact-wave5-line-v2')
})

test('legacy artifact cannot become current operational artifact', () => {
  const projection = project({
    canonicalAuthorityClassification: 'LEGACY_TITLE_RECORD',
  })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'LEGACY_ARTIFACT_ONLY')
})

test('later-stage artifact cannot skip governed stage', () => {
  const projection = project({
    evidenceLinks: [{
      label: 'Proof exists',
      href: 'sharepoint://drive/items/item-proof',
      artifactId: 'artifact-proof',
      titleId: 'title-wave5-current',
      checksum,
      artifactType: 'PROOF',
      version: 'v1',
      current: true,
      stageCode: 'BOOK_PRODUCTION',
    }],
  })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'STAGE_INCOMPATIBLE_ARTIFACT')
  assert.equal(projection.artifactTruth.artifactStageCompatibility, 'STAGE_INCOMPATIBLE_ARTIFACT')
})

test('author approval binds to exact version', () => {
  const projection = project({
    authorApproved: true,
    authorDecisionEvidenceText: 'Author approved artifact-wave5-line-v2 v2',
    evidenceLinks: [{
      label: 'Line edit v2',
      href: 'sharepoint://drive/items/item-wave5-line-v2',
      artifactId: 'artifact-wave5-line-v2',
      titleId: 'title-wave5-current',
      checksum,
      artifactType: 'LINE_EDIT',
      version: 'v2',
      current: true,
      stageCode: 'EDITORIAL_PRODUCTION',
      approvalArtifactId: 'artifact-wave5-line-v2',
      approvalVersion: 'v2',
    }],
  })

  assert.equal(projection.artifactTruth.artifactApprovalStatus, 'APPROVAL_BOUND_TO_VERSION')
  assert.equal(projection.artifactTruth.artifactTrustClassification, 'TRUSTED_CURRENT_ARTIFACT')
})

test('approval of prior version does not approve replacement version', () => {
  const projection = project({
    authorApproved: true,
    authorDecisionEvidenceText: 'Author approved artifact-wave5-line-v1 v1',
    evidenceLinks: [{
      label: 'Line edit v2',
      href: 'sharepoint://drive/items/item-wave5-line-v2',
      artifactId: 'artifact-wave5-line-v2',
      titleId: 'title-wave5-current',
      checksum,
      artifactType: 'LINE_EDIT',
      version: 'v2',
      current: true,
      stageCode: 'EDITORIAL_PRODUCTION',
      approvalArtifactId: 'artifact-wave5-line-v1',
      approvalVersion: 'v1',
    }],
  })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'APPROVAL_VERSION_MISMATCH')
})

test('missing artifact produces explicit missing state', () => {
  const projection = project({ evidenceLinks: [] })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'NO_AUTHORITATIVE_ARTIFACT_FOUND')
  assert.equal(projection.artifactTruth.displayLabel, 'Authoritative artifact not found')
})

test('ambiguous version produces reconciliation state', () => {
  const projection = project({
    evidenceLinks: [
      {
        label: 'Line edit v1',
        href: 'sharepoint://drive/items/item-v1',
        artifactId: 'artifact-v1',
        titleId: 'title-wave5-current',
        checksum,
        artifactType: 'LINE_EDIT',
        version: 'v1',
        current: true,
      },
      {
        label: 'Line edit v2',
        href: 'sharepoint://drive/items/item-v2',
        artifactId: 'artifact-v2',
        titleId: 'title-wave5-current',
        checksum,
        artifactType: 'LINE_EDIT',
        version: 'v2',
        current: true,
      },
    ],
  })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'AMBIGUOUS_VERSION')
})

test('published legacy title may require no active artifact', () => {
  const projection = project({
    legacySourceState: 'Published catalog royalty review',
    commercialModel: 'GRANDFATHERED',
    evidenceLinks: [],
  })

  assert.equal(projection.artifactTruth.artifactTrustClassification, 'NO_CURRENT_ARTIFACT_REQUIRED')
})

test('replay is deterministic and projection performs no title or file mutation', () => {
  const first = project()
  const second = project()
  const serialized = JSON.stringify(first)

  assert.deepEqual(first, second)
  assert.equal(serialized.includes('PATCH'), false)
  assert.equal(serialized.includes('rename'), false)
  assert.equal(serialized.includes('delete'), false)
})
