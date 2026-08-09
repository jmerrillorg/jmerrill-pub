import test from 'node:test'
import assert from 'node:assert/strict'

import {
  architectureDelta,
  artifacts,
  authorizedTables,
  buildMarketingPackage,
  campaignServiceRows,
  classifyRequirements,
  requirementRows,
  runMarketingSyntheticValidation,
} from './marketing_canon_reconciliation.mjs'

test('marketing doctrine reconciliation covers all seven artifacts', () => {
  assert.equal(artifacts.length, 7)
  for (const artifact of artifacts) {
    assert.ok(requirementRows.some((row) => row.artifact === artifact), artifact)
  }
})

test('marketing reconciliation does not authorize duplicate authorities or tables', () => {
  assert.equal(authorizedTables.jm1_title, 'NOT_CREATED')
  assert.equal(authorizedTables.jm1_marketingstage, 'NOT_CREATED')
  assert.equal(authorizedTables.jm1_addonservice, 'NOT_CREATED')
  const delta = architectureDelta()
  assert.equal(delta.newMarketingTablesRequired, 0)
  assert.equal(delta.proposedDuplicateTablesRejected, 3)
  assert.equal(delta.newTopLevelPublishingCapabilities, 0)
})

test('marketing artifact classifications are explicit', () => {
  const counts = classifyRequirements()
  assert.equal(Object.values(counts).reduce((sum, value) => sum + value, 0), requirementRows.length)
  assert.ok(counts.BUSINESS_RULE_ENHANCEMENT > 0)
  assert.ok(counts.RUNTIME_EXTENSION_REQUIRED > 0)
  assert.ok(counts.REJECT_DUPLICATIVE >= 3)
})

test('campaign services remain candidates and do not silently become catalog SKUs', () => {
  assert.equal(campaignServiceRows.filter((row) => row.disposition === 'NEW_CATALOG_CANDIDATE').length, 2)
  assert.ok(campaignServiceRows.every((row) => row.disposition !== 'EXISTING_CANONICAL_SKU'))
})

test('marketing package is ready with holds and no live actions', () => {
  const pkg = buildMarketingPackage()
  assert.equal(pkg.marketingSyntheticValidation, '20 / 20 PASS')
  assert.equal(pkg.pilotBlockers, 0)
  assert.equal(pkg.intentionalLeaderReassessment, 'PILOT READY WITH HOLDS')
  for (const value of Object.values(pkg.zeroes)) assert.equal(value, 0)
})

test('synthetic validation is exactly 20 of 20 pass', () => {
  const validation = runMarketingSyntheticValidation()
  assert.equal(validation.total, 20)
  assert.equal(validation.passed, 20)
  assert.ok(validation.results.every((row) => row.result === 'PASS'))
})
