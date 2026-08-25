import assert from 'node:assert/strict'
import test from 'node:test'

const {
  AUTHOR_RESPONSE_ESCALATION_DEFAULTS,
  BOOK_TYPE_MULTIPLIERS,
  STAGE_BASELINE_CONFIGURATION,
  applyAuthorResponseCadenceRestart,
  calculateBusinessDays,
  calculateEditorialCadence,
  evaluateScheduledEligibility,
  resolveStageBaseline,
  scoreComplexity,
  wordCountBand,
} = await import('../lib/server/editorial-cadence-engine.ts')

function baseInput(overrides = {}) {
  return {
    titleId: 'title-001',
    stageId: 'stage-001',
    packageId: 'package-001',
    stage: 'LINE_EDITING',
    stageCompletedAt: '2026-08-10T14:00:00.000Z',
    now: '2026-08-10T14:00:00.000Z',
    manuscript: {
      artifactId: 'artifact-001',
      artifactChecksum: 'sha256:artifact-001',
      wordCount: 45000,
      countedAt: '2026-08-10T13:30:00.000Z',
      countMethod: 'GOVERNED_STAGE_ENTRY_ARTIFACT_COUNT',
    },
    bookType: 'Leadership or business',
    complexity: {
      complexityFactors: [],
      assignedBy: 'Jackie Smith, Jr.',
      assignedAt: '2026-08-10T13:45:00.000Z',
    },
    ...overrides,
  }
}

test('word-count bands honor canonical boundaries', () => {
  assert.deepEqual(wordCountBand(19999), { band: 'SMALL', multiplier: 0.75 })
  assert.deepEqual(wordCountBand(20000), { band: 'SMALL', multiplier: 0.75 })
  assert.deepEqual(wordCountBand(20001), { band: 'STANDARD', multiplier: 1 })
  assert.deepEqual(wordCountBand(59999), { band: 'STANDARD', multiplier: 1 })
  assert.deepEqual(wordCountBand(60000), { band: 'STANDARD', multiplier: 1 })
  assert.deepEqual(wordCountBand(60001), { band: 'LARGE', multiplier: 1.25 })
  assert.deepEqual(wordCountBand(99999), { band: 'LARGE', multiplier: 1.25 })
  assert.deepEqual(wordCountBand(100000), { band: 'LARGE', multiplier: 1.25 })
  assert.deepEqual(wordCountBand(100001), { band: 'EXTENDED', multiplier: 1.5 })
})

test('stage baselines include every governed stage and profile', () => {
  const expected = new Map([
    ['EDITORIAL_REVIEW/standard', 2],
    ['EDITORIAL_REVIEW/complex', 3],
    ['DEVELOPMENTAL_EDITING/children-picture-book', 3],
    ['DEVELOPMENTAL_EDITING/poetry', 4],
    ['DEVELOPMENTAL_EDITING/devotional', 4],
    ['DEVELOPMENTAL_EDITING/standard-nonfiction', 5],
    ['DEVELOPMENTAL_EDITING/memoir-leadership', 6],
    ['DEVELOPMENTAL_EDITING/novel', 7],
    ['DEVELOPMENTAL_EDITING/anthology-compilation', 8],
    ['DEVELOPMENTAL_EDITING/extended-enterprise', 10],
    ['LINE_EDITING/standard', 5],
    ['LINE_EDITING/complex', 7],
    ['COPYEDITING/standard', 4],
    ['COPYEDITING/complex', 6],
    ['PROOFREADING/standard', 3],
    ['PROOFREADING/complex', 4],
    ['INTERIOR_LAYOUT/page-layout-standard', 3],
    ['INTERIOR_LAYOUT/complex', 5],
    ['COVER_DESIGN/standard', 5],
    ['PRODUCTION_PROOF/standard', 3],
    ['DISTRIBUTION_PREPARATION/standard', 2],
    ['DISTRIBUTION_SUBMISSION/standard', 3],
    ['PUBLICATION_LAUNCH/standard', 3],
  ])
  for (const row of STAGE_BASELINE_CONFIGURATION) {
    const key = `${row.stage}/${row.profile}`
    assert.equal(row.baselineDays, expected.get(key), key)
    expected.delete(key)
  }
  assert.deepEqual([...expected.keys()], [])
})

test('book-type multipliers preserve the recovered canon values', () => {
  assert.equal(BOOK_TYPE_MULTIPLIERS['Standard text-forward manuscript'], 1)
  assert.equal(BOOK_TYPE_MULTIPLIERS["Children's picture book"], 1.25)
  assert.equal(BOOK_TYPE_MULTIPLIERS['Early reader'], 0.9)
  assert.equal(BOOK_TYPE_MULTIPLIERS['Poetry collection'], 1.1)
  assert.equal(BOOK_TYPE_MULTIPLIERS.Devotional, 1)
  assert.equal(BOOK_TYPE_MULTIPLIERS['Workbook or journal'], 1.3)
  assert.equal(BOOK_TYPE_MULTIPLIERS.Memoir, 1.1)
  assert.equal(BOOK_TYPE_MULTIPLIERS['Leadership or business'], 1)
  assert.equal(BOOK_TYPE_MULTIPLIERS['Novel or narrative fiction'], 1.2)
  assert.equal(BOOK_TYPE_MULTIPLIERS['Academic or research-heavy'], 1.35)
  assert.equal(BOOK_TYPE_MULTIPLIERS['Anthology or compilation'], 1.3)
  assert.equal(BOOK_TYPE_MULTIPLIERS['Illustrated nonfiction'], 1.25)
  assert.equal(BOOK_TYPE_MULTIPLIERS['Complex-accessibility title'], 1.3)
})

test('baseline floor and combined multiplier cap are applied after multiplication', () => {
  const floor = calculateBusinessDays({
    stageBaselineDays: 5,
    wordCountMultiplier: 0.75,
    bookTypeMultiplier: 0.9,
    complexityMultiplier: 1,
  })
  assert.equal(floor.calculatedBusinessDays, 5)

  const capped = calculateBusinessDays({
    stageBaselineDays: 10,
    wordCountMultiplier: 1.5,
    bookTypeMultiplier: 1.35,
    complexityMultiplier: 1.5,
  })
  assert.ok(Math.abs(capped.combinedMultiplier - 3.0375) < 0.000001)
  assert.equal(capped.appliedCombinedMultiplier, 2)
  assert.equal(capped.capApplied, true)
  assert.equal(capped.calculatedBusinessDays, 20)
})

test('complexity score requires named authority and maps 0-6 to approved multipliers', () => {
  assert.equal(scoreComplexity({ complexityScore: 0, complexityFactors: [], assignedBy: 'Jackie', assignedAt: '2026-08-10T00:00:00Z' }).multiplier, 1)
  assert.equal(scoreComplexity({ complexityScore: 1, complexityFactors: [], assignedBy: 'Jackie', assignedAt: '2026-08-10T00:00:00Z' }).multiplier, 1)
  assert.equal(scoreComplexity({ complexityScore: 2, complexityFactors: [], assignedBy: 'Jackie', assignedAt: '2026-08-10T00:00:00Z' }).multiplier, 1.15)
  assert.equal(scoreComplexity({ complexityScore: 3, complexityFactors: [], assignedBy: 'Jackie', assignedAt: '2026-08-10T00:00:00Z' }).multiplier, 1.15)
  assert.equal(scoreComplexity({ complexityScore: 4, complexityFactors: [], assignedBy: 'Jackie', assignedAt: '2026-08-10T00:00:00Z' }).multiplier, 1.3)
  assert.equal(scoreComplexity({ complexityScore: 5, complexityFactors: [], assignedBy: 'Jackie', assignedAt: '2026-08-10T00:00:00Z' }).multiplier, 1.3)
  assert.equal(scoreComplexity({ complexityScore: 6, complexityFactors: [], assignedBy: 'Jackie', assignedAt: '2026-08-10T00:00:00Z' }).multiplier, 1.5)
  assert.throws(() => scoreComplexity({ complexityFactors: [], assignedBy: '', assignedAt: '2026-08-10T00:00:00Z' }), /COMPLEXITY_AUTHORITY_MISSING/)
})

test('stage profile resolver covers recovered developmental and complexity profiles', () => {
  assert.equal(resolveStageBaseline(baseInput({ stage: 'DEVELOPMENTAL_EDITING', bookType: "Children's picture book" })).configuration.baselineDays, 3)
  assert.equal(resolveStageBaseline(baseInput({ stage: 'DEVELOPMENTAL_EDITING', bookType: 'Poetry collection' })).configuration.baselineDays, 4)
  assert.equal(resolveStageBaseline(baseInput({ stage: 'DEVELOPMENTAL_EDITING', bookType: 'Devotional' })).configuration.baselineDays, 4)
  assert.equal(resolveStageBaseline(baseInput({ stage: 'DEVELOPMENTAL_EDITING', bookType: 'Leadership or business' })).configuration.baselineDays, 6)
  assert.equal(resolveStageBaseline(baseInput({ stage: 'DEVELOPMENTAL_EDITING', bookType: 'Novel or narrative fiction' })).configuration.baselineDays, 7)
  assert.equal(resolveStageBaseline(baseInput({ stage: 'DEVELOPMENTAL_EDITING', bookType: 'Anthology or compilation' })).configuration.baselineDays, 8)
  assert.equal(resolveStageBaseline(baseInput({ stage: 'DEVELOPMENTAL_EDITING', bookType: 'Academic or research-heavy' })).configuration.baselineDays, 10)
  assert.equal(resolveStageBaseline(baseInput({
    stage: 'INTERIOR_LAYOUT',
    complexity: {
      complexityFactors: ['images-or-illustrations'],
      assignedBy: 'Jackie',
      assignedAt: '2026-08-10T00:00:00Z',
    },
  })).configuration.baselineDays, 5)
})

test('approved author response restarts next-stage cadence and preserves worker freeze', () => {
  const result = applyAuthorResponseCadenceRestart({
    ...baseInput({ stage: 'LINE_EDITING' }),
    responseClassification: 'APPROVED',
    currentStage: 'DEVELOPMENTAL_EDITING',
    nextStageIfApproved: 'LINE_EDITING',
  })
  assert.equal(result.action, 'CADENCE_RESTARTED')
  assert.equal(result.stageClosed, true)
  assert.equal(result.stage, 'LINE_EDITING')
  assert.equal(result.waitingOn, 'WAITING_ON_JMP')
  assert.equal(result.workerExecutionAuthorized, false)
  assert.equal(result.schedule.scheduledReleaseAt, '2026-08-17T04:00:00.000Z')
})

test('changes requested restarts current-stage revision cadence without false approval', () => {
  const result = applyAuthorResponseCadenceRestart({
    ...baseInput({ stage: 'DEVELOPMENTAL_EDITING' }),
    responseClassification: 'CHANGES_REQUESTED',
    currentStage: 'DEVELOPMENTAL_EDITING',
    nextStageIfApproved: 'LINE_EDITING',
  })
  assert.equal(result.action, 'CADENCE_RESTARTED')
  assert.equal(result.stageClosed, false)
  assert.equal(result.stage, 'DEVELOPMENTAL_EDITING')
  assert.equal(result.schedule.waitingOn, 'WAITING_ON_JMP')
})

test('question-only and ambiguous responses fail closed without cadence restart', () => {
  const question = applyAuthorResponseCadenceRestart({
    ...baseInput(),
    responseClassification: 'QUESTION_ONLY',
    currentStage: 'LINE_EDITING',
  })
  assert.equal(question.action, 'NO_CADENCE_RESTART')
  assert.equal(question.waitingOn, 'WAITING_ON_AUTHOR')

  const ambiguous = applyAuthorResponseCadenceRestart({
    ...baseInput(),
    responseClassification: 'AMBIGUOUS',
    currentStage: 'LINE_EDITING',
  })
  assert.equal(ambiguous.action, 'NO_CADENCE_RESTART')
  assert.equal(ambiguous.waitingOn, 'PUBLISHER_REVIEW_REQUIRED')
})

test('duplicate response inputs produce one stable cadence schedule identifier', () => {
  const first = calculateEditorialCadence(baseInput())
  const replay = calculateEditorialCadence(baseInput())
  assert.equal(first.cadenceScheduleId, replay.cadenceScheduleId)
})

test('timezone, Day-0/Day-1, after-hours, weekend, and holiday boundaries are governed', () => {
  const normal = calculateEditorialCadence(baseInput({ stage: 'EDITORIAL_REVIEW' }))
  assert.equal(normal.calculationEvidence.authorResponseReceivedAtNormalized, '2026-08-10T04:00:00.000Z')
  assert.equal(normal.scheduledReleaseAt, '2026-08-12T04:00:00.000Z')

  const afterHours = calculateEditorialCadence(baseInput({ stage: 'EDITORIAL_REVIEW', stageCompletedAt: '2026-08-10T23:00:00.000Z' }))
  assert.equal(afterHours.calculationEvidence.authorResponseReceivedAtNormalized, '2026-08-11T04:00:00.000Z')
  assert.equal(afterHours.scheduledReleaseAt, '2026-08-13T04:00:00.000Z')

  const weekend = calculateEditorialCadence(baseInput({ stage: 'EDITORIAL_REVIEW', stageCompletedAt: '2026-08-15T14:00:00.000Z' }))
  assert.equal(weekend.calculationEvidence.authorResponseReceivedAtNormalized, '2026-08-17T04:00:00.000Z')

  const holiday = calculateEditorialCadence(baseInput({ stage: 'EDITORIAL_REVIEW', stageCompletedAt: '2026-09-03T14:00:00.000Z' }))
  assert.equal(holiday.scheduledReleaseAt, '2026-09-08T04:00:00.000Z')
})

test('rush, 24-hour rhythm, rhythm override, and active holds feed final schedule precedence independently', () => {
  const rush = calculateEditorialCadence(baseInput({
    rushOverride: {
      approvedBy: 'Jackie Smith, Jr.',
      approvedAt: '2026-08-10T13:00:00.000Z',
      reason: 'Publisher-approved rush review',
      evidence: 'JACKIE_RUSH_APPROVAL',
    },
  }))
  assert.equal(rush.calculationEvidence.rushAuthority, 'CADENCE_RUSH_OVERRIDE_APPROVED')
  assert.equal(rush.calculationEvidence.rushBusinessDays, 3)

  const rhythm = calculateEditorialCadence(baseInput({
    stage: 'EDITORIAL_REVIEW',
    priorAuthorPackageDeliveredAt: '2026-08-12T20:00:00.000Z',
  }))
  assert.equal(rhythm.scheduledReleaseAt, '2026-08-13T20:00:00.000Z')

  const override = calculateEditorialCadence(baseInput({
    stage: 'EDITORIAL_REVIEW',
    rhythmOverride: {
      approvedScheduleAt: '2026-08-14T16:00:00.000Z',
      approver: 'Jackie Smith, Jr.',
      approvedAt: '2026-08-10T15:00:00.000Z',
      expiresAt: '2026-08-14T16:00:00.000Z',
      reason: 'One-time rhythm adjustment',
      evidence: 'CADENCE_RHYTHM_OVERRIDE_APPROVED',
    },
  }))
  assert.equal(override.calculationEvidence.rhythmOverride.evidence, 'CADENCE_RHYTHM_OVERRIDE_APPROVED')
  assert.equal(override.scheduledReleaseAt, '2026-08-14T16:00:00.000Z')

  const held = calculateEditorialCadence(baseInput({
    stage: 'EDITORIAL_REVIEW',
    holds: [{
      type: 'publisher',
      releaseAt: '2026-08-18T14:00:00.000Z',
      reason: 'Publisher hold',
      decisionOwner: 'Jackie Smith, Jr.',
    }],
  }))
  assert.equal(held.scheduledReleaseAt, '2026-08-18T14:00:00.000Z')
})

test('supersession preserves lineage while leaving one active schedule for the restart', () => {
  const schedule = calculateEditorialCadence(baseInput({ supersedesCadenceId: 'cadence:old' }))
  assert.equal(schedule.supersedesCadenceId, 'cadence:old')
  assert.equal(schedule.supersessionReason, 'AUTHOR_RESPONSE_CADENCE_RESTART')
})

test('manuscript word count authority is the governed stage artifact, not stale intake memory', () => {
  assert.throws(() => calculateEditorialCadence(baseInput({
    manuscript: {
      artifactId: '',
      artifactChecksum: '',
      wordCount: 45000,
      countedAt: '2026-08-10T13:30:00.000Z',
      countMethod: 'GOVERNED_STAGE_ENTRY_ARTIFACT_COUNT',
    },
  })), /MANUSCRIPT_WORD_COUNT_AUTHORITY_MISSING/)
})

test('Day-20 author response escalation requires AUTHOR_STATUS_RULING_RECORDED', () => {
  assert.equal(AUTHOR_RESPONSE_ESCALATION_DEFAULTS.at(-1).elapsedBusinessDays, 20)
  assert.match(AUTHOR_RESPONSE_ESCALATION_DEFAULTS.at(-1).action, /AUTHOR_STATUS_RULING_RECORDED/)
})

test('scheduled eligibility does not thaw client-title worker execution', () => {
  const schedule = calculateEditorialCadence(baseInput())
  const frozen = evaluateScheduledEligibility({
    schedule,
    now: '2026-08-18T04:00:00.000Z',
    workerCommissioned: true,
    clientTitleAutomationFrozen: true,
  })
  assert.equal(frozen.due, true)
  assert.equal(frozen.workerExecutionAuthorized, false)
  assert.equal(frozen.freezeBoundaryPreserved, 'CLIENT_TITLE_AUTOMATION_FROZEN')
})
