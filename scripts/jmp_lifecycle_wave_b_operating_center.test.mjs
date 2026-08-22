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

const {
  canonicalPublisherLifecycleStages,
  canonicalStageIdForPublisherState,
  projectCanonicalPublisherLifecycle,
} = await import('../lib/publishing/lifecycle/operating-center-read-model.ts')

test('Operating Center stage columns are derived from the Wave A lifecycle registry', () => {
  const stages = canonicalPublisherLifecycleStages()
  assert.equal(stages.length, 10)
  assert.deepEqual(stages.map((stage) => stage.id), [
    'INQUIRY_INTAKE',
    'CLASSIFICATION',
    'EDITORIAL_REVIEW_RECOMMENDATION',
    'COMMERCIAL_ACTIVATION',
    'AUTHOR_ONBOARDING',
    'EDITORIAL_PRODUCTION',
    'BOOK_PRODUCTION',
    'DISTRIBUTION_READINESS',
    'DISTRIBUTION_RELEASE',
    'POST_PUBLICATION',
  ])
  assert.ok(stages[5].label.includes('06 - Editorial Production'))
})

test('exact legacy Line Editing maps to canonical title lifecycle without migration', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Known Author',
    bookTitle: 'The General’s Will and Last Testament',
    titleId: 'title-1',
    legacySourceState: 'Line Editing - provider hold',
    editorialStage: 'Line Editing - In Progress',
    pipelineStage: 'Editorial',
    owner: 'JM1 Automation',
    executionState: 'WAITING_FOR_EXTERNAL_PARTY',
    dependency: 'Provider capacity hold',
    nextAction: 'Wait for provider capacity',
    ageDays: 6,
  })

  assert.equal(projection.canonicalMappingStatus, 'CANONICAL_MAPPING_EXACT')
  assert.equal(projection.titleLifecycleStage.code, 'EDITORIAL_PRODUCTION')
  assert.equal(projection.titleLifecycleSubstage.code, 'LINE_EDITING')
  assert.equal(projection.waitingOn, 'JMP/System')
  assert.equal(projection.systemAttention.code, 'PROVIDER_BACKPRESSURE')
  assert.equal(projection.authorActionRequired.label, 'NO')
  assert.equal(projection.nextGovernedAction.confidence, 'CONFIRMED')
})

test('prospect Editorial Review maps contextually to Stage 03 while active-title ambiguity remains visible', () => {
  const prospect = projectCanonicalPublisherLifecycle({
    author: 'Prospect',
    bookTitle: 'Indomitable',
    intakeId: 'intake-1',
    legacySourceState: 'Editorial Review',
    pipelineStage: 'Prospect intake',
    owner: 'Publisher',
  })
  const active = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'Ambiguous Active Title',
    titleId: 'title-2',
    legacySourceState: 'Editorial Review',
    pipelineStage: 'Active pipeline',
    owner: 'Publisher',
  })

  assert.equal(prospect.canonicalMappingStatus, 'CANONICAL_MAPPING_CONTEXTUAL')
  assert.equal(prospect.titleLifecycleStage.code, 'EDITORIAL_REVIEW_RECOMMENDATION')
  assert.equal(prospect.titleLifecycleSubstage.code, 'PRE_CONTRACT_EDITORIAL_REVIEW')
  assert.equal(active.canonicalMappingStatus, 'CANONICAL_MAPPING_CONFLICT')
  assert.equal(active.nextGovernedAction.action, 'Resolve lifecycle mapping conflict')
  assert.equal(active.nextGovernedAction.confidence, 'UNRESOLVED')
})

test('unmapped legacy values become incomplete rather than guessed', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'Unmapped Title',
    titleId: 'title-3',
    legacySourceState: 'Legacy Mystery State',
  })

  assert.equal(projection.canonicalMappingStatus, 'CANONICAL_MAPPING_INCOMPLETE')
  assert.equal(projection.titleLifecycleStage.code, 'DATA_GAP')
  assert.equal(projection.systemAttention.code, 'DATA_GAP')
  assert.equal(projection.nextGovernedAction.confidence, 'UNRESOLVED')
})

test('stage inference does not use title words after a legacy stage delimiter', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Synthetic Author',
    bookTitle: 'Final Proof in the Title',
    titleId: 'title-proof-word',
    legacySourceState: 'Editorial Review - Final Proof in the Title',
    pipelineStage: 'Active pipeline',
  })

  assert.equal(projection.canonicalMappingStatus, 'CANONICAL_MAPPING_CONFLICT')
  assert.equal(projection.titleLifecycleStage.code, 'DATA_GAP')
})

test('three lifecycle dimensions remain distinct and package accepted is not Joined the Family', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Quanishia Dockery',
    bookTitle: 'Recommendation Sent',
    intakeId: 'intake-2',
    legacySourceState: 'Package Accepted',
    packageState: 'Package Accepted / payment option selection pending',
    pipelineStage: 'Prospect commercial',
    owner: 'Prospect',
  })

  assert.equal(projection.prospectCommercialState, 'PACKAGE_ACCEPTED')
  assert.equal(projection.authorRelationshipState, 'PROSPECT')
  assert.equal(projection.joinedTheFamily.value, 'NO')
  assert.equal(projection.waitingOn, 'Prospect')
})

test('author action, human wait, and system attention are separate fields', () => {
  const authorWait = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'Line Review',
    titleId: 'title-4',
    legacySourceState: 'Line Author Review',
    owner: 'Author',
    nextAction: 'Approve Line Edit',
  })
  const systemWait = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'Line Execution',
    titleId: 'title-5',
    legacySourceState: 'Line Editing',
    owner: 'JM1 Automation',
    dependency: 'Foundry provider backpressure',
  })

  assert.equal(authorWait.waitingOn, 'Author')
  assert.equal(authorWait.authorActionRequired.label, 'YES')
  assert.equal(systemWait.waitingOn, 'JMP/System')
  assert.equal(systemWait.authorActionRequired.label, 'NO')
  assert.equal(systemWait.systemAttention.code, 'PROVIDER_BACKPRESSURE')
})

test('stage applicability allows Starter package to omit Developmental Editing', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Starter Author',
    bookTitle: 'Starter Book',
    titleId: 'title-6',
    legacySourceState: 'Developmental Editing',
    packageState: 'Starter package',
  })

  assert.equal(projection.titleLifecycleSubstage.code, 'DEVELOPMENTAL_EDITING')
  assert.equal(projection.titleLifecycleSubstage.applicability, 'NOT_APPLICABLE')
})

test('split-brain proof/layout conflict surfaces as blocking System Attention', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'The Intentional Leader',
    titleId: 'title-7',
    legacySourceState: 'Proofreading',
    editorialStage: 'Proofreading',
    pipelineStage: 'Interior Layout',
    dependency: 'Layout must precede Proof',
  })

  assert.equal(projection.systemAttention.code, 'LIFECYCLE_SPLIT_BRAIN')
  assert.equal(projection.systemAttention.severity, 'BLOCKING')
})

test('artifact, readiness, async execution, workspace, payment, and distribution gaps are explicit', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'Copy Complete',
    titleId: 'title-8',
    legacySourceState: 'Copyediting complete; Layout next',
    editorialStage: 'Copyediting',
    executionState: 'EXECUTING',
    executionMode: 'AUTOMATIC_EVENT_DRIVEN',
    runtime: 'Editorial worker',
    qaState: '17 / 28 chunks',
    activeFormats: ['Paperback', 'Ebook', 'Audiobook'],
  })

  assert.equal(projection.executionStatus, 'EXECUTING')
  assert.equal(projection.sourceArtifact.checksum, 'DATA_GAP')
  assert.equal(projection.readiness.editorial, 'READY')
  assert.equal(projection.workspaceState, 'DATA_GAP')
  assert.equal(projection.paymentPlan, 'DATA_GAP')
  assert.equal(projection.royaltyPayoutReadiness, 'NOT YET AVAILABLE')
  assert.deepEqual(Object.keys(projection.distributionState), ['Paperback', 'Ebook', 'Audiobook'])
})

test('Publisher Operating Center UI consumes canonical projection instead of raw-only status labels', () => {
  const server = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
  const client = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')

  assert.ok(server.includes('projectCanonicalPublisherLifecycle'))
  assert.ok(server.includes('canonicalPublisherLifecycleStages'))
  assert.ok(client.includes('Lifecycle Dimensions'))
  assert.ok(client.includes('Waiting / Attention / Next Action'))
  assert.ok(client.includes('Stage-Specific Readiness'))
  assert.ok(client.includes('card.canonicalLifecycle.titleLifecycleStage'))
  assert.ok(!client.includes('Fix Stage'))
  assert.ok(!client.includes('Migrate Title'))
})

test('canonical stage helper maps post-publication and production states without UI-owned stage sequence', () => {
  assert.equal(canonicalStageIdForPublisherState('Published catalog royalty review'), 'POST_PUBLICATION')
  assert.equal(canonicalStageIdForPublisherState('Interior Layout'), 'BOOK_PRODUCTION')
})
