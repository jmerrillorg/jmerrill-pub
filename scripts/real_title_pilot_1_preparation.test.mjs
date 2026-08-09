import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPilotActivationMatrix,
  buildPilotPackage,
  candidates,
  pr431Eligibility,
} from './real_title_pilot_1_preparation.mjs'

test('Pilot package recommends exactly one non-red title', () => {
  const recommended = candidates.filter((item) => item.recommended)
  assert.equal(recommended.length, 1)
  assert.equal(recommended[0].title, 'The Intentional Leader')
  assert.equal(recommended[0].classification, 'YELLOW')
  assert.equal(recommended[0].redCount, 0)
})

test('Pilot candidate counts are explicit and complete', () => {
  const pkg = buildPilotPackage()
  assert.equal(pkg.titlesAssessed, 8)
  assert.deepEqual(pkg.candidateCounts, { GREEN: 0, YELLOW: 2, RED: 6 })
  assert.equal(pkg.recommendedRisk, 'MODERATE')
})

test('PR #431 titles remain individually excluded', () => {
  const rows = pr431Eligibility()
  assert.equal(rows.length, 4)
  assert.ok(rows.every((row) => row.classification === 'PILOT EXCLUDED'))
  assert.ok(rows.every((row) => row.risk === 'RED'))
  assert.deepEqual(rows.map((row) => row.title).sort(), [
    'Before You Were Born',
    'Naughty Tales',
    'Strategies For Success',
    'The General\'s Will and Last Testament',
  ].sort())
})

test('Pilot prep has zero real external or financial actions', () => {
  const pkg = buildPilotPackage()
  assert.equal(pkg.shadowMode, 'PASS')
  assert.equal(pkg.assistedMode, 'PASS')
  assert.equal(pkg.criticalMismatches, 0)
  for (const value of Object.values(pkg.zeroes)) assert.equal(value, 0)
})

test('Pilot activation matrix never authorizes external live action', () => {
  const rows = buildPilotActivationMatrix()
  assert.ok(rows.length >= 30)
  assert.ok(rows.every((row) => row.externalLiveActionAuthorized === false))
  assert.ok(rows.some((row) => row.capability === 'Author communication send' && row.pilotUse === 'FROZEN_OR_NOT_USED'))
  assert.ok(rows.some((row) => row.capability === 'Distribution submission' && row.pilotUse === 'FROZEN_OR_NOT_USED'))
  assert.ok(rows.some((row) => row.capability === 'Marketing journey activation' && row.pilotUse === 'FROZEN_OR_NOT_USED'))
})

test('Pilot package preserves controlled thaw boundary', () => {
  const pkg = buildPilotPackage()
  assert.equal(pkg.singleOperatorTest, 'PASS WITH GAPS')
  assert.equal(pkg.humanOperatingLayerPilotTest, 'PASS WITH GAPS')
  assert.equal(pkg.waveCDecisionCount, 5)
})
