import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addCompanionEdition,
  assignIdentifier,
  authorizeCorrection,
  buildCloseout,
  computeComplimentaryEntitlements,
  createEditionInstances,
  evaluateDistributionReadiness,
  evaluateReleaseDateGate,
  executionEvents,
  initializeTitleRuntime,
  microsoftDispositions,
  productForms,
  readbackDistribution,
  requestFtl,
  runInternalValidation,
  submitDistribution,
  validateProductFormElection,
} from './tranche3_title_pf_runtime.mjs'

test('Tranche 3 validates 40 synthetic title/PF runtime scenarios', () => {
  const validation = runInternalValidation()
  assert.equal(validation.result, 'PASS')
  assert.equal(validation.passed, 40)
  assert.equal(validation.total, 40)
})

test('Tranche 3 preserves canonical Product Form authority', () => {
  assert.deepEqual(productForms.map((item) => item.code), ['PF-01', 'PF-02', 'PF-03', 'PF-04', 'PF-05', 'PF-06', 'PF-07', 'PF-08'])
  assert.equal(productForms.find((item) => item.code === 'PF-07')?.status, 'INACTIVE')
  assert.equal(productForms.find((item) => item.code === 'PF-08')?.status, 'ACTIVE_SCOPE_GATED')
  assert.equal(validateProductFormElection(['PF-07']).result, 'BLOCKED')
  assert.equal(validateProductFormElection([{ productFormCode: 'PF-08' }]).result, 'BLOCKED')
  assert.equal(validateProductFormElection([{ productFormCode: 'PF-08', scopeApproved: true }]).result, 'ACCEPTED')
})

test('Tranche 3 initializes only after FULFILLMENT_AUTHORIZED', () => {
  const blocked = initializeTitleRuntime({ fulfillmentAuthorization: 'NOT_AUTHORIZED', electedProductForms: ['PF-01'] })
  assert.equal(blocked.result, 'BLOCKED')
  const ready = initializeTitleRuntime({
    titleId: 'SYN-TITLE',
    fulfillmentAuthorization: 'AUTHORIZED',
    authorRelationshipId: 'REL',
    agreementVersion: 'v1.3.1',
    packageSku: 'JMP-PKG-STARTER',
    publishingTrack: 'Hybrid',
    electedProductForms: ['PF-01', 'PF-03'],
  })
  assert.equal(ready.result, 'INITIALIZED')
})

test('Tranche 3 creates idempotent jm1pub_edition instances', () => {
  const title = initializeTitleRuntime({
    titleId: 'SYN-TITLE',
    fulfillmentAuthorization: 'AUTHORIZED',
    authorRelationshipId: 'REL',
    agreementVersion: 'v1.3.1',
    packageSku: 'JMP-PKG-STARTER',
    publishingTrack: 'Hybrid',
    electedProductForms: ['PF-01', 'PF-01', 'PF-03'],
  })
  const editions = createEditionInstances(title)
  assert.equal(editions.length, 2)
  assert.equal(editions.every((item) => item.table === 'jm1pub_edition'), true)
})

test('Tranche 3 gates identifiers and release dates through FTL and distribution readiness', () => {
  assert.equal(assignIdentifier({ ftlConfirmed: false, productForm: 'PF-01', identifier: 'ISBN-SYN' }).result, 'BLOCKED')
  assert.equal(requestFtl({ title: 'Synthetic', printedAuthorName: 'Author', imprint: 'J Merrill Publishing', electedProductForms: ['PF-01'], ftlEvidenceRef: 'SP' }).result, 'FTL_CONFIRMED')
  assert.equal(evaluateReleaseDateGate({ distributionReady: false, minimumPropagationLeadDays: 21 }).result, 'BLOCKED')
  assert.equal(evaluateReleaseDateGate({ distributionReady: true, minimumPropagationLeadDays: 20 }).result, 'BLOCKED')
})

test('Tranche 3 distinguishes submitted, accepted, and live', () => {
  const readiness = evaluateDistributionReadiness({
    approvedFiles: true,
    metadataComplete: true,
    identifiersAssigned: true,
    pricingApproved: true,
    rightsTerritoryConfirmed: true,
    distributionSettingsReady: true,
    accessibilityStateReady: true,
  })
  assert.equal(readiness.result, 'DISTRIBUTION_READY')
  assert.equal(submitDistribution({ titleId: 'SYN', productForm: 'PF-01', channel: 'retail', attempt: 1, submittedTimestamp: '2026-08-08T00:00:00Z', distributionReady: true }).result, 'SUBMITTED')
  assert.equal(readbackDistribution({ externalStatus: 'ACCEPTED' }).live, false)
  assert.equal(readbackDistribution({ externalStatus: 'LIVE', externalEvidenceRef: 'EXT' }).result, 'LIVE')
})

test('Tranche 3 correction and companion edition paths are Jackie/addendum gated', () => {
  assert.equal(authorizeCorrection({ jackieApproval: false }).result, 'BLOCKED')
  assert.equal(authorizeCorrection({ jackieApproval: true }).result, 'CORRECTION_AUTHORIZED')
  assert.equal(addCompanionEdition({ addendumApproved: false, productForm: 'PF-05' }).result, 'BLOCKED')
  assert.equal(addCompanionEdition({ addendumApproved: true, productForm: 'PF-05' }).result, 'COMPANION_EDITION_ADDED')
})

test('Tranche 3 complimentary entitlements follow elected Product Forms', () => {
  const entitlement = computeComplimentaryEntitlements('JMP-PKG-PRO', ['PF-01', 'PF-05', 'PF-03'])
  assert.deepEqual(
    entitlement.rows.map((row) => `${row.productForm}:${row.entitlement}`),
    ['PF-01:10', 'PF-05:10', 'PF-03:1'],
  )
})

test('Tranche 3 closeout preserves frozen and zero-mutation boundaries', () => {
  const closeout = buildCloseout()
  assert.equal(closeout.liveAuthorsUsed, 0)
  assert.equal(closeout.liveTitlesUsed, 0)
  assert.equal(closeout.pr431TitlesUsed, 0)
  assert.equal(closeout.businessCentralLivePosting, 0)
  assert.equal(closeout.strategicMarketingActivation, 0)
  assert.equal(closeout.authorCommunications, 0)
  assert.equal(closeout.clientTitleAutomation, 'FROZEN')
  assert.equal(closeout.tranche4, 'NOT STARTED')
  assert.equal(closeout.internalValidation, '40 / 40 PASS')
})

test('Tranche 3 Microsoft-first and execution-log gates have no UNKNOWN dispositions', () => {
  assert.equal(microsoftDispositions.some(([, disposition]) => disposition === 'UNKNOWN'), false)
  assert.equal(executionEvents.includes('TITLE_RUNTIME_INITIALIZED'), true)
  assert.equal(executionEvents.includes('RELEASE_CONFIRMED_LIVE'), true)
  assert.equal(executionEvents.includes('CORRECTION_AUTHORIZED'), true)
})
