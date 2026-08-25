// Engine: Editorial Cadence Engine
// Reusable? Y
// Stage-specific exception? N

export const CADENCE_POLICY_VERSION = 'JMP Editorial Cadence Doctrine v1.0'
export const CADENCE_GOVERNANCE_STATUS = 'CANON'
export const CADENCE_CALCULATION_FUNCTION_VERSION = 'calculateEditorialCadence:v1.0.0'

export type CadenceStage =
  | 'EDITORIAL_REVIEW'
  | 'DEVELOPMENTAL_EDITING'
  | 'LINE_EDITING'
  | 'COPYEDITING'
  | 'PROOFREADING'
  | 'INTERIOR_LAYOUT'
  | 'COVER_DESIGN'
  | 'PRODUCTION_PROOF'
  | 'DISTRIBUTION_PREPARATION'
  | 'DISTRIBUTION_SUBMISSION'
  | 'PUBLICATION_LAUNCH'

export type WordCountBand = 'SMALL' | 'STANDARD' | 'LARGE' | 'EXTENDED'

export type BookType =
  | 'Standard text-forward manuscript'
  | "Children's picture book"
  | 'Early reader'
  | 'Poetry collection'
  | 'Devotional'
  | 'Workbook or journal'
  | 'Memoir'
  | 'Leadership or business'
  | 'Novel or narrative fiction'
  | 'Academic or research-heavy'
  | 'Anthology or compilation'
  | 'Illustrated nonfiction'
  | 'Complex-accessibility title'

export type StageBaselineProfile =
  | 'standard'
  | 'complex'
  | 'children-picture-book'
  | 'poetry'
  | 'devotional'
  | 'standard-nonfiction'
  | 'memoir-leadership'
  | 'novel'
  | 'anthology-compilation'
  | 'extended-enterprise'
  | 'page-layout-standard'

export type ComplexityFactor =
  | 'tables-charts-footnotes-citations-references'
  | 'images-or-illustrations'
  | 'multiple-contributors-voices-or-sources'
  | 'sensitivity-legal-medical-theological-factual-rights'
  | 'nonstandard-structure-front-back-matter-workbook'
  | 'accessibility-remediation'

export type ComplexityAuthority = {
  complexityScore?: number
  complexityFactors: ComplexityFactor[]
  assignedBy: string
  assignedAt: string
  reviewedBy?: string
  reviewedAt?: string
  previousScore?: number
  newScore?: number
  overrideReason?: string
  overrideAuthority?: string
  overrideEvidence?: string
  overriddenAt?: string
}

export type CadenceHold = {
  type: 'publisher' | 'legal' | 'external-dependency' | 'runtime-exception'
  releaseAt?: string
  reason: string
  decisionOwner: string
}

export type RushOverride = {
  approvedBy: string
  approvedAt: string
  reason: string
  evidence: string
  delegationId?: string
}

export type RhythmOverride = {
  approvedScheduleAt: string
  approver: string
  approvedAt: string
  reason: string
  evidence: string
  delegationId?: string
  expiresAt?: string
}

export type GovernedManuscriptWordCount = {
  artifactId: string
  artifactChecksum: string
  wordCount: number
  countedAt: string
  countMethod: string
}

export type BusinessCalendar = {
  timezone: 'America/New_York'
  businessDayCutoffLocal: string
  holidays: string[]
}

export type EditorialCadenceInput = {
  titleId: string
  stageId: string
  packageId: string
  stage: CadenceStage
  stageCompletedAt: string
  now: string
  manuscript: GovernedManuscriptWordCount
  bookType: BookType
  complexity: ComplexityAuthority
  priorAuthorPackageDeliveredAt?: string | null
  holds?: CadenceHold[]
  rushOverride?: RushOverride | null
  rhythmOverride?: RhythmOverride | null
  supersedesCadenceId?: string
  businessCalendar?: Partial<BusinessCalendar>
}

export type CadenceCalculationEvidence = {
  policyVersion: string
  governanceStatus: typeof CADENCE_GOVERNANCE_STATUS
  stage: CadenceStage
  stageBaselineDays: number
  wordCount: number
  wordCountBand: WordCountBand
  wordCountMultiplier: number
  artifactId: string
  artifactChecksum: string
  countedAt: string
  countMethod: string
  bookType: BookType
  bookTypeMultiplier: number
  complexityScore: number
  complexityFactors: ComplexityFactor[]
  complexityMultiplier: number
  assignedBy: string
  assignedAt: string
  previousScore: number | null
  newScore: number | null
  overrideReason: string | null
  overrideAuthority: string | null
  overrideEvidence: string | null
  overriddenAt: string | null
  combinedMultiplier: number
  appliedCombinedMultiplier: number
  capApplied: boolean
  rawBusinessDays: number
  calculatedBusinessDays: number
  rushApplied: boolean
  rushBusinessDays: number | null
  rushAuthority: string | null
  rushReason: string | null
  rushApprovedBy: string | null
  rushApprovedAt: string | null
  authorResponseReceivedAtRaw: string
  authorResponseReceivedAtNormalized: string
  cadenceRestartedAt: string
  effectiveCadenceStartAt: string
  businessTimezone: 'America/New_York'
  businessDayCutoffLocal: string
  holidays: string[]
  priorAuthorDeliveryAt: string | null
  rhythmBoundaryAt: string | null
  rhythmOverride: RhythmOverride | null
  holds: CadenceHold[]
  holdBoundaryAt: string | null
  calculatedCadenceReleaseAt: string
  finalScheduledReleaseAt: string
  nextAutomaticAction: string
  clientTitleAutomationBoundary: 'CADENCE_ONLY_WORKER_EXECUTION_NOT_AUTHORIZED'
  calculationFunctionVersion: string
}

export type EditorialCadenceSchedule = {
  cadenceScheduleId: string
  titleId: string
  stageId: string
  packageId: string
  policyVersion: string
  stage: CadenceStage
  status: 'CADENCE_SCHEDULED' | 'READY_FOR_RELEASE'
  waitingOn: 'WAITING_ON_JMP'
  stageBaselineDays: number
  calculatedBusinessDays: number
  earliestReleaseAt: string
  scheduledReleaseAt: string
  remainingHoldDuration: string
  nextAutomaticAction: string
  supersedesCadenceId: string | null
  supersededByCadenceId: string | null
  supersededAt: string | null
  supersessionReason: string | null
  calculationEvidence: CadenceCalculationEvidence
}

export type EditorialCadencePersistencePayload = {
  cadenceScheduleId: string
  titleId: string
  stageId: string
  packageId: string
  policyVersion: string
  stage: CadenceStage
  status: EditorialCadenceSchedule['status']
  waitingOn: EditorialCadenceSchedule['waitingOn']
  earliestReleaseAt: string
  scheduledReleaseAt: string
  remainingHoldDuration: string
  nextAutomaticAction: string
  supersedesCadenceId: string | null
  calculationEvidence: string
}

export type AuthorResponseCadenceRestartInput = EditorialCadenceInput & {
  responseClassification:
    | 'APPROVED'
    | 'APPROVED_WITH_CORRECTIONS'
    | 'CHANGES_REQUESTED'
    | 'QUESTION_ONLY'
    | 'QUESTION_WITH_EXPLICIT_APPROVAL'
    | 'AMBIGUOUS'
  currentStage: CadenceStage
  nextStageIfApproved?: CadenceStage
}

export type AuthorResponseCadenceRestartResult =
  | {
      action: 'CADENCE_RESTARTED'
      responseClassification: AuthorResponseCadenceRestartInput['responseClassification']
      stageClosed: boolean
      stage: CadenceStage
      waitingOn: 'WAITING_ON_JMP'
      workerExecutionAuthorized: false
      schedule: EditorialCadenceSchedule
    }
  | {
      action: 'NO_CADENCE_RESTART'
      responseClassification: AuthorResponseCadenceRestartInput['responseClassification']
      stageClosed: false
      waitingOn: 'WAITING_ON_AUTHOR' | 'PUBLISHER_REVIEW_REQUIRED'
      reason: string
      workerExecutionAuthorized: false
    }

export const STAGE_BASELINE_CONFIGURATION: Array<{
  configurationId: string
  stage: CadenceStage
  profile: StageBaselineProfile
  baselineDays: number
  effectiveFrom: string
  status: 'ACTIVE'
  approvedBy: string
}> = [
  { configurationId: 'cadence-baseline:editorial-review:standard:v1', stage: 'EDITORIAL_REVIEW', profile: 'standard', baselineDays: 2, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:editorial-review:complex:v1', stage: 'EDITORIAL_REVIEW', profile: 'complex', baselineDays: 3, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:developmental-editing:children-picture-book:v1', stage: 'DEVELOPMENTAL_EDITING', profile: 'children-picture-book', baselineDays: 3, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:developmental-editing:poetry:v1', stage: 'DEVELOPMENTAL_EDITING', profile: 'poetry', baselineDays: 4, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:developmental-editing:devotional:v1', stage: 'DEVELOPMENTAL_EDITING', profile: 'devotional', baselineDays: 4, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:developmental-editing:standard-nonfiction:v1', stage: 'DEVELOPMENTAL_EDITING', profile: 'standard-nonfiction', baselineDays: 5, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:developmental-editing:memoir-leadership:v1', stage: 'DEVELOPMENTAL_EDITING', profile: 'memoir-leadership', baselineDays: 6, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:developmental-editing:novel:v1', stage: 'DEVELOPMENTAL_EDITING', profile: 'novel', baselineDays: 7, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:developmental-editing:anthology-compilation:v1', stage: 'DEVELOPMENTAL_EDITING', profile: 'anthology-compilation', baselineDays: 8, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:developmental-editing:extended-enterprise:v1', stage: 'DEVELOPMENTAL_EDITING', profile: 'extended-enterprise', baselineDays: 10, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:line-editing:standard:v1', stage: 'LINE_EDITING', profile: 'standard', baselineDays: 5, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:line-editing:complex:v1', stage: 'LINE_EDITING', profile: 'complex', baselineDays: 7, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:copyediting:standard:v1', stage: 'COPYEDITING', profile: 'standard', baselineDays: 4, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:copyediting:complex:v1', stage: 'COPYEDITING', profile: 'complex', baselineDays: 6, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:proofreading:standard:v1', stage: 'PROOFREADING', profile: 'standard', baselineDays: 3, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:proofreading:complex:v1', stage: 'PROOFREADING', profile: 'complex', baselineDays: 4, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:interior-layout:page-layout-standard:v1', stage: 'INTERIOR_LAYOUT', profile: 'page-layout-standard', baselineDays: 3, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:interior-layout:complex:v1', stage: 'INTERIOR_LAYOUT', profile: 'complex', baselineDays: 5, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:cover-design:standard:v1', stage: 'COVER_DESIGN', profile: 'standard', baselineDays: 5, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:production-proof:standard:v1', stage: 'PRODUCTION_PROOF', profile: 'standard', baselineDays: 3, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:distribution-preparation:standard:v1', stage: 'DISTRIBUTION_PREPARATION', profile: 'standard', baselineDays: 2, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:distribution-submission:standard:v1', stage: 'DISTRIBUTION_SUBMISSION', profile: 'standard', baselineDays: 3, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
  { configurationId: 'cadence-baseline:publication-launch:standard:v1', stage: 'PUBLICATION_LAUNCH', profile: 'standard', baselineDays: 3, effectiveFrom: '2026-07-21T00:00:00.000Z', status: 'ACTIVE', approvedBy: 'Jackie Smith, Jr.' },
]

export const BOOK_TYPE_MULTIPLIERS: Record<BookType, number> = {
  'Standard text-forward manuscript': 1,
  "Children's picture book": 1.25,
  'Early reader': 0.9,
  'Poetry collection': 1.1,
  Devotional: 1,
  'Workbook or journal': 1.3,
  Memoir: 1.1,
  'Leadership or business': 1,
  'Novel or narrative fiction': 1.2,
  'Academic or research-heavy': 1.35,
  'Anthology or compilation': 1.3,
  'Illustrated nonfiction': 1.25,
  'Complex-accessibility title': 1.3,
}

export const AUTHOR_RESPONSE_ESCALATION_DEFAULTS = [
  { elapsedBusinessDays: 5, action: 'First courteous reminder' },
  { elapsedBusinessDays: 10, action: 'Second reminder and Publisher Operating Center escalation' },
  { elapsedBusinessDays: 15, action: 'Publisher follow-up decision required' },
  { elapsedBusinessDays: 20, action: 'Administrative hold; AUTHOR_STATUS_RULING_RECORDED required before adverse author classification' },
] as const

export const DEFAULT_BUSINESS_CALENDAR: BusinessCalendar = {
  timezone: 'America/New_York',
  businessDayCutoffLocal: '17:00:00',
  holidays: [
    '2026-01-01',
    '2026-01-19',
    '2026-02-16',
    '2026-05-25',
    '2026-06-19',
    '2026-07-03',
    '2026-09-07',
    '2026-10-12',
    '2026-11-11',
    '2026-11-26',
    '2026-12-25',
  ],
}

export function wordCountBand(wordCount: number): { band: WordCountBand; multiplier: number } {
  if (wordCount <= 20000) return { band: 'SMALL', multiplier: 0.75 }
  if (wordCount <= 60000) return { band: 'STANDARD', multiplier: 1 }
  if (wordCount <= 100000) return { band: 'LARGE', multiplier: 1.25 }
  return { band: 'EXTENDED', multiplier: 1.5 }
}

export function scoreComplexity(evidence: ComplexityAuthority) {
  if (!evidence.assignedBy || !evidence.assignedAt) {
    throw Object.assign(new Error('CADENCE_CALCULATION_BLOCKED - COMPLEXITY_AUTHORITY_MISSING'), {
      code: 'CADENCE_CALCULATION_BLOCKED',
      reason: 'COMPLEXITY_AUTHORITY_MISSING',
    })
  }
  const unique = Array.from(new Set(evidence.complexityFactors || []))
  const score = evidence.complexityScore ?? Math.min(unique.length, 6)
  if (!Number.isInteger(score) || score < 0 || score > 6) {
    throw Object.assign(new Error('CADENCE_CALCULATION_BLOCKED - COMPLEXITY_SCORE_OUT_OF_RANGE'), {
      code: 'CADENCE_CALCULATION_BLOCKED',
      reason: 'COMPLEXITY_SCORE_OUT_OF_RANGE',
    })
  }
  const multiplier = score <= 1 ? 1 : score <= 3 ? 1.15 : score <= 5 ? 1.3 : 1.5
  return { score, multiplier, factors: unique }
}

export function resolveStageProfile(input: {
  stage: CadenceStage
  bookType: BookType
  wordCount: number
  complexity?: ComplexityAuthority
}): StageBaselineProfile {
  if (input.stage === 'DEVELOPMENTAL_EDITING') {
    if (input.bookType === "Children's picture book" || input.bookType === 'Early reader') return 'children-picture-book'
    if (input.bookType === 'Poetry collection') return 'poetry'
    if (input.bookType === 'Devotional') return 'devotional'
    if (input.bookType === 'Memoir' || input.bookType === 'Leadership or business') return 'memoir-leadership'
    if (input.bookType === 'Novel or narrative fiction') return 'novel'
    if (input.bookType === 'Anthology or compilation') return 'anthology-compilation'
    if (input.bookType === 'Academic or research-heavy' || input.bookType === 'Workbook or journal' || input.wordCount > 100000) return 'extended-enterprise'
    return 'standard-nonfiction'
  }
  if (input.stage === 'INTERIOR_LAYOUT') {
    return input.complexity?.complexityFactors.includes('images-or-illustrations') ||
      input.complexity?.complexityFactors.includes('accessibility-remediation')
      ? 'complex'
      : 'page-layout-standard'
  }
  if (input.stage === 'EDITORIAL_REVIEW' || input.stage === 'LINE_EDITING' || input.stage === 'COPYEDITING' || input.stage === 'PROOFREADING') {
    return input.complexity?.complexityFactors.includes('nonstandard-structure-front-back-matter-workbook') ||
      input.complexity?.complexityFactors.includes('multiple-contributors-voices-or-sources')
      ? 'complex'
      : 'standard'
  }
  return 'standard'
}

export function resolveStageBaseline(input: {
  stage: CadenceStage
  bookType: BookType
  wordCount: number
  complexity: ComplexityAuthority
}) {
  const profile = resolveStageProfile(input)
  const configuration = STAGE_BASELINE_CONFIGURATION.find(
    (item) => item.stage === input.stage && item.profile === profile && item.status === 'ACTIVE',
  )
  if (!configuration) {
    throw Object.assign(new Error(`CADENCE_CALCULATION_BLOCKED - STAGE_BASELINE_NOT_CONFIGURED: ${input.stage}/${profile}`), {
      code: 'CADENCE_CALCULATION_BLOCKED',
      reason: 'STAGE_BASELINE_NOT_CONFIGURED',
      stage: input.stage,
      profile,
    })
  }
  return { profile, configuration }
}

export function calculateBusinessDays(input: {
  stageBaselineDays: number
  wordCountMultiplier: number
  bookTypeMultiplier: number
  complexityMultiplier: number
}) {
  const combinedMultiplier = input.wordCountMultiplier * input.bookTypeMultiplier * input.complexityMultiplier
  const appliedCombinedMultiplier = Math.min(combinedMultiplier, 2)
  const rawBusinessDays = input.stageBaselineDays * appliedCombinedMultiplier
  const calculatedBusinessDays = Math.max(input.stageBaselineDays, Math.ceil(rawBusinessDays))
  return {
    combinedMultiplier,
    appliedCombinedMultiplier,
    capApplied: combinedMultiplier > 2,
    rawBusinessDays,
    calculatedBusinessDays,
  }
}

export function calculateEditorialCadence(input: EditorialCadenceInput): EditorialCadenceSchedule {
  if (!input.bookType || BOOK_TYPE_MULTIPLIERS[input.bookType] === undefined) {
    throw Object.assign(new Error('CADENCE_CALCULATION_BLOCKED - BOOK_TYPE_MULTIPLIER_NOT_CONFIGURED'), {
      code: 'CADENCE_CALCULATION_BLOCKED',
      reason: 'BOOK_TYPE_MULTIPLIER_NOT_CONFIGURED',
    })
  }
  if (!input.manuscript.artifactId || !input.manuscript.artifactChecksum || !input.manuscript.countedAt || !input.manuscript.countMethod) {
    throw Object.assign(new Error('CADENCE_CALCULATION_BLOCKED - MANUSCRIPT_WORD_COUNT_AUTHORITY_MISSING'), {
      code: 'CADENCE_CALCULATION_BLOCKED',
      reason: 'MANUSCRIPT_WORD_COUNT_AUTHORITY_MISSING',
    })
  }

  const calendar = normalizeCalendar(input.businessCalendar)
  const complexity = scoreComplexity(input.complexity)
  const baseline = resolveStageBaseline({ stage: input.stage, bookType: input.bookType, wordCount: input.manuscript.wordCount, complexity: input.complexity })
  const wordBand = wordCountBand(input.manuscript.wordCount)
  const bookTypeMultiplier = BOOK_TYPE_MULTIPLIERS[input.bookType]
  const days = calculateBusinessDays({
    stageBaselineDays: baseline.configuration.baselineDays,
    wordCountMultiplier: wordBand.multiplier,
    bookTypeMultiplier,
    complexityMultiplier: complexity.multiplier,
  })
  const normalizedStart = normalizeAuthorResponseTimestamp(input.stageCompletedAt, calendar)
  const rushBusinessDays = input.rushOverride ? Math.max(1, Math.ceil(days.calculatedBusinessDays * 0.5)) : null
  const cadenceDays = rushBusinessDays ?? days.calculatedBusinessDays
  const calculatedCadenceReleaseAt = addBusinessDays(normalizedStart.normalizedIso, cadenceDays, calendar)
  const rhythmBoundaryAt = input.priorAuthorPackageDeliveredAt
    ? new Date(new Date(input.priorAuthorPackageDeliveredAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null
  const holdBoundaryAt = latestBoundary((input.holds || []).map((hold) => hold.releaseAt).filter(Boolean) as string[])
  const finalScheduledReleaseAt = latestBoundary([
    calculatedCadenceReleaseAt,
    rhythmBoundaryAt,
    holdBoundaryAt,
    input.rhythmOverride?.approvedScheduleAt,
  ].filter((value): value is string => Boolean(value))) || calculatedCadenceReleaseAt
  const scheduleId = stableCadenceScheduleId(input.packageId, input.stage, input.stageCompletedAt, input.supersedesCadenceId)
  const now = input.now || new Date().toISOString()
  const evidence: CadenceCalculationEvidence = {
    policyVersion: CADENCE_POLICY_VERSION,
    governanceStatus: CADENCE_GOVERNANCE_STATUS,
    stage: input.stage,
    stageBaselineDays: baseline.configuration.baselineDays,
    wordCount: input.manuscript.wordCount,
    wordCountBand: wordBand.band,
    wordCountMultiplier: wordBand.multiplier,
    artifactId: input.manuscript.artifactId,
    artifactChecksum: input.manuscript.artifactChecksum,
    countedAt: input.manuscript.countedAt,
    countMethod: input.manuscript.countMethod,
    bookType: input.bookType,
    bookTypeMultiplier,
    complexityScore: complexity.score,
    complexityFactors: complexity.factors,
    complexityMultiplier: complexity.multiplier,
    assignedBy: input.complexity.assignedBy,
    assignedAt: input.complexity.assignedAt,
    previousScore: input.complexity.previousScore ?? null,
    newScore: input.complexity.newScore ?? null,
    overrideReason: input.complexity.overrideReason ?? null,
    overrideAuthority: input.complexity.overrideAuthority ?? null,
    overrideEvidence: input.complexity.overrideEvidence ?? null,
    overriddenAt: input.complexity.overriddenAt ?? null,
    combinedMultiplier: days.combinedMultiplier,
    appliedCombinedMultiplier: days.appliedCombinedMultiplier,
    capApplied: days.capApplied,
    rawBusinessDays: days.rawBusinessDays,
    calculatedBusinessDays: days.calculatedBusinessDays,
    rushApplied: Boolean(input.rushOverride),
    rushBusinessDays,
    rushAuthority: input.rushOverride ? 'CADENCE_RUSH_OVERRIDE_APPROVED' : null,
    rushReason: input.rushOverride?.reason ?? null,
    rushApprovedBy: input.rushOverride?.approvedBy ?? null,
    rushApprovedAt: input.rushOverride?.approvedAt ?? null,
    authorResponseReceivedAtRaw: input.stageCompletedAt,
    authorResponseReceivedAtNormalized: normalizedStart.normalizedIso,
    cadenceRestartedAt: now,
    effectiveCadenceStartAt: normalizedStart.normalizedIso,
    businessTimezone: calendar.timezone,
    businessDayCutoffLocal: calendar.businessDayCutoffLocal,
    holidays: calendar.holidays,
    priorAuthorDeliveryAt: input.priorAuthorPackageDeliveredAt || null,
    rhythmBoundaryAt,
    rhythmOverride: input.rhythmOverride || null,
    holds: input.holds || [],
    holdBoundaryAt,
    calculatedCadenceReleaseAt,
    finalScheduledReleaseAt,
    nextAutomaticAction: 'Evaluate scheduled eligibility; worker execution remains governed separately.',
    clientTitleAutomationBoundary: 'CADENCE_ONLY_WORKER_EXECUTION_NOT_AUTHORIZED',
    calculationFunctionVersion: CADENCE_CALCULATION_FUNCTION_VERSION,
  }
  return {
    cadenceScheduleId: scheduleId,
    titleId: input.titleId,
    stageId: input.stageId,
    packageId: input.packageId,
    policyVersion: CADENCE_POLICY_VERSION,
    stage: input.stage,
    status: new Date(now).getTime() >= new Date(finalScheduledReleaseAt).getTime() ? 'READY_FOR_RELEASE' : 'CADENCE_SCHEDULED',
    waitingOn: 'WAITING_ON_JMP',
    stageBaselineDays: baseline.configuration.baselineDays,
    calculatedBusinessDays: days.calculatedBusinessDays,
    earliestReleaseAt: calculatedCadenceReleaseAt,
    scheduledReleaseAt: finalScheduledReleaseAt,
    remainingHoldDuration: remainingHoldDuration(finalScheduledReleaseAt, now),
    nextAutomaticAction: evidence.nextAutomaticAction,
    supersedesCadenceId: input.supersedesCadenceId || null,
    supersededByCadenceId: null,
    supersededAt: null,
    supersessionReason: input.supersedesCadenceId ? 'AUTHOR_RESPONSE_CADENCE_RESTART' : null,
    calculationEvidence: evidence,
  }
}

export function applyAuthorResponseCadenceRestart(input: AuthorResponseCadenceRestartInput): AuthorResponseCadenceRestartResult {
  if (input.responseClassification === 'QUESTION_ONLY') {
    return {
      action: 'NO_CADENCE_RESTART',
      responseClassification: input.responseClassification,
      stageClosed: false,
      waitingOn: 'WAITING_ON_AUTHOR',
      reason: 'QUESTION_ONLY_DOES_NOT_CLOSE_GATE_OR_START_CADENCE',
      workerExecutionAuthorized: false,
    }
  }
  if (input.responseClassification === 'AMBIGUOUS') {
    return {
      action: 'NO_CADENCE_RESTART',
      responseClassification: input.responseClassification,
      stageClosed: false,
      waitingOn: 'PUBLISHER_REVIEW_REQUIRED',
      reason: 'AMBIGUOUS_RESPONSE_FAILS_CLOSED',
      workerExecutionAuthorized: false,
    }
  }
  const approved = input.responseClassification === 'APPROVED' || input.responseClassification === 'QUESTION_WITH_EXPLICIT_APPROVAL'
  const approvedWithCorrections = input.responseClassification === 'APPROVED_WITH_CORRECTIONS'
  const stage = approved || approvedWithCorrections ? input.nextStageIfApproved || input.stage : input.currentStage
  const schedule = calculateEditorialCadence({ ...input, stage })
  return {
    action: 'CADENCE_RESTARTED',
    responseClassification: input.responseClassification,
    stageClosed: approved || approvedWithCorrections,
    stage,
    waitingOn: 'WAITING_ON_JMP',
    workerExecutionAuthorized: false,
    schedule,
  }
}

export function evaluateScheduledEligibility(input: {
  schedule: EditorialCadenceSchedule
  now: string
  workerCommissioned: boolean
  clientTitleAutomationFrozen: boolean
}) {
  const due = new Date(input.now).getTime() >= new Date(input.schedule.scheduledReleaseAt).getTime()
  return {
    due,
    cadenceEligible: due,
    workerExecutionAuthorized: due && input.workerCommissioned && !input.clientTitleAutomationFrozen,
    freezeBoundaryPreserved: input.clientTitleAutomationFrozen ? 'CLIENT_TITLE_AUTOMATION_FROZEN' : 'NOT_FROZEN',
  }
}

export function buildEditorialCadencePersistencePayload(schedule: EditorialCadenceSchedule): EditorialCadencePersistencePayload {
  return {
    cadenceScheduleId: schedule.cadenceScheduleId,
    titleId: schedule.titleId,
    stageId: schedule.stageId,
    packageId: schedule.packageId,
    policyVersion: schedule.policyVersion,
    stage: schedule.stage,
    status: schedule.status,
    waitingOn: schedule.waitingOn,
    earliestReleaseAt: schedule.earliestReleaseAt,
    scheduledReleaseAt: schedule.scheduledReleaseAt,
    remainingHoldDuration: schedule.remainingHoldDuration,
    nextAutomaticAction: schedule.nextAutomaticAction,
    supersedesCadenceId: schedule.supersedesCadenceId,
    calculationEvidence: JSON.stringify(schedule.calculationEvidence),
  }
}

function normalizeCalendar(input?: Partial<BusinessCalendar>): BusinessCalendar {
  return {
    timezone: 'America/New_York',
    businessDayCutoffLocal: input?.businessDayCutoffLocal || DEFAULT_BUSINESS_CALENDAR.businessDayCutoffLocal,
    holidays: input?.holidays || DEFAULT_BUSINESS_CALENDAR.holidays,
  }
}

function normalizeAuthorResponseTimestamp(value: string, calendar: BusinessCalendar) {
  const local = localParts(value)
  let candidate = local.date
  if (!isBusinessDate(candidate, calendar) || local.time > calendar.businessDayCutoffLocal) {
    candidate = nextBusinessDate(candidate, calendar)
  }
  return {
    rawIso: value,
    normalizedIso: localDateToUtcIso(candidate, '00:00:00'),
  }
}

function addBusinessDays(value: string, days: number, calendar: BusinessCalendar) {
  let date = localParts(value).date
  let remaining = days
  while (remaining > 0) {
    date = nextCalendarDate(date)
    if (isBusinessDate(date, calendar)) remaining -= 1
  }
  return localDateToUtcIso(date, '00:00:00')
}

function isBusinessDate(localDate: string, calendar: BusinessCalendar) {
  const utcNoon = new Date(`${localDate}T12:00:00.000Z`)
  const day = utcNoon.getUTCDay()
  return day !== 0 && day !== 6 && !calendar.holidays.includes(localDate)
}

function nextBusinessDate(localDate: string, calendar: BusinessCalendar) {
  let date = localDate
  do {
    date = nextCalendarDate(date)
  } while (!isBusinessDate(date, calendar))
  return date
}

function nextCalendarDate(localDate: string) {
  const date = new Date(`${localDate}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function localParts(value: string) {
  const date = new Date(value)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    time: `${byType.hour}:${byType.minute}:${byType.second}`,
  }
}

function localDateToUtcIso(localDate: string, localTime: string) {
  const [hour, minute, second] = localTime.split(':').map(Number)
  for (const offsetHours of [4, 5]) {
    const utc = new Date(`${localDate}T00:00:00.000Z`)
    utc.setUTCHours(hour + offsetHours, minute, second || 0, 0)
    const parts = localParts(utc.toISOString())
    if (parts.date === localDate && parts.time === localTime) return utc.toISOString()
  }
  throw Object.assign(new Error(`CADENCE_CALCULATION_BLOCKED - TIMEZONE_NORMALIZATION_FAILED: ${localDate} ${localTime}`), {
    code: 'CADENCE_CALCULATION_BLOCKED',
    reason: 'TIMEZONE_NORMALIZATION_FAILED',
    localDate,
    localTime,
  })
}

function latestBoundary(values: string[]) {
  if (values.length === 0) return null
  return values.reduce((latest, value) => (new Date(value).getTime() > new Date(latest).getTime() ? value : latest))
}

function remainingHoldDuration(scheduledReleaseAt: string, now: string) {
  const ms = new Date(scheduledReleaseAt).getTime() - new Date(now).getTime()
  if (ms <= 0) return 'expired'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.round((ms % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

function stableCadenceScheduleId(packageId: string, stage: CadenceStage, startAt: string, supersedes?: string) {
  return ['cadence', packageId, stage, startAt, supersedes || 'new'].join(':')
}
