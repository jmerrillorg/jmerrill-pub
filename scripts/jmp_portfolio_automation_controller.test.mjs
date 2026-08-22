#!/usr/bin/env node

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CONTROLLER_VERSION,
  buildWorkQueue,
  evaluatePortfolio,
  evaluatePortfolioRecord,
} from '../lib/publishing/portfolio/automation-controller.mjs'

const evaluatedOn = '2026-08-22T12:00:00Z'

test('eligible autonomous action is queued without a manual Cody trigger', () => {
  const result = evaluatePortfolioRecord({
    recordType: 'title',
    title: 'Line Ready Title',
    author: 'Author',
    titleStage: 'Line Ready',
    runtimeAvailable: true,
    modifiedOn: '2026-08-20T12:00:00Z',
  }, { evaluatedOn })

  assert.equal(result.controllerVersion, CONTROLLER_VERSION)
  assert.equal(result.bucket, 'AUTO_QUEUE_NOW')
  assert.equal(result.machineExecutable, 'YES')
  assert.equal(result.humanGateRequired, 'NO')
  assert.equal(result.waitingOn, 'None')
})

test('human author gate blocks automatic queueing', () => {
  const result = evaluatePortfolioRecord({
    recordType: 'title',
    title: 'Awaiting Author',
    author: 'Author',
    titleStage: 'Line Author Review',
    authorGateRequired: true,
    authorAction: 'Approve Line Edit',
  }, { evaluatedOn })

  assert.equal(result.bucket, 'WAITING_ON_AUTHOR')
  assert.equal(result.machineExecutable, 'NO')
  assert.equal(result.humanGateRequired, 'YES')
  assert.equal(result.authorActionRequired, 'YES')
})

test('payment option selected plus pricing lock surfaces missing agreement immediately', () => {
  const result = evaluatePortfolioRecord({
    recordType: 'prospect',
    title: 'Indomitable',
    author: 'Quanishia Dockery',
    packageAccepted: true,
    paymentOptionSelected: true,
    pricingLocked: true,
    agreementGenerated: false,
    notes: 'Professional package; payment option selected; pricing locked',
  }, { evaluatedOn })

  assert.equal(result.bucket, 'SYSTEM_ATTENTION_REQUIRED')
  assert.equal(result.systemAttention, 'AGREEMENT_GENERATION_RUNTIME_UNCONFIRMED')
  assert.equal(result.nextGovernedAction, 'Repair agreement-generation runtime or generate through governed operator path')
})

test('safe agreement runtime queues contract generation from locked snapshot', () => {
  const result = evaluatePortfolioRecord({
    recordType: 'prospect',
    title: 'Contract Ready',
    author: 'Author',
    packageAccepted: true,
    paymentOptionSelected: true,
    pricingLocked: true,
    agreementGenerated: false,
    agreementGenerationSafe: true,
  }, { evaluatedOn })

  assert.equal(result.bucket, 'AUTO_QUEUE_NOW')
  assert.equal(result.nextGovernedAction, 'Generate governed agreement/addendum from locked commercial snapshot')
})

test('agreement and first payment trigger Joined-the-Family consequence idempotent queue', () => {
  const result = evaluatePortfolioRecord({
    recordType: 'title',
    title: 'Atta / Untitled',
    author: 'Atta Boateng',
    agreementExecuted: true,
    initialPaymentReceived: true,
    joinedFamily: false,
    runtimeAvailable: true,
  }, { evaluatedOn })

  assert.equal(result.bucket, 'AUTO_QUEUE_NOW')
  assert.match(result.nextGovernedAction, /Joined-the-Family/)
  assert.equal(result.titleLifecycleStage, 'AUTHOR_ONBOARDING')
})

test('known Joined-the-Family action with unproven runtime becomes system attention', () => {
  const result = evaluatePortfolioRecord({
    recordType: 'title',
    title: 'Commercial Complete But Runtime Unknown',
    author: 'Author',
    agreementExecuted: true,
    initialPaymentReceived: true,
    joinedFamily: false,
  }, { evaluatedOn })

  assert.equal(result.bucket, 'SYSTEM_ATTENTION_REQUIRED')
  assert.equal(result.machineExecutable, 'NO')
  assert.equal(result.systemAttention, 'JOINED_FAMILY_RUNTIME_UNCONFIRMED')
})

test('duplicate event evaluation produces one stable queue item', () => {
  const evaluation = evaluatePortfolio([
    {
      recordType: 'title',
      titleId: 'title-1',
      title: 'Copy Complete',
      author: 'Author',
      titleStage: 'Copyediting Complete',
      runtimeAvailable: true,
      modifiedOn: '2026-08-01T12:00:00Z',
    },
  ], { evaluatedOn })
  const first = buildWorkQueue(evaluation)
  const second = buildWorkQueue(evaluation)

  assert.equal(first.length, 1)
  assert.deepEqual(first, second)
  assert.equal(first[0].jobId, 'JMPAC-title-1-book-production-queue-layout-work-item-a')
})

test('failure with commissioned runtime retries before human exception', () => {
  const result = evaluatePortfolioRecord({
    recordType: 'title',
    title: 'Relay Failed Title',
    author: 'Author',
    titleStage: 'Author package failed',
    runtime: 'Author package dispatcher commissioned',
  }, { evaluatedOn })

  assert.equal(result.bucket, 'SYSTEM_RECOVERY_IN_PROGRESS')
  assert.equal(result.systemExecutionState, 'RETRYING')
  assert.equal(result.machineExecutable, 'YES')
})

test('provider backpressure is an execution state, not unexplained idle', () => {
  const result = evaluatePortfolioRecord({
    recordType: 'title',
    title: 'Long Form Manuscript',
    author: 'Author',
    titleStage: 'Line Editing 429 provider capacity',
  }, { evaluatedOn })

  assert.equal(result.bucket, 'SYSTEM_RECOVERY_IN_PROGRESS')
  assert.equal(result.waitingOn, 'External')
  assert.equal(result.systemExecutionState, 'BACKPRESSURE')
})

test('unknown unmapped active title becomes system attention instead of forgotten', () => {
  const result = evaluatePortfolioRecord({
    recordType: 'title',
    title: 'A Year Walking With Him',
    author: 'Author',
    titleStage: '',
    modifiedOn: '2026-08-01T12:00:00Z',
  }, { evaluatedOn })

  assert.equal(result.bucket, 'SYSTEM_ATTENTION_REQUIRED')
  assert.equal(result.systemAttention, 'NO_VALID_WAIT_OR_ACTION')
  assert.equal(result.slaOverdue, 'OVERDUE')
})

test('one-title repair evaluation includes all affected titles in the same run', () => {
  const evaluation = evaluatePortfolio([
    { recordType: 'title', title: 'The General’s Will', author: 'Iyorwuese Hagher', titleStage: 'Line Ready', runtimeAvailable: true },
    { recordType: 'title', title: 'The Long Watch', author: 'Jackie Smith Jr', titleStage: 'Line Ready', runtimeAvailable: true },
  ], { evaluatedOn })

  assert.equal(evaluation.autoExecutable.length, 2)
  assert.equal(evaluation.counts.unexplainedIdle, 0)
})

test('priority override changes queue order but not gates', () => {
  const evaluation = evaluatePortfolio([
    { recordType: 'title', titleId: 'low', title: 'Old Ready', author: 'Author', titleStage: 'Line Ready', runtimeAvailable: true, modifiedOn: '2026-08-01T12:00:00Z' },
    { recordType: 'title', titleId: 'gate', title: 'Needs Author', author: 'Author', titleStage: 'Author Review', authorGateRequired: true, modifiedOn: '2026-08-01T12:00:00Z' },
    { recordType: 'title', titleId: 'p0', title: 'Agreement Gap', author: 'Author', packageAccepted: true, paymentOptionSelected: true, pricingLocked: true, agreementGenerated: true, agreementExecuted: true, initialPaymentReceived: true, joinedFamily: false, runtimeAvailable: true },
  ], { evaluatedOn })
  const queue = buildWorkQueue(evaluation)

  assert.equal(queue.length, 2)
  assert.equal(queue[0].titleId, 'p0')
  assert.equal(evaluation.items.find((item) => item.titleId === 'gate').machineExecutable, 'NO')
})

test('portfolio summary separates active titles, prospects, authors, waits, and attention', () => {
  const evaluation = evaluatePortfolio([
    { recordType: 'title', title: 'Ready', author: 'A', titleStage: 'Line Ready', runtimeAvailable: true },
    { recordType: 'prospect', title: 'Offer', author: 'B', packageAccepted: true },
    { recordType: 'author', title: 'Published Book', author: 'C', titleStage: 'Published' },
    { recordType: 'title', title: 'Gap', author: 'D' },
  ], { evaluatedOn })

  assert.equal(evaluation.counts.activeTitles, 2)
  assert.equal(evaluation.counts.activeProspects, 1)
  assert.equal(evaluation.counts.activeAuthors, 1)
  assert.equal(evaluation.counts.waitingOnAuthor, 1)
  assert.equal(evaluation.counts.waitingOnJmp, 1)
  assert.equal(evaluation.counts.postPublication, 1)
})
