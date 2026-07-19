import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const serverSource = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const clientSource = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')
const wave2 = JSON.parse(readFileSync('docs/operations/generated/2026-07-19-JM1-Royalty-Operations-Wave2-Decision-Packages.json', 'utf8'))
const statementReadiness = JSON.parse(readFileSync('docs/operations/generated/2026-07-19-JM1-Royalty-Operations-Wave2-Statement-Readiness.json', 'utf8'))

assert.equal(wave2.summary.acceptedBaseline.normalizedRows, 297)
assert.equal(wave2.summary.acceptedBaseline.coreRoyaltyRows, 104)
assert.equal(wave2.summary.acceptedBaseline.heldRows, 193)
assert.equal(wave2.summary.acceptedBaseline.januaryBDisposition, 'SUPERSEDED')

assert.equal(wave2.summary.decisionPackages.heldRows, 193)
assert.equal(wave2.summary.decisionPackages.count, wave2.packages.length)
assert.equal(wave2.summary.decisionPackages.count, 175)
assert.equal(wave2.summary.mappingResults.durableMappingsCreated, 0)
assert.equal(wave2.summary.mappingResults.rowsReleased, 0)
assert.equal(wave2.summary.mappingResults.remainingHeldRows, 193)
assert.equal(wave2.summary.decisionPackages.affectedDollars, 1487.97)

const coveredRows = wave2.packages.reduce((sum, decisionPackage) => sum + decisionPackage.affectedRows, 0)
assert.equal(coveredRows, 193)
assert.ok(wave2.packages.every((decisionPackage) => decisionPackage.approvalState === 'Awaiting Jackie approval'))
assert.ok(wave2.packages.every((decisionPackage) => decisionPackage.downstreamEffect.includes('keep author visibility off')))

assert.equal(statementReadiness.statements.length, 6)
assert.equal(statementReadiness.summary.rowsHeld, 193)
assert.equal(statementReadiness.summary.rowsReconciled, 104)
assert.ok(statementReadiness.statements.some((statement) => statement.status === 'Draft — Exceptions'))

const juneKdp = wave2.monthlyClose.months
  .find((month) => month.month === 'June')
  ?.sources.find((source) => source.label === 'KDP')
assert.equal(juneKdp?.state, 'UPLOAD REQUIRED')
const juneDirectSales = wave2.monthlyClose.missingSourceActions.find(
  (action) => action.month === 'June' && action.source === 'Direct Sales',
)
assert.equal(juneDirectSales?.action, 'Upload Direct Sales or Confirm No Activity')
const juneAcx = wave2.monthlyClose.months
  .find((month) => month.month === 'June')
  ?.sources.find((source) => source.label === 'ACX')
assert.equal(juneAcx?.state, 'KNOWN UNAVAILABLE')

assert.match(serverSource, /PublisherRoyaltyDecisionPackage/)
assert.match(serverSource, /PublisherRoyaltyStatementQueueItem/)
assert.match(serverSource, /readRoyaltyWave2DecisionPackage/)
assert.match(clientSource, /Publisher decision packages/)
assert.match(clientSource, /Statement readiness/)
assert.match(clientSource, /Missing source actions/)
assert.match(clientSource, /No author visibility/)

console.log('Royalty Wave 2 decision package contract verified.')
