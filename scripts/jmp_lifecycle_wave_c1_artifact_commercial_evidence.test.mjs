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

const authority = await import('../lib/publishing/lifecycle/wave-c1-evidence-authority.ts')
const { projectCanonicalPublisherLifecycle } = await import('../lib/publishing/lifecycle/operating-center-read-model.ts')

test('artifact checksum authority is not fabricated from path or title evidence', () => {
  const evaluated = authority.evaluateWaveC1ArtifactAuthority({
    artifactId: 'sharepoint:/Title/FinalInterior.pdf',
    artifactType: 'Final print interior PDF',
    evidenceSource: 'SharePoint file reference',
    storageReference: 'sharepoint:/Title/FinalInterior.pdf',
  })

  assert.equal(evaluated.artifactClass, 'FINAL_PRINT_INTERIOR')
  assert.equal(evaluated.identity.status, 'SUPPORTED')
  assert.equal(evaluated.checksum.status, 'INCOMPLETE')
  assert.equal(evaluated.additiveChecksumWrite, 'NOT_SAFE_TO_BACKFILL')
})

test('byte-readable artifact with no checksum is only an additive evidence-write candidate', () => {
  const evaluated = authority.evaluateWaveC1ArtifactAuthority({
    artifactId: 'asset-1',
    artifactType: 'Final EPUB',
    byteReadable: true,
  })

  assert.equal(evaluated.checksum.status, 'INCOMPLETE')
  assert.equal(evaluated.checksumComputability.status, 'SUPPORTED')
  assert.equal(evaluated.additiveChecksumWrite, 'SAFE_ADDITIVE_EVIDENCE_WRITE_CANDIDATE')
})

test('agreement document availability does not prove agreement executed', () => {
  const evaluated = authority.evaluateWaveC1CommercialAuthority({
    packageState: 'Package Accepted',
    agreementDocumentAvailable: true,
    agreementEvidenceText: 'Agreement PDF exists in workspace',
  })

  assert.equal(evaluated.packageAccepted.status, 'SUPPORTED')
  assert.equal(evaluated.agreementExecuted.status, 'INCOMPLETE')
  assert.equal(evaluated.controlledWriteAuthorityEligible, 'NO')
})

test('agreement execution uses governed contract/provider execution evidence', () => {
  const evaluated = authority.evaluateWaveC1CommercialAuthority({
    contractStatus: 'Active',
    providerStatus: 'ADOBE_SIGNED_COMPLETED',
    signedDate: '2026-08-19T12:00:00Z',
  })

  assert.equal(evaluated.agreementExecuted.status, 'SUPPORTED')
  assert.equal(evaluated.agreementExecuted.strength, 'AUTHORITATIVE')
})

test('initial payment requires successful payment evidence in the correct commercial context', () => {
  const contextualOnly = authority.evaluateWaveC1CommercialAuthority({
    paymentEvidenceText: 'Initial payment mentioned in notes',
  })
  const authoritative = authority.evaluateWaveC1CommercialAuthority({
    firstPaymentStatus: 'Paid Confirmed',
    firstPaymentConfirmedOn: '2026-08-19T12:00:00Z',
    firstPaymentConfirmationSource: 'Stripe Live Approved',
  })

  assert.equal(contextualOnly.initialPayment.status, 'SUPPORTED')
  assert.equal(contextualOnly.initialPayment.strength, 'CONTEXTUAL')
  assert.equal(authoritative.initialPayment.status, 'SUPPORTED')
  assert.equal(authoritative.initialPayment.strength, 'AUTHORITATIVE')
})

test('Joined the Family becomes conflict when authoritative prerequisites are missing', () => {
  const evaluated = authority.evaluateWaveC1CommercialAuthority({
    joinedFamilyEvent: true,
    contractStatus: 'Active',
  })

  assert.equal(evaluated.joinedFamily.status, 'CONFLICT')
  assert.equal(evaluated.controlledWriteAuthorityEligible, 'NO')
})

test('Joined the Family is eligible only with authoritative agreement and initial payment', () => {
  const evaluated = authority.evaluateWaveC1CommercialAuthority({
    joinedFamilyEvent: true,
    contractStatus: 'Active',
    providerStatus: 'SIGNED',
    firstPaymentStatus: 'Paid Confirmed',
    firstPaymentConfirmedOn: '2026-08-19T12:00:00Z',
    firstPaymentConfirmationSource: 'Stripe Live Approved',
  })

  assert.equal(evaluated.joinedFamily.status, 'SUPPORTED')
  assert.equal(evaluated.controlledWriteAuthorityEligible, 'LIMITED_COMMERCIAL_EVENT_WRITE_CANDIDATE')
})

test('workspace entitlement and active state are not inferred from title relationship or URL', () => {
  const evaluated = authority.evaluateWaveC1WorkspaceAuthority({
    authorRelationshipState: 'ACTIVE_AUTHOR',
    workspaceUrl: 'https://author.example/workspace/title',
  })

  assert.equal(evaluated.relationship.status, 'SUPPORTED')
  assert.equal(evaluated.entitlement.status, 'INCOMPLETE')
  assert.equal(evaluated.activeWorkspace.status, 'INCOMPLETE')
})

test('format certification is separate from identifier, URL, publication, and live state', () => {
  const evaluated = authority.evaluateWaveC1FormatAuthority({
    format: 'Paperback',
    externalId: '9780000000000',
    liveUrl: 'https://retailer.example/book',
    liveState: 'Published live',
    distributionEvidenceText: 'Live in catalog',
  })

  assert.equal(evaluated.identity.status, 'SUPPORTED')
  assert.equal(evaluated.distribution.status, 'SUPPORTED')
  assert.equal(evaluated.externalReference.status, 'SUPPORTED')
  assert.equal(evaluated.certification.status, 'INCOMPLETE')
})

test('read model exposes Wave C.1 authority while preserving royalty DATA_GAP boundary', () => {
  const projection = projectCanonicalPublisherLifecycle({
    author: 'Author',
    bookTitle: 'Commercial Complete',
    titleId: 'title-c1',
    legacySourceState: 'Package Accepted',
    packageState: 'Package Accepted; Joined the Family',
    contractStatus: 'Active',
    providerStatus: 'ADOBE_SIGNED_COMPLETED',
    firstPaymentStatus: 'Paid Confirmed',
    firstPaymentConfirmedOn: '2026-08-19T12:00:00Z',
    firstPaymentConfirmationSource: 'Stripe Live Approved',
    joinedFamilyEvent: true,
    evidenceLinks: [{ label: 'Final EPUB', href: 'sharepoint:/final.epub', artifactType: 'Final EPUB' }],
    activeFormats: ['Paperback'],
    formatEvidenceText: 'Paperback live at https://retailer.example/book',
  })

  assert.equal(projection.waveC1EvidenceAuthority.commercial.joinedFamily.status, 'SUPPORTED')
  assert.equal(projection.waveC1EvidenceAuthority.controlledWriteAuthorityEligible, 'LIMITED_COMMERCIAL_EVENT_WRITE_CANDIDATE')
  assert.equal(projection.waveC1EvidenceAuthority.artifact.checksum.status, 'INCOMPLETE')
  assert.equal(projection.waveC1EvidenceAuthority.formats[0].certification.status, 'INCOMPLETE')
  assert.equal(projection.waveC1EvidenceAuthority.royalty.value, 'DATA_GAP')
})

test('Wave C.1 implementation contains no production lifecycle write path or Wave D start', () => {
  const source = readFileSync(`${root}/lib/publishing/lifecycle/wave-c1-evidence-authority.ts`, 'utf8')
  const readModel = readFileSync(`${root}/lib/publishing/lifecycle/operating-center-read-model.ts`, 'utf8')
  const server = readFileSync(`${root}/lib/server/publisher-operating-center.ts`, 'utf8')

  assert.equal(/dataverseRequest\([^)]*,[^)]*,[^)]*,\s*\{[^}]*method:\s*['"`](POST|PATCH|DELETE)/s.test(source), false)
  assert.equal(readModel.includes('createLifecycleEvent('), false)
  assert.equal(server.includes('commercialLifecycleWrite'), false)
  assert.equal(server.includes('wave_d_started'), false)
  assert.equal(source.includes('production_title_stage_writes'), false)
})
