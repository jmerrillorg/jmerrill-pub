import assert from 'node:assert/strict'
import test from 'node:test'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)
const {
  PUBLISHING_DEPENDENCY_CLASSES,
  PUBLISHING_STAGE_DEPENDENCY_MODEL,
  classifyPostPublicationRequest,
  evaluateDevelopmentalEntry,
} = jiti('../lib/publishing/lifecycle/workstream-dependency-model.ts')

test('all 16 human-facing stages declare explicit dependency policy', () => {
  assert.equal(Object.keys(PUBLISHING_STAGE_DEPENDENCY_MODEL).length, 16)
  for (const [stageId, policy] of Object.entries(PUBLISHING_STAGE_DEPENDENCY_MODEL)) {
    assert.equal(policy.stageId, stageId)
    assert.deepEqual(Object.keys(policy).sort(), [
      'authorDependencies', 'cadenceDependencies', 'hardPrerequisites', 'parallelizableWith',
      'providerDependencies', 'softDependencies', 'stageId',
    ])
  }
})

test('dependency classification taxonomy is complete', () => {
  assert.deepEqual(PUBLISHING_DEPENDENCY_CLASSES, [
    'HARD_PREREQUISITE', 'SOFT_DEPENDENCY', 'PARALLELIZABLE',
    'AUTHOR_DEPENDENCY', 'PROVIDER_DEPENDENCY', 'CADENCE_DEPENDENCY',
  ])
})

test('agreement, payment, and manuscript authorize Developmental while onboarding is incomplete', () => {
  assert.deepEqual(evaluateDevelopmentalEntry({
    agreementExecuted: true,
    paymentOrPackageAuthoritySatisfied: true,
    authoritativeManuscriptAvailable: true,
    onboardingComplete: false,
  }), {
    actionable: true,
    blockers: [],
    onboardingBlocksDevelopmentalEditing: false,
    parallelWorkstreams: ['AUTHOR_ONBOARDING', 'DEVELOPMENTAL_EDITING'],
  })
})

test('author-copy request remains post-publication fulfillment and never regresses production', () => {
  assert.deepEqual(classifyPostPublicationRequest({
    productionComplete: true,
    distributionComplete: true,
    requestType: 'AUTHOR_COPIES',
  }), {
    productionState: 'CLOSED',
    workstream: 'POST_PUBLICATION_FULFILLMENT',
    regressPipeline: false,
  })
})
