import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluatePortfolio } from '../lib/publishing/portfolio/automation-controller.mjs'
import { reconcileWave2 } from '../lib/publishing/portfolio/automation-wave2.mjs'
import { reconcileWave3 } from '../lib/publishing/portfolio/automation-wave3.mjs'

test('Wave 3 converts generic system attention into specific actionable classes', () => {
  const source = emptySource()
  const records = [
    {
      author: 'Sample Author',
      title: 'Unmapped Title',
      titleStage: 'DATA_GAP',
      modifiedOn: '2026-08-01T00:00:00Z',
      createdOn: '2026-08-01T00:00:00Z',
      evidence: ['test:record'],
    },
  ]
  const evaluation = evaluatePortfolio(records, { evaluatedOn: '2026-08-22T00:00:00Z' })
  const wave2 = reconcileWave2({ records, evaluation, source })
  const wave3 = reconcileWave3({ records, evaluation, source, wave2 })

  assert.equal(wave3.summary.genericSystemAttention, 0)
  assert.equal(wave3.items[0].wave3SystemAttentionClass, 'MISSING_CANONICAL_LINK')
  assert.equal(wave3.items[0].wave3AutomationClass, 'CREATE_OPERATOR_TASK_FOR_EXTERNAL_MANUAL_STEP')
})

test('Wave 3 preserves author decisions as hard waits', () => {
  const source = emptySource()
  const records = [
    {
      author: 'Author Gate',
      title: 'Decision Title',
      titleStage: 'Author Review',
      editorialStatus: 'Awaiting author approval',
      authorGateRequired: true,
      authorAction: 'Approve or request revisions',
      modifiedOn: '2026-08-20T00:00:00Z',
      createdOn: '2026-08-20T00:00:00Z',
      evidence: ['test:gate'],
    },
  ]
  const evaluation = evaluatePortfolio(records, { evaluatedOn: '2026-08-22T00:00:00Z' })
  const wave2 = reconcileWave2({ records, evaluation, source })
  const wave3 = reconcileWave3({ records, evaluation, source, wave2 })

  assert.equal(wave3.items[0].wave3WaitingState, 'WAITING_ON_AUTHOR')
  assert.equal(wave3.items[0].wave3AutomationClass, 'NONE')
})

test('Wave 3 does not park structural title-link defects on prospect wait', () => {
  const source = emptySource()
  const records = [
    {
      author: 'Quanishia Dockery',
      title: 'Indomitable',
      titleStage: 'Inquiry Intake',
      substage: 'Prospect Response',
      waitingOn: 'Prospect',
      nextAction: 'Bind canonical title/project link',
      modifiedOn: '2026-08-22T00:00:00Z',
      createdOn: '2026-08-20T00:00:00Z',
      evidence: ['test:intake'],
    },
  ]
  const evaluation = evaluatePortfolio(records, { evaluatedOn: '2026-08-22T00:00:00Z' })
  const wave2 = reconcileWave2({ records, evaluation, source })
  const overridden = {
    ...wave2,
    items: wave2.items.map((item) => ({
      ...item,
      rootCause: 'MISSING_CANONICAL_TITLE_LINK',
      wave2WaitingState: 'WAITING_ON_PROSPECT',
      nextGovernedAction: 'Bind canonical title/project link',
    })),
  }
  const wave3 = reconcileWave3({ records, evaluation, source, wave2: overridden })

  assert.equal(wave3.items[0].wave3WaitingState, 'WAITING_ON_JMP')
  assert.equal(wave3.items[0].wave3AutomationClass, 'CREATE_OPERATOR_TASK_FOR_EXTERNAL_MANUAL_STEP')
})

test('Wave 3 maps line-ready titles to commissioned editorial queue class', () => {
  const source = emptySource()
  const records = [
    {
      author: 'J Merrill Publishing',
      title: "The General's Will",
      titleStage: 'Line',
      currentArtifact: 'line-source.docx',
      checksum: 'abc123',
      runtime: 'Editorial runtime / Foundry worker',
      runtimeAvailable: true,
      modifiedOn: '2026-08-22T00:00:00Z',
      createdOn: '2026-08-01T00:00:00Z',
      evidence: ['test:line'],
    },
  ]
  const evaluation = evaluatePortfolio(records, { evaluatedOn: '2026-08-22T00:00:00Z' })
  const wave2 = reconcileWave2({ records, evaluation, source })
  const wave3 = reconcileWave3({ records, evaluation, source, wave2 })

  assert.equal(wave3.items[0].wave3WaitingState, 'AUTO_EXECUTABLE')
  assert.equal(wave3.items[0].wave3AutomationClass, 'QUEUE_COMMISSIONED_EDITORIAL_JOB')
})

test('Wave 3 generates contracts only from locked pricing without an agreement', () => {
  const source = emptySource({
    opportunities: [
      {
        opportunityid: 'opp-1',
        name: 'Indomitable',
        jm1pub_projecttitle: 'Indomitable',
        jm1_m6packageselectionstatus: 'Accepted',
        jm1_m6selectedinstallmentcount: 6,
        jm1_m6agreementpreparationstatus: '',
      },
    ],
  })
  const records = [
    {
      author: 'Quanishia Dockery',
      title: 'Indomitable',
      titleStage: 'Commercial Activation',
      packageAccepted: true,
      paymentOptionSelected: true,
      pricingLocked: true,
      agreementGenerated: false,
      modifiedOn: '2026-08-22T00:00:00Z',
      createdOn: '2026-08-20T00:00:00Z',
      evidence: ['test:opp'],
    },
  ]
  const evaluation = evaluatePortfolio(records, { evaluatedOn: '2026-08-22T00:00:00Z' })
  const wave2 = reconcileWave2({ records, evaluation, source })
  const wave3 = reconcileWave3({ records, evaluation, source, wave2 })

  assert.equal(wave3.items[0].wave3AutomationClass, 'GENERATE_CONTRACT_FROM_LOCKED_PRICING')
  assert.equal(wave3.items[0].wave3WaitingState, 'AUTO_EXECUTABLE')
})

test('Wave 3 idempotently marks already recorded actions', () => {
  const source = emptySource()
  const records = [
    {
      author: 'J Merrill Publishing',
      title: 'The Long Watch',
      titleStage: 'Line',
      currentArtifact: 'line-source.docx',
      checksum: 'abc123',
      runtime: 'Editorial runtime / Foundry worker',
      runtimeAvailable: true,
      modifiedOn: '2026-08-22T00:00:00Z',
      createdOn: '2026-08-01T00:00:00Z',
      evidence: ['test:line'],
    },
  ]
  const evaluation = evaluatePortfolio(records, { evaluatedOn: '2026-08-22T00:00:00Z' })
  const wave2 = reconcileWave2({ records, evaluation, source })
  const preliminary = reconcileWave3({ records, evaluation, source, wave2 })
  const actionKey = preliminary.items[0].wave3ActionKey
  const replay = reconcileWave3({ records, evaluation, source, wave2, actionKeys: new Set([actionKey]) })

  assert.equal(replay.items[0].wave3ActionTaken, 'QUEUE_ALREADY_PRESENT')
})

test('Wave 3 summary can reduce system attention without claiming full commissioning', () => {
  const source = emptySource()
  const records = [
    {
      author: 'Legacy Author',
      title: 'Legacy Needs Link',
      titleStage: 'DATA_GAP',
      modifiedOn: '2026-07-01T00:00:00Z',
      createdOn: '2026-07-01T00:00:00Z',
      evidence: ['test:legacy'],
    },
    {
      author: 'Author Gate',
      title: 'Needs Author',
      titleStage: 'Author Review',
      editorialStatus: 'Awaiting author approval',
      authorGateRequired: true,
      authorAction: 'Approve or request revisions',
      modifiedOn: '2026-08-20T00:00:00Z',
      createdOn: '2026-08-20T00:00:00Z',
      evidence: ['test:gate'],
    },
  ]
  const evaluation = evaluatePortfolio(records, { evaluatedOn: '2026-08-22T00:00:00Z' })
  const wave2 = reconcileWave2({ records, evaluation, source })
  const wave3 = reconcileWave3({ records, evaluation, source, wave2 })

  assert.equal(wave3.summary.genericSystemAttention, 0)
  assert.ok(wave3.summary.operatorTasks >= 1)
  assert.equal(wave3.summary.systemAttentionAfter, 0)
})

function emptySource(overrides = {}) {
  return {
    titles: [],
    intakes: [],
    opportunities: [],
    authorProfiles: [],
    stages: [],
    gates: [],
    artifacts: [],
    productionProjects: [],
    productionTasks: [],
    logs: [],
    counts: {
      titles: 0,
      intakes: 0,
      opportunities: 0,
      authorProfiles: 0,
      stages: 0,
      gates: 0,
      artifacts: 0,
      productionProjects: 0,
      productionTasks: 0,
      logsRead: 0,
    },
    ...overrides,
  }
}
