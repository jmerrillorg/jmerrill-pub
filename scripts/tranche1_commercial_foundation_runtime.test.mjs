import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCloseout,
  commercialStates,
  loadCatalogProjection,
  nativeDynamicsObjects,
  runInternalValidation,
  stripePaymentStates,
} from './tranche1_commercial_foundation_runtime.mjs'

test('Tranche 1 catalog projection is idempotent and duplicate-free', () => {
  const first = loadCatalogProjection()
  const second = loadCatalogProjection()

  assert.equal(first.products.length, 20)
  assert.equal(first.priceListItems.length, 22)
  assert.deepEqual(first.products, second.products)
  assert.deepEqual(first.duplicateProjectedSkus, [])
})

test('Tranche 1 validates native Dynamics commercial foundation objects', () => {
  for (const table of ['lead', 'opportunity', 'product', 'pricelevel', 'productpricelevel', 'quote', 'quotedetail', 'salesorder', 'salesorderdetail', 'task']) {
    assert.ok(nativeDynamicsObjects.includes(table), `${table} missing`)
  }
})

test('Tranche 1 commercial and payment state vocabularies are fail-closed capable', () => {
  assert.ok(commercialStates.includes('FULFILLMENT_AUTHORIZED'))
  assert.ok(commercialStates.includes('EXCEPTION_REVIEW_REQUIRED'))
  assert.ok(commercialStates.includes('ON_HOLD'))
  assert.ok(stripePaymentStates.includes('PAID'))
  assert.ok(stripePaymentStates.includes('EXCEPTION_REQUIRED'))
  assert.ok(stripePaymentStates.includes('STALE'))
})

test('Tranche 1 synthetic internal validation passes 20 of 20 scenarios', () => {
  const validation = runInternalValidation()
  assert.equal(validation.result, 'PASS')
  assert.equal(validation.passed, 20)
  assert.equal(validation.total, 20)
})

test('Tranche 1 closeout preserves boundaries', () => {
  const closeout = buildCloseout()
  assert.equal(closeout.liveAuthorsUsed, 0)
  assert.equal(closeout.liveTitlesUsed, 0)
  assert.equal(closeout.pr431TitlesUsed, 0)
  assert.equal(closeout.agreementTemplatesChanged, 0)
  assert.equal(closeout.businessCentralPosting, 0)
  assert.equal(closeout.strategicMarketingActivation, 0)
  assert.equal(closeout.titlePfRuntime, 'NOT STARTED')
  assert.equal(closeout.clientTitleAutomation, 'FROZEN')
  assert.equal(closeout.tranche2, 'NOT STARTED')
  assert.equal(closeout.operatorBurden.before, 12)
  assert.equal(closeout.operatorBurden.after, 5)
})
