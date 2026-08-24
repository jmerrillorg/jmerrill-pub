#!/usr/bin/env node

import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluatePortfolio } from '../lib/publishing/portfolio/automation-controller.mjs'
import { reconcileWave2 } from '../lib/publishing/portfolio/automation-wave2.mjs'

const evaluatedOn = '2026-08-22T12:00:00Z'
const emptySource = {
  titles: [],
  intakes: [],
  opportunities: [],
  stages: [],
  gates: [],
  artifacts: [],
  productionProjects: [],
  productionTasks: [],
  authorProfiles: [],
  logs: [],
}

test('Wave 2 splits generic system attention into specific root causes', () => {
  const evaluation = evaluatePortfolio([
    { recordType: 'title', titleId: 't1', title: 'Legacy Bare Row', author: 'Author', modifiedOn: '2026-07-01T12:00:00Z' },
    { recordType: 'title', titleId: 't2', title: 'Production Gap', author: 'Author', titleStage: 'Book Production', modifiedOn: '2026-08-01T12:00:00Z' },
  ], { evaluatedOn })
  const result = reconcileWave2({ records: [], evaluation, source: emptySource })

  assert.equal(result.rootCauseDistribution.LEGACY_RECORD_RECONCILIATION, 1)
  assert.equal(result.rootCauseDistribution.MISSING_ARTIFACT_AUTHORITY, 1)
})

test('Indomitable locked pricing without agreement becomes autonomous contract queue candidate', () => {
  const evaluation = evaluatePortfolio([
    { recordType: 'prospect', title: 'Indomitable', author: 'Quanishia Dockery', waitingOn: 'Prospect' },
  ], { evaluatedOn })
  const source = {
    ...emptySource,
    opportunities: [{
      opportunityid: 'opp-indomitable',
      name: 'Indomitable',
      jm1pub_projecttitle: 'Indomitable',
      jm1_m6packageselectionstatus: 'PACKAGE_ACCEPTED',
      jm1_m6paymentoptionselectionstatus: 'PAYMENT_OPTION_SELECTED',
      jm1_m6selectedinstallmentcount: 12,
      jm1_m6selectedpaymentamount: 400,
      jm1_m6agreementpreparationstatus: '',
    }],
  }
  const result = reconcileWave2({ records: [], evaluation, source })
  const item = result.items[0]

  assert.equal(item.wave2WaitingState, 'AUTO_EXECUTABLE')
  assert.equal(item.automationClass, 'GENERATE_CONTRACT_FROM_LOCKED_PRICING')
  assert.match(item.nextGovernedAction, /agreement/)
})

test('Indomitable ready for manual signature send is a Jackie manual gate, not contract generation', () => {
  const evaluation = evaluatePortfolio([
    { recordType: 'prospect', title: 'Indomitable', author: 'Quanishia Dockery', waitingOn: 'Prospect' },
  ], { evaluatedOn })
  const source = {
    ...emptySource,
    opportunities: [{
      opportunityid: 'opp-indomitable',
      name: 'Indomitable — Professional Publishing Package — Quanisha Dockery',
      jm1pub_projecttitle: 'Indomitable',
      jm1_m6packageselectionstatus: 'PACKAGE_SELECTED',
      jm1_m6paymentoptionselectionstatus: 'PAYMENT_OPTION_SELECTED',
      jm1_m6selectedinstallmentcount: 24,
      jm1_m6selectedpaymentamount: 209.06,
      jm1_m6agreementpreparationstatus: 'READY_FOR_MANUAL_SIGNATURE_SEND',
    }],
  }
  const result = reconcileWave2({ records: [], evaluation, source })
  const item = result.items[0]

  assert.equal(item.wave2WaitingState, 'WAITING_ON_JMP')
  assert.equal(item.automationClass, 'NONE')
  assert.match(item.nextGovernedAction, /Manual signature send prepared/)
})

test('known line-ready titles are queued by class instead of waiting on Jackie memory', () => {
  const evaluation = evaluatePortfolio([
    { recordType: 'title', titleId: 'gw', title: "The General's Will and Last Testament", author: 'Iyorwuese Hagher', titleStage: 'Editorial Production', runtimeAvailable: true },
    { recordType: 'title', titleId: 'lw', title: 'The Long Watch', author: 'Jackie Smith Jr', titleStage: 'Editorial Production', runtimeAvailable: true },
  ], { evaluatedOn })
  const result = reconcileWave2({ records: [], evaluation, source: emptySource })

  assert.equal(result.queueable.length, 2)
  assert.ok(result.queueable.every((item) => item.automationClass === 'QUEUE_COMMISSIONED_JOB'))
})

test('human gates remain hard stops', () => {
  const evaluation = evaluatePortfolio([
    { recordType: 'title', titleId: 'atta', title: 'Untitled', author: 'Atta Boateng', authorGateRequired: true, authorAction: 'Review Editorial Recommendation' },
  ], { evaluatedOn })
  const result = reconcileWave2({ records: [], evaluation, source: emptySource })

  assert.equal(result.items[0].wave2WaitingState, 'WAITING_ON_AUTHOR')
  assert.equal(result.items[0].automationClass, 'NONE')
})
