import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  architectureDelta,
  approvedCampaignServiceSkus,
  artifacts,
  authorizedTables,
  buildMarketingPackage,
  campaignServiceRows,
  classifyRequirements,
  requirementRows,
  runMarketingSyntheticValidation,
} from './marketing_canon_reconciliation.mjs'

const catalog = readFileSync('lib/commercial/catalog.ts', 'utf8')

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

test('campaign services are governed SKUs without duplicate catalog authority', () => {
  assert.equal(campaignServiceRows.filter((row) => row.disposition === 'APPROVED_GOVERNED_SKU').length, 2)
  assert.deepEqual(approvedCampaignServiceSkus.map((item) => item.sku).sort(), ['JMP-MKT-ARC', 'JMP-MKT-PAID-SOCIAL-SETUP'].sort())
  assert.equal((catalog.match(/JMP-MKT-ARC/g) || []).length >= 2, true)
  assert.equal((catalog.match(/JMP-MKT-PAID-SOCIAL-SETUP/g) || []).length >= 2, true)
  assert.ok(catalog.includes('marketingCampaignServices'))
  assert.ok(catalog.includes('spendAuthorizationRequired: true'))
})

test('marketing package is ready with holds and no live actions', () => {
  const pkg = buildMarketingPackage()
  assert.equal(pkg.marketingSyntheticValidation, '20 / 20 PASS')
  assert.equal(pkg.pilotBlockers, 0)
  assert.equal(pkg.intentionalLeaderReassessment, 'PILOT READY FOR LIMITED LIVE ACTIVATION')
  assert.equal(pkg.waveCApprovalsGranted, 5)
  assert.equal(pkg.approvedCampaignServices, 2)
  for (const value of Object.values(pkg.zeroes)) assert.equal(value, 0)
})

test('synthetic validation is exactly 20 of 20 pass', () => {
  const validation = runMarketingSyntheticValidation()
  assert.equal(validation.total, 20)
  assert.equal(validation.passed, 20)
  assert.ok(validation.results.every((row) => row.result === 'PASS'))
})
