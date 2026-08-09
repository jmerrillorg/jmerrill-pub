import test from 'node:test'
import assert from 'node:assert/strict'

import {
  approvedCampaignServiceSkus,
  evaluateSpendAuthorization,
  evaluateWaveCMarketing,
} from './marketing_canon_reconciliation.mjs'

test('no external cost continues without spend approval', () => {
  assert.deepEqual(evaluateSpendAuthorization({ externalCost: false }), {
    state: 'COST_NOT_APPLICABLE',
    eligible: true,
  })
})

test('configured budget is not spend authority', () => {
  const result = evaluateSpendAuthorization({
    externalCost: true,
    configuredBudget: 250,
    track: 'Hybrid',
    costOwner: 'AUTHOR_COST',
    stopLossDefined: true,
  })
  assert.equal(result.state, 'COST_HOLD')
  assert.equal(result.eligible, false)
})

test('Hybrid author-owned cost requires author approval', () => {
  assert.equal(evaluateSpendAuthorization({
    externalCost: true,
    track: 'Hybrid',
    costOwner: 'AUTHOR_COST',
    stopLossDefined: true,
    objective: 'Awareness',
    successMetric: 'Clicks',
    reportingCadence: 'Weekly',
  }).state, 'AUTHOR_APPROVAL_REQUIRED')
})

test('Traditional and JM Signature JMP-owned cost requires Jackie approval', () => {
  for (const track of ['Traditional', 'JM Signature']) {
    assert.equal(evaluateSpendAuthorization({
      externalCost: true,
      track,
      costOwner: 'JMP_COST',
      stopLossDefined: true,
      objective: 'Awareness',
      successMetric: 'Clicks',
      reportingCadence: 'Weekly',
    }).state, 'JMP_APPROVAL_REQUIRED')
  }
})

test('shared cost requires both author and Jackie approval', () => {
  assert.equal(evaluateSpendAuthorization({
    externalCost: true,
    track: 'Hybrid',
    costOwner: 'SHARED_COST',
    authorApproved: true,
    approvalEvidence: 'AUTHOR',
    stopLossDefined: true,
    objective: 'Awareness',
    successMetric: 'Clicks',
    reportingCadence: 'Weekly',
  }).state, 'SHARED_APPROVAL_REQUIRED')
})

test('paid campaigns require stop loss and campaign controls', () => {
  assert.equal(evaluateSpendAuthorization({
    externalCost: true,
    track: 'Hybrid',
    costOwner: 'AUTHOR_COST',
    authorApproved: true,
    approvalEvidence: 'AUTHOR',
  }).state, 'PAID_CAMPAIGN_HOLD')
})

test('Wave C marketing remains held without pilot activation permission', () => {
  assert.equal(evaluateWaveCMarketing({
    externalCost: false,
    lifecycleEligible: true,
    marketingLayer: 'Organic Launch',
    trackRuleSatisfied: true,
    costOwnerKnown: true,
    consentValid: true,
    contentApproved: true,
    pilotActivationPermitsAction: false,
  }), 'HOLD / NOT ELIGIBLE')
})

test('approved Campaign Service SKUs do not create spend authority', () => {
  assert.equal(approvedCampaignServiceSkus.length, 2)
  for (const service of approvedCampaignServiceSkus) {
    assert.equal(service.layer, 'CAMPAIGN_SERVICES')
    assert.match(service.trackEligibility, /Hybrid/)
    assert.match(service.trackEligibility, /Traditional/)
    assert.equal(evaluateSpendAuthorization({
      externalCost: true,
      track: 'Hybrid',
      costOwner: 'AUTHOR_COST',
      configuredBudget: 100,
      stopLossDefined: true,
    }).eligible, false, `${service.sku} must still require spend approval`)
  }
})
