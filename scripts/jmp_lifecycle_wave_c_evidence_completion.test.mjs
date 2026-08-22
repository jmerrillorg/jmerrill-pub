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

test('artifact identity, checksum, provenance, and current version evidence are tracked independently', () => {
  const checksum = 'a'.repeat(64)
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'Line Edit',
    titleId: 'title-artifact',
    legacySourceState: 'Line Editing',
    evidenceLinks: [{
      label: 'Line edit artifact',
      href: 'https://sharepoint.example/line-edit.docx',
      checksum,
      artifactType: 'LINE_EDITING',
      version: 'v3',
      current: true,
    }],
  })

  assert.equal(projection.lifecycleEvidence.artifact.identity.status, 'SUPPORTED')
  assert.equal(projection.lifecycleEvidence.artifact.checksum.value, checksum)
  assert.equal(projection.lifecycleEvidence.artifact.provenance.status, 'SUPPORTED')
  assert.equal(projection.lifecycleEvidence.artifact.currentVersion.value, 'v3')
  assert.equal(projection.lifecycleEvidence.coverage.artifactChecksum, 'SUPPORTED')
})

test('missing artifact checksum remains a resolvable DATA_GAP instead of false readiness', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'Proof',
    titleId: 'title-checksum-gap',
    legacySourceState: 'Proofreading',
    evidenceLinks: [{ label: 'Proof package', href: 'https://sharepoint.example/proof.pdf' }],
  })

  assert.equal(projection.sourceArtifact.checksum, 'DATA_GAP')
  assert.equal(projection.lifecycleEvidence.artifact.checksum.status, 'INCOMPLETE')
  assert.equal(projection.lifecycleEvidence.artifact.checksum.gapClassification, 'RESOLVABLE')
  assert.ok(projection.dataGaps.some((gap) => gap.field === 'sourceChecksum' && gap.classification === 'RESOLVABLE'))
})

test('commercial Joined Family cannot be inferred without agreement and initial payment evidence', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Prospect',
    bookTitle: 'Package Accepted',
    intakeId: 'intake-commercial',
    legacySourceState: 'Package Accepted',
    packageState: 'Package Accepted / payment option selection pending',
    pipelineStage: 'Prospect commercial',
    owner: 'Prospect',
  })

  assert.equal(projection.packageAccepted, 'YES')
  assert.equal(projection.joinedTheFamily.value, 'NO')
  assert.equal(projection.lifecycleEvidence.commercial.packageAccepted.status, 'SUPPORTED')
  assert.equal(projection.lifecycleEvidence.commercial.agreementExecuted.status, 'INCOMPLETE')
  assert.equal(projection.lifecycleEvidence.commercial.initialPayment.status, 'INCOMPLETE')
})

test('Joined Family conflict surfaces when family state lacks payment-chain support', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'Family Conflict',
    titleId: 'title-commercial-conflict',
    legacySourceState: 'Package Accepted',
    packageState: 'Joined the Family',
    portfolioState: 'active author',
  })

  assert.equal(projection.joinedTheFamily.value, 'YES')
  assert.equal(projection.lifecycleEvidence.commercial.joinedFamily.status, 'CONFLICT')
  assert.equal(projection.lifecycleEvidence.conflictCount > 0, true)
})

test('agreement, payment, pricing lock, installment plan, and Joined Family can be supported together', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'Commercial Complete',
    titleId: 'title-commercial-complete',
    legacySourceState: 'Package Accepted',
    packageState: 'Package Accepted; pricing locked; agreement executed; initial payment paid; 8-pay installment plan; Joined the Family',
    commercialEvidenceText: 'locked price; signed agreement; first payment paid',
  })

  assert.equal(projection.lifecycleEvidence.commercial.pricingLocked.status, 'SUPPORTED')
  assert.equal(projection.lifecycleEvidence.commercial.agreementExecuted.status, 'SUPPORTED')
  assert.equal(projection.lifecycleEvidence.commercial.initialPayment.status, 'SUPPORTED')
  assert.equal(projection.lifecycleEvidence.commercial.installments.value, '8-Pay')
  assert.equal(projection.lifecycleEvidence.commercial.joinedFamily.status, 'SUPPORTED')
})

test('workspace entitlement, active state, and onboarding are separate evidence families', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Returning Author',
    bookTitle: 'Workspace Title',
    titleId: 'title-workspace',
    legacySourceState: 'Joined the Family',
    workspaceState: 'Workspace active',
    workspaceEntitlementState: 'Entitled',
    onboardingState: 'Returning author orientation',
  })

  assert.equal(projection.workspaceState, 'Workspace active')
  assert.equal(projection.lifecycleEvidence.authorWorkspace.entitlement.status, 'SUPPORTED')
  assert.equal(projection.lifecycleEvidence.authorWorkspace.activeWorkspace.status, 'SUPPORTED')
  assert.equal(projection.lifecycleEvidence.authorWorkspace.onboarding.value, 'Returning author orientation')
})

test('format identity, distribution, certification, and verified URL evidence are not collapsed', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'Distributed Title',
    titleId: 'title-format',
    legacySourceState: 'Distribution Release',
    activeFormats: ['Paperback', 'Ebook'],
    formatEvidenceText: 'Paperback certified and live at https://example.com/paperback. Ebook submitted to catalog.',
  })
  const paperback = projection.lifecycleEvidence.formats.find((format) => format.format === 'Paperback')
  const ebook = projection.lifecycleEvidence.formats.find((format) => format.format === 'Ebook')

  assert.equal(paperback?.identity.status, 'SUPPORTED')
  assert.equal(paperback?.distribution.status, 'SUPPORTED')
  assert.equal(paperback?.certification.status, 'SUPPORTED')
  assert.equal(paperback?.verifiedUrl.status, 'SUPPORTED')
  assert.equal(ebook?.identity.status, 'SUPPORTED')
  assert.equal(ebook?.certification.status, 'INCOMPLETE')
})

test('mapping conflicts keep next governed action unresolved and evidence conflict visible', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: "'TIL DEATH DO US PART",
    titleId: 'title-conflict',
    legacySourceState: 'Editorial Review',
    pipelineStage: 'Active pipeline',
  })

  assert.equal(projection.canonicalMappingStatus, 'CANONICAL_MAPPING_CONFLICT')
  assert.equal(projection.nextGovernedAction.confidence, 'UNRESOLVED')
  assert.equal(projection.lifecycleEvidence.artifact.ambiguity.status, 'CONFLICT')
})

test('Operating Center UI exposes Wave C evidence without new write controls', () => {
  const server = readFileSync(`${root}/lib/server/publisher-operating-center.ts`, 'utf8')
  const client = readFileSync(`${root}/app/publisher/_components/PublisherOperatingCenterClient.tsx`, 'utf8')

  assert.ok(server.includes('commercialEvidenceText'))
  assert.ok(server.includes('formatEvidenceText'))
  assert.ok(client.includes('Lifecycle Evidence'))
  assert.ok(client.includes('artifactChecksum'))
  assert.equal(client.includes('commercialLifecycleWrite'), false)
  assert.equal(server.includes('createLifecycleEvent('), false)
})
