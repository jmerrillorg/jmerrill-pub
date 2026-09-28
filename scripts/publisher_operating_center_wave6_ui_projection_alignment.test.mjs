#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, readFileSync, symlinkSync, unlinkSync } from 'node:fs'
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
    symlinkSync(target, shim)
    created.push(shim)
  }
}
after(() => {
  for (const shim of created) unlinkSync(shim)
})

const { projectCanonicalPublisherLifecycle } = await import('../lib/publishing/lifecycle/operating-center-read-model.ts')

const server = readFileSync(`${root}/lib/server/publisher-operating-center.ts`, 'utf8')
const client = readFileSync(`${root}/app/publisher/_components/PublisherOperatingCenterClient.tsx`, 'utf8')

test('W1-301 governed current-authority projection remains commercial activation package acceptance', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Quanisha Dockery',
    bookTitle: 'Indomitable',
    titleId: 'fd577d2b-01a0-f111-b8dc-000d3a14673b',
    legacySourceState: 'Package accepted',
    pipelineStage: 'Prospect commercial',
    editorialStage: 'Package accepted',
    substage: '',
    owner: 'Publisher',
    packageState: 'Package accepted / pricing locked / agreement generated',
    canonicalAuthorityClassification: 'CANONICAL_CURRENT_TITLE',
    canonicalTitleReference: 'fd577d2b-01a0-f111-b8dc-000d3a14673b',
    canonicalAuthorContactReference: 'Quanisha Dockery',
    sourceAuthority: 'W1-301 current authority certification',
  })

  assert.equal(projection.titleLifecycleStage.code, 'COMMERCIAL_ACTIVATION')
  assert.equal(projection.titleLifecycleSubstage.code, 'PACKAGE_ACCEPTANCE')
  assert.equal(projection.waitingTruth.waitingOn, 'NOT_WAITING')
  assert.equal(projection.waitingTruth.timerDisplay, 'No active timer')
  assert.equal(projection.artifactTruth.artifactTrustClassification, 'NO_CURRENT_ARTIFACT_REQUIRED')
  assert.equal(projection.systemAttention.code, 'NONE')
})

test('live Whole editorial review is not projected as its frozen published snapshot', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Jackuline Fly',
    bookTitle: 'Whole',
    titleId: 'daf8180f-85a3-f111-b8de-000d3a14673b',
    legacySourceState: 'Developmental Editing - Author Review Author Review Editorial',
    pipelineStage: 'Editorial',
    editorialStage: 'Developmental Editing - Author Review',
    substage: 'Author Review',
    owner: 'Author',
    awaiting: 'Author',
    executionState: 'WAITING_FOR_EXTERNAL_PARTY',
    packageState: 'Released to author',
    evidenceLinks: [{
      label: 'Delivered developmental manuscript',
      href: '8ed48c9c-67b5-f111-aaab-000d3a10aa9c',
      artifactId: '8ed48c9c-67b5-f111-aaab-000d3a10aa9c',
      titleId: 'daf8180f-85a3-f111-b8de-000d3a14673b',
      checksum: 'a'.repeat(64),
      artifactType: 'DEVELOPMENTAL_EDIT',
      version: 'v1.0',
      current: true,
    }],
    canonicalAuthorityClassification: 'CANONICAL_PUBLISHED_TITLE',
    canonicalTitleReference: 'daf8180f-85a3-f111-b8de-000d3a14673b',
    canonicalAuthorContactReference: 'contact:106a78d0-fb9a-f111-b8dc-6045bdd69738',
    sourceAuthority: 'PUBLISHING_OPERATING_CENTER_WAVE1_2026_09_01:W1-308',
  })
  assert.equal(projection.titleLifecycleStage.code, 'EDITORIAL_PRODUCTION')
  assert.equal(projection.titleLifecycleSubstage.code, 'DEVELOPMENTAL_EDITING')
})

test('title card construction selects governed projection before stage and waiting fields are assigned', () => {
  assert.match(server, /const selected = selectGovernedProjectionPrimaryItem\(items, authorResponses\)/)
  assert.match(server, /const primary = selected\.item/)
  assert.match(server, /const canonicalLifecycle = selected\.canonicalLifecycle/)
  assert.match(server, /const waitingOn = waitingOnForCanonicalLifecycle\(canonicalLifecycle\)/)
  assert.match(server, /const nextAction = canonicalLifecycle\.nextGovernedAction\.action/)
})

test('legacy raw stage selection cannot override the governed projection primary', () => {
  assert.match(server, /function governedProjectionPrimaryScore/)
  assert.match(server, /TRUSTED_STAGE: 600/)
  assert.match(server, /NO_CURRENT_ARTIFACT_REQUIRED: 250/)
  assert.match(server, /item\.canonicalAuthorityClassification === 'CANONICAL_CURRENT_TITLE'/)
  assert.match(server, /item\.key\.startsWith\('production:'\).*item\.key\.startsWith\('workload:'\)/s)
})

test('artifact attention remains diagnostic and cannot become the title stage source', () => {
  assert.match(server, /blockerForCanonicalLifecycle\(canonicalLifecycle, primary\)/)
  assert.match(server, /canonicalLifecycle\.systemAttention\.severity === 'BLOCKING'/)
  assert.match(server, /canonicalLifecycle\.waitingTruth\.waitingOn === 'NOT_WAITING'\) return ''/)
  assert.doesNotMatch(server, /const projectedStageId[\s\S]{0,160}artifactTruth/)
})

test('artifact attention cannot override Waiting On when the governed state is not waiting', () => {
  assert.match(server, /function waitingOnForCanonicalLifecycle/)
  assert.match(server, /if \(canonicalLifecycle\.waitingTruth\.waitingOn === 'NOT_WAITING'\) return 'None'/)
  assert.match(client, /<MiniFact label="Waiting on" value=\{card\.canonicalLifecycle\.waitingTruth\.waitingOn\} \/>/)
  assert.doesNotMatch(server, /const waitingOn = waitingOnForTodayItem\(primary\)/)
})

test('card-visible timer comes from canonical waiting truth instead of raw age', () => {
  assert.match(client, /<MiniFact label="Timer" value=\{card\.canonicalLifecycle\.waitingTruth\.timerDisplay\} \/>/)
  assert.doesNotMatch(client, /<MiniFact label="Age" value=\{`\$\{card\.ageDays\}/)
})

test('reconciliation-required remains explicit unresolved rather than suppressed', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Duplicate Author',
    bookTitle: 'Duplicate Current Title',
    titleId: 'duplicate-title',
    legacySourceState: 'COMMERCIAL_ACTIVATION PACKAGE_ACCEPTANCE Prospect commercial',
    pipelineStage: 'Prospect commercial',
    editorialStage: 'COMMERCIAL_ACTIVATION',
    substage: 'PACKAGE_ACCEPTANCE',
    owner: 'Publisher',
    canonicalAuthorityClassification: 'REQUIRES_RECONCILIATION',
    sourceAuthority: 'Wave 6 duplicate-current regression fixture',
  })

  assert.equal(projection.canonicalAuthority.requiresReconciliation, true)
  assert.equal(projection.waitingTruth.waitingOn, 'RECONCILIATION_REQUIRED')
  assert.equal(projection.nextGovernedAction.confidence, 'UNRESOLVED')
})

test('stage, substage, waiting, attention, and next action are mutually sourced from one canonical lifecycle', () => {
  const cardBlock = server.slice(server.indexOf('function titleItemsToOperatingCard'), server.indexOf('function projectTodayItemCanonicalLifecycle'))
  assert.match(cardBlock, /stageId: stage\.id/)
  assert.match(cardBlock, /canonicalLifecycle,/)
  assert.match(cardBlock, /waitingOn,/)
  assert.match(cardBlock, /blocker,/)
  assert.match(cardBlock, /nextAction,/)
  assert.match(cardBlock, /nextStageEligible: canonicalLifecycle\.nextGovernedAction\.confidence === 'CONFIRMED'/)
})
