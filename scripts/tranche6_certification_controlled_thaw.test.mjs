import test from 'node:test'
import assert from 'node:assert/strict'

import {
  activationRegister,
  activationStates,
  buildActivationMatrix,
  buildCloseout,
  buildOperatorBurden,
  evaluateThaw,
  riskTierRules,
  runCertification,
  validateHumanFirst,
  validateIdentityTrace,
  validateKillSwitches,
  validateMicrosoftUtilization,
  validateRollback,
  validateShadowMode,
  validateSystemOfRecord,
} from './tranche6_certification_controlled_thaw.mjs'

test('Tranche 6 validates at least 75 integrated certification scenarios', () => {
  const certification = runCertification()
  assert.equal(certification.result, 'PASS')
  assert.equal(certification.passed, certification.total)
  assert.ok(certification.total >= 75)
  assert.ok(certification.groups.Commercial >= 10)
  assert.ok(certification.groups.Financial >= 10)
  assert.ok(certification.groups['Title/PF'] >= 15)
  assert.ok(certification.groups['Author Experience'] >= 10)
  assert.ok(certification.groups.Marketing >= 10)
  assert.ok(certification.groups['Post-Publication'] >= 15)
  assert.ok(certification.groups.Enterprise >= 5)
})

test('Tranche 6 activation register uses capability-level states and risk tiers', () => {
  const matrix = buildActivationMatrix()
  assert.equal(matrix.conflicts, 0)
  assert.ok(activationRegister.length >= 25)
  assert.ok(Object.keys(riskTierRules).includes('TIER_4'))
  assert.ok(activationStates.includes('SUSPENDED'))
  assert.ok(matrix.rows.every((row) => row.certificationStatus === 'PASS'))
  assert.ok(matrix.rows.some((row) => row.riskTier === 'TIER_4' && row.targetActivationState === 'FROZEN'))
})

test('Tranche 6 system of record and identity certification have no unresolved conflicts', () => {
  assert.equal(validateSystemOfRecord().unresolvedConflicts, 0)
  const identity = validateIdentityTrace()
  assert.equal(identity.duplicateSyntheticIdentities, 0)
  assert.equal(identity.unresolvedSyntheticIdentityLinks, 0)
})

test('Tranche 6 controlled thaw avoids blanket automation thaw', () => {
  const thaw = evaluateThaw()
  assert.equal(thaw.clientTitleAutomation, 'PARTIALLY THAWED UNDER ACTIVATION REGISTER')
  assert.equal(thaw.waveA, 'ACTIVE / CERTIFIED')
  assert.equal(thaw.waveB, 'READY / ASSISTED')
  assert.equal(thaw.waveC, 'NOT ACTIVATED / PILOT AUTHORIZATION REQUIRED')
  assert.equal(thaw.tier4, 'JACKIE-GATED')
})

test('Tranche 6 kill switches, rollback, and shadow mode are certified', () => {
  assert.equal(validateKillSwitches().result, 'PASS')
  assert.equal(validateKillSwitches().tested, true)
  assert.equal(validateRollback().result, 'PASS')
  assert.equal(validateShadowMode().criticalMismatches, 0)
})

test('Tranche 6 human-first acceptance is pass with intentional holds only', () => {
  const human = validateHumanFirst()
  assert.equal(human.result, 'PASS WITH HOLDS')
  assert.equal(human.unsafeAbsenceActions, 0)
  assert.equal(human.holds.length, 3)
})

test('Tranche 6 enterprise operator burden is deduplicated and reduced', () => {
  const burden = buildOperatorBurden()
  assert.equal(burden.before, 42)
  assert.equal(burden.after, 12)
  assert.equal(burden.netRemoved, 30)
  assert.equal(burden.decisionJudgmentRetained, 12)
})

test('Tranche 6 Microsoft utilization has no UNKNOWN disposition', () => {
  const utilization = validateMicrosoftUtilization()
  assert.equal(utilization.result, 'PASS')
  assert.equal(utilization.counts.UNKNOWN, 0)
  assert.ok(utilization.customSystemsAvoided >= 10)
})

test('Tranche 6 closeout preserves all hard zero-mutation boundaries', () => {
  const closeout = buildCloseout()
  assert.equal(closeout.integratedCertification, '83 / 83 PASS')
  assert.equal(closeout.systemOfRecordConflicts, 0)
  assert.equal(closeout.authorFacingLeakageAcceptedDefects, 0)
  assert.equal(closeout.financialReconciliationVariance, 0)
  assert.equal(closeout.realAuthorAutomatedSends, 0)
  assert.equal(closeout.realMarketingActivation, 0)
  assert.equal(closeout.realRoyaltyPayments, 0)
  assert.equal(closeout.realAnnualFeeCharges, 0)
  assert.equal(closeout.realAuthorCopyOrders, 0)
  assert.equal(closeout.realTitlesRetired, 0)
  assert.equal(closeout.realRightsReverted, 0)
  assert.equal(closeout.pr431, 'UNCHANGED / CURRENT OPERATING PRIORITY')
})
