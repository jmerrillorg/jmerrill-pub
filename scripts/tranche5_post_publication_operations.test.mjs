import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCloseout,
  buildReporting,
  buildSingleOperatorSurface,
  calculateRoyalties,
  createCopyEntitlement,
  enterPostPublication,
  evaluateAnnualDistributionFee,
  evaluatePayoutReadiness,
  executionEvents,
  importRoyaltySource,
  microsoftDispositions,
  prepareBusinessCentralPayableHandoff,
  prepareRoyaltyStatement,
  reconcileRoyaltyRows,
  royaltyPolicy,
  royaltyReconciliationProof,
  runInternalValidation,
  triggerPostReleaseMarketing,
  verifyStatementArtifact,
} from './tranche5_post_publication_operations.mjs'

test('Tranche 5 validates 50 synthetic post-publication scenarios', () => {
  const validation = runInternalValidation()
  assert.equal(validation.result, 'PASS')
  assert.equal(validation.passed, 50)
  assert.equal(validation.total, 50)
})

test('Tranche 5 royalty intake, reconciliation, and calculation are deterministic', () => {
  const source = importRoyaltySource({
    sourceName: 'SYNTHETIC-KDP',
    period: '2026-07',
    channel: 'KDP',
    fileChecksum: 'sha256:test',
    rows: [{ rowId: 'R1', titleId: 'TITLE-1', productForm: 'PF-01', units: 2, gross: 40, fees: 12 }],
  })
  const reconciled = reconcileRoyaltyRows({ rows: source.rows })
  const calc = calculateRoyalties({ reconciliation: reconciled, period: '2026-07', authorId: 'AUTH-1' })
  assert.equal(source.result, 'IMPORTED')
  assert.equal(reconciled.result, 'RECONCILED')
  assert.equal(calc.lines[0].royaltyRate, royaltyPolicy.rate)
  assert.equal(calc.lines[0].royaltyAmount, 19.6)
  assert.equal(calc.deterministicHash, calculateRoyalties({ reconciliation: reconciled, period: '2026-07', authorId: 'AUTH-1' }).deterministicHash)
})

test('Tranche 5 financial handoff and payout readiness do not move money', () => {
  const statement = { status: 'LOCKED', totalRoyalty: 19.6 }
  assert.equal(prepareBusinessCentralPayableHandoff({ statement }).postingPerformed, false)
  assert.equal(evaluatePayoutReadiness({ lockedStatement: true, thresholdMet: true, stripeReady: true, jackieApproval: true }).paymentExecuted, false)
})

test('Tranche 5 statement artifact blocks internal leakage', () => {
  assert.equal(verifyStatementArtifact({ statementId: 'RS-1', period: '2026-07', authorName: 'Author One', totalRoyalty: 19.6, title: 'Statement', body: 'Please review your statement.' }).result, 'VERIFIED')
  assert.equal(verifyStatementArtifact({ statementId: 'RS-1', period: '2026-07', authorName: 'Author One', totalRoyalty: 19.6, title: 'Statement', body: 'Dataverse GUID debug' }).result, 'BLOCKED')
})

test('Tranche 5 entitlements and annual fees are tracked without real fulfillment or charges', () => {
  const entitlement = createCopyEntitlement({ packageSku: 'JMP-PKG-PRO', electedProductForms: ['PF-01', 'PF-02', 'PF-04'] })
  const fee = evaluateAnnualDistributionFee({ printProductForms: ['PF-01', 'PF-02'], releaseAnchor: '2026-08-08' })
  assert.equal(entitlement.result, 'ACTIVE')
  assert.equal(entitlement.realOrderCreated, false)
  assert.equal(fee.amountDue, 60)
  assert.equal(fee.realChargeCreated, false)
})

test('Tranche 5 reporting, marketing, and single-operator surface remain bounded', () => {
  assert.equal(enterPostPublication({ titleId: 'TITLE-1', releaseReadback: 'LIVE', liveEvidenceRef: 'SP-LIVE' }).result, 'ACTIVE')
  assert.equal(triggerPostReleaseMarketing({ trigger: 'ANNIVERSARY', consentOk: true }).realActivationCount, 0)
  assert.equal(buildReporting({ royaltyPeriods: 1 }).result, 'ACTIVE')
  assert.equal(buildSingleOperatorSurface([{ label: 'Statement review', queue: 'StatementReview' }]).rows[0].needsJackie, true)
})

test('Tranche 5 closeout preserves frozen and zero-mutation boundaries', () => {
  const closeout = buildCloseout()
  assert.equal(closeout.internalValidation, '50 / 50 PASS')
  assert.equal(closeout.royaltyPolicyChanged, 0)
  assert.equal(closeout.realBusinessCentralPostingOrPayments, 0)
  assert.equal(closeout.businessCentralLiveClientPosting, 0)
  assert.equal(closeout.stripeMoneyMovement, 0)
  assert.equal(closeout.realAuthorAutomatedCommunications, 0)
  assert.equal(closeout.clientTitleAutomation, 'FROZEN')
  assert.equal(closeout.tranche6, 'NOT STARTED')
})

test('Tranche 5 reconciliation proof and Microsoft reuse gate have no unknowns', () => {
  const proof = royaltyReconciliationProof({})
  assert.equal(proof.unmatchedRows, 0)
  assert.equal(proof.duplicateRows, 0)
  assert.equal(proof.calculationDiffs, 0)
  assert.equal(proof.untraceableStatementLines, 0)
  assert.equal(microsoftDispositions.some(([, disposition]) => disposition === 'UNKNOWN'), false)
  assert.equal(executionEvents.includes('ROYALTY_STATEMENT_LOCKED'), true)
})

test('Tranche 5 statements require calculation before preparation', () => {
  assert.equal(prepareRoyaltyStatement({ calculation: { result: 'BLOCKED' }, period: '2026-07', authorId: 'AUTH-1' }).result, 'BLOCKED')
})
