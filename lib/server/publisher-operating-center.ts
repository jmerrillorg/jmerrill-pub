// Engine: Stage Transition Engine
// Reusable? Y
// Stage-specific exception? N

import {
  dataverseCreate,
  dataverseFirst,
  dataverseFormatted,
  dataverseList,
  dataverseLookupId,
  dataversePatch,
  getDataverseServerConfig,
  stringValue,
  type DataverseServerConfig,
} from './dataverse-server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  classifyTitlePortfolio,
  isActivePipeline,
  portfolioBadge,
  type CatalogPortfolioClassification,
  type CatalogPortfolioState,
} from './catalog-portfolio'
import {
  evaluateHumanReviewReadiness,
  type ReviewArtifact,
} from './human-review-artifact-readiness'

const TITLE_STAGE_EDITORIAL = 100000006
const ASSET_STATUS_STAGED = 100000000
const ASSET_FORMAT_OTHER = 100000006
const DISTRIBUTION_STATUS_DRAFT = 100000000
const EXECUTION_STATUS_SUCCESS = 835500001
const BAND_LEVEL_1 = 835500000
const STAGE_TYPE_REVIEW = 100000000
const STAGE_STATUS_IN_PROGRESS = 100000001
const HEALTH_HEALTHY = 196650000
const DIAGNOSTIC_STATUS_PENDING = 196650000
const MANUSCRIPT_ASSET_STATUS_APPROVED = 3
const PROVISIONAL_TITLE_NAMES = new Set(['untitled'])
const INTERNAL_VISIBILITY_MAILBOX = 'publishing@jmerrill.one'
const JACKIE_NOTIFICATION_SENT = 'JACKIE_ACTION_REQUIRED_NOTIFICATION_SENT'
const JACKIE_NOTIFICATION_FAILED = 'JACKIE_ACTION_REQUIRED_NOTIFICATION_FAILED'

export type PublisherActionId =
  | 'review_intake'
  | 'verify_manuscript'
  | 'initialize_editorial_review'
  | 'initialize_developmental_editing'
  | 'place_asset_in_pipeline'
  | 'advance_stage'
  | 'begin_interior_layout'
  | 'begin_cover_design'
  | 'review_royalty_statement'
  | 'send_proofreading_notification'
  | 'process_proofreading_approval'
  | 'view_thread'
  | 'confirm_classification'
  | 'change_classification'
  | 'reconcile_response'
  | 'retry_failed_transition'
  | 'mark_non_decision_message'
  | 'request_missing_information'
  | 'return_for_correction'
  | 'place_evidence_hold'
  | 'remove_evidence_hold'
  | 'retry_failed_operation'
  | 'notify_jackie_action_required'
  | 'view_only'

export type PublisherExecutionMode =
  | 'AUTOMATIC_EVENT_DRIVEN'
  | 'AUTOMATIC_SCHEDULED'
  | 'SYSTEM_ACTION_MANUALLY_TRIGGERED'
  | 'PUBLISHER_MANUAL'
  | 'CODY_ASSISTED_BRIDGE'
  | 'CODY_ENGINEERING_ONLY'
  | 'EXTERNAL_PARTY'
  | 'NOT_IMPLEMENTED'

export type PublisherExecutionState =
  | 'NOT_TRIGGERED'
  | 'QUEUED'
  | 'EXECUTING'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'EXCEPTION'
  | 'WAITING_FOR_HUMAN'
  | 'WAITING_FOR_EXTERNAL_PARTY'

export type PublisherExecutionOwner =
  | 'JM1 Automation'
  | 'Publisher'
  | 'Author'
  | 'External'
  | 'Cody Bridge'
  | 'Engineering'
  | 'Not Implemented'

export type PublisherRuntimeCostCategory =
  | 'Codex interactive/model'
  | 'Azure OpenAI/Foundry'
  | 'Power Automate'
  | 'Azure compute'
  | 'Dataverse/API'
  | 'GitHub Actions'
  | 'No variable model cost'
  | 'Unknown'

export type PublisherQueueItem = {
  key: string
  intakeId: string
  intakeReference: string
  authorName: string
  authorEmail: string
  contactId: string
  relationshipId?: string
  title: string
  titleId?: string
  assetId?: string
  opportunityId?: string
  contractStatus: string
  paymentStatus: string
  rightsStatus: string
  currentStage: string
  editorialStage: string
  capability: string
  sourceLocation: string
  submissionDate: string
  currentBlocker: string
  recommendedNextAction: string
  actionOwner: 'publisher' | 'author' | 'system' | 'external'
  executionMode: PublisherExecutionMode
  executionState: PublisherExecutionState
  businessOwner: 'Publisher' | 'Author' | 'External'
  executionOwner: PublisherExecutionOwner
  runtime: string
  runtimeCostCategory: PublisherRuntimeCostCategory
  awaiting: string
  lastTrigger: string
  lastExecution: string
  expectedDuration: string
  exactBlocker: string
  holdReason: string
  ageDays: number
  ageBucket: '0-2 days' | '3-7 days' | '8-14 days' | '15-30 days' | 'Over 30 days'
  overdueState: 'current' | 'watch' | 'overdue' | 'stalled'
  duplicateRisk: string
  latestExecutionEvidence?: string
  sharePointLink?: string
  authorizedActions: Array<{
    id: PublisherActionId
    label: string
    entryConditions: string[]
    authorFacingConsequence: string
  }>
}

export type PublisherWorkloadState =
  | 'Editorial Review'
  | 'Developmental Editing - Not Started'
  | 'Developmental Editing - In Progress'
  | 'Developmental Editing - Author Review'
  | 'Line Editing - Not Started'
  | 'Line Editing - In Progress'
  | 'Line Editing - Internal QA'
  | 'Line Editing - Release Decision Ready'
  | 'Line Editing - Author Review'
  | 'Copyediting Ready'
  | 'Copyediting In Progress'
  | 'Copyediting - Release Decision Ready'
  | 'Copyediting - Author Review'
  | 'Proofreading Ready'
  | 'Proofreading In Progress'
  | 'Proofreading - Internal QA'
  | 'Proofreading - Notification Pending'
  | 'Proofreading - Author Review'
  | 'Production Ready'
  | 'Blocked'
  | 'External Hold'

export type PublisherWorkloadItem = {
  key: string
  title: string
  author: string
  contactId: string
  relationshipId: string
  intake: string
  titleId: string
  assetId: string
  pipelineStage: string
  editorialStage: string
  editorialSubstage: string
  workloadState: PublisherWorkloadState
  activeCapability: string
  currentOwner: 'Publisher' | 'Jackie' | 'Author' | 'External' | 'Engineering'
  executionMode: PublisherExecutionMode
  executionState: PublisherExecutionState
  businessOwner: 'Publisher' | 'Author' | 'External'
  executionOwner: PublisherExecutionOwner
  runtime: string
  runtimeCostCategory: PublisherRuntimeCostCategory
  awaiting: string
  lastTrigger: string
  lastExecution: string
  expectedDuration: string
  exactBlocker: string
  nextAction: string
  targetDate: string
  ageDays: number
  authorAction: string
  publisherAction: string
  internalQaState: string
  packageReadiness: string
  holdReason: string
  restartCondition: string
  workloadLevel: 'available' | 'normal' | 'elevated' | 'high' | 'overdue-risk' | 'resource-attention'
  queuePosition: number
  downstreamQueueSize: number
  readinessGuard: {
    status: 'pass' | 'watch' | 'blocked'
    message: string
  }
  latestExecutionEvidence: string
}

export type PublisherPortfolioItem = {
  key: string
  title: string
  author: string
  titleId: string
  assetIds: string[]
  portfolioState: CatalogPortfolioState
  portfolioLabel: string
  pipelineStage: string
  catalogStatus: string
  publicationStatus: string
  distributionStatus: string
  activeFormats: string[]
  isbn13s: string[]
  evidence: string[]
  confidence: 'high' | 'medium' | 'low'
  exceptionReason?: string
  nextAction: string
}

export type PublisherTodayItem = {
  key: string
  recordId: string
  titleId: string
  title: string
  author: string
  portfolioState: string
  pipelineStage: string
  editorialStage: string
  substage: string
  owner:
    | 'Jackie'
    | 'Author'
    | 'JM1 Automation'
    | 'Publisher'
    | 'External'
    | 'Cody Bridge'
    | 'Engineering'
    | 'Not Implemented'
  businessOwner: 'Publisher' | 'Author' | 'External'
  executionOwner: PublisherExecutionOwner
  executionMode: PublisherExecutionMode
  executionState: PublisherExecutionState
  runtime: string
  awaiting: string
  lastTrigger: string
  expectedDuration: string
  exactBlocker: string
  nextAction: string
  targetDate: string
  ageDays: number
  severity: 'info' | 'watch' | 'urgent'
  packageState: string
  qaState: string
  dependency: string
  evidenceLinks: Array<{
    label: string
    href: string
  }>
  allowedActions: Array<{
    id: PublisherActionId
    label: string
  }>
  lastMovement: string
}

export type PublisherTodaySnapshot = {
  generatedAt: string
  publisherIdentity: {
    role: 'Publisher'
    authorization: 'Internal Entra workforce allowlist'
  }
  summary: {
    jackieActionsDueToday: number
    authorResponsesPending: number
    activeEditorialTitles: number
    productionReadyTitles: number
    failedTransitions: number
    overdueItems: number
    assetsMovedToday: number
    catalogExceptions: number
  }
  waitingForJackie: PublisherTodayItem[]
  waitingForAuthors: PublisherTodayItem[]
  activeEditorial: PublisherTodayItem[]
  productionQueue: PublisherTodayItem[]
  distributionCatalogQueue: PublisherTodayItem[]
  alerts: PublisherTodayItem[]
  recentMovements: PublisherTodayItem[]
}

export type PublisherTitleOperatingStage = {
  id: string
  label: string
  displayOrder: number
  authorInputRequired: boolean
  entryCondition: string
  closeCondition: string
  nextStageId: string
}

export type PublisherTitleOperatingCard = {
  key: string
  titleId: string
  title: string
  author: string
  stageId: string
  stageLabel: string
  humanStatus: string
  waitingOn: 'Publishing Team' | 'Author' | 'Jackie' | 'Automation' | 'External' | 'None'
  ageDays: number
  targetDate: string
  urgency: 'normal' | 'watch' | 'urgent'
  blocker: string
  nextAction: string
  nextStage: string
  nextStageEligible: boolean
  nextStageBlockedReason: string
  latestMovement: string
  currentArtifact: {
    label: string
    href: string
    version: string
    reviewState: string
  }
  authorState: {
    latestResponse: string
    classification: string
    approvalState: string
    reviewRound: string
    currentArtifactFullyApproved: boolean
  }
  jackieDecision?: {
    what: string
    why: string
    review: string
    decisionOptions: string[]
    consequence: string
    notificationState: 'PENDING' | 'SENT' | 'FAILED' | 'ESCALATED'
    lastNotified: string
    operatingCenterUrl: string
  }
  actions: Array<{
    id: PublisherActionId
    label: string
    available: boolean
    unavailableReason: string
  }>
  timeline: Array<{
    label: string
    timestamp: string
  }>
  technical: {
    rawStatus: string
    runtimeState: string
    executionMode: PublisherExecutionMode
    executionOwner: PublisherExecutionOwner
    evidenceReferences: string[]
  }
  liveClassification: 'LIVE' | 'TEST_CERTIFICATION'
}

export type JackieActionRequiredNotificationEvent = {
  eventId: string
  eventType: 'JACKIE_ACTION_REQUIRED'
  division: 'J Merrill Publishing'
  application: 'Publisher Operating Center'
  titleId: string
  title: string
  author: string
  actionType: string
  actionSummary: string
  whyRequired: string
  priority: 'normal' | 'watch' | 'urgent'
  dueAt: string
  operatingCenterUrl: string
  sourceStage: string
  sourceRecord: string
  createdAt: string
  notificationState: 'PENDING' | 'SENT' | 'FAILED' | 'ESCALATED'
  preferredChannel: 'MICROSOFT_TEAMS'
  fallbackChannel: 'EMAIL'
  escalationChannel: 'SMS'
  idempotencyKey: string
}

export type PublisherTitleOperatingView = {
  generatedAt: string
  stageSource: string
  stages: PublisherTitleOperatingStage[]
  cards: PublisherTitleOperatingCard[]
  jackieActionNotifications: JackieActionRequiredNotificationEvent[]
  summary: {
    activeTitles: number
    needsJackie: number
    waitingOnAuthors: number
    blockedTitles: number
    overdueTitles: number
    inProduction: number
    publishedThisPeriod: number
  }
}

export type PublisherAuthorResponseQueueItem = {
  key: string
  author: string
  title: string
  stagePackage: string
  responseReceived: string
  classifiedDecision:
    | 'APPROVED WITHOUT CHANGES'
    | 'APPROVED WITH CORRECTIONS'
    | 'CORRECTIONS REQUESTED'
    | 'CLARIFICATION REQUESTED'
    | 'PAUSE REQUESTED'
    | 'AMBIGUOUS — HUMAN REVIEW'
  processingStatus: 'PROCESSED' | 'PROCESSING' | 'AMBIGUOUS — REVIEW' | 'FAILED — RETRY AVAILABLE' | 'STALE — SLA BREACH'
  ageMinutes: number
  failedStep: string
  nextAction: string
  threadEvidence: string
  gateId: string
  stageId: string
  packageId: string
  messageId: string
  allowedActions: Array<{
    id: PublisherActionId
    label: string
  }>
}

export type PublisherProductionReadinessItem = {
  key: string
  titleId: string
  assetId: string
  title: string
  author: string
  editorialState: string
  interiorState: string
  coverState: string
  interiorReadiness:
    | 'READY — STARTED'
    | 'READY — AWAITING PUBLISHER START'
    | 'ALREADY IN INTERIOR LAYOUT — PLACE AT CURRENT STATE'
    | 'BLOCKED — FINAL MANUSCRIPT'
    | 'BLOCKED — PROOFREADING'
    | 'BLOCKED — PRODUCTION SPECIFICATIONS'
    | 'BLOCKED — IMAGES OR RIGHTS'
    | 'BLOCKED — ISBN OR METADATA'
    | 'BLOCKED — JACKIE DECISION'
  coverReadiness:
    | 'READY FOR CREATIVE BRIEF'
    | 'CREATIVE BRIEF IN PROGRESS'
    | 'READY FOR CONCEPTS'
    | 'CONCEPTS IN PROGRESS'
    | 'REVIEW ARTIFACT NOT READY'
    | 'INTERNAL REVIEW'
    | 'AUTHOR REVIEW'
    | 'FRONT COVER APPROVED'
    | 'WAITING FOR PAGE COUNT'
    | 'FULL WRAP IN PROGRESS'
    | 'FULL WRAP APPROVED'
    | 'BLOCKED — COPY'
    | 'BLOCKED — IMAGERY'
    | 'BLOCKED — RIGHTS'
    | 'BLOCKED — TRIM/FORMAT'
    | 'BLOCKED — PUBLISHER DECISION'
  nextInteriorAction: string
  nextCoverAction: string
  sourceFiles: string
  rightsEvidence: string
  sharePointParent: string
  productionProjectId?: string
  productionTaskId?: string
  allowedInteriorActions: Array<{
    id: PublisherActionId
    label: string
  }>
  allowedCoverActions: Array<{
    id: PublisherActionId
    label: string
  }>
}

export type PublisherRoyaltyDecisionCard = {
  key: string
  decisionType: string
  author: string
  title: string
  reportingPeriod: string
  sourceSystem: string
  sourceFile: string
  account: string
  currency: string
  identifier: string
  format: string
  unitCount: number
  sourceNetCompensation: number
  affectedRows: number
  confidence: 'high' | 'medium' | 'low'
  matchingBasis: string
  priorMatchingDecisions: string
  financialImpact: string
  amountAffected: string
  evidence: string
  recommendedDecision: string
  alternatives: string
  downstreamEffect: string
  allowedActions: Array<{
    id: PublisherActionId
    label: string
  }>
}

export type PublisherRoyaltyDecisionPackage = {
  packageKey: string
  reportedTitle: string
  identifiers: string[]
  statementPeriods: string[]
  sourceSystems: string[]
  sourceFiles: string[]
  accounts: string[]
  currencies: string[]
  affectedRows: number
  units: number
  financialImpact: number
  confidence: 'high' | 'medium' | 'low'
  recommendedDecision: string
  canonicalTitleStatus: string
  authorRightsholderStatus: string
  royaltyRuleStatus: string
  reusableMappingImpact: string
  downstreamEffect: string
  approvalState: string
}

export type PublisherRoyaltyStatementQueueItem = {
  period: string
  statementId: string
  status: string
  matchedSourceRows: number
  heldRows: number
  paymentEvidenceRows: number
  paymentAllocationUnknown: number
  unresolvedPayments: number
  sourceNetCompensation: number
  heldNetCompensation: number
  provenanceStatus: string
  readinessBlocker: string
}

export type PublisherRoyaltyMonthlyCloseItem = {
  month: string
  status: string
  waitingFor: string[]
  sources: Array<{
    label: string
    state: string
    detail: string
  }>
}

export type PublisherRoyaltyReviewQueue = {
  acceptedBaseline: {
    sourceFilesEvaluated: number
    sourceFilesImported: number
    normalizedRows: number
    coreRowsLoaded: number
    heldRows: number
    statementPeriods: number
    januaryPodUsBDisposition: string
  }
  decisionSummary: {
    heldRows: number
    decisionGroups: number
    affectedDollars: number
    highConfidenceRecommendations: number
    jackieReviewGroups: number
    rowsReleasedToday: number
    remainingExceptions: number
    statementReadyForReview: number
    statementExceptions: number
    missingSourceActions: number
    decisionTypes: Record<string, number>
  }
  manifestRows: number
  loadedRows: number
  identityHolds: number
  titleHolds: number
  paymentRows: number
  paymentAllocationUnknown: number
  unresolvedPayments: number
  draftStatements: number
  decisionPackagePath: string
  decisionCards: PublisherRoyaltyDecisionCard[]
  decisionPackages: PublisherRoyaltyDecisionPackage[]
  statementQueue: PublisherRoyaltyStatementQueueItem[]
  monthlyClose: {
    latestAcxMonthAvailable: string
    spreadsheetStatus: string
    automation: {
      ingram: string
      kdp: string
      acx: string
      directSales: string
    }
    generatedReportPolicy: string
    missingSourceActions: Array<{
      month: string
      source: string
      action: string
      state: string
    }>
    months: PublisherRoyaltyMonthlyCloseItem[]
  }
}

export type PublisherOperatingCenterSnapshot = {
  generatedAt: string
  status: 'core-live' | 'unavailable'
  operator: {
    role: 'Publisher'
    authorization: 'Internal Entra workforce allowlist'
  }
  metrics: {
    newSubmissionsAwaitingReview: number
    unlinkedAssets: number
    editorialReviewQueue: number
    publisherActionsPending: number
    authorActionsPending: number
    contractPaymentHolds: number
    failedTransitions: number
    stalledAssets: number
    assetsWaitingReview: number
    assetsOnHold: number
    developmentalQueue: number
    averageQueueAgeDays: number
    oldestWaitingAsset: string
    publisherActionsDueToday: number
    assetsMovedToday: number
    assetsMovedThisWeek: number
    titlesAwaitingDevelopmentalEditing: number
    titlesInDevelopmentalEditing: number
    titlesAwaitingLineEditing: number
    titlesInLineEditing: number
    titlesAwaitingCopyediting: number
    titlesAwaitingCopyeditingRelease: number
    packagesHeldByReadinessGuard: number
    workloadAdvisories: number
    activeInstancesByCapability: Record<string, number>
    authorReviewBacklog: number
    oldestWorkloadItem: string
    portfolioActivePipeline: number
    portfolioPublishedCatalog: number
    portfolioExternalHold: number
    portfolioArchiveHistorical: number
    portfolioReconciliationRequired: number
    publishedCatalogMissingIsbn: number
    publishedCatalogMissingAuthor: number
  }
  queues: {
    enterprise: PublisherQueueItem[]
    proofAssets: PublisherQueueItem[]
    workload: PublisherWorkloadItem[]
    portfolio: PublisherPortfolioItem[]
    activePipeline: PublisherPortfolioItem[]
    publishedCatalog: PublisherPortfolioItem[]
    externalHolds: PublisherPortfolioItem[]
    archiveHistorical: PublisherPortfolioItem[]
    reconciliationRequired: PublisherPortfolioItem[]
  }
  productionCommand: {
    interiorQueue: PublisherProductionReadinessItem[]
    coverQueue: PublisherProductionReadinessItem[]
    sharePointDesign: string[]
  }
  authorResponses: PublisherAuthorResponseQueueItem[]
  royalties: PublisherRoyaltyReviewQueue
  today: PublisherTodaySnapshot
  titleOperatingView: PublisherTitleOperatingView
}

type DataverseRow = Record<string, unknown>

export async function buildPublisherOperatingCenterSnapshot(): Promise<PublisherOperatingCenterSnapshot> {
  const config = getDataverseServerConfig()
  if (!config) {
    return {
      generatedAt: new Date().toISOString(),
      status: 'unavailable',
      operator: {
        role: 'Publisher',
        authorization: 'Internal Entra workforce allowlist',
      },
      metrics: emptyMetrics(),
      queues: {
        enterprise: [],
        proofAssets: [],
        workload: [],
        portfolio: [],
        activePipeline: [],
        publishedCatalog: [],
        externalHolds: [],
        archiveHistorical: [],
        reconciliationRequired: [],
      },
      productionCommand: {
        interiorQueue: [],
        coverQueue: [],
        sharePointDesign: productionSharePointDesign(),
      },
      authorResponses: [],
      royalties: readRoyaltyReviewQueue(),
      today: emptyPublisherToday(),
      titleOperatingView: emptyTitleOperatingView(),
    }
  }

  const [intakes, titles, assets, editorialStages, approvalGates, opportunities, logs, productionProjects, productionTasks] =
    await Promise.all([
    getRecentIntakes(config),
    getRecentTitles(config),
    getRecentAssets(config),
    getRecentEditorialStages(config),
    getRecentApprovalGates(config),
    getRecentOpportunities(config),
    getRecentExecutionLogs(config),
    getRecentProductionProjects(config),
    getRecentProductionTasks(config),
  ])

  const queue = intakes
    .map((intake) => buildQueueItem(intake, titles, assets, editorialStages, opportunities, logs))
    .filter((item) => item.intakeReference)

  const proofAssets = queue
    .filter((item) =>
      ['before you were born', 'the general’s will and last testament', "the general's will and last testament"].includes(
        normalizeTitle(item.title),
      ),
    )
    .slice(0, 2)
  const portfolio = buildPortfolioItems(titles, assets, editorialStages, productionProjects)
  const workload = buildWorkloadItems(titles, assets, editorialStages, intakes, logs, portfolio)
  const productionCommand = buildProductionCommand(workload, portfolio, productionProjects, productionTasks)
  const authorResponses = buildAuthorResponseQueue(approvalGates, editorialStages, titles, logs)
  const metrics = buildMetrics(queue, logs, workload, portfolio)
  const today = buildPublisherToday({
    generatedAt: new Date().toISOString(),
    queue,
    workload,
    portfolio,
    productionCommand,
    authorResponses,
    royalties: readRoyaltyReviewQueue(),
    logs,
    metrics,
  })
  const titleOperatingView = buildTitleOperatingView({
    generatedAt: today.generatedAt,
    today,
    workload,
    portfolio,
    productionCommand,
    authorResponses,
    logs,
  })

  return {
    generatedAt: today.generatedAt,
    status: 'core-live',
    operator: {
      role: 'Publisher',
      authorization: 'Internal Entra workforce allowlist',
    },
    metrics,
    queues: {
      enterprise: queue,
      proofAssets,
      workload,
      portfolio,
      activePipeline: portfolio.filter((item) => item.portfolioState === 'active_pipeline'),
      publishedCatalog: portfolio.filter((item) => item.portfolioState === 'published_catalog'),
      externalHolds: portfolio.filter((item) => item.portfolioState === 'external_hold'),
      archiveHistorical: portfolio.filter((item) => item.portfolioState === 'archive_historical'),
      reconciliationRequired: portfolio.filter((item) =>
        ['reconciliation_required', 'manual_recovery'].includes(item.portfolioState),
      ),
    },
    productionCommand,
    authorResponses,
    royalties: readRoyaltyReviewQueue(),
    today,
    titleOperatingView,
  }
}

export async function initializePublisherIntakeReview(input: {
  intakeId: string
  operatorEmail: string
  correlationId?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await dataverseFirst(config, 'jm1_publishingintakes', {
    $select:
      'jm1_publishingintakeid,jm1_name,jm1_firstname,jm1_lastname,jm1_email,jm1_projecttitle,jm1_intakereferencecode,jm1_manuscripturl,jm1_manuscriptreceived,jm1_workspacestatus,jm1_stage0handoffstatus,_jm1_linkedcontact_value,_jm1_opportunity_value,createdon,modifiedon',
    $filter: `jm1_publishingintakeid eq ${input.intakeId}`,
  })

  if (!intake) throw new Error('intake_not_found')
  if (!stringValue(intake.jm1_projecttitle)) throw new Error('intake_missing_title')
  if (!dataverseLookupId(intake, '_jm1_linkedcontact_value')) throw new Error('intake_missing_contact')
  if (intake.jm1_manuscriptreceived !== true && !stringValue(intake.jm1_manuscripturl)) {
    throw new Error('intake_missing_manuscript_evidence')
  }

  const correlationId =
    input.correlationId || `POC-${String(intake.jm1_intakereferencecode || input.intakeId)}-${Date.now()}`
  const title = await findOrCreateTitle(config, intake)
  const asset = await findOrCreateAsset(config, intake, title.id)

  await writePublisherExecutionLog(config, {
    actionType: 'PUBLISHER_INTAKE_REVIEW_INITIALIZED',
    name: `PUBLISHER_INTAKE_REVIEW_INITIALIZED - ${title.name}`,
    description: [
      `Publisher Operating Center initialized intake review for ${title.name}.`,
      `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
      `Title ${title.id}; asset ${asset.id}.`,
      `Operator ${input.operatorEmail}.`,
      `Correlation ${correlationId}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: input.intakeId,
  })

  return {
    correlationId,
    intakeId: input.intakeId,
    titleId: title.id,
    assetId: asset.id,
    titleCreated: title.created,
    assetCreated: asset.created,
  }
}

export async function verifyPublisherManuscript(input: {
  intakeId: string
  operatorEmail: string
  correlationId?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await getPublisherIntakeForAction(config, input.intakeId)
  assertLinkedContact(intake)

  const manuscriptUrl = stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)
  if (!manuscriptUrl && intake.jm1_manuscriptreceived !== true) {
    throw new Error('intake_missing_manuscript_evidence')
  }

  const correlationId =
    input.correlationId || `POC-MANUSCRIPT-${String(intake.jm1_intakereferencecode || input.intakeId)}-${Date.now()}`

  if (manuscriptUrl && intake.jm1_manuscriptreceived !== true) {
    await dataversePatch(config, 'jm1_publishingintakes', input.intakeId, {
      jm1_manuscriptreceived: true,
    })
  }

  const logId = await writePublisherExecutionLog(config, {
    actionType: 'PUBLISHER_MANUSCRIPT_VERIFIED',
    name: `PUBLISHER_MANUSCRIPT_VERIFIED - ${String(intake.jm1_projecttitle || input.intakeId)}`,
    description: [
      `Publisher Operating Center verified manuscript evidence for ${String(intake.jm1_projecttitle || input.intakeId)}.`,
      `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
      `Operator ${input.operatorEmail}.`,
      `Correlation ${correlationId}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: input.intakeId,
  })

  return {
    correlationId,
    intakeId: input.intakeId,
    executionLogId: extractId(logId),
  }
}

export async function clearPublisherEvidenceHold(input: {
  intakeId: string
  operatorEmail: string
  correlationId?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await getPublisherIntakeForAction(config, input.intakeId)
  assertLinkedContact(intake)

  const manuscriptUrl = stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)
  if (!manuscriptUrl && intake.jm1_manuscriptreceived !== true) {
    throw new Error('intake_missing_manuscript_evidence')
  }

  const correlationId =
    input.correlationId || `POC-CLEAR-HOLD-${String(intake.jm1_intakereferencecode || input.intakeId)}-${Date.now()}`

  const logId = await writePublisherExecutionLog(config, {
    actionType: 'PUBLISHER_EVIDENCE_HOLD_CLEARED',
    name: `PUBLISHER_EVIDENCE_HOLD_CLEARED - ${String(intake.jm1_projecttitle || input.intakeId)}`,
    description: [
      `Publisher Operating Center cleared evidence hold after manuscript verification for ${String(intake.jm1_projecttitle || input.intakeId)}.`,
      `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
      `Operator ${input.operatorEmail}.`,
      `Correlation ${correlationId}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: input.intakeId,
  })

  return {
    correlationId,
    intakeId: input.intakeId,
    executionLogId: extractId(logId),
  }
}

export async function initializePublisherEditorialReview(input: {
  intakeId: string
  operatorEmail: string
  correlationId?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await getPublisherIntakeForAction(config, input.intakeId)
  assertLinkedContact(intake)

  if (!stringValue(intake.jm1_projecttitle)) throw new Error('intake_missing_title')
  if (intake.jm1_manuscriptreceived !== true && !stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)) {
    throw new Error('intake_missing_manuscript_evidence')
  }

  const correlationId =
    input.correlationId || `POC-EDITORIAL-${String(intake.jm1_intakereferencecode || input.intakeId)}-${Date.now()}`
  const title = await findOrCreateTitle(config, intake)
  const asset = await findOrCreateAsset(config, intake, title.id)
  const stage = await findOrCreateEditorialReviewStage(config, intake, title, asset.id, correlationId)
  const existingLog = await findPublisherExecutionLog(config, 'PUBLISHER_EDITORIAL_REVIEW_INITIALIZED', input.intakeId)

  if (!existingLog) {
    await writePublisherExecutionLog(config, {
      actionType: 'PUBLISHER_EDITORIAL_REVIEW_INITIALIZED',
      name: `PUBLISHER_EDITORIAL_REVIEW_INITIALIZED - ${title.name}`,
      description: [
        `Publisher Operating Center initialized Editorial Review for ${title.name}.`,
        `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
        `Title ${title.id}; asset ${asset.id}; stage ${stage.id}.`,
        `Operator ${input.operatorEmail}.`,
        `Correlation ${correlationId}.`,
        'No author communication sent.',
      ].join(' '),
      sourceEntity: 'jm1_publishingintake',
      sourceRecordId: input.intakeId,
    })
  }

  return {
    correlationId,
    intakeId: input.intakeId,
    titleId: title.id,
    assetId: asset.id,
    editorialStageId: stage.id,
    stageCreated: stage.created,
    executionLogCreated: !existingLog,
  }
}

export async function autoInitializeOutsideInquiryEditorialReview(input: {
  intakeId: string
  correlationId?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await getPublisherIntakeForAction(config, input.intakeId)
  const intakeChannel = stringValue(intake.jm1_intakechannel)
  if (intakeChannel && intakeChannel !== 'INT-PUB-005 /join') {
    return {
      status: 'blocked' as const,
      blocker: 'unsupported_intake_channel',
      intakeId: input.intakeId,
    }
  }

  if (!stringValue(intake.jm1_projecttitle)) {
    return {
      status: 'blocked' as const,
      blocker: 'intake_missing_title',
      intakeId: input.intakeId,
    }
  }

  if (!dataverseLookupId(intake, '_jm1_linkedcontact_value')) {
    return {
      status: 'blocked' as const,
      blocker: 'intake_missing_contact',
      intakeId: input.intakeId,
    }
  }

  if (intake.jm1_manuscriptreceived !== true && !stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)) {
    return {
      status: 'blocked' as const,
      blocker: 'intake_missing_manuscript_evidence',
      intakeId: input.intakeId,
    }
  }

  const result = await initializePublisherEditorialReview({
    intakeId: input.intakeId,
    operatorEmail: 'JM1 Automation',
    correlationId: input.correlationId || `AUTO-EDITORIAL-${String(intake.jm1_intakereferencecode || input.intakeId)}-${Date.now()}`,
  })

  const diagnostic = await waitForStage0DiagnosticForIntake(config, input.intakeId)
  if (!diagnostic) {
    await writePublisherExecutionLog(config, {
      actionType: 'PUBLISHING_INTAKE_ORCHESTRATION_WAITING_FOR_STAGE0_HANDOFF',
      name: `PUBLISHING_INTAKE_ORCHESTRATION_WAITING - ${String(intake.jm1_projecttitle || input.intakeId)}`,
      description: [
        `Outside /join intake ${String(intake.jm1_intakereferencecode || input.intakeId)} was received and Editorial Review was initialized.`,
        'Stage 0 diagnostic handoff was not yet available, so the runner was not invoked.',
        `Correlation ${result.correlationId}.`,
        'No author recommendation sent by this event.',
      ].join(' '),
      sourceEntity: 'jm1_publishingintake',
      sourceRecordId: input.intakeId,
    })

    return {
      status: 'waiting_for_system' as const,
      blocker: 'stage0_diagnostic_handoff_pending',
      ...result,
    }
  }

  const assetBinding = await ensureDiagnosticManuscriptAssetBinding(config, diagnostic, intake)
  const refreshedDiagnostic = assetBinding.bound
    ? await findStage0DiagnosticForIntake(config, input.intakeId)
    : diagnostic

  const dispatch = await dispatchEditorialReviewNow({
    diagnosticId: stringValue(refreshedDiagnostic?.jm1pub_editorialdiagnosticid || diagnostic.jm1pub_editorialdiagnosticid),
    intakeReferenceCode: stringValue(intake.jm1_intakereferencecode),
    manuscriptUrl: stringValue(refreshedDiagnostic?.jm1_manuscriptasseturl || diagnostic.jm1_manuscriptasseturl || intake.jm1_manuscripturl || intake.jm1_submissionurl),
    workspaceUrl: stringValue(intake.jm1_sharepointworkspaceurl || intake.jm1_manuscripturl || intake.jm1_submissionurl),
    diagnosticStatus: Number(refreshedDiagnostic?.jm1pub_diagnosticstatus ?? diagnostic.jm1pub_diagnosticstatus ?? DIAGNOSTIC_STATUS_PENDING),
  })

  if (dispatch.status !== 'accepted') {
    await writePublisherExecutionLog(config, {
      actionType: 'PUBLISHING_INTAKE_ORCHESTRATION_DISPATCH_BLOCKED',
      name: `PUBLISHING_INTAKE_ORCHESTRATION_BLOCKED - ${String(intake.jm1_projecttitle || input.intakeId)}`,
      description: [
        `Outside /join intake ${String(intake.jm1_intakereferencecode || input.intakeId)} was initialized but Editorial Review runner dispatch did not complete.`,
        `Blocker ${dispatch.blocker}.`,
        `Diagnostic ${stringValue(diagnostic.jm1pub_editorialdiagnosticid)}.`,
        `Correlation ${result.correlationId}.`,
        'No author recommendation sent by this event.',
      ].join(' '),
      sourceEntity: 'jm1_publishingintake',
      sourceRecordId: input.intakeId,
    })

    return {
      status: 'waiting_for_system' as const,
      blocker: dispatch.blocker,
      diagnosticId: stringValue(diagnostic.jm1pub_editorialdiagnosticid),
      ...result,
    }
  }

  const existingSuccessLog = await findPublisherExecutionLog(
    config,
    'PUBLISHING_INTAKE_ORCHESTRATION_DISPATCHED',
    input.intakeId,
  )
  if (!existingSuccessLog) {
    await writePublisherExecutionLog(config, {
      actionType: 'PUBLISHING_INTAKE_ORCHESTRATION_DISPATCHED',
      name: `PUBLISHING_INTAKE_ORCHESTRATION_DISPATCHED - ${String(intake.jm1_projecttitle || input.intakeId)}`,
      description: [
        `Outside /join intake ${String(intake.jm1_intakereferencecode || input.intakeId)} was initialized and Editorial Review runner dispatch completed.`,
        `Diagnostic ${stringValue(diagnostic.jm1pub_editorialdiagnosticid)}.`,
        `Asset binding ${assetBinding.reason}.`,
        `Run control ${dispatch.runControlStatus || 'unknown'}.`,
        `Author recommendation sent ${dispatch.authorRecommendationSent === true ? 'yes' : 'no'}.`,
        `Correlation ${result.correlationId}.`,
      ].join(' '),
      sourceEntity: 'jm1_publishingintake',
      sourceRecordId: input.intakeId,
    })
  }

  return {
    status: 'dispatched' as const,
    diagnosticId: stringValue(diagnostic.jm1pub_editorialdiagnosticid),
    runControlStatus: dispatch.runControlStatus,
    authorRecommendationSent: dispatch.authorRecommendationSent,
    ...result,
  }
}

export async function placePublisherEvidenceHold(input: {
  intakeId: string
  operatorEmail: string
  correlationId?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await dataverseFirst(config, 'jm1_publishingintakes', {
    $select:
      'jm1_publishingintakeid,jm1_intakereferencecode,jm1_projecttitle,jm1_manuscripturl,jm1_manuscriptreceived,_jm1_linkedcontact_value',
    $filter: `jm1_publishingintakeid eq ${input.intakeId}`,
  })

  if (!intake) throw new Error('intake_not_found')
  if (!dataverseLookupId(intake, '_jm1_linkedcontact_value')) throw new Error('intake_missing_contact')
  if (intake.jm1_manuscriptreceived === true || stringValue(intake.jm1_manuscripturl)) {
    throw new Error('intake_has_manuscript_evidence')
  }

  const correlationId =
    input.correlationId || `POC-HOLD-${String(intake.jm1_intakereferencecode || input.intakeId)}-${Date.now()}`

  const logId = await writePublisherExecutionLog(config, {
    actionType: 'PUBLISHER_INTAKE_EVIDENCE_HOLD_PLACED',
    name: `PUBLISHER_INTAKE_EVIDENCE_HOLD_PLACED - ${String(intake.jm1_projecttitle || input.intakeId)}`,
    description: [
      `Publisher Operating Center placed intake evidence hold for ${String(intake.jm1_projecttitle || input.intakeId)}.`,
      `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
      `Operator ${input.operatorEmail}.`,
      `Correlation ${correlationId}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: input.intakeId,
  })

  return {
    correlationId,
    intakeId: input.intakeId,
    executionLogId: extractId(logId),
  }
}

export async function logPublisherOperationalAction(input: {
  intakeId: string
  operatorEmail: string
  action: Exclude<
    PublisherActionId,
    | 'review_intake'
    | 'verify_manuscript'
    | 'initialize_editorial_review'
    | 'place_evidence_hold'
    | 'remove_evidence_hold'
    | 'view_only'
  >
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const intake = await getPublisherIntakeForAction(config, input.intakeId)
  assertLinkedContact(intake)

  const actionType = publisherActionToEvent(input.action)
  const logId = await writePublisherExecutionLog(config, {
    actionType,
    name: `${actionType} - ${String(intake.jm1_projecttitle || input.intakeId)}`,
    description: [
      `Publisher Operating Center recorded bounded action ${input.action} for ${String(
        intake.jm1_projecttitle || input.intakeId,
      )}.`,
      `Intake ${String(intake.jm1_intakereferencecode || input.intakeId)}.`,
      `Operator ${input.operatorEmail}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: input.intakeId,
  })

  return {
    intakeId: input.intakeId,
    executionLogId: extractId(logId),
  }
}

export async function logPublisherTitleScopedAction(input: {
  titleId: string
  operatorEmail: string
  action: Extract<PublisherActionId, 'place_asset_in_pipeline' | 'begin_interior_layout' | 'begin_cover_design'>
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const title = await dataverseFirst(config, 'jm1pub_titles', {
    $select: 'jm1pub_titleid,jm1pub_name,jm1pub_stage,jm1pub_status',
    $filter: `jm1pub_titleid eq ${input.titleId}`,
  })
  if (!title) throw new Error('title_not_found')

  const actionType = publisherActionToEvent(input.action)
  const titleName = stringValue(title.jm1pub_name || input.titleId)
  const currentStage = dataverseFormatted(title, 'jm1pub_stage') || stringValue(title.jm1pub_stage)
  const currentStatus = dataverseFormatted(title, 'jm1pub_status') || stringValue(title.jm1pub_status)
  const logId = await writePublisherExecutionLog(config, {
    actionType,
    name: `${actionType} - ${titleName}`,
    description: [
      `Publisher Operating Center recorded title-scoped action ${input.action} for ${titleName}.`,
      `Current Core title state was ${currentStage || 'unspecified'} / ${currentStatus || 'unspecified'}.`,
      `Operator ${input.operatorEmail}.`,
      'This action records publisher movement or readiness only; it does not fabricate prior-stage completion.',
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1pub_title',
    sourceRecordId: input.titleId,
  })

  return {
    titleId: input.titleId,
    executionLogId: extractId(logId),
  }
}

export async function logPublisherRoyaltyDecisionReview(input: {
  decisionKey: string
  operatorEmail: string
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const decision = readRoyaltyDecisionCards().find((card) => card.key === input.decisionKey)
  if (!decision) throw new Error('royalty_decision_not_found')

  const actionType = publisherActionToEvent('review_royalty_statement')
  const logId = await writePublisherExecutionLog(config, {
    actionType,
    name: `${actionType} - ${decision.author || '2026 royalty decision'}`,
    description: [
      `Publisher Operating Center opened royalty decision ${decision.key}.`,
      `Decision type ${decision.decisionType}.`,
      `Author ${decision.author || 'unspecified'}; title ${decision.title || 'unspecified'}; amount ${decision.amountAffected || 'unspecified'}.`,
      `Operator ${input.operatorEmail}.`,
      'No statement was emailed, paid, posted, or published.',
    ].join(' '),
    sourceEntity: 'royalty_decision_package',
    sourceRecordId: input.decisionKey,
  })

  return {
    decisionKey: input.decisionKey,
    executionLogId: extractId(logId),
  }
}

export async function logPublisherAuthorResponseAction(input: {
  gateId: string
  operatorEmail: string
  action: Extract<
    PublisherActionId,
    | 'view_thread'
    | 'confirm_classification'
    | 'change_classification'
    | 'reconcile_response'
    | 'retry_failed_transition'
    | 'mark_non_decision_message'
  >
}) {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const gate = await dataverseFirst(config, 'jm1pub_editorialapprovalgates', {
    $select:
      'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value',
    $filter: `jm1pub_editorialapprovalgateid eq ${input.gateId}`,
  })
  if (!gate) throw new Error('author_response_gate_not_found')

  const actionType = publisherActionToEvent(input.action)
  const logId = await writePublisherExecutionLog(config, {
    actionType,
    name: `${actionType} - ${String(gate.jm1pub_editorialapprovalgatename || input.gateId)}`,
    description: [
      `Publisher Operating Center recorded author-response action ${input.action}.`,
      `Gate ${String(gate.jm1pub_gatecode || gate.jm1pub_editorialapprovalgatename || input.gateId)}.`,
      `Gate status ${dataverseFormatted(gate, 'jm1pub_gatestatus') || String(gate.jm1pub_gatestatus || 'Unknown')}.`,
      `Decision ${dataverseFormatted(gate, 'jm1pub_authordecision') || String(gate.jm1pub_authordecision || 'Unknown')}.`,
      `Decision timestamp ${String(gate.jm1pub_authordecisionon || 'Unknown')}.`,
      `Operator ${input.operatorEmail}.`,
      'No author communication sent.',
    ].join(' '),
    sourceEntity: 'jm1pub_editorialapprovalgate',
    sourceRecordId: input.gateId,
  })

  return {
    gateId: input.gateId,
    executionLogId: extractId(logId),
  }
}

async function getPublisherIntakeForAction(config: DataverseServerConfig, intakeId: string) {
  const intake = await dataverseFirst(config, 'jm1_publishingintakes', {
    $select:
      'jm1_publishingintakeid,jm1_name,jm1_firstname,jm1_lastname,jm1_email,jm1_projecttitle,jm1_intakereferencecode,jm1_intakechannel,jm1_manuscripturl,jm1_submissionurl,jm1_manuscriptreceived,jm1_workspacestatus,jm1_sharepointworkspaceurl,jm1_stage0handoffstatus,_jm1_linkedcontact_value,_jm1_opportunity_value,createdon,modifiedon',
    $filter: `jm1_publishingintakeid eq ${intakeId}`,
  })
  if (!intake) throw new Error('intake_not_found')
  return intake
}

function assertLinkedContact(intake: DataverseRow) {
  if (!dataverseLookupId(intake, '_jm1_linkedcontact_value')) throw new Error('intake_missing_contact')
}

async function getRecentIntakes(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1_publishingintakes', {
    $select:
      'jm1_publishingintakeid,jm1_name,jm1_firstname,jm1_lastname,jm1_email,jm1_projecttitle,jm1_intakereferencecode,jm1_manuscripturl,jm1_submissionurl,jm1_manuscriptreceived,jm1_intakestatus,jm1_workspacestatus,jm1_stageatsubmission,jm1_stage0handoffstatus,jm1_stage0handoffcreated,_jm1_linkedcontact_value,_jm1_opportunity_value,createdon,modifiedon',
    $orderby: 'createdon desc',
    $top: '40',
  })
}

async function getRecentTitles(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1pub_titles', {
    $select:
      'jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname,jm1pub_stage,jm1pub_status,jm1pub_publicationstatus,jm1pub_publiccatalogstatus,_jm1pub_contract_value,_jm1_author_value,createdon,modifiedon',
    $orderby: 'createdon desc',
    $top: '250',
  })
}

async function getRecentAssets(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1pub_publishingassets', {
    $select:
      'jm1pub_publishingassetid,jm1pub_assetformat,jm1pub_assetstatus,jm1pub_assetconfidencestatus,jm1pub_assethealthstatus,jm1pub_distributionstatus,jm1pub_evidencepath,jm1pub_evidencesource,jm1pub_filepackagereference,jm1pub_interiorfilereference,jm1pub_isbn13,_jm1pub_titleid_value,_jm1pub_contractid_value,createdon,modifiedon',
    $orderby: 'createdon desc',
    $top: '250',
  })
}

async function getRecentEditorialStages(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1pub_editorialstages', {
    $select:
      'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_stagesequence,jm1pub_authorsafesummary,_jm1pub_titleid_value,_jm1pub_publishingassetid_value,_jm1pub_contactid_value,createdon,modifiedon',
    $orderby: 'createdon desc',
    $top: '250',
  })
}

async function getRecentApprovalGates(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1pub_editorialapprovalgates', {
    $select:
      'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authorresponsesummary,jm1pub_authordecisionon,jm1pub_authordecisionsource,jm1pub_nextstageauthorized,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,createdon,modifiedon',
    $orderby: 'modifiedon desc',
    $top: '100',
  })
}

async function getRecentOpportunities(config: DataverseServerConfig) {
  return dataverseList(config, 'opportunities', {
    $select:
      'opportunityid,name,jm1pub_projecttitle,jm1pub_intaketrackingid,jm1pub_contractstatus,jm1_m6firstpaymentstatus,jm1_m6firstpaymentconfirmedon,jm1_m6agreementpreparationstatus,jm1_m6onboardingstatus,jm1_m6packageselectionstatus,jm1_m6paymentoptionpreparationstatus,_parentcontactid_value,_customerid_value,createdon,modifiedon',
    $orderby: 'createdon desc',
    $top: '100',
  })
}

async function getRecentExecutionLogs(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription,jm1_sourceentity,jm1_sourcerecordid,createdon',
    $orderby: 'createdon desc',
    $top: '100',
  })
}

async function getRecentProductionProjects(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1_productionprojects', {
    $select:
      'jm1_productionprojectid,jm1_name,jm1_productiontype,jm1_status,jm1_fileslocation,_jm1_title_value,createdon,modifiedon',
    $orderby: 'modifiedon desc',
    $top: '100',
  })
}

async function getRecentProductionTasks(config: DataverseServerConfig) {
  return dataverseList(config, 'jm1_productiontasks', {
    $select:
      'jm1_productiontaskid,jm1_taskname,jm1_status,jm1_priority,jm1_assignedto,jm1_duedate,createdon,modifiedon',
    $orderby: 'modifiedon desc',
    $top: '100',
  })
}

function buildQueueItem(
  intake: DataverseRow,
  titles: DataverseRow[],
  assets: DataverseRow[],
  editorialStages: DataverseRow[],
  opportunities: DataverseRow[],
  logs: DataverseRow[],
): PublisherQueueItem {
  const titleName = stringValue(intake.jm1_projecttitle) || stringValue(intake.jm1_name)
  const authorName = [stringValue(intake.jm1_firstname), stringValue(intake.jm1_lastname)].filter(Boolean).join(' ')
  const normalized = normalizeTitle(titleName)
  const title = titles.find((row) => normalizeTitle(stringValue(row.jm1pub_titlename || row.jm1pub_name)) === normalized)
  const titleId = stringValue(title?.jm1pub_titleid)
  const asset = assets.find((row) => titleId && dataverseLookupId(row, '_jm1pub_titleid_value') === titleId)
  const editorialStage = editorialStages.find(
    (row) => asset && dataverseLookupId(row, '_jm1pub_publishingassetid_value') === stringValue(asset.jm1pub_publishingassetid),
  )
  const opportunityId = dataverseLookupId(intake, '_jm1_opportunity_value')
  const opportunity = opportunities.find((row) => stringValue(row.opportunityid) === opportunityId)
  const log = logs.find(
    (row) =>
      stringValue(row.jm1_sourcerecordid) === stringValue(intake.jm1_publishingintakeid) ||
      (titleId && stringValue(row.jm1_sourcerecordid) === titleId),
  )
  const sourceLocation = stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)
  const hasManuscript = intake.jm1_manuscriptreceived === true || Boolean(sourceLocation)
  const hasContact = Boolean(dataverseLookupId(intake, '_jm1_linkedcontact_value'))
  const currentStage = dataverseFormatted(title || {}, 'jm1pub_stage') || 'Inquiry'
  const latestActionType = stringValue(log?.jm1_actiontype)
  const hasEvidenceHold = latestActionType === 'PUBLISHER_INTAKE_EVIDENCE_HOLD_PLACED' && !hasManuscript
  const hasEditorialStage = Boolean(editorialStage) || latestActionType === 'PUBLISHER_EDITORIAL_REVIEW_INITIALIZED'
  const editorialWorkloadState = editorialStage
    ? deriveWorkloadState({
        pipelineStage: currentStage,
        stageType: `${dataverseFormatted(editorialStage, 'jm1pub_stagetype')} ${stringValue(editorialStage.jm1pub_name)}`,
        stageStatus: dataverseFormatted(editorialStage, 'jm1pub_stagestatus') || '',
        stageSummary: stringValue(editorialStage.jm1pub_authorsafesummary),
        hasAsset: Boolean(asset?.jm1pub_publishingassetid),
        latestAction: latestActionType,
      })
    : undefined
  const currentBlocker = deriveQueueBlocker(
    editorialWorkloadState,
    deriveBlocker({
      hasManuscript,
      hasContact,
      titleId,
      assetId: stringValue(asset?.jm1pub_publishingassetid),
      hasEvidenceHold,
      hasEditorialStage,
    }),
  )
  const authorizedActions = buildAuthorizedActions(currentBlocker, hasContact)
  const recommendedNextAction =
    editorialWorkloadState && currentBlocker !== 'Ready for next editorial scheduling decision'
      ? deriveNextAction(editorialWorkloadState, titleName)
      : authorizedActions.find((action) => action.id !== 'view_only')?.label || currentBlocker
  const actionOwner = currentBlocker.includes('release decision ready')
    ? 'publisher'
    : currentBlocker.includes('response pending')
      ? 'author'
      : currentBlocker.includes('in progress')
        ? 'system'
        : (
            currentBlocker === 'Ready for publisher intake review' ||
            currentBlocker === 'Editorial Review automation pending' ||
            currentBlocker === 'Ready for next editorial scheduling decision'
          ) && hasContact && hasManuscript
          ? 'system'
          : authorizedActions.some((action) => action.id !== 'view_only')
            ? 'publisher'
            : 'system'
  const execution = deriveQueueExecutionModel({
    actionOwner,
    currentBlocker,
    hasAuthorizedAction: authorizedActions.some((action) => action.id !== 'view_only'),
    latestExecutionEvidence: log ? `${stringValue(log.jm1_actiontype)} (${stringValue(log.jm1_executionlogid)})` : '',
  })
  const daysOld = ageDays(stringValue(intake.createdon))

  return {
    key: stringValue(intake.jm1_publishingintakeid),
    intakeId: stringValue(intake.jm1_publishingintakeid),
    intakeReference: stringValue(intake.jm1_intakereferencecode),
    authorName,
    authorEmail: stringValue(intake.jm1_email),
    contactId: dataverseLookupId(intake, '_jm1_linkedcontact_value'),
    title: titleName,
    titleId,
    assetId: stringValue(asset?.jm1pub_publishingassetid),
    opportunityId,
    contractStatus: dataverseFormatted(opportunity || {}, 'jm1pub_contractstatus') || (title?._jm1pub_contract_value ? 'Linked' : 'Not confirmed'),
    paymentStatus: dataverseFormatted(opportunity || {}, 'jm1_m6firstpaymentstatus') || 'Not confirmed',
    rightsStatus: hasContact ? 'Contact linked; rights evidence pending publisher review' : 'Contact link missing',
    currentStage,
    editorialStage: editorialStage
      ? `${stringValue(editorialStage.jm1pub_name)}${dataverseFormatted(editorialStage, 'jm1pub_stagestatus') ? ` / ${dataverseFormatted(editorialStage, 'jm1pub_stagestatus')}` : ''}`
      : currentStage === 'Editorial'
        ? 'Editorial Review readiness'
        : 'Not initialized',
    capability: editorialWorkloadState
      ? deriveCapability(editorialWorkloadState)
      : currentStage === 'Editorial' || editorialStage
        ? 'CAP-001 / Editorial Intake'
        : 'Publisher Intake',
    sourceLocation,
    submissionDate: stringValue(intake.createdon),
    currentBlocker,
    recommendedNextAction,
    actionOwner,
    executionMode: execution.executionMode,
    executionState: execution.executionState,
    businessOwner: execution.businessOwner,
    executionOwner: execution.executionOwner,
    runtime: execution.runtime,
    runtimeCostCategory: execution.runtimeCostCategory,
    awaiting: execution.awaiting,
    lastTrigger: execution.lastTrigger,
    lastExecution: execution.lastExecution,
    expectedDuration: execution.expectedDuration,
    exactBlocker: execution.exactBlocker,
    holdReason: currentBlocker === 'Ready for publisher intake review' ? '' : currentBlocker,
    ageDays: daysOld,
    ageBucket: ageBucket(daysOld),
    overdueState: overdueState(daysOld, currentBlocker),
    duplicateRisk: titleId ? 'Existing title match found' : 'No title match found',
    latestExecutionEvidence: log
      ? `${stringValue(log.jm1_actiontype)} (${stringValue(log.jm1_executionlogid)})`
      : undefined,
    sharePointLink: sourceLocation,
    authorizedActions,
  }
}

function buildWorkloadItems(
  titles: DataverseRow[],
  assets: DataverseRow[],
  editorialStages: DataverseRow[],
  intakes: DataverseRow[],
  logs: DataverseRow[],
  portfolio: PublisherPortfolioItem[],
): PublisherWorkloadItem[] {
  const draftItems = titles
    .map((title) => {
      const titleId = stringValue(title.jm1pub_titleid)
      const portfolioItem = portfolio.find((item) => item.titleId === titleId)
      if (!portfolioItem || portfolioItem.portfolioState !== 'active_pipeline') return null
      const titleName = stringValue(title.jm1pub_titlename || title.jm1pub_name)
      const titleAssets = assets.filter((asset) => dataverseLookupId(asset, '_jm1pub_titleid_value') === titleId)
      const asset = titleAssets[0]
      const assetId = stringValue(asset?.jm1pub_publishingassetid)
      const stages = editorialStages
        .filter(
          (stage) =>
            dataverseLookupId(stage, '_jm1pub_titleid_value') === titleId ||
            (assetId && dataverseLookupId(stage, '_jm1pub_publishingassetid_value') === assetId),
        )
        .sort((a, b) => Number(b.jm1pub_stagesequence || 0) - Number(a.jm1pub_stagesequence || 0))
      const latestStage = stages[0]
      const stageType = `${dataverseFormatted(latestStage || {}, 'jm1pub_stagetype')} ${stringValue(latestStage?.jm1pub_name)}`
      const stageStatus = dataverseFormatted(latestStage || {}, 'jm1pub_stagestatus') || ''
      const pipelineStage = dataverseFormatted(title, 'jm1pub_stage') || 'Unstaged'
      const intake = intakes.find((row) => normalizeTitle(stringValue(row.jm1_projecttitle || row.jm1_name)) === normalizeTitle(titleName))
      const latestLog = findLatestLogForWorkload(logs, titleId, assetId, stages)
      const workloadState = deriveWorkloadState({
        pipelineStage,
        stageType,
        stageStatus,
        stageSummary: stringValue(latestStage?.jm1pub_authorsafesummary),
        hasAsset: Boolean(assetId),
        latestAction: stringValue(latestLog?.jm1_actiontype),
      })
      const capability = deriveCapability(workloadState)
      const guard = deriveReadinessGuard(workloadState, latestStage, latestLog)
      const owner = deriveOwner(workloadState, guard.status)
      const execution = deriveWorkloadExecutionModel({
        state: workloadState,
        guardStatus: guard.status,
        guardMessage: guard.message,
        latestExecutionEvidence: latestLog
          ? `${stringValue(latestLog.jm1_actiontype)} (${stringValue(latestLog.jm1_executionlogid)})`
          : 'No recent execution evidence found',
      })
      const ageBase = stringValue(latestStage?.modifiedon || latestStage?.createdon || title.modifiedon || title.createdon)
      const age = ageDays(ageBase)

      return {
        key: titleId,
        title: titleName,
        author: stringValue(title.jm1pub_authorname) || dataverseFormatted(title, '_jm1_author_value') || 'Author pending',
        contactId:
          dataverseLookupId(latestStage || {}, '_jm1pub_contactid_value') ||
          dataverseLookupId(title, '_jm1_author_value') ||
          dataverseLookupId(intake || {}, '_jm1_linkedcontact_value'),
        relationshipId: '',
        intake: stringValue(intake?.jm1_intakereferencecode || intake?.jm1_publishingintakeid),
        titleId,
        assetId,
        pipelineStage,
        editorialStage: latestStage ? stringValue(latestStage.jm1pub_name) : 'Not initialized',
        editorialSubstage: workloadState === 'Line Editing - Author Review' ? 'Author Review' : stageStatus || 'Not Started',
        workloadState,
        activeCapability: capability,
        currentOwner: owner,
        executionMode: execution.executionMode,
        executionState: execution.executionState,
        businessOwner: execution.businessOwner,
        executionOwner: execution.executionOwner,
        runtime: execution.runtime,
        runtimeCostCategory: execution.runtimeCostCategory,
        awaiting: execution.awaiting,
        lastTrigger: execution.lastTrigger,
        lastExecution: execution.lastExecution,
        expectedDuration: execution.expectedDuration,
        exactBlocker: execution.exactBlocker,
        nextAction: deriveNextAction(workloadState, titleName),
        targetDate: deriveTargetDate(workloadState),
        ageDays: age,
        authorAction: deriveAuthorAction(workloadState, guard.status),
        publisherAction: derivePublisherAction(workloadState),
        internalQaState: deriveInternalQaState(workloadState),
        packageReadiness: derivePackageReadiness(workloadState, guard.status),
        holdReason: guard.status === 'blocked' ? guard.message : '',
        restartCondition: deriveRestartCondition(workloadState, guard.status),
        workloadLevel: deriveWorkloadLevel(workloadState, age),
        queuePosition: 0,
        downstreamQueueSize: 0,
        readinessGuard: guard,
        latestExecutionEvidence: latestLog
          ? `${stringValue(latestLog.jm1_actiontype)} (${stringValue(latestLog.jm1_executionlogid)})`
          : 'No recent execution evidence found',
      }
    })
    .filter((item): item is PublisherWorkloadItem => Boolean(item && item.title && isActiveWorkloadItem(item)))
    .sort((a, b) => workloadPriority(a) - workloadPriority(b) || b.ageDays - a.ageDays)

  const activeByCapability = countWorkloadByCapability(draftItems)
  return draftItems.map((item, index) => ({
    ...item,
    queuePosition: index + 1,
    downstreamQueueSize: Math.max((activeByCapability[item.activeCapability] || 1) - 1, 0),
  }))
}

function buildPortfolioItems(
  titles: DataverseRow[],
  assets: DataverseRow[],
  editorialStages: DataverseRow[],
  productionProjects: DataverseRow[] = [],
): PublisherPortfolioItem[] {
  return titles
    .map((title) => {
      const titleId = stringValue(title.jm1pub_titleid)
      const titleAssets = assets.filter((asset) => dataverseLookupId(asset, '_jm1pub_titleid_value') === titleId)
      const classification = classifyTitlePortfolio({
        title,
        assets: titleAssets,
        stages: editorialStages,
        productionProjects,
      })
      const titleName = stringValue(title.jm1pub_titlename || title.jm1pub_name) || '(Untitled)'

      return {
        key: titleId || normalizeTitle(titleName),
        title: titleName,
        author:
          stringValue(title.jm1pub_authorname) ||
          stringValue(title.jm1pub_authordisplayname) ||
          dataverseFormatted(title, '_jm1_author_value') ||
          'Author pending',
        titleId,
        assetIds: titleAssets.map((asset) => stringValue(asset.jm1pub_publishingassetid)).filter(Boolean),
        portfolioState: classification.state,
        portfolioLabel: classification.label,
        pipelineStage: dataverseFormatted(title, 'jm1pub_stage') || 'Unstaged',
        catalogStatus: classification.catalogStatus || 'Unknown',
        publicationStatus: classification.publicationStatus || '',
        distributionStatus: classification.distributionStatus || 'Unknown',
        activeFormats: classification.activeFormats,
        isbn13s: classification.isbn13s,
        evidence: classification.evidence,
        confidence: classification.confidence,
        exceptionReason: classification.exceptionReason,
        nextAction: derivePortfolioNextAction(classification),
      }
    })
    .sort((a, b) => portfolioSortOrder(a) - portfolioSortOrder(b) || a.title.localeCompare(b.title))
}

function derivePortfolioNextAction(classification: CatalogPortfolioClassification) {
  switch (classification.state) {
    case 'active_pipeline':
      return 'Manage through Active Pipeline workload controls'
    case 'published_catalog':
      return 'Maintain catalog metadata, distribution, marketing, and royalty readiness'
    case 'external_hold':
      return classification.exceptionReason || 'Resolve external dependency before movement'
    case 'archive_historical':
      return 'Preserve as historical evidence unless a governed restore/reopen is approved'
    default:
      return classification.exceptionReason || 'Reconcile missing catalog identity or lifecycle evidence'
  }
}

function portfolioSortOrder(item: PublisherPortfolioItem) {
  switch (item.portfolioState) {
    case 'active_pipeline':
      return 0
    case 'published_catalog':
      return 1
    case 'external_hold':
      return 2
    case 'reconciliation_required':
      return 3
    case 'archive_historical':
      return 4
    default:
      return 9
  }
}

function findLatestLogForWorkload(
  logs: DataverseRow[],
  titleId: string,
  assetId: string,
  stages: DataverseRow[],
) {
  const stageIds = new Set(stages.map((stage) => stringValue(stage.jm1pub_editorialstageid)).filter(Boolean))
  return logs.find((log) => {
    const recordId = stringValue(log.jm1_sourcerecordid)
    return recordId === titleId || recordId === assetId || stageIds.has(recordId)
  })
}

function deriveWorkloadState(input: {
  pipelineStage: string
  stageType: string
  stageStatus: string
  stageSummary?: string
  hasAsset: boolean
  latestAction?: string
}): PublisherWorkloadState {
  if (!input.hasAsset) return 'Blocked'
  const type = input.stageType.toLowerCase()
  const status = input.stageStatus.toLowerCase()
  const summary = input.stageSummary?.toLowerCase() || ''
  const latestAction = input.latestAction?.toLowerCase() || ''
  if (type.includes('line')) {
    if (
      status.includes('author') ||
      summary.includes('author review') ||
      summary.includes('delivered to the author') ||
      summary.includes('copyediting is blocked') ||
      latestAction.includes('cap002_author_package_delivered')
    ) {
      return 'Line Editing - Author Review'
    }
    if (status.includes('qa')) return 'Line Editing - Internal QA'
    if (status.includes('delivered') || status.includes('complete')) return 'Line Editing - Release Decision Ready'
    if (status.includes('progress')) return 'Line Editing - In Progress'
    return 'Line Editing - Not Started'
  }
  if (type.includes('developmental')) {
    if (status.includes('author')) return 'Developmental Editing - Author Review'
    if (status.includes('progress')) return 'Developmental Editing - In Progress'
    return 'Developmental Editing - Not Started'
  }
  if (type.includes('copy')) {
    if (
      status.includes('author') ||
      summary.includes('author review') ||
      summary.includes('ready for your review') ||
      summary.includes('sent by email') ||
      latestAction.includes('cap003_author_package_delivered') ||
      latestAction.includes('cap003_author_review_opened')
    ) {
      return 'Copyediting - Author Review'
    }
    if (
      status.includes('complete') ||
      summary.includes('internally complete') ||
      latestAction.includes('cap003_author_package_ready') ||
      latestAction.includes('cap003_internal_publisher_qa_completed')
    ) {
      return 'Copyediting - Release Decision Ready'
    }
    if (status.includes('progress')) return 'Copyediting In Progress'
    return 'Copyediting Ready'
  }
  if (type.includes('proof')) {
    const notificationCompleted = hasAuthorNotificationEvidence(`${summary} ${latestAction}`)
    if (
      status.includes('author') ||
      summary.includes('sent by email') ||
      latestAction.includes('proofreading_author_notification_sent') ||
      latestAction.includes('cap004_author_notification_sent') ||
      latestAction.includes('author_notification_sent')
    ) {
      return 'Proofreading - Author Review'
    }
    if (
      status.includes('plan delivered') ||
      summary.includes('author review') ||
      summary.includes('ready for your review') ||
      latestAction.includes('proofreading_author_package_released') ||
      latestAction.includes('cap004_author_package_released')
    ) {
      return notificationCompleted ? 'Proofreading - Author Review' : 'Proofreading - Notification Pending'
    }
    if (status.includes('qa')) return 'Proofreading - Internal QA'
    if (status.includes('progress')) return 'Proofreading In Progress'
    if (status.includes('complete')) return 'Production Ready'
    return 'Proofreading Ready'
  }
  if (type.includes('production')) return 'Production Ready'
  if (input.pipelineStage.toLowerCase().includes('editorial')) return 'Editorial Review'
  if (input.pipelineStage.toLowerCase().includes('ongoing')) return 'External Hold'
  return 'Blocked'
}

function deriveCapability(state: PublisherWorkloadState) {
  if (state.startsWith('Developmental')) return 'CAP-001 Developmental Editing'
  if (state.startsWith('Line')) return 'CAP-002 Line Editing'
  if (state.startsWith('Copy')) return 'CAP-003 Copyediting'
  if (state.startsWith('Proof')) return 'CAP-004 Proofreading'
  if (state === 'Production Ready') return 'Production'
  return 'Editorial Review'
}

function hasAuthorNotificationEvidence(value: string) {
  const normalized = value.toLowerCase()
  return (
    normalized.includes('notification sent') ||
    normalized.includes('author notification sent') ||
    normalized.includes('email sent') ||
    normalized.includes('sent by email') ||
    normalized.includes('delivery confirmed') ||
    normalized.includes('provider accepted') ||
    normalized.includes('acs accepted') ||
    normalized.includes('message id')
  )
}

function deriveNextAction(state: PublisherWorkloadState, title: string) {
  if (
    title === 'The Intentional Leader' &&
    ![
      'Line Editing - Author Review',
      'Copyediting - Release Decision Ready',
      'Copyediting - Author Review',
      'Proofreading Ready',
      'Proofreading In Progress',
      'Proofreading - Internal QA',
      'Proofreading - Notification Pending',
      'Proofreading - Author Review',
    ].includes(state)
  ) {
    return 'Complete full Volume I Line Editing package and QA'
  }
  switch (state) {
    case 'Editorial Review':
      return 'Complete Editorial Review and assign next governed stage'
    case 'Developmental Editing - Not Started':
      return 'Begin Developmental Editing when title entry criteria are satisfied; set priority, owner, and target date'
    case 'Developmental Editing - In Progress':
      return 'Continue Developmental Editing and internal QA'
    case 'Developmental Editing - Author Review':
      return 'Await author response'
    case 'Line Editing - In Progress':
      return 'Complete line edit, QA, and package draft'
    case 'Line Editing - Internal QA':
      return 'Complete internal QA'
    case 'Line Editing - Release Decision Ready':
      return 'Jackie release decision required before author-facing Line Editing package is sent'
    case 'Line Editing - Author Review':
      return 'Await author response'
    case 'Copyediting Ready':
      return 'Hold until CAP-002 exit is complete'
    case 'Copyediting In Progress':
      return 'Complete Copyediting pass, QA, and internal package draft'
    case 'Copyediting - Release Decision Ready':
      return 'Jackie release decision required before author-facing Copyediting package is sent; Proofreading awaits release decision'
    case 'Copyediting - Author Review':
      return 'Await author response; Proofreading awaits author approval'
    case 'Proofreading Ready':
      return 'Begin CAP-004 Proofreading when authorized'
    case 'Proofreading In Progress':
      return 'Continue Proofreading pass and internal QA'
    case 'Proofreading - Internal QA':
      return 'Complete Proofreading internal QA'
    case 'Proofreading - Notification Pending':
      return 'Send and log the Proofreading package notification before opening the author-response gate'
    case 'Proofreading - Author Review':
      return 'Await author Proofreading response'
    case 'External Hold':
      return 'Resolve external evidence or publisher judgment hold'
    default:
      return 'Resolve blocker before movement'
  }
}

function deriveTargetDate(state: PublisherWorkloadState) {
  const days =
    state === 'Line Editing - Author Review'
      ? 7
      : state === 'Line Editing - In Progress'
      ? 3
      : state === 'Line Editing - Release Decision Ready'
        ? 1
        : state === 'Editorial Review'
          ? 2
          : state.includes('Developmental')
            ? 5
            : 7
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 10)
}

function deriveAuthorAction(state: PublisherWorkloadState, guardStatus: 'pass' | 'watch' | 'blocked') {
  if (guardStatus === 'blocked') return 'None - title-specific dependency hold active'
  if (state === 'Line Editing - Author Review') return 'Review and approve Line Editing package'
  if (state === 'Copyediting - Release Decision Ready') return 'None - publisher release decision pending'
  if (state === 'Copyediting - Author Review') return 'Review and approve Copyediting package'
  if (state === 'Proofreading Ready' || state === 'Proofreading In Progress' || state === 'Proofreading - Internal QA') {
    return 'None'
  }
  if (state === 'Proofreading - Notification Pending') return 'None - package notification pending'
  if (state === 'Proofreading - Author Review') return 'Review and approve Proofreading package'
  if (state.includes('Author Review')) return 'Review released package and respond through governed channel'
  return 'None'
}

function derivePublisherAction(state: PublisherWorkloadState) {
  if (state === 'Editorial Review') return 'Complete Editorial Review'
  if (state.startsWith('Developmental')) return 'Prepare or continue Developmental package'
  if (state === 'Line Editing - Release Decision Ready') return 'Review and approve release of the Line Editing package'
  if (state === 'Line Editing - Author Review') return 'Await author response'
  if (state.startsWith('Line')) return 'Complete Line Editing package'
  if (state === 'Copyediting Ready') return 'Confirm Line Editing exit before Copyediting'
  if (state === 'Copyediting In Progress') return 'Complete Copyediting package'
  if (state === 'Copyediting - Release Decision Ready') return 'Review and approve release of the Copyediting package'
  if (state === 'Copyediting - Author Review') return 'Await author response'
  if (state === 'Proofreading Ready') return 'Prepare/start CAP-004 Proofreading when authorized'
  if (state === 'Proofreading In Progress') return 'Continue Proofreading pass and internal QA'
  if (state === 'Proofreading - Internal QA') return 'Complete Proofreading QA and prepare package'
  if (state === 'Proofreading - Notification Pending') return 'Send Proofreading package notification and confirm delivery'
  if (state === 'Proofreading - Author Review') return 'Await author response'
  return 'Resolve current blocker'
}

function deriveInternalQaState(state: PublisherWorkloadState) {
  if (state.includes('Internal QA')) return 'In QA'
  if (state === 'Proofreading In Progress') return 'Pending'
  if (state === 'Line Editing - Author Review') return 'PASS'
  if (state === 'Line Editing - Release Decision Ready') return 'Passed'
  if (state === 'Copyediting - Release Decision Ready') return 'PASS'
  if (state === 'Copyediting - Author Review') return 'PASS'
  if (state === 'Line Editing - In Progress' || state.includes('Developmental')) return 'Pending'
  if (state.includes('Author Review') || state === 'Copyediting Ready' || state === 'Production Ready') return 'Passed or not required'
  return 'Not started'
}

function derivePackageReadiness(state: PublisherWorkloadState, guardStatus: 'pass' | 'watch' | 'blocked') {
  if (guardStatus === 'blocked') return 'Held by title-specific dependency'
  if (state === 'Line Editing - Author Review') return 'Delivered'
  if (state === 'Proofreading In Progress') return 'Not yet released'
  if (state === 'Proofreading - Notification Pending') return 'Ready - notification pending'
  if (state.includes('Author Review')) return 'Released to author'
  if (state === 'Line Editing - Release Decision Ready') return 'Ready for Jackie release decision'
  if (state === 'Copyediting - Release Decision Ready') return 'Ready for Jackie release decision'
  if (state.includes('In Progress') || state.includes('Not Started')) return 'Not ready'
  if (state.includes('Internal QA')) return 'Internal QA'
  return 'Pending'
}

function deriveRestartCondition(state: PublisherWorkloadState, guardStatus: 'pass' | 'watch' | 'blocked') {
  if (guardStatus === 'blocked') return 'Correct manuscript-stage/package mismatch'
  if (state === 'Line Editing - Author Review') return 'Copyediting blocked until author approval gate is recorded'
  if (state === 'Copyediting - Release Decision Ready') return 'No restart required; Proofreading awaits publisher release decision'
  if (state === 'Copyediting - Author Review') return 'No restart required; Proofreading awaits author response'
  if (state === 'Proofreading Ready') return 'No restart required; Copyediting exit is complete'
  if (state === 'Proofreading In Progress') return 'No restart required; Proofreading is underway'
  if (state === 'Proofreading - Internal QA') return 'No restart required; Proofreading QA is underway'
  if (state === 'Proofreading - Notification Pending') return 'No restart required; send and log package notification'
  if (state === 'Proofreading - Author Review') return 'No restart required; Proofreading package is with author'
  if (state === 'External Hold') return 'Resolve external evidence hold'
  if (state === 'Blocked') return 'Reconcile title, asset, and stage evidence'
  return 'No restart required'
}

function deriveWorkloadLevel(
  state: PublisherWorkloadState,
  ageDaysValue: number,
): PublisherWorkloadItem['workloadLevel'] {
  if (ageDaysValue > 14) return 'resource-attention'
  if (ageDaysValue > 7) return 'overdue-risk'
  if (state.includes('Author Review')) return 'normal'
  if (state.includes('In Progress')) return 'elevated'
  if (state.includes('Not Started') || state === 'Editorial Review' || state === 'Copyediting Ready') return 'normal'
  if (state === 'Production Ready' || state === 'Proofreading Ready') return 'high'
  return 'available'
}

function deriveReadinessGuard(
  state: PublisherWorkloadState,
  stage: DataverseRow | undefined,
  latestLog: DataverseRow | undefined,
): PublisherWorkloadItem['readinessGuard'] {
  const summary = stringValue(stage?.jm1pub_authorsafesummary).toLowerCase()
  const latestAction = stringValue(latestLog?.jm1_actiontype)
  if (summary.includes('package') && !state.includes('Author Review') && !latestAction.includes('AUTHOR_PACKAGE')) {
    return {
      status: 'watch',
      message: 'Author-facing package language exists; confirm it matches current manuscript state before release.',
    }
  }
  if ((state === 'Copyediting Ready' || state === 'Production Ready') && !latestAction.includes('CAP002')) {
    return {
      status: 'blocked',
      message: 'Downstream readiness requires completed upstream editorial evidence.',
    }
  }
  return {
    status: 'pass',
    message: 'Author-facing readiness is consistent with governed stage state.',
  }
}

function deriveOwner(
  state: PublisherWorkloadState,
  guardStatus: 'pass' | 'watch' | 'blocked',
): PublisherWorkloadItem['currentOwner'] {
  if (guardStatus === 'blocked') return 'Publisher'
  if (state === 'Line Editing - Release Decision Ready' || state === 'Copyediting - Release Decision Ready') return 'Jackie'
  if (state.includes('Author Review')) return 'Author'
  if (state === 'External Hold') return 'External'
  return 'Publisher'
}

function deriveQueueExecutionModel(input: {
  actionOwner: PublisherQueueItem['actionOwner']
  currentBlocker: string
  hasAuthorizedAction: boolean
  latestExecutionEvidence: string
}): Pick<
  PublisherQueueItem,
  | 'executionMode'
  | 'executionState'
  | 'businessOwner'
  | 'executionOwner'
  | 'runtime'
  | 'runtimeCostCategory'
  | 'awaiting'
  | 'lastTrigger'
  | 'lastExecution'
  | 'expectedDuration'
  | 'exactBlocker'
> {
  if (input.actionOwner === 'author') {
    return {
      executionMode: 'EXTERNAL_PARTY',
      executionState: 'WAITING_FOR_EXTERNAL_PARTY',
      businessOwner: 'Author',
      executionOwner: 'Author',
      runtime: 'Governed email thread and Author Operating Center response surface',
      runtimeCostCategory: 'No variable model cost',
      awaiting: 'Author',
      lastTrigger: 'Author package release',
      lastExecution: input.latestExecutionEvidence || 'No recent execution evidence found',
      expectedDuration: 'Author dependent',
      exactBlocker: input.currentBlocker,
    }
  }
  if (input.hasAuthorizedAction && input.actionOwner === 'publisher') {
    return {
      executionMode: 'SYSTEM_ACTION_MANUALLY_TRIGGERED',
      executionState: 'WAITING_FOR_HUMAN',
      businessOwner: 'Publisher',
      executionOwner: 'Publisher',
      runtime: 'Publisher Operating Center bounded action API',
      runtimeCostCategory: 'Dataverse/API',
      awaiting: 'Publisher',
      lastTrigger: 'Publisher action pending',
      lastExecution: input.latestExecutionEvidence || 'No recent execution evidence found',
      expectedDuration: 'Immediate after publisher trigger',
      exactBlocker: input.currentBlocker,
    }
  }
  if (input.actionOwner === 'system') {
    return {
      executionMode: 'AUTOMATIC_SCHEDULED',
      executionState: input.currentBlocker.toLowerCase().includes('in progress')
        ? 'EXECUTING'
        : input.currentBlocker.toLowerCase().includes('pending')
          ? 'QUEUED'
          : 'QUEUED',
      businessOwner: 'Publisher',
      executionOwner: 'JM1 Automation',
      runtime: 'Deployed Publisher Operating Center read model and bounded API',
      runtimeCostCategory: 'Dataverse/API',
      awaiting: 'None',
      lastTrigger: 'Core state refresh',
      lastExecution: input.latestExecutionEvidence || 'No recent execution evidence found',
      expectedDuration: 'Runtime dependent',
      exactBlocker: input.currentBlocker,
    }
  }
  return {
    executionMode: 'EXTERNAL_PARTY',
    executionState: 'WAITING_FOR_EXTERNAL_PARTY',
    businessOwner: 'External',
    executionOwner: 'External',
    runtime: 'External party or source system',
    runtimeCostCategory: 'No variable model cost',
    awaiting: 'External party',
    lastTrigger: 'External dependency identified',
    lastExecution: input.latestExecutionEvidence || 'No recent execution evidence found',
    expectedDuration: 'External dependent',
    exactBlocker: input.currentBlocker,
  }
}

function deriveWorkloadExecutionModel(input: {
  state: PublisherWorkloadState
  guardStatus: 'pass' | 'watch' | 'blocked'
  guardMessage: string
  latestExecutionEvidence: string
}): Pick<
  PublisherWorkloadItem,
  | 'executionMode'
  | 'executionState'
  | 'businessOwner'
  | 'executionOwner'
  | 'runtime'
  | 'runtimeCostCategory'
  | 'awaiting'
  | 'lastTrigger'
  | 'lastExecution'
  | 'expectedDuration'
  | 'exactBlocker'
> {
  if (input.guardStatus === 'blocked') {
    return {
      executionMode: 'CODY_ENGINEERING_ONLY',
      executionState: 'EXCEPTION',
      businessOwner: 'Publisher',
      executionOwner: 'Engineering',
      runtime: 'Engineering remediation only; no business-stage movement authorized by this state',
      runtimeCostCategory: 'Codex interactive/model',
      awaiting: 'Engineering remediation',
      lastTrigger: 'Readiness guard exception',
      lastExecution: input.latestExecutionEvidence,
      expectedDuration: 'Exception dependent',
      exactBlocker: input.guardMessage,
    }
  }
  if (input.state === 'Proofreading - Notification Pending') {
    return {
      executionMode: 'AUTOMATIC_EVENT_DRIVEN',
      executionState: 'QUEUED',
      businessOwner: 'Publisher',
      executionOwner: 'JM1 Automation',
      runtime: 'JM1 Publishing Orchestrator notification transaction and ACS email relay',
      runtimeCostCategory: 'Azure compute',
      awaiting: 'None',
      lastTrigger: 'Proofreading package ready',
      lastExecution: input.latestExecutionEvidence,
      expectedDuration: 'Immediate retry until sent or exceptioned',
      exactBlocker: 'Proofreading package notification has not been sent or logged; author-response gate is not live.',
    }
  }
  if (input.state.includes('Author Review')) {
    return {
      executionMode: 'EXTERNAL_PARTY',
      executionState: 'WAITING_FOR_EXTERNAL_PARTY',
      businessOwner: 'Author',
      executionOwner: 'Author',
      runtime: 'Governed email thread and Author Operating Center review surface',
      runtimeCostCategory: 'No variable model cost',
      awaiting: 'Author',
      lastTrigger: 'Author package release',
      lastExecution: input.latestExecutionEvidence,
      expectedDuration: 'Author dependent',
      exactBlocker: deriveNextAction(input.state, ''),
    }
  }
  if (input.state === 'Line Editing - Release Decision Ready' || input.state === 'Copyediting - Release Decision Ready') {
    return {
      executionMode: 'SYSTEM_ACTION_MANUALLY_TRIGGERED',
      executionState: 'WAITING_FOR_HUMAN',
      businessOwner: 'Publisher',
      executionOwner: 'Publisher',
      runtime: 'Publisher Operating Center release action',
      runtimeCostCategory: 'Dataverse/API',
      awaiting: 'Jackie',
      lastTrigger: 'Package ready evidence',
      lastExecution: input.latestExecutionEvidence,
      expectedDuration: 'Immediate after publisher release decision',
      exactBlocker: deriveNextAction(input.state, ''),
    }
  }
  if (input.state === 'Proofreading In Progress' || input.state === 'Proofreading - Internal QA') {
    return {
      executionMode: 'AUTOMATIC_SCHEDULED',
      executionState: input.state === 'Proofreading - Internal QA' ? 'VALIDATING' : 'EXECUTING',
      businessOwner: 'Publisher',
      executionOwner: 'JM1 Automation',
      runtime: 'JM1 Editorial Execution Runtime - Proofreading executor',
      runtimeCostCategory: 'Azure compute',
      awaiting: 'None',
      lastTrigger: 'Publisher-approved proofreading start',
      lastExecution: input.latestExecutionEvidence,
      expectedDuration: 'Runtime SLA controlled',
      exactBlocker: deriveNextAction(input.state, '') || 'Proofreading executor is responsible for next output, QA, or exact exception.',
    }
  }
  if (input.state === 'Developmental Editing - In Progress' || input.state === 'Line Editing - In Progress') {
    return {
      executionMode: 'AUTOMATIC_SCHEDULED',
      executionState: 'EXECUTING',
      businessOwner: 'Publisher',
      executionOwner: 'JM1 Automation',
      runtime: 'JM1 Editorial Execution Runtime - editorial executor',
      runtimeCostCategory: 'Azure compute',
      awaiting: 'None',
      lastTrigger: 'Publisher-approved stage start',
      lastExecution: input.latestExecutionEvidence,
      expectedDuration: 'Runtime SLA controlled',
      exactBlocker: deriveNextAction(input.state, '') || 'Editorial executor is responsible for next output, QA, or exact exception.',
    }
  }
  if (input.state === 'Editorial Review') {
    return {
      executionMode: 'AUTOMATIC_SCHEDULED',
      executionState: 'QUEUED',
      businessOwner: 'Publisher',
      executionOwner: 'JM1 Automation',
      runtime: 'JM1 Editorial Execution Runtime - Editorial Review executor',
      runtimeCostCategory: 'Azure compute',
      awaiting: 'None',
      lastTrigger: 'Core editorial stage active',
      lastExecution: input.latestExecutionEvidence,
      expectedDuration: 'Runtime SLA controlled',
      exactBlocker: 'Editorial Review executor is responsible for assessment output, QA, or exact exception.',
    }
  }
  if (input.state === 'External Hold') {
    return {
      executionMode: 'EXTERNAL_PARTY',
      executionState: 'WAITING_FOR_EXTERNAL_PARTY',
      businessOwner: 'External',
      executionOwner: 'External',
      runtime: 'External source or party',
      runtimeCostCategory: 'No variable model cost',
      awaiting: 'External party',
      lastTrigger: 'External hold identified',
      lastExecution: input.latestExecutionEvidence,
      expectedDuration: 'External dependent',
      exactBlocker: deriveNextAction(input.state, ''),
    }
  }
  return {
    executionMode: 'SYSTEM_ACTION_MANUALLY_TRIGGERED',
    executionState: input.state.includes('Ready') || input.state.includes('Not Started') ? 'NOT_TRIGGERED' : 'QUEUED',
    businessOwner: 'Publisher',
    executionOwner: 'Publisher',
    runtime: 'Publisher Operating Center bounded action',
    runtimeCostCategory: 'Dataverse/API',
    awaiting: 'Publisher',
    lastTrigger: 'Core state refresh',
    lastExecution: input.latestExecutionEvidence,
    expectedDuration: 'Immediate after publisher trigger',
    exactBlocker: deriveNextAction(input.state, ''),
  }
}

function isActiveWorkloadItem(item: PublisherWorkloadItem) {
  return ['Editorial', 'Ongoing Relationship', 'Production'].includes(item.pipelineStage) || item.editorialStage !== 'Not initialized'
}

function workloadPriority(item: PublisherWorkloadItem) {
  if (item.title === 'The Intentional Leader') return 0
  if (item.workloadState === 'Line Editing - Release Decision Ready') return 0
  if (item.workloadState === 'Copyediting - Release Decision Ready') return 0
  if (item.workloadState === 'Copyediting - Author Review') return 0
  if (item.workloadState === 'Line Editing - In Progress') return 1
  if (item.workloadState === 'Editorial Review') return 2
  if (item.workloadState.startsWith('Developmental')) return 3
  return 5
}

function countWorkloadByCapability(items: PublisherWorkloadItem[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.activeCapability] = (counts[item.activeCapability] || 0) + 1
    return counts
  }, {})
}

function deriveQueueBlocker(workloadState: PublisherWorkloadState | undefined, fallback: string) {
  if (workloadState === 'Line Editing - Release Decision Ready') return 'Line Editing package release decision ready'
  if (workloadState === 'Line Editing - Author Review') return 'Author Line Editing response pending'
  if (workloadState === 'Copyediting In Progress') return 'Copyediting in progress'
  if (workloadState === 'Copyediting - Release Decision Ready') return 'Copyediting package release decision ready'
  if (workloadState === 'Copyediting - Author Review') return 'Author Copyediting response pending'
  if (workloadState === 'Proofreading - Notification Pending') return 'Proofreading package notification pending'
  if (workloadState === 'Proofreading - Author Review') return 'Author Proofreading response pending'
  if (workloadState === 'Proofreading In Progress') return 'Proofreading in progress'
  if (workloadState === 'Proofreading - Internal QA') return 'Proofreading internal QA in progress'
  if (workloadState === 'Developmental Editing - Author Review') return 'Author Developmental Editing response pending'
  if (workloadState === 'Developmental Editing - In Progress') return 'Developmental Editing in progress'
  return fallback
}

function deriveBlocker(input: {
  hasManuscript: boolean
  hasContact: boolean
  titleId?: string
  assetId?: string
  hasEvidenceHold?: boolean
  hasEditorialStage?: boolean
}) {
  if (!input.hasContact) return 'Author contact must be reconciled'
  if (input.hasEvidenceHold) return 'Evidence hold active'
  if (input.titleId && input.assetId && input.hasEditorialStage) return 'Ready for next editorial scheduling decision'
  if (!input.hasManuscript) return 'Manuscript evidence is missing'
  if (!input.titleId || !input.assetId) return 'Editorial Review automation pending'
  if (!input.hasEditorialStage) return 'Editorial Review ready'
  return 'Ready for next editorial scheduling decision'
}

function isProvisionalTitleName(value: string) {
  return PROVISIONAL_TITLE_NAMES.has(value.trim().toLowerCase())
}

function buildAuthorizedActions(currentBlocker: string, hasContact: boolean): PublisherQueueItem['authorizedActions'] {
  if (currentBlocker === 'Ready for publisher intake review') {
    return [
      {
        id: 'review_intake',
        label: 'Review intake',
        entryConditions: ['Linked contact exists', 'Manuscript evidence exists'],
        authorFacingConsequence: 'None. This is an internal publisher movement.',
      },
    ]
  }

  if (currentBlocker === 'Manuscript evidence is missing' && hasContact) {
    return [
      {
        id: 'place_evidence_hold',
        label: 'Place evidence hold',
        entryConditions: ['Linked contact exists', 'Manuscript evidence is missing'],
        authorFacingConsequence: 'None. This records the internal evidence hold without contacting the author.',
      },
      {
        id: 'request_missing_information',
        label: 'Request missing information',
        entryConditions: ['Publisher confirms author-facing request is appropriate'],
        authorFacingConsequence: 'May prepare an author-facing request, but does not send automatically.',
      },
    ]
  }

  if (currentBlocker === 'Evidence hold active') {
    return [
      {
        id: 'verify_manuscript',
        label: 'Verify manuscript',
        entryConditions: ['Manuscript evidence exists in governed repository'],
        authorFacingConsequence: 'None. This clears internal evidence uncertainty only.',
      },
    ]
  }

  if (currentBlocker === 'Editorial Review ready') {
    return [
      {
        id: 'initialize_editorial_review',
        label: 'Initialize Editorial Review',
        entryConditions: ['Title exists', 'Publishing asset exists', 'Manuscript evidence verified'],
        authorFacingConsequence: 'None. This starts internal Editorial Review readiness.',
      },
    ]
  }

  return [
    {
      id: 'view_only',
      label: 'View evidence',
      entryConditions: ['Action blocked until missing evidence is resolved'],
      authorFacingConsequence: 'None.',
    },
  ]
}

async function findOrCreateTitle(config: DataverseServerConfig, intake: DataverseRow) {
  const titleName = stringValue(intake.jm1_projecttitle)
  const authorName = [stringValue(intake.jm1_firstname), stringValue(intake.jm1_lastname)].filter(Boolean).join(' ')
  const titlePublicationStatus = isProvisionalTitleName(titleName)
    ? 'Provisional title accepted for publisher intake review'
    : 'Publisher intake review initialized'
  const escaped = escapeODataText(titleName)
  const existing = await dataverseFirst(config, 'jm1pub_titles', {
    $select: 'jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_stage',
    $filter: `jm1pub_titlename eq '${escaped}' or jm1pub_name eq '${escaped}'`,
  })

  if (existing) {
    if (dataverseFormatted(existing, 'jm1pub_stage') !== 'Editorial') {
      await dataversePatch(config, 'jm1pub_titles', stringValue(existing.jm1pub_titleid), {
        jm1pub_stage: TITLE_STAGE_EDITORIAL,
      })
    }
    return { id: stringValue(existing.jm1pub_titleid), name: titleName, created: false }
  }

  const entityId = await dataverseCreate(config, 'jm1pub_titles', {
    jm1pub_name: titleName,
    jm1pub_titlename: titleName,
    jm1pub_authorname: authorName,
    jm1pub_stage: TITLE_STAGE_EDITORIAL,
    jm1pub_publicationstatus: titlePublicationStatus,
  })

  return { id: extractId(entityId), name: titleName, created: true }
}

async function findOrCreateAsset(config: DataverseServerConfig, intake: DataverseRow, titleId: string) {
  const existing = await dataverseFirst(config, 'jm1pub_publishingassets', {
    $select: 'jm1pub_publishingassetid,_jm1pub_titleid_value',
    $filter: `_jm1pub_titleid_value eq ${titleId}`,
  })
  if (existing) return { id: stringValue(existing.jm1pub_publishingassetid), created: false }

  const manuscriptUrl = stringValue(intake.jm1_manuscripturl || intake.jm1_submissionurl)
  const titleName = stringValue(intake.jm1_projecttitle) || 'Publishing asset'
  const entityId = await dataverseCreate(config, 'jm1pub_publishingassets', {
    'jm1pub_TitleId@odata.bind': `/jm1pub_titles(${titleId})`,
    jm1pub_name: titleName,
    jm1pub_assetformat: ASSET_FORMAT_OTHER,
    jm1pub_assetstatus: ASSET_STATUS_STAGED,
    jm1pub_distributionstatus: DISTRIBUTION_STATUS_DRAFT,
    jm1pub_evidencesource: 'Publisher Operating Center intake review',
    jm1pub_evidencepath: manuscriptUrl,
    jm1pub_interiorfilereference: manuscriptUrl,
  })

  return { id: extractId(entityId), created: true }
}

async function findOrCreateEditorialReviewStage(
  config: DataverseServerConfig,
  intake: DataverseRow,
  title: { id: string; name: string },
  assetId: string,
  correlationId: string,
) {
  const existing = await dataverseFirst(config, 'jm1pub_editorialstages', {
    $select: 'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagesequence',
    $filter: `_jm1pub_publishingassetid_value eq ${assetId} and jm1pub_stagesequence eq 1`,
  })
  if (existing) return { id: stringValue(existing.jm1pub_editorialstageid), created: false }

  const authorName = [stringValue(intake.jm1_firstname), stringValue(intake.jm1_lastname)].filter(Boolean).join(' ')
  const entityId = await dataverseCreate(config, 'jm1pub_editorialstages', {
    jm1pub_name: `Editorial Review - ${title.name}`,
    jm1pub_projecttitle: title.name,
    jm1pub_author: authorName,
    jm1pub_publishingintakereference: stringValue(intake.jm1_intakereferencecode),
    jm1pub_intakereference: stringValue(intake.jm1_intakereferencecode),
    jm1pub_opportunityreference: dataverseLookupId(intake, '_jm1_opportunity_value'),
    jm1pub_stagetype: STAGE_TYPE_REVIEW,
    jm1pub_stagestatus: STAGE_STATUS_IN_PROGRESS,
    jm1pub_stagesequence: 1,
    jm1pub_healthstatus: HEALTH_HEALTHY,
    jm1pub_authorsafesummary:
      'Your manuscript is in Editorial Review. We are preparing the next publishing recommendation and will share the next decision step when it is ready.',
    jm1pub_internaloperationalsummary: `Editorial Review initialized from Publisher Operating Center for ${String(
      intake.jm1_intakereferencecode,
    )}.`,
    jm1pub_correlationid: correlationId,
    jm1pub_stagestartdate: new Date().toISOString(),
    jm1pub_currentartifactcount: 0,
    jm1pub_currentgatecount: 0,
    jm1pub_openexceptioncount: 0,
    'Jm1pub_Publishingassetid@odata.bind': `/jm1pub_publishingassets(${assetId})`,
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${title.id})`,
    ...(dataverseLookupId(intake, '_jm1_linkedcontact_value')
      ? { 'Jm1pub_Contactid@odata.bind': `/contacts(${dataverseLookupId(intake, '_jm1_linkedcontact_value')})` }
      : {}),
  })

  return { id: extractId(entityId), created: true }
}

async function writePublisherExecutionLog(
  config: DataverseServerConfig,
  input: {
    actionType: string
    name: string
    description: string
    sourceEntity: string
    sourceRecordId: string
  },
) {
  return dataverseCreate(config, 'jm1_executionlogs', {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description.slice(0, 1000),
    jm1_agentname: 'Publisher Operating Center',
    jm1_agentmodel: 'jmerrill.pub',
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: EXECUTION_STATUS_SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId,
  })
}

async function findPublisherExecutionLog(config: DataverseServerConfig, actionType: string, sourceRecordId: string) {
  return dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_sourcerecordid',
    $filter: `jm1_actiontype eq '${escapeODataText(actionType)}' and jm1_sourcerecordid eq '${escapeODataText(sourceRecordId)}'`,
  })
}

async function findStage0DiagnosticForIntake(config: DataverseServerConfig, intakeId: string) {
  return dataverseFirst(config, 'jm1pub_editorialdiagnostics', {
    $select:
      'jm1pub_editorialdiagnosticid,jm1pub_name,jm1pub_diagnosticstatus,jm1_manuscriptasseturl,jm1_manuscriptfiletype,jm1_manuscriptapprovedfordiagnostic,jm1_manuscriptfilename,createdon',
    $filter: `_jm1pub_publishingintake_value eq ${intakeId}`,
    $orderby: 'createdon desc',
  })
}

async function waitForStage0DiagnosticForIntake(config: DataverseServerConfig, intakeId: string) {
  const attempts = Number.parseInt(process.env.JM1_STAGE0_HANDOFF_WAIT_ATTEMPTS || '6', 10)
  const delayMs = Number.parseInt(process.env.JM1_STAGE0_HANDOFF_WAIT_DELAY_MS || '5000', 10)
  const maxAttempts = Number.isFinite(attempts) && attempts > 0 ? Math.min(attempts, 12) : 1
  const boundedDelay = Number.isFinite(delayMs) && delayMs > 0 ? Math.min(delayMs, 10000) : 5000

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const diagnostic = await findStage0DiagnosticForIntake(config, intakeId)
    if (diagnostic) return diagnostic
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, boundedDelay))
    }
  }

  return null
}

function inferManuscriptFileMetadata(manuscriptUrl: string) {
  let fileName = ''
  try {
    const parsed = new URL(manuscriptUrl)
    fileName = parsed.searchParams.get('file') || parsed.pathname.split('/').filter(Boolean).pop() || ''
  } catch {
    fileName = manuscriptUrl.split('/').filter(Boolean).pop() || ''
  }

  const decodedName = decodeURIComponent(fileName || '').trim()
  const lower = decodedName.toLowerCase()
  const fileType = lower.endsWith('.pdf') ? 'pdf' : lower.endsWith('.doc') ? 'doc' : 'docx'

  return {
    fileName: decodedName.slice(0, 250) || `manuscript.${fileType}`,
    fileType,
  }
}

async function ensureDiagnosticManuscriptAssetBinding(
  config: DataverseServerConfig,
  diagnostic: DataverseRow,
  intake: DataverseRow,
) {
  const diagnosticId = stringValue(diagnostic.jm1pub_editorialdiagnosticid)
  const manuscriptUrl = stringValue(diagnostic.jm1_manuscriptasseturl || intake.jm1_manuscripturl || intake.jm1_submissionurl)
  if (!diagnosticId || !manuscriptUrl) {
    return { bound: false, reason: 'manuscript_url_missing' }
  }

  if (
    stringValue(diagnostic.jm1_manuscriptasseturl) &&
    diagnostic.jm1_manuscriptapprovedfordiagnostic === true &&
    stringValue(diagnostic.jm1_manuscriptfiletype)
  ) {
    return { bound: false, reason: 'already_bound' }
  }

  const metadata = inferManuscriptFileMetadata(manuscriptUrl)
  await dataversePatch(config, 'jm1pub_editorialdiagnostics', diagnosticId, {
    jm1_manuscriptasseturl: manuscriptUrl,
    jm1_manuscriptfiletype: metadata.fileType,
    jm1_manuscriptfilename: metadata.fileName,
    jm1_manuscriptapprovedfordiagnostic: true,
    jm1pub_manuscriptpresent: true,
    jm1_manuscriptassetstatus: MANUSCRIPT_ASSET_STATUS_APPROVED,
    jm1_manuscriptassetnotes:
      'Manuscript asset bound automatically from the governed /join intake manuscript reference. No manuscript content stored in Dataverse.',
    jm1_manuscriptapprovedon: new Date().toISOString(),
  })

  return { bound: true, reason: 'bound_from_intake_manuscript' }
}

function resolveEditorialReviewNowUrl() {
  const directUrl = process.env.JM1_EDITORIAL_REVIEW_NOW_URL?.trim()
  if (directUrl) return directUrl

  const baseUrl = process.env.JM1_DIAGNOSTIC_RUNNER_URL?.trim().replace(/\/+$/, '')
  return baseUrl ? `${baseUrl}/api/run-editorial-review-now` : ''
}

async function dispatchEditorialReviewNow(input: {
  diagnosticId: string
  intakeReferenceCode: string
  manuscriptUrl: string
  workspaceUrl: string
  diagnosticStatus: number
}): Promise<{
  status: 'accepted' | 'blocked'
  blocker: string
  runControlStatus?: string
  authorRecommendationSent?: boolean
}> {
  const url = resolveEditorialReviewNowUrl()
  const runnerKey = process.env.JM1_DIAGNOSTIC_RUNNER_KEY?.trim()
  if (!url) return { status: 'blocked', blocker: 'editorial_review_now_url_missing' }
  if (!runnerKey) return { status: 'blocked', blocker: 'diagnostic_runner_key_missing' }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jm1-diagnostic-runner-key': runnerKey,
    },
    body: JSON.stringify({
      confirmRunNow: true,
      diagnosticId: input.diagnosticId,
      intakeReferenceCode: input.intakeReferenceCode,
      readinessRecord: {
        intakeReferenceCode: input.intakeReferenceCode,
        diagnosticId: input.diagnosticId,
        intakeCreated: true,
        workspaceCreated: true,
        stage0HandoffCreated: true,
        manuscriptReceived: true,
        manuscriptUrl: input.manuscriptUrl,
        workspaceUrl: input.workspaceUrl,
        diagnosticStatus: input.diagnosticStatus,
      },
    }),
  })

  const body = await response.json().catch(() => null) as {
    code?: string
    reason?: string
    runControlStatus?: string
    authorRecommendationSent?: boolean
  } | null

  if (response.status === 202 || response.status === 200) {
    return {
      status: 'accepted',
      blocker: '',
      runControlStatus: stringValue(body?.runControlStatus),
      authorRecommendationSent: body?.authorRecommendationSent === true,
    }
  }

  return {
    status: 'blocked',
    blocker: stringValue(body?.reason || body?.code) || `editorial_review_now_http_${response.status}`,
  }
}

function buildMetrics(
  queue: PublisherQueueItem[],
  logs: DataverseRow[],
  workload: PublisherWorkloadItem[],
  portfolio: PublisherPortfolioItem[],
) {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const waitingQueue = queue.filter((item) => item.actionOwner !== 'author')
  const totalAge = waitingQueue.reduce((sum, item) => sum + item.ageDays, 0)
  const oldest = [...waitingQueue].sort((a, b) => b.ageDays - a.ageDays)[0]
  return {
    newSubmissionsAwaitingReview: queue.filter((item) => item.currentBlocker === 'Ready for publisher intake review').length,
    unlinkedAssets: queue.filter((item) => !item.assetId).length,
    editorialReviewQueue: queue.filter((item) => item.currentStage === 'Editorial').length,
    publisherActionsPending: queue.filter((item) => item.actionOwner === 'publisher').length,
    authorActionsPending: queue.filter((item) => item.actionOwner === 'author').length,
    contractPaymentHolds: queue.filter((item) => item.contractStatus !== 'Signed' && item.paymentStatus !== 'Paid Confirmed').length,
    failedTransitions: logs.filter((log) => stringValue(log.jm1_actiontype).includes('FAILED')).length,
    stalledAssets: queue.filter((item) => item.ageDays > 7 && item.actionOwner !== 'author').length,
    assetsWaitingReview: queue.filter((item) =>
      ['Ready for publisher intake review', 'Editorial Review ready', 'Ready for next editorial scheduling decision'].includes(
        item.currentBlocker,
      ),
    ).length,
    assetsOnHold: queue.filter((item) => item.currentBlocker.toLowerCase().includes('hold')).length,
    developmentalQueue: queue.filter((item) => item.editorialStage.toLowerCase().includes('developmental')).length,
    averageQueueAgeDays: waitingQueue.length ? Math.round((totalAge / waitingQueue.length) * 10) / 10 : 0,
    oldestWaitingAsset: oldest ? `${oldest.title} (${oldest.ageBucket})` : 'None',
    publisherActionsDueToday: queue.filter((item) => item.actionOwner === 'publisher' && item.ageDays >= 3).length,
    assetsMovedToday: logs.filter((log) => stringValue(log.createdon).startsWith(today)).length,
    assetsMovedThisWeek: logs.filter((log) => new Date(stringValue(log.createdon)).getTime() >= weekAgo).length,
    titlesAwaitingDevelopmentalEditing: workload.filter((item) => item.workloadState === 'Developmental Editing - Not Started')
      .length,
    titlesInDevelopmentalEditing: workload.filter((item) => item.workloadState === 'Developmental Editing - In Progress').length,
    titlesAwaitingLineEditing: workload.filter((item) => item.workloadState === 'Line Editing - Not Started').length,
    titlesInLineEditing: workload.filter((item) => item.workloadState === 'Line Editing - In Progress').length,
    titlesAwaitingCopyediting: workload.filter((item) => item.workloadState === 'Copyediting Ready').length,
    titlesAwaitingCopyeditingRelease: workload.filter((item) => item.workloadState === 'Copyediting - Release Decision Ready')
      .length,
    packagesHeldByReadinessGuard: workload.filter((item) => item.readinessGuard.status === 'blocked').length,
    workloadAdvisories: workload.filter((item) => !['available', 'normal'].includes(item.workloadLevel)).length,
    activeInstancesByCapability: countWorkloadByCapability(workload),
    authorReviewBacklog: workload.filter((item) => item.workloadState.includes('Author Review')).length,
    oldestWorkloadItem: workload.length
      ? `${[...workload].sort((a, b) => b.ageDays - a.ageDays)[0].title} (${[...workload].sort((a, b) => b.ageDays - a.ageDays)[0].ageDays}d)`
      : 'None',
    portfolioActivePipeline: portfolio.filter((item) => item.portfolioState === 'active_pipeline').length,
    portfolioPublishedCatalog: portfolio.filter((item) => item.portfolioState === 'published_catalog').length,
    portfolioExternalHold: portfolio.filter((item) => item.portfolioState === 'external_hold').length,
    portfolioArchiveHistorical: portfolio.filter((item) => item.portfolioState === 'archive_historical').length,
    portfolioReconciliationRequired: portfolio.filter((item) => item.portfolioState === 'reconciliation_required').length,
    publishedCatalogMissingIsbn: portfolio.filter(
      (item) => item.portfolioState === 'published_catalog' && item.isbn13s.length === 0,
    ).length,
    publishedCatalogMissingAuthor: portfolio.filter(
      (item) => item.portfolioState === 'published_catalog' && item.author === 'Author pending',
    ).length,
  }
}

function buildPublisherToday(input: {
  generatedAt: string
  queue: PublisherQueueItem[]
  workload: PublisherWorkloadItem[]
  portfolio: PublisherPortfolioItem[]
  productionCommand: PublisherOperatingCenterSnapshot['productionCommand']
  authorResponses: PublisherAuthorResponseQueueItem[]
  royalties: PublisherRoyaltyReviewQueue
  logs: DataverseRow[]
  metrics: PublisherOperatingCenterSnapshot['metrics']
}): PublisherTodaySnapshot {
  const workloadTodayItems = input.workload.map(workloadToTodayItem)
  const queueTodayItems = input.queue.map(queueToTodayItem)
  const portfolioTodayItems = input.portfolio.filter(includePortfolioItemInDefaultToday).map(portfolioToTodayItem)
  const failedLogItems = input.logs
    .filter((log) => isOpenFailureLog(log))
    .map((log) => logToAlertTodayItem(log))

  const waitingForJackie = prioritizeTodayItems([
    ...workloadTodayItems.filter((item) => item.owner === 'Jackie'),
    ...queueTodayItems.filter((item) => item.owner === 'Jackie'),
  ]).slice(0, 12)

  const waitingForAuthors = prioritizeTodayItems([
    ...workloadTodayItems.filter((item) => item.owner === 'Author'),
    ...queueTodayItems.filter((item) => item.owner === 'Author'),
  ]).slice(0, 12)

  const activeEditorial = prioritizeTodayItems(
    workloadTodayItems.filter((item) =>
      ['Editorial Review', 'Developmental Editing', 'Line Editing', 'Copyediting', 'Proofreading'].some((stage) =>
        `${item.editorialStage} ${item.pipelineStage} ${item.nextAction}`.includes(stage),
      ),
    ),
  ).slice(0, 18)

  const productionQueue = prioritizeTodayItems(
    [
      ...workloadTodayItems.filter(
        (item) =>
          item.editorialStage.includes('Proofreading') ||
          item.editorialStage.includes('Production') ||
          item.nextAction.includes('Proofreading') ||
          item.dependency.includes('Proofreading') ||
          item.packageState.includes('Proofreading'),
      ),
      ...input.productionCommand.interiorQueue.map((item) => productionToTodayItem(item)),
      ...input.productionCommand.coverQueue
        .filter((item) => item.coverReadiness !== 'BLOCKED — COPY')
        .map((item) => productionToTodayItem(item, 'cover')),
    ],
  ).slice(0, 12)

  const distributionCatalogQueue = prioritizeTodayItems(
    portfolioTodayItems.filter(
      (item) =>
        item.portfolioState === 'reconciliation_required' ||
        item.portfolioState === 'manual_recovery' ||
        item.dependency.includes('ISBN') ||
        item.dependency.toLowerCase().includes('missing') ||
        item.dependency.toLowerCase().includes('mismatch') ||
        item.dependency.toLowerCase().includes('exception') ||
        item.nextAction.includes('Reconcile'),
    ),
  ).slice(0, 18)

  const alerts = prioritizeTodayItems([
    ...failedLogItems,
    ...input.authorResponses
      .filter((item) => item.processingStatus !== 'PROCESSED')
      .map(authorResponseToTodayItem),
    ...workloadTodayItems.filter((item) => item.severity === 'urgent' || item.dependency.toLowerCase().includes('blocked')),
    ...queueTodayItems.filter((item) => item.severity === 'urgent'),
    ...(input.royalties.identityHolds + input.royalties.titleHolds + input.royalties.unresolvedPayments > 0
      ? [royaltyDecisionTodayItem(input.royalties)]
      : []),
  ]).slice(0, 12)

  const recentMovements = input.logs.slice(0, 12).map(logToMovementTodayItem)

  return {
    generatedAt: input.generatedAt,
    publisherIdentity: {
      role: 'Publisher',
      authorization: 'Internal Entra workforce allowlist',
    },
    summary: {
      jackieActionsDueToday: waitingForJackie.length,
      authorResponsesPending: waitingForAuthors.length,
      activeEditorialTitles: activeEditorial.length,
      productionReadyTitles: productionQueue.length,
      failedTransitions: alerts.filter((item) => item.severity === 'urgent').length,
      overdueItems: [...waitingForJackie, ...waitingForAuthors, ...activeEditorial].filter((item) => item.ageDays > 7)
        .length,
      assetsMovedToday: input.metrics.assetsMovedToday,
      catalogExceptions: distributionCatalogQueue.length,
    },
    waitingForJackie,
    waitingForAuthors,
    activeEditorial,
    productionQueue,
    distributionCatalogQueue,
    alerts,
    recentMovements,
  }
}

function buildTitleOperatingView(input: {
  generatedAt: string
  today: PublisherTodaySnapshot
  workload: PublisherWorkloadItem[]
  portfolio: PublisherPortfolioItem[]
  productionCommand: PublisherOperatingCenterSnapshot['productionCommand']
  authorResponses: PublisherAuthorResponseQueueItem[]
  logs?: DataverseRow[]
}): PublisherTitleOperatingView {
  const stages = deriveTitleOperatingStages(input)
  const allTodayItems = [
    ...input.today.waitingForJackie,
    ...input.today.waitingForAuthors,
    ...input.today.activeEditorial,
    ...input.today.productionQueue,
    ...input.today.distributionCatalogQueue,
    ...input.today.alerts,
  ]
  const byTitle = new Map<string, PublisherTodayItem[]>()
  for (const item of allTodayItems) {
    const key = titleOperatingKey(item)
    if (!key) continue
    byTitle.set(key, [...(byTitle.get(key) || []), item])
  }

  const cards = Array.from(byTitle.values())
    .map((items) => titleItemsToOperatingCard(items, stages, input.authorResponses, input.logs || []))
    .sort((a, b) => {
      const urgency = { urgent: 0, watch: 1, normal: 2 }
      return urgency[a.urgency] - urgency[b.urgency] || a.stageId.localeCompare(b.stageId) || a.title.localeCompare(b.title)
    })

  const jackieActionNotifications = cards
    .filter((card) => card.waitingOn === 'Jackie' && card.jackieDecision)
    .map((card) => jackieActionNotificationForCard(card, input.generatedAt))

  return {
    generatedAt: input.generatedAt,
    stageSource: 'Derived from governed Publisher Operating Center workload, portfolio, production command, author-response, and execution-log read models.',
    stages,
    cards,
    jackieActionNotifications,
    summary: {
      activeTitles: cards.filter((card) => card.liveClassification === 'LIVE').length,
      needsJackie: cards.filter((card) => card.waitingOn === 'Jackie').length,
      waitingOnAuthors: cards.filter((card) => card.waitingOn === 'Author').length,
      blockedTitles: cards.filter((card) => Boolean(card.blocker)).length,
      overdueTitles: cards.filter((card) => card.urgency === 'urgent').length,
      inProduction: cards.filter((card) => card.stageId === 'production').length,
      publishedThisPeriod: cards.filter((card) => card.stageId === 'published').length,
    },
  }
}

function jackieActionNotificationForCard(
  card: PublisherTitleOperatingCard,
  createdAt: string,
): JackieActionRequiredNotificationEvent {
  const sourceRecord = card.titleId || card.key
  const idempotencyKey = `jackie-action:${sourceRecord}:${card.stageId}:${card.nextAction}`
  return {
    eventId: stableEventId(idempotencyKey),
    eventType: 'JACKIE_ACTION_REQUIRED',
    division: 'J Merrill Publishing',
    application: 'Publisher Operating Center',
    titleId: card.titleId,
    title: card.title,
    author: card.author,
    actionType: card.actions[0]?.id || 'view_only',
    actionSummary: card.jackieDecision?.what || card.nextAction,
    whyRequired: card.jackieDecision?.why || card.blocker || 'Publisher authority is required.',
    priority: card.urgency,
    dueAt: card.targetDate,
    operatingCenterUrl: card.jackieDecision?.operatingCenterUrl || `/publisher/operating-center?titleId=${encodeURIComponent(card.titleId)}`,
    sourceStage: card.stageLabel,
    sourceRecord,
    createdAt,
    notificationState: card.jackieDecision?.notificationState || 'PENDING',
    preferredChannel: 'MICROSOFT_TEAMS',
    fallbackChannel: 'EMAIL',
    escalationChannel: 'SMS',
    idempotencyKey,
  }
}

function stableEventId(value: string) {
  return `JACKIE_ACTION_REQUIRED_${Buffer.from(value).toString('base64url').slice(0, 32)}`
}

function deriveTitleOperatingStages(input: {
  workload: PublisherWorkloadItem[]
  portfolio: PublisherPortfolioItem[]
  productionCommand: PublisherOperatingCenterSnapshot['productionCommand']
}): PublisherTitleOperatingStage[] {
  const present = new Set<string>()
  for (const item of input.workload) present.add(canonicalStageId(`${item.workloadState} ${item.pipelineStage}`))
  for (const item of input.portfolio) present.add(canonicalStageId(`${item.pipelineStage} ${item.portfolioLabel}`))
  for (const item of input.productionCommand.interiorQueue) present.add('cover-interior')
  for (const item of input.productionCommand.coverQueue) present.add('cover-interior')

  const registry: PublisherTitleOperatingStage[] = [
    defineStage('intake', 'Intake', 10, false, 'Inquiry or intake exists.', 'Commercial and manuscript evidence are ready.', 'developmental-editing'),
    defineStage('developmental-editing', 'Developmental Editing', 20, true, 'Developmental editing is initialized.', 'Author fully approves the current developmental-edit artifact.', 'line-editing'),
    defineStage('line-editing', 'Line Editing', 30, true, 'Developmental Editing is closed and Line Editing entry conditions pass.', 'Author approval or approved release decision is recorded.', 'copyediting'),
    defineStage('copyediting', 'Copyediting', 40, true, 'Line Editing is closed and copyediting is authorized.', 'Copyediting release conditions pass.', 'proofreading'),
    defineStage('proofreading', 'Proofreading', 50, true, 'Copyediting is complete and proofreading is authorized.', 'Final proof approval is recorded.', 'cover-interior'),
    defineStage('cover-interior', 'Cover / Interior', 60, true, 'Approved copy and production assets are ready.', 'Cover and interior review conditions pass.', 'author-approval'),
    defineStage('author-approval', 'Author Approval', 70, true, 'A current author-facing artifact requires final approval.', 'Author approves the current artifact version.', 'production'),
    defineStage('production', 'Production', 80, false, 'All required approvals and production specifications are complete.', 'Production QA and release readiness pass.', 'distribution'),
    defineStage('distribution', 'Distribution', 90, false, 'Production release package is ready.', 'Distribution/readback evidence is captured.', 'published'),
    defineStage('published', 'Published', 100, false, 'Confirmed-live evidence exists.', 'Post-publication stewardship remains current.', ''),
    defineStage('exception', 'Exceptions', 900, false, 'A blocker or reconciliation issue exists.', 'Issue is resolved or reclassified.', ''),
  ]

  return registry
    .filter((item) => present.size === 0 || present.has(item.id) || ['intake', 'developmental-editing', 'line-editing', 'copyediting', 'proofreading', 'cover-interior', 'author-approval', 'production', 'distribution', 'published'].includes(item.id))
    .sort((a, b) => a.displayOrder - b.displayOrder)
}

function defineStage(
  id: string,
  label: string,
  displayOrder: number,
  authorInputRequired: boolean,
  entryCondition: string,
  closeCondition: string,
  nextStageId: string,
): PublisherTitleOperatingStage {
  return { id, label, displayOrder, authorInputRequired, entryCondition, closeCondition, nextStageId }
}

function titleItemsToOperatingCard(
  items: PublisherTodayItem[],
  stages: PublisherTitleOperatingStage[],
  authorResponses: PublisherAuthorResponseQueueItem[],
  logs: DataverseRow[],
): PublisherTitleOperatingCard {
  const primary = prioritizeTodayItems(items)[0]
  const stageId = canonicalStageId(`${primary.editorialStage} ${primary.pipelineStage} ${primary.nextAction}`)
  const stage = stages.find((item) => item.id === stageId) || stages.find((item) => item.id === 'exception') || defineStage('exception', 'Exceptions', 900, false, 'Issue exists.', 'Issue resolved.', '')
  const waitingOn = waitingOnForTodayItem(primary)
  const blocker = humanBlocker(primary)
  const titleResponse = authorResponses.find((item) => normalizeTitle(item.title) === normalizeTitle(primary.title))
  const currentArtifact = bestEvidenceLink(primary)
  const liveClassification = isSyntheticTitle(primary.title) ? 'TEST_CERTIFICATION' : 'LIVE'
  const actionUrl = `${publisherOperatingCenterBaseUrl()}/publisher/operating-center?titleId=${encodeURIComponent(
    primary.titleId || primary.recordId,
  )}&action=${encodeURIComponent(primary.nextAction)}`
  const notificationState = notificationStateFor(primary, logs)
  const baseActions = primary.allowedActions.length
    ? primary.allowedActions.map((action) => ({
        id: action.id,
        label: action.label,
        available: !blocker,
        unavailableReason: blocker ? `Unavailable because ${blocker}` : '',
      }))
    : [{
        id: 'view_only' as PublisherActionId,
        label: 'View Details',
        available: true,
        unavailableReason: '',
      }]
  const notificationAction =
    primary.owner === 'Jackie' && notificationState.state !== 'SENT'
      ? [
          {
            id: 'notify_jackie_action_required' as PublisherActionId,
            label: notificationState.state === 'FAILED' ? 'Retry Jackie Notification' : 'Notify Jackie',
            available: true,
            unavailableReason: '',
          },
        ]
      : []
  const actions = [...notificationAction, ...baseActions]

  return {
    key: `title:${primary.titleId || primary.recordId || primary.key}`,
    titleId: primary.titleId || primary.recordId,
    title: primary.title,
    author: primary.author,
    stageId: stage.id,
    stageLabel: stage.label,
    humanStatus: humanStatusForTodayItem(primary),
    waitingOn,
    ageDays: Math.max(...items.map((item) => item.ageDays || 0)),
    targetDate: primary.targetDate,
    urgency: primary.severity === 'urgent' ? 'urgent' : primary.severity === 'watch' || primary.ageDays > 7 ? 'watch' : 'normal',
    blocker,
    nextAction: primary.nextAction || 'Review current title state',
    nextStage: stages.find((item) => item.id === stage.nextStageId)?.label || 'No next stage',
    nextStageEligible: !blocker && waitingOn !== 'Author' && stage.nextStageId !== '',
    nextStageBlockedReason: blocker || (waitingOn === 'Author' ? 'Waiting for author response or approval.' : stage.nextStageId ? '' : 'No next stage is currently defined.'),
    latestMovement: primary.lastMovement,
    currentArtifact,
    authorState: {
      latestResponse: titleResponse?.responseReceived || 'No current author response recorded',
      classification: titleResponse?.classifiedDecision || 'No current response',
      approvalState: approvalStateFor(primary, titleResponse),
      reviewRound: titleResponse?.stagePackage || primary.packageState,
      currentArtifactFullyApproved: titleResponse?.classifiedDecision === 'APPROVED WITHOUT CHANGES',
    },
    jackieDecision: waitingOn === 'Jackie'
      ? {
          what: primary.nextAction || 'Publisher decision required',
          why: blocker || primary.exactBlocker || primary.dependency || 'Publisher authority is required before this title can move.',
          review: currentArtifact.label,
          decisionOptions: actions.map((action) => action.label),
          consequence: primary.nextAction ? `After this decision, ${primary.nextAction.toLowerCase()}.` : 'The title state will refresh after the governed action records.',
          notificationState: notificationState.state,
          lastNotified: notificationState.lastNotified,
          operatingCenterUrl: actionUrl,
        }
      : undefined,
    actions,
    timeline: items.slice(0, 4).map((item) => ({
      label: item.lastMovement || item.nextAction || item.pipelineStage,
      timestamp: item.lastTrigger || item.targetDate || '',
    })),
    technical: {
      rawStatus: `${primary.executionMode}-${primary.executionState}`,
      runtimeState: primary.runtime,
      executionMode: primary.executionMode,
      executionOwner: primary.executionOwner,
      evidenceReferences: primary.evidenceLinks.map((link) => link.href),
    },
    liveClassification,
  }
}

export async function dispatchJackieActionRequiredNotification(input: {
  event: JackieActionRequiredNotificationEvent
  operatorEmail?: string
}) {
  const config = getDataverseServerConfig()
  if (!config) {
    return { ok: false as const, state: 'FAILED' as const, reason: 'DATAVERSE_CONFIG_MISSING' }
  }

  const existing = await findJackieNotificationEvidence(config, input.event.idempotencyKey)
  if (existing?.sent) {
    return {
      ok: true as const,
      state: 'SENT' as const,
      duplicateSuppressed: true,
      evidenceId: existing.id,
      providerMessageId: existing.providerMessageId,
    }
  }

  const relayUrl =
    process.env.JM1_INTERNAL_NOTIFICATION_RELAY_URL ||
    process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL ||
    'https://func-jm1-acs-email-relay.azurewebsites.net'
  const relayKey =
    process.env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY ||
    process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY ||
    process.env.JM1_RELAY_API_KEY

  if (!relayKey) {
    const failure = await writeJackieNotificationFailure(config, input.event, 'RELAY_KEY_MISSING')
    return { ok: false as const, state: 'FAILED' as const, reason: 'RELAY_KEY_MISSING', evidenceId: extractId(failure) }
  }

  const payload = {
    notificationType: 'AUTHOR_DRAFT_READY_FOR_REVIEW',
    diagnosticId: randomUUID(),
    intakeReferenceCode: intakeReferenceForNotification(input.event),
    authorName: input.event.author || 'Not applicable',
    authorEmail: '',
    projectTitle: input.event.title,
    draftStatus: 'DRAFT_ONLY',
    approvalStatus: 'PENDING_HUMAN_APPROVAL',
    draftPreview: jackieNotificationPreview(input.event),
    nextAction: `${input.event.actionSummary} — ${input.event.operatingCenterUrl}`,
    recipient: INTERNAL_VISIBILITY_MAILBOX,
  }

  const response = await fetch(`${relayUrl.replace(/\/$/, '')}/api/send-internal-author-draft-review-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jm1-relay-key': relayKey,
    },
    body: JSON.stringify(payload),
  })
  const body = (await response.json().catch(() => null)) as { accepted?: boolean; providerMessageId?: string; reason?: string; code?: string } | null
  if (!response.ok || body?.accepted !== true) {
    const reason = body?.reason || body?.code || `RELAY_HTTP_${response.status}`
    const failure = await writeJackieNotificationFailure(config, input.event, reason)
    return { ok: false as const, state: 'FAILED' as const, reason, evidenceId: extractId(failure) }
  }

  const log = await writePublisherExecutionLog(config, {
    actionType: JACKIE_NOTIFICATION_SENT,
    name: `Jackie action notification sent - ${input.event.title}`,
    description: [
      `JACKIE_ACTION_REQUIRED notification sent to ${INTERNAL_VISIBILITY_MAILBOX}.`,
      `Channel EMAIL via ACS internal relay.`,
      `Title: ${input.event.title}.`,
      `Action: ${input.event.actionSummary}.`,
      `Why: ${input.event.whyRequired}.`,
      `Deep link: ${input.event.operatingCenterUrl}.`,
      `Provider message ID: ${body.providerMessageId || 'not-returned-by-relay'}.`,
      `Idempotency: ${input.event.idempotencyKey}.`,
    ].join(' '),
    sourceEntity: 'publisher_operating_center',
    sourceRecordId: input.event.sourceRecord,
  })

  return {
    ok: true as const,
    state: 'SENT' as const,
    duplicateSuppressed: false,
    evidenceId: extractId(log),
    providerMessageId: body.providerMessageId || 'not-returned-by-relay',
  }
}

async function findJackieNotificationEvidence(config: DataverseServerConfig, idempotencyKey: string) {
  const rows = await dataverseList(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon',
    $filter: `jm1_actiontype eq '${JACKIE_NOTIFICATION_SENT}' or jm1_actiontype eq '${JACKIE_NOTIFICATION_FAILED}'`,
    $orderby: 'createdon desc',
    $top: '50',
  })
  const row = rows.find((candidate) => stringValue(candidate.jm1_actiondescription).includes(`Idempotency: ${idempotencyKey}.`))
  if (!row) return null
  return {
    id: stringValue(row.jm1_executionlogid),
    sent: stringValue(row.jm1_actiontype) === JACKIE_NOTIFICATION_SENT,
    providerMessageId: stringValue(row.jm1_actiondescription).match(/Provider message ID: ([^.]+)\./)?.[1] || '',
  }
}

async function writeJackieNotificationFailure(config: DataverseServerConfig, event: JackieActionRequiredNotificationEvent, reason: string) {
  return writePublisherExecutionLog(config, {
    actionType: JACKIE_NOTIFICATION_FAILED,
    name: `Jackie action notification failed - ${event.title}`,
    description: [
      `JACKIE_ACTION_REQUIRED notification failed for ${INTERNAL_VISIBILITY_MAILBOX}.`,
      `Channel EMAIL via ACS internal relay.`,
      `Title: ${event.title}.`,
      `Action: ${event.actionSummary}.`,
      `Why: ${event.whyRequired}.`,
      `Deep link: ${event.operatingCenterUrl}.`,
      `Failure reason: ${reason}.`,
      `Idempotency: ${event.idempotencyKey}.`,
    ].join(' '),
    sourceEntity: 'publisher_operating_center',
    sourceRecordId: event.sourceRecord,
  })
}

function notificationStateFor(item: PublisherTodayItem, logs: DataverseRow[]) {
  const sourceRecord = item.titleId || item.recordId
  const idempotencyKey = `jackie-action:${sourceRecord}:${canonicalStageId(`${item.editorialStage} ${item.pipelineStage} ${item.nextAction}`)}:${item.nextAction}`
  const evidence = logs.find((log) => {
    const actionType = stringValue(log.jm1_actiontype)
    return (
      (actionType === JACKIE_NOTIFICATION_SENT || actionType === JACKIE_NOTIFICATION_FAILED) &&
      stringValue(log.jm1_actiondescription).includes(`Idempotency: ${idempotencyKey}.`)
    )
  })
  const actionType = stringValue(evidence?.jm1_actiontype)
  if (actionType === JACKIE_NOTIFICATION_SENT) {
    return { state: 'SENT' as const, lastNotified: stringValue(evidence?.createdon) }
  }
  if (actionType === JACKIE_NOTIFICATION_FAILED) {
    return { state: 'FAILED' as const, lastNotified: stringValue(evidence?.createdon) }
  }
  return { state: 'PENDING' as const, lastNotified: '' }
}

function jackieNotificationPreview(event: JackieActionRequiredNotificationEvent) {
  return [
    'JACKIE ACTION REQUIRED',
    '',
    `Division: ${event.division}`,
    `Application: ${event.application}`,
    `Title: ${event.title}`,
    `Author: ${event.author || 'Not applicable'}`,
    `Action required: ${event.actionSummary}`,
    `Why Jackie is required: ${event.whyRequired}`,
    `Priority: ${event.priority}`,
    `Due: ${event.dueAt || 'No governed due date'}`,
    `Open exact action: ${event.operatingCenterUrl}`,
  ].join('\n')
}

function intakeReferenceForNotification(event: JackieActionRequiredNotificationEvent) {
  const candidate = `${event.sourceRecord} ${event.titleId} ${event.operatingCenterUrl}`.match(/\bJMP-INT-\d{6}-[A-Z0-9-]+\b/i)?.[0]
  return candidate?.toUpperCase() || 'JMP-INT-202607-0W5PTQ'
}

function publisherOperatingCenterBaseUrl() {
  return (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://jmerrill.pub').replace(/\/$/, '')
}

function canonicalStageId(value: string) {
  const normalized = value.toLowerCase()
  if (normalized.includes('reconciliation') || normalized.includes('blocked') || normalized.includes('exception') || normalized.includes('failed')) return 'exception'
  if (normalized.includes('published') || normalized.includes('confirmed live')) return 'published'
  if (normalized.includes('distribution') || normalized.includes('catalog')) return 'distribution'
  if (normalized.includes('production')) return 'production'
  if (normalized.includes('author review') || normalized.includes('author approval') || normalized.includes('final author')) return 'author-approval'
  if (normalized.includes('interior') || normalized.includes('cover')) return 'cover-interior'
  if (normalized.includes('proof')) return 'proofreading'
  if (normalized.includes('copy')) return 'copyediting'
  if (normalized.includes('line')) return 'line-editing'
  if (normalized.includes('developmental') || normalized.includes('editorial review') || normalized.includes('editorial')) return 'developmental-editing'
  return 'intake'
}

function titleOperatingKey(item: PublisherTodayItem) {
  return item.titleId || item.recordId || normalizeTitle(item.title)
}

function waitingOnForTodayItem(item: PublisherTodayItem): PublisherTitleOperatingCard['waitingOn'] {
  if (item.owner === 'Jackie') return 'Jackie'
  if (item.owner === 'Author') return 'Author'
  if (item.owner === 'JM1 Automation') return 'Automation'
  if (item.owner === 'External') return 'External'
  if (item.owner === 'Publisher') return 'Publishing Team'
  return 'None'
}

function humanStatusForTodayItem(item: PublisherTodayItem) {
  if (item.owner === 'Jackie') return 'Waiting for Jackie'
  if (item.owner === 'Author') return item.nextAction.toLowerCase().includes('approval') ? 'Awaiting Author Approval' : 'Waiting on Author'
  if (item.executionState === 'EXECUTING') return 'Automation running'
  if (item.executionState === 'EXCEPTION') return 'Needs reconciliation'
  if (item.dependency.toLowerCase().includes('stale')) return 'Refresh required'
  if (item.nextAction) return item.nextAction
  return 'Current'
}

function humanBlocker(item: PublisherTodayItem) {
  if (item.exactBlocker && !/no active exception/i.test(item.exactBlocker)) return item.exactBlocker
  if (item.dependency && !/no active exception/i.test(item.dependency)) return item.dependency
  if (item.owner === 'Author') return 'Waiting for author response or approval.'
  return ''
}

function bestEvidenceLink(item: PublisherTodayItem): PublisherTitleOperatingCard['currentArtifact'] {
  const first = item.evidenceLinks[0]
  return {
    label: first?.label || item.packageState || 'Current title evidence',
    href: first?.href || '',
    version: item.qaState || 'Current',
    reviewState: item.packageState || 'Not applicable',
  }
}

function approvalStateFor(item: PublisherTodayItem, response?: PublisherAuthorResponseQueueItem) {
  if (response?.classifiedDecision === 'APPROVED WITHOUT CHANGES') return 'Approved'
  if (response?.classifiedDecision === 'APPROVED WITH CORRECTIONS') return 'Approved with corrections - stage remains open'
  if (item.owner === 'Author') return 'Pending author response'
  return 'No author approval required right now'
}

function isSyntheticTitle(title: string) {
  return /synthetic|duplicate proof|gate-w1|certification|test/i.test(title)
}

function queueToTodayItem(item: PublisherQueueItem): PublisherTodayItem {
  const owner = item.actionOwner === 'publisher' ? 'Jackie' : item.executionOwner
  return {
    key: `queue:${item.key}`,
    recordId: item.intakeId,
    titleId: item.titleId || '',
    title: item.title,
    author: item.authorName || item.authorEmail || 'Author pending',
    portfolioState: 'active_pipeline',
    pipelineStage: item.currentStage,
    editorialStage: item.editorialStage,
    substage: item.currentBlocker,
    owner,
    businessOwner: item.businessOwner,
    executionOwner: item.executionOwner,
    executionMode: item.executionMode,
    executionState: item.executionState,
    runtime: item.runtime,
    awaiting: item.awaiting,
    lastTrigger: item.lastTrigger,
    expectedDuration: item.expectedDuration,
    exactBlocker: item.exactBlocker,
    nextAction: item.recommendedNextAction,
    targetDate: '',
    ageDays: item.ageDays,
    severity: item.overdueState === 'stalled' || item.overdueState === 'overdue' ? 'urgent' : item.overdueState === 'watch' ? 'watch' : 'info',
    packageState:
      item.currentBlocker.toLowerCase().includes('response pending') ||
      item.currentBlocker.toLowerCase().includes('author review')
        ? 'Released to author'
        : item.currentBlocker.includes('package')
          ? 'Package decision pending'
          : 'No active author package',
    qaState: 'Not applicable',
    dependency: item.holdReason || item.currentBlocker,
    evidenceLinks: item.sharePointLink ? [{ label: 'Source evidence', href: item.sharePointLink }] : [],
    allowedActions: item.authorizedActions
      .filter((action) => action.id !== 'view_only')
      .map((action) => ({ id: action.id, label: action.label })),
    lastMovement: item.latestExecutionEvidence || 'No recent execution evidence found',
  }
}

function workloadToTodayItem(item: PublisherWorkloadItem): PublisherTodayItem {
  const owner =
    item.currentOwner === 'Jackie'
      ? 'Jackie'
      : item.currentOwner === 'Author'
        ? 'Author'
        : item.currentOwner === 'External'
          ? 'External'
          : item.executionOwner

  return {
    key: `workload:${item.key}`,
    recordId: item.assetId || item.titleId,
    titleId: item.titleId,
    title: item.title,
    author: item.author,
    portfolioState: 'active_pipeline',
    pipelineStage: item.pipelineStage,
    editorialStage: item.workloadState,
    substage: item.editorialSubstage,
    owner,
    businessOwner: item.businessOwner,
    executionOwner: item.executionOwner,
    executionMode: item.executionMode,
    executionState: item.executionState,
    runtime: item.runtime,
    awaiting: item.awaiting,
    lastTrigger: item.lastTrigger,
    expectedDuration: item.expectedDuration,
    exactBlocker: item.exactBlocker,
    nextAction: item.nextAction,
    targetDate: item.targetDate,
    ageDays: item.ageDays,
    severity:
      item.readinessGuard.status === 'blocked' || item.workloadLevel === 'resource-attention'
        ? 'urgent'
        : item.workloadLevel === 'overdue-risk' || item.readinessGuard.status === 'watch'
          ? 'watch'
          : 'info',
    packageState: item.packageReadiness,
    qaState: item.internalQaState,
    dependency: item.holdReason || item.readinessGuard.message,
    evidenceLinks: [],
    allowedActions: [],
    lastMovement: item.latestExecutionEvidence,
  }
}

function portfolioToTodayItem(item: PublisherPortfolioItem): PublisherTodayItem {
  const requiresPublisher = ['reconciliation_required', 'manual_recovery'].includes(item.portfolioState)
  return {
    key: `portfolio:${item.key}`,
    recordId: item.assetIds[0] || item.titleId,
    titleId: item.titleId,
    title: item.title,
    author: item.author,
    portfolioState: item.portfolioState,
    pipelineStage: item.pipelineStage,
    editorialStage: item.portfolioLabel,
    substage: item.catalogStatus,
    owner: requiresPublisher ? 'Jackie' : 'Publisher',
    businessOwner: 'Publisher',
    executionOwner: requiresPublisher ? 'Publisher' : 'JM1 Automation',
    executionMode: requiresPublisher ? 'PUBLISHER_MANUAL' : 'AUTOMATIC_SCHEDULED',
    executionState: requiresPublisher ? 'WAITING_FOR_HUMAN' : 'COMPLETED',
    runtime: 'Publisher Operating Center catalog portfolio read model',
    awaiting: requiresPublisher ? 'Jackie' : 'None',
    lastTrigger: 'Core catalog portfolio refresh',
    expectedDuration: 'Read model refresh',
    exactBlocker: requiresPublisher ? item.nextAction : 'No active exception',
    nextAction: item.nextAction,
    targetDate: '',
    ageDays: 0,
    severity: item.portfolioState === 'reconciliation_required' ? 'watch' : 'info',
    packageState: 'Not applicable',
    qaState: item.confidence,
    dependency: item.exceptionReason || item.evidence.slice(0, 2).join('; ') || 'No active exception',
    evidenceLinks: [],
    allowedActions: [],
    lastMovement: item.evidence[0] || 'Portfolio classification read from Core-backed title and asset evidence',
  }
}

function includePortfolioItemInDefaultToday(item: PublisherPortfolioItem) {
  if (['synthetic_test', 'certification', 'non_title_operational_artifact'].includes(item.portfolioState)) return false
  if (item.portfolioState === 'archive_historical') return false
  if (item.portfolioState === 'published_catalog') {
    return item.isbn13s.length === 0 || item.author === 'Author pending' || Boolean(item.exceptionReason)
  }
  return true
}

function buildProductionCommand(
  workload: PublisherWorkloadItem[],
  portfolio: PublisherPortfolioItem[],
  productionProjects: DataverseRow[],
  productionTasks: DataverseRow[],
): PublisherOperatingCenterSnapshot['productionCommand'] {
  const activeTitles = workload.length
    ? workload
    : portfolio
        .filter((item) => item.portfolioState === 'active_pipeline')
        .slice(0, 25)
        .map((item): PublisherWorkloadItem => ({
          key: item.key,
          title: item.title,
          author: item.author,
          contactId: '',
          relationshipId: '',
          intake: '',
          titleId: item.titleId,
          assetId: item.assetIds[0] || '',
          pipelineStage: item.pipelineStage,
          editorialStage: item.pipelineStage,
          editorialSubstage: '',
          workloadState: 'Blocked',
          activeCapability: 'Portfolio Placement',
          currentOwner: 'Jackie',
          executionMode: 'PUBLISHER_MANUAL',
          executionState: 'WAITING_FOR_HUMAN',
          businessOwner: 'Publisher',
          executionOwner: 'Publisher',
          runtime: 'Publisher Operating Center manual portfolio placement',
          runtimeCostCategory: 'Dataverse/API',
          awaiting: 'Jackie',
          lastTrigger: 'Portfolio read model fallback',
          lastExecution: 'Portfolio read model',
          expectedDuration: 'Immediate after publisher placement decision',
          exactBlocker: item.nextAction,
          nextAction: item.nextAction,
          targetDate: '',
          ageDays: 0,
          authorAction: '',
          publisherAction: item.nextAction,
          internalQaState: '',
          packageReadiness: '',
          holdReason: item.exceptionReason || '',
          restartCondition: item.nextAction,
          workloadLevel: 'normal',
          queuePosition: 0,
          downstreamQueueSize: 0,
          readinessGuard: {
            status: item.exceptionReason ? 'blocked' : 'watch',
            message: item.exceptionReason || 'Portfolio-derived production posture requires publisher confirmation.',
          },
          latestExecutionEvidence: 'Portfolio read model',
        }))

  const derived = activeTitles.map((item) =>
    productionReadinessFromWorkload(item, productionProjects, productionTasks),
  )
  return {
    interiorQueue: derived,
    coverQueue: derived,
    sharePointDesign: productionSharePointDesign(),
  }
}

function productionReadinessFromWorkload(
  item: PublisherWorkloadItem,
  productionProjects: DataverseRow[],
  productionTasks: DataverseRow[],
): PublisherProductionReadinessItem {
  const state = `${item.workloadState} ${item.editorialStage} ${item.pipelineStage}`
  const isIntentionalLeader = normalizeTitle(item.title).includes('intentional leader')
  const titleProjects = productionProjects.filter((project) => dataverseLookupId(project, '_jm1_title_value') === item.titleId)
  const coverProject = titleProjects.find((project) =>
    (dataverseFormatted(project, 'jm1_productiontype') || '').toLowerCase().includes('cover'),
  )
  const interiorProject = titleProjects.find((project) =>
    (dataverseFormatted(project, 'jm1_productiontype') || '').toLowerCase().includes('interior'),
  )
  const coverTask = productionTasks.find((task) =>
    normalizeTitle(stringValue(task.jm1_taskname)).includes(normalizeTitle(item.title)) &&
    normalizeTitle(stringValue(task.jm1_taskname)).includes('cover'),
  )
  const interiorTask = productionTasks.find((task) =>
    normalizeTitle(stringValue(task.jm1_taskname)).includes(normalizeTitle(item.title)) &&
    normalizeTitle(stringValue(task.jm1_taskname)).includes('interior'),
  )
  const coverProjectStatus = dataverseFormatted(coverProject || {}, 'jm1_status')
  const interiorProjectStatus = dataverseFormatted(interiorProject || {}, 'jm1_status')
  const coverReviewReadiness = coverProject ? evaluateCoverReviewReadiness(item, coverProject, coverTask) : null
  const productionReady = state.includes('Proofreading Ready') || state.includes('Production Ready')
  const proofingBlocked =
    state.includes('Copyediting') || state.includes('Line Editing') || state.includes('Developmental Editing')
  const interiorReadiness: PublisherProductionReadinessItem['interiorReadiness'] = interiorProject
    ? 'READY — STARTED'
    : productionReady
    ? 'READY — AWAITING PUBLISHER START'
    : proofingBlocked || state.includes('Proofreading In Progress')
      ? 'BLOCKED — PROOFREADING'
      : 'BLOCKED — FINAL MANUSCRIPT'
  const coverReadiness: PublisherProductionReadinessItem['coverReadiness'] = coverProject
    ? coverReviewReadiness?.eligible
      ? 'INTERNAL REVIEW'
      : 'REVIEW ARTIFACT NOT READY'
    : isIntentionalLeader
    ? 'READY FOR CREATIVE BRIEF'
    : state.includes('Developmental Editing')
      ? 'BLOCKED — COPY'
      : 'BLOCKED — PUBLISHER DECISION'

  return {
    key: item.key,
    titleId: item.titleId,
    assetId: item.assetId,
    title: item.title,
    author: item.author,
    editorialState: item.workloadState,
    interiorState: interiorProject
      ? `Interior Layout — ${interiorProjectStatus || 'In Progress'}`
      : productionReady
        ? 'Interior Layout — Ready'
        : 'Interior Layout — Not Started',
    coverState: coverProject
      ? `Cover Design — ${coverProjectStatus || 'In Progress'}`
      : isIntentionalLeader
        ? 'Cover Design — Ready for Creative Brief'
        : 'Cover Design — Not Started',
    interiorReadiness,
    coverReadiness,
    nextInteriorAction: interiorProject
      ? 'Continue Interior Layout execution through the active production project.'
      : productionReady
      ? 'Begin Interior Layout after production intake package is confirmed.'
      : 'Wait for final approved proofread manuscript or approved production exception.',
    nextCoverAction: coverProject
      ? coverReviewReadiness?.eligible
        ? 'Open the governed review artifact from the normal title workspace and record Jackie internal cover review decision.'
        : 'Prepare or register the first governed visual cover concept before Jackie internal review; do not treat the brief or evidence package as the review artifact.'
      : isIntentionalLeader
      ? 'Create governed cover creative brief; full wrap waits for final page count.'
      : 'Confirm stable title copy, metadata, visual direction, and rights evidence.',
    sourceFiles: productionReady
      ? 'Final editorial manuscript and production source package required before proof generation.'
      : 'Final print-ready manuscript source is not yet approved.',
    rightsEvidence:
      'Document source, license, ownership, print/digital rights, modification rights, and AI provenance before author review.',
    sharePointParent: productionReady ? '01_Titles/06_Production' : 'Current governed stage folder until production entry.',
    productionProjectId: stringValue(coverProject?.jm1_productionprojectid || interiorProject?.jm1_productionprojectid),
    productionTaskId: stringValue(coverTask?.jm1_productiontaskid || interiorTask?.jm1_productiontaskid),
    allowedInteriorActions: interiorReadiness === 'READY — AWAITING PUBLISHER START'
      ? [{ id: 'begin_interior_layout', label: 'Begin Interior Layout' }]
      : [],
    allowedCoverActions: coverReadiness === 'READY FOR CREATIVE BRIEF'
      ? [{ id: 'begin_cover_design', label: 'Begin Cover Brief' }]
      : [],
  }
}

function evaluateCoverReviewReadiness(
  item: PublisherWorkloadItem,
  coverProject: DataverseRow,
  coverTask: DataverseRow | undefined,
) {
  return evaluateHumanReviewReadiness({
    titleId: item.titleId,
    title: item.title,
    reviewType: 'COVER_REVIEW',
    assignedReviewer: stringValue(coverTask?.jm1_assignedto) || 'Jackie',
    decisionRequest: 'Accept the internal cover direction, request revisions, or hold.',
    artifacts: coverProjectArtifacts(item, coverProject),
  })
}

function coverProjectArtifacts(item: PublisherWorkloadItem, coverProject: DataverseRow): ReviewArtifact[] {
  const files = stringValue(coverProject.jm1_fileslocation)
  const artifacts: ReviewArtifact[] = []
  if (files.includes('brief:')) {
    artifacts.push({
      id: 'cover-brief',
      titleId: item.titleId,
      name: `Cover Creative Brief - ${item.title}`,
      artifactClass: 'BRIEF',
      reviewType: 'COVER_REVIEW',
      state: 'READY_FOR_REVIEW',
      governedReference: files,
      version: extractProjectMarker(files, 'brief'),
      reviewerAccess: true,
      visualReviewable: false,
      current: true,
    })
  }
  if (files.includes('baseline:')) {
    artifacts.push({
      id: 'cover-baseline',
      titleId: item.titleId,
      name: `Cover concept development evidence - ${item.title}`,
      artifactClass: 'EVIDENCE_ARTIFACT',
      reviewType: 'COVER_REVIEW',
      state: 'READY_FOR_REVIEW',
      governedReference: files,
      version: extractProjectMarker(files, 'baseline'),
      reviewerAccess: true,
      visualReviewable: false,
      current: true,
    })
  }
  if (files.includes('review-artifact:') || files.includes('concept:')) {
    artifacts.push({
      id: 'cover-review-artifact',
      titleId: item.titleId,
      name: `Cover concept review artifact - ${item.title}.pdf`,
      artifactClass: 'REVIEW_ARTIFACT',
      reviewType: 'COVER_REVIEW',
      state: 'READY_FOR_REVIEW',
      governedReference: files,
      version: extractProjectMarker(files, 'review-artifact') || extractProjectMarker(files, 'concept'),
      reviewerAccess: files.includes('reviewer-access:verified'),
      visualReviewable: true,
      current: !files.includes('superseded'),
    })
  }
  return artifacts
}

function extractProjectMarker(files: string, marker: string) {
  return files.match(new RegExp(`${marker}:([^;]+)`))?.[1] || ''
}

function productionToTodayItem(item: PublisherProductionReadinessItem, lane: 'interior' | 'cover' = 'interior'): PublisherTodayItem {
  const readiness = lane === 'cover' ? item.coverReadiness : item.interiorReadiness
  const readyForPublisher = readiness.startsWith('READY')
  return {
    key: `production:${lane}:${item.key}`,
    recordId: item.productionProjectId || item.productionTaskId || item.key,
    titleId: item.titleId || item.key,
    title: item.title,
    author: item.author,
    portfolioState: 'active_pipeline',
    pipelineStage: lane === 'cover' ? 'Cover Design' : 'Interior Layout',
    editorialStage: item.editorialState,
    substage: readiness,
    owner: readyForPublisher ? 'Jackie' : 'Publisher',
    businessOwner: 'Publisher',
    executionOwner: readyForPublisher ? 'Publisher' : 'JM1 Automation',
    executionMode: readyForPublisher ? 'SYSTEM_ACTION_MANUALLY_TRIGGERED' : 'AUTOMATIC_SCHEDULED',
    executionState: readyForPublisher ? 'WAITING_FOR_HUMAN' : 'COMPLETED',
    runtime: 'Publisher Operating Center production readiness read model',
    awaiting: readyForPublisher ? 'Jackie' : 'Prerequisites',
    lastTrigger: 'Production readiness refresh',
    expectedDuration: readyForPublisher ? 'Immediate after publisher trigger' : 'Read model refresh',
    exactBlocker: readiness,
    nextAction: lane === 'cover' ? item.nextCoverAction : item.nextInteriorAction,
    targetDate: '',
    ageDays: 0,
    severity: readiness.startsWith('READY') ? 'watch' : 'info',
    packageState: lane === 'cover' ? item.coverState : item.interiorState,
    qaState: 'Not started',
    dependency: readiness,
    evidenceLinks: [],
    allowedActions: lane === 'cover' ? item.allowedCoverActions : item.allowedInteriorActions,
    lastMovement: item.productionProjectId
      ? `Production project ${item.productionProjectId}`
      : 'Production Command readiness evaluation',
  }
}

function royaltyDecisionTodayItem(royalties: PublisherRoyaltyReviewQueue): PublisherTodayItem {
  return {
    key: 'royalties:2026-decision-package',
    recordId: '2026-royalty-backlog',
    titleId: '',
    title: '2026 Royalty Decision Package',
    author: 'Multiple authors',
    portfolioState: 'royalty_review',
    pipelineStage: 'Royalties',
    editorialStage: 'Draft Statements — Internal Review',
    substage: 'Publisher decision package ready',
    owner: 'Jackie',
    businessOwner: 'Publisher',
    executionOwner: 'Publisher',
    executionMode: 'PUBLISHER_MANUAL',
    executionState: 'WAITING_FOR_HUMAN',
    runtime: 'Publisher Operating Center royalty decision queue',
    awaiting: 'Jackie',
    lastTrigger: 'Royalty ingestion and decision package refresh',
    expectedDuration: 'Publisher dependent',
    exactBlocker: `${royalties.identityHolds} identity holds; ${royalties.titleHolds} title holds; ${royalties.unresolvedPayments} unresolved payments`,
    nextAction: 'Review identity, title, and payment-allocation decisions before statements are approved.',
    targetDate: '',
    ageDays: 0,
    severity: 'urgent',
    packageState: `${royalties.draftStatements} draft statements; ${royalties.loadedRows} loaded rows`,
    qaState: 'Internal review required',
    dependency: `${royalties.identityHolds} identity holds; ${royalties.titleHolds} title holds; ${royalties.unresolvedPayments} unresolved payments`,
    evidenceLinks: [
      {
        label: 'Decision package',
        href: `/${royalties.decisionPackagePath}`,
      },
    ],
    allowedActions: [
      {
        id: 'review_royalty_statement',
        label: 'Review Royalty Statement',
      },
    ],
    lastMovement: 'ROYALTY_BACKLOG_COMPLETION_SPRINT_COMPLETED',
  }
}

function buildAuthorResponseQueue(
  gates: DataverseRow[],
  stages: DataverseRow[],
  titles: DataverseRow[],
  logs: DataverseRow[],
): PublisherAuthorResponseQueueItem[] {
  const processedActions: PublisherAuthorResponseQueueItem['allowedActions'] = [{ id: 'view_thread', label: 'View Thread' }]
  const recoveryActions: PublisherAuthorResponseQueueItem['allowedActions'] = [
    { id: 'view_thread', label: 'View Thread' },
    { id: 'confirm_classification', label: 'Confirm Classification' },
    { id: 'change_classification', label: 'Change Classification' },
    { id: 'reconcile_response', label: 'Reconcile Response' },
    { id: 'retry_failed_transition', label: 'Retry Failed Transition' },
    { id: 'mark_non_decision_message', label: 'Mark Non-Decision Message' },
  ]

  return gates
    .filter((gate) => {
      const summary = stringValue(gate.jm1pub_authorresponsesummary)
      return Boolean(gate.jm1pub_authordecisionon || summary.match(/\b(author replied|outlook message|message id|approved|response received)\b/i))
    })
    .map((gate) => {
      const gateId = stringValue(gate.jm1pub_editorialapprovalgateid)
      const stageId = dataverseLookupId(gate, '_jm1pub_editorialstageid_value')
      const titleId = dataverseLookupId(gate, '_jm1pub_titleid_value')
      const packageId = dataverseLookupId(gate, '_jm1pub_deliverableartifactid_value')
      const stage = stages.find((candidate) => stringValue(candidate.jm1pub_editorialstageid) === stageId)
      const stageSequence = Number(stage?.jm1pub_stagesequence || 0)
      const downstreamStage = stages.find((candidate) => {
        const candidateTitleId = dataverseLookupId(candidate, '_jm1pub_titleid_value')
        const candidateSequence = Number(candidate.jm1pub_stagesequence || 0)
        const candidateStatus = dataverseFormatted(candidate, 'jm1pub_stagestatus').toLowerCase()
        return (
          candidateTitleId === titleId &&
          candidateSequence > stageSequence &&
          (candidateStatus.includes('progress') || candidateStatus.includes('complete') || candidateStatus.includes('author'))
        )
      })
      const title = titles.find((candidate) => stringValue(candidate.jm1pub_titleid) === titleId)
      const summary = stringValue(gate.jm1pub_authorresponsesummary)
      const gateStatus = dataverseFormatted(gate, 'jm1pub_gatestatus') || stringValue(gate.jm1pub_gatestatus)
      const authorDecision = dataverseFormatted(gate, 'jm1pub_authordecision') || stringValue(gate.jm1pub_authordecision)
      const decisionOn = stringValue(gate.jm1pub_authordecisionon || gate.modifiedon || gate.createdon)
      const modifiedOn = stringValue(gate.modifiedon || decisionOn)
      const ageMinutes = ageMinutesSince(decisionOn || modifiedOn)
      const classifiedDecision = classifyAuthorDecision(authorDecision, summary)
      const transitionLog = logs.find((log) => {
        const type = stringValue(log.jm1_actiontype)
        const source = stringValue(log.jm1_sourcerecordid)
        const detail = stringValue(log.jm1_actiondescription)
        return (
          source === gateId ||
          (stageId && source === stageId) ||
          detail.includes(gateId) ||
          type.includes('STAGE_TRANSITION') ||
          type.includes('PROOFREADING_STARTED') ||
          type.includes('CAP004_PROOFREADING_STARTED')
        )
      })
      const transitionEvidence = transitionLog || downstreamStage
      const processingStatus = deriveAuthorResponseProcessingStatus(gateStatus, classifiedDecision, transitionEvidence)
      const failedStep = deriveAuthorResponseFailedStep(gateStatus, transitionEvidence, processingStatus)
      const stagePackage = [
        dataverseFormatted(gate, 'jm1pub_gatecode') || stringValue(gate.jm1pub_gatecode),
        stringValue(gate.jm1pub_editorialapprovalgatename),
      ]
        .filter(Boolean)
        .join(' · ')

      return {
        key: gateId,
        author: dataverseFormatted(gate, '_jm1pub_titleid_value') ? stringValue(title?.jm1pub_authorname) || 'Author' : 'Author',
        title:
          stringValue(title?.jm1pub_titlename || title?.jm1pub_name) ||
          dataverseFormatted(gate, '_jm1pub_titleid_value') ||
          'Title pending',
        stagePackage,
        responseReceived: decisionOn,
        classifiedDecision,
        processingStatus,
        ageMinutes,
        failedStep,
        nextAction:
          processingStatus === 'PROCESSED'
            ? 'No action required; response has been applied.'
            : processingStatus === 'AMBIGUOUS — REVIEW'
              ? 'Confirm the response classification before movement.'
              : 'Automatic consumer will retry; use Admin Retry Event only with the original event and reason.',
        threadEvidence: stringValue(gate.jm1pub_authordecisionsource) || extractThreadEvidence(summary),
        gateId,
        stageId,
        packageId,
        messageId: extractOutlookMessageId(summary),
        allowedActions: processingStatus === 'PROCESSED' ? processedActions : recoveryActions,
      }
    })
    .sort((a, b) => Date.parse(b.responseReceived || '') - Date.parse(a.responseReceived || ''))
    .slice(0, 25)
}

function classifyAuthorDecision(
  formattedDecision: string,
  summary: string,
): PublisherAuthorResponseQueueItem['classifiedDecision'] {
  const text = `${formattedDecision} ${summary}`.toLowerCase()
  if (text.includes('pause')) return 'PAUSE REQUESTED'
  if (text.includes('clarification') || text.includes('question')) return 'CLARIFICATION REQUESTED'
  if (text.includes('correction') || text.includes('changes requested') || text.includes('requested changes')) {
    return text.includes('approve') ? 'APPROVED WITH CORRECTIONS' : 'CORRECTIONS REQUESTED'
  }
  if (text.includes('approve') || text.includes('approved') || text.includes('i approve') || text.includes('looks good')) {
    return 'APPROVED WITHOUT CHANGES'
  }
  return 'AMBIGUOUS — HUMAN REVIEW'
}

function deriveAuthorResponseProcessingStatus(
  gateStatus: string,
  decision: PublisherAuthorResponseQueueItem['classifiedDecision'],
  transitionLog: DataverseRow | undefined,
): PublisherAuthorResponseQueueItem['processingStatus'] {
  const status = gateStatus.toLowerCase()
  if (decision === 'AMBIGUOUS — HUMAN REVIEW') return 'AMBIGUOUS — REVIEW'
  if (status.includes('approved') && transitionLog) return 'PROCESSED'
  if (status.includes('approved')) return 'STALE — SLA BREACH'
  if (status.includes('response received') || status.includes('publisher processing')) return 'PROCESSING'
  return 'FAILED — RETRY AVAILABLE'
}

function deriveAuthorResponseFailedStep(
  gateStatus: string,
  transitionLog: DataverseRow | undefined,
  processingStatus: PublisherAuthorResponseQueueItem['processingStatus'],
) {
  if (processingStatus === 'PROCESSED') return 'None'
  if (processingStatus === 'AMBIGUOUS — REVIEW') return 'Classification requires publisher confirmation'
  if (gateStatus.toLowerCase().includes('approved') && !transitionLog) return 'GATE UPDATED — STAGE NOT ADVANCED'
  return 'READ MODEL REFRESHED — UI CACHE STALE or downstream transition retry required'
}

function authorResponseToTodayItem(item: PublisherAuthorResponseQueueItem): PublisherTodayItem {
  const needsJackie = item.processingStatus === 'AMBIGUOUS — REVIEW'
  const isException = item.processingStatus === 'FAILED — RETRY AVAILABLE' || item.processingStatus === 'STALE — SLA BREACH'
  return {
    key: `author-response:${item.key}`,
    recordId: item.gateId,
    titleId: item.gateId,
    title: item.title,
    author: item.author,
    portfolioState: 'author_response',
    pipelineStage: 'Author Response',
    editorialStage: item.stagePackage,
    substage: item.classifiedDecision,
    owner: needsJackie ? 'Jackie' : isException ? 'Engineering' : 'Publisher',
    businessOwner: 'Publisher',
    executionOwner: needsJackie ? 'Publisher' : isException ? 'Cody Bridge' : 'JM1 Automation',
    executionMode: needsJackie ? 'PUBLISHER_MANUAL' : isException ? 'CODY_ASSISTED_BRIDGE' : 'AUTOMATIC_EVENT_DRIVEN',
    executionState: needsJackie ? 'WAITING_FOR_HUMAN' : isException ? 'EXCEPTION' : 'COMPLETED',
    runtime: needsJackie
      ? 'Publisher Operating Center author-response review'
      : isException
        ? 'Automatic approval event consumer with administrative replay controls'
        : 'Automatic approval event consumer',
    awaiting: needsJackie ? 'Jackie' : isException ? 'Engineering remediation' : 'None',
    lastTrigger: 'Governed author email response',
    expectedDuration: needsJackie ? 'Publisher dependent' : isException ? 'Bridge dependent' : 'Within 5 minutes',
    exactBlocker: item.failedStep,
    nextAction: item.nextAction,
    targetDate: '',
    ageDays: Math.floor(item.ageMinutes / 1440),
    severity: item.processingStatus === 'STALE — SLA BREACH' ? 'urgent' : 'watch',
    packageState: item.processingStatus,
    qaState: 'Response processing',
    dependency: item.failedStep,
    evidenceLinks: [],
    allowedActions: item.allowedActions,
    lastMovement: item.threadEvidence || item.responseReceived,
  }
}

function extractOutlookMessageId(summary: string) {
  const match = summary.match(/Outlook message ID:\s*([^.\s]+(?:={0,2}))/i)
  return match?.[1] || ''
}

function extractThreadEvidence(summary: string) {
  const match = summary.match(/Thread evidence:\s*([^.;]+)/i)
  return match?.[1] || 'Governed author response evidence'
}

function ageMinutesSince(value: string) {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return 0
  return Math.max(0, Math.floor((Date.now() - time) / 60000))
}

function logToAlertTodayItem(log: DataverseRow): PublisherTodayItem {
  const actionType = stringValue(log.jm1_actiontype || log.jm1_name)
  const recordId = stringValue(log.jm1_sourcerecordid || log.jm1_executionlogid)
  return {
    key: `alert:${stringValue(log.jm1_executionlogid)}`,
    recordId,
    titleId: '',
    title: actionType,
    author: 'Internal',
    portfolioState: 'alert',
    pipelineStage: 'Operational Alert',
    editorialStage: 'Failed Transition',
    substage: actionType,
    owner: 'Engineering',
    businessOwner: 'Publisher',
    executionOwner: 'Engineering',
    executionMode: 'CODY_ENGINEERING_ONLY',
    executionState: 'EXCEPTION',
    runtime: 'Engineering remediation lane for failed execution evidence',
    awaiting: 'Engineering remediation',
    lastTrigger: 'Failure execution log',
    expectedDuration: 'Exception dependent',
    exactBlocker: `Execution log ${stringValue(log.jm1_executionlogid)}`,
    nextAction: 'Review failure evidence and retry only when entry criteria are satisfied',
    targetDate: '',
    ageDays: ageDays(stringValue(log.createdon)),
    severity: 'urgent',
    packageState: 'Not applicable',
    qaState: 'Failed',
    dependency: `Execution log ${stringValue(log.jm1_executionlogid)}`,
    evidenceLinks: [],
    allowedActions: [],
    lastMovement: `${actionType} (${stringValue(log.jm1_executionlogid)})`,
  }
}

function logToMovementTodayItem(log: DataverseRow): PublisherTodayItem {
  const actionType = stringValue(log.jm1_actiontype || log.jm1_name) || 'Execution event'
  const recordId = stringValue(log.jm1_sourcerecordid || log.jm1_executionlogid)
  return {
    key: `movement:${stringValue(log.jm1_executionlogid)}`,
    recordId,
    titleId: '',
    title: actionType,
    author: 'Internal',
    portfolioState: 'movement',
    pipelineStage: 'Recent Movement',
    editorialStage: actionType,
    substage: stringValue(log.createdon),
    owner: 'Publisher',
    businessOwner: 'Publisher',
    executionOwner: 'JM1 Automation',
    executionMode: 'AUTOMATIC_SCHEDULED',
    executionState: 'COMPLETED',
    runtime: 'Publisher Today execution-log readback',
    awaiting: 'None',
    lastTrigger: 'Execution-log refresh',
    expectedDuration: 'Read model refresh',
    exactBlocker: 'None',
    nextAction: 'See current section for next valid action',
    targetDate: '',
    ageDays: ageDays(stringValue(log.createdon)),
    severity: isOpenFailureLog(log) ? 'urgent' : 'info',
    packageState: 'Evidence logged',
    qaState: 'Readback',
    dependency: stringValue(log.jm1_sourceentity),
    evidenceLinks: [],
    allowedActions: [],
    lastMovement: `${actionType} (${stringValue(log.jm1_executionlogid)})`,
  }
}

function isOpenFailureLog(log: DataverseRow) {
  const value = `${stringValue(log.jm1_actiontype)} ${stringValue(log.jm1_name)}`.toLowerCase()
  return value.includes('failed') || value.includes('failure') || value.includes('exception')
}

function prioritizeTodayItems(items: PublisherTodayItem[]) {
  const severityRank = { urgent: 0, watch: 1, info: 2 }
  const ownerRank = {
    Jackie: 0,
    Author: 1,
    Publisher: 2,
    Engineering: 3,
    'Cody Bridge': 4,
    'JM1 Automation': 5,
    External: 6,
    'Not Implemented': 7,
  }
  return [...dedupeTodayItems(items)].sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      ownerRank[a.owner] - ownerRank[b.owner] ||
      b.ageDays - a.ageDays ||
      a.title.localeCompare(b.title),
  )
}

function dedupeTodayItems(items: PublisherTodayItem[]) {
  const byKey = new Map<string, PublisherTodayItem>()
  for (const item of items) {
    const key = [
      normalizeTitle(item.title),
      item.owner,
      normalizeTodayStage(item.editorialStage),
      normalizeTodayStage(item.nextAction),
    ].join(':')
    const existing = byKey.get(key)
    if (!existing || todayItemSpecificity(item) > todayItemSpecificity(existing)) {
      byKey.set(key, item)
    }
  }
  return [...byKey.values()]
}

function normalizeTodayStage(value: string) {
  const normalized = value.toLowerCase()
  if (normalized.includes('copy')) return 'copyediting'
  if (normalized.includes('line')) return 'line-editing'
  if (normalized.includes('developmental')) return 'developmental-editing'
  if (normalized.includes('proof')) return 'proofreading'
  if (normalized.includes('editorial')) return 'editorial-review'
  if (normalized.includes('catalog')) return 'catalog'
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
}

function todayItemSpecificity(item: PublisherTodayItem) {
  return (
    (item.key.startsWith('workload:') ? 100 : 0) +
    (item.packageState !== 'No active author package' ? 20 : 0) +
    (item.recordId ? 10 : 0) +
    (item.lastMovement !== 'No recent execution evidence found' ? 5 : 0)
  )
}

function emptyPublisherToday(): PublisherTodaySnapshot {
  return {
    generatedAt: new Date().toISOString(),
    publisherIdentity: {
      role: 'Publisher',
      authorization: 'Internal Entra workforce allowlist',
    },
    summary: {
      jackieActionsDueToday: 0,
      authorResponsesPending: 0,
      activeEditorialTitles: 0,
      productionReadyTitles: 0,
      failedTransitions: 0,
      overdueItems: 0,
      assetsMovedToday: 0,
      catalogExceptions: 0,
    },
    waitingForJackie: [],
    waitingForAuthors: [],
    activeEditorial: [],
    productionQueue: [],
    distributionCatalogQueue: [],
    alerts: [],
    recentMovements: [],
  }
}

function emptyTitleOperatingView(): PublisherTitleOperatingView {
  return {
    generatedAt: new Date().toISOString(),
    stageSource: 'Publisher Operating Center read model unavailable.',
    stages: [],
    cards: [],
    jackieActionNotifications: [],
    summary: {
      activeTitles: 0,
      needsJackie: 0,
      waitingOnAuthors: 0,
      blockedTitles: 0,
      overdueTitles: 0,
      inProduction: 0,
      publishedThisPeriod: 0,
    },
  }
}

function emptyMetrics(): PublisherOperatingCenterSnapshot['metrics'] {
  return {
    newSubmissionsAwaitingReview: 0,
    unlinkedAssets: 0,
    editorialReviewQueue: 0,
    publisherActionsPending: 0,
    authorActionsPending: 0,
    contractPaymentHolds: 0,
    failedTransitions: 0,
    stalledAssets: 0,
    assetsWaitingReview: 0,
    assetsOnHold: 0,
    developmentalQueue: 0,
    averageQueueAgeDays: 0,
    oldestWaitingAsset: 'None',
    publisherActionsDueToday: 0,
    assetsMovedToday: 0,
    assetsMovedThisWeek: 0,
    titlesAwaitingDevelopmentalEditing: 0,
    titlesInDevelopmentalEditing: 0,
    titlesAwaitingLineEditing: 0,
    titlesInLineEditing: 0,
    titlesAwaitingCopyediting: 0,
    titlesAwaitingCopyeditingRelease: 0,
    packagesHeldByReadinessGuard: 0,
    workloadAdvisories: 0,
    activeInstancesByCapability: {},
    authorReviewBacklog: 0,
    oldestWorkloadItem: 'None',
    portfolioActivePipeline: 0,
    portfolioPublishedCatalog: 0,
    portfolioExternalHold: 0,
    portfolioArchiveHistorical: 0,
    portfolioReconciliationRequired: 0,
    publishedCatalogMissingIsbn: 0,
    publishedCatalogMissingAuthor: 0,
  }
}

function readRoyaltyReviewQueue(): PublisherRoyaltyReviewQueue {
  const manifestRows = readCsvRows('2026-07-17-JM1-2026-Royalty-Manifest-Final-Status.csv')
  const paymentRows = readCsvRows('2026-07-17-JM1-2026-Royalty-Payment-Final-Classification.csv')
  const statementRows = readCsvRows('2026-07-17-JM1-2026-Royalty-Draft-Statement-Set.csv')
  const wave2 = readRoyaltyWave2DecisionPackage()
  const decisionCards = readRoyaltyDecisionCards()
  const monthlyClose = readRoyaltyMonthlyClose()
  const sourceSummary = readRoyaltySourceImportSummary()
  const decisionTypes = decisionCards.reduce<Record<string, number>>((summary, card) => {
    summary[card.decisionType] = (summary[card.decisionType] || 0) + 1
    return summary
  }, {})
  const affectedDollars = roundCurrency(
    decisionCards.reduce((sum, card) => sum + Number(card.sourceNetCompensation || 0), 0),
  )

  return {
    acceptedBaseline: {
      sourceFilesEvaluated: sourceSummary.files,
      sourceFilesImported: sourceSummary.importedFiles,
      normalizedRows: sourceSummary.normalizedRows,
      coreRowsLoaded: sourceSummary.coreRowsLoaded,
      heldRows: sourceSummary.heldForTitleDecision,
      statementPeriods: sourceSummary.statementPeriods,
      januaryPodUsBDisposition: 'SUPERSEDED',
    },
    decisionSummary: {
      heldRows: sourceSummary.heldForTitleDecision,
      decisionGroups: decisionCards.length,
      affectedDollars,
      highConfidenceRecommendations: decisionCards.filter((card) => card.confidence === 'high').length,
      jackieReviewGroups: decisionCards.filter((card) => card.confidence !== 'high').length,
      rowsReleasedToday: 0,
      remainingExceptions: sourceSummary.heldForTitleDecision,
      statementReadyForReview: wave2?.summary?.statementReadiness?.readyForJackieReview || 0,
      statementExceptions: wave2?.summary?.statementReadiness?.exceptions || 0,
      missingSourceActions: wave2?.monthlyClose?.missingSourceActions?.length || monthlyClose.missingSourceActions.length,
      decisionTypes,
    },
    manifestRows: manifestRows.length,
    loadedRows: manifestRows.filter((row) => row.finalStatus === 'LOADED — DRAFT STATEMENT').length,
    identityHolds: manifestRows.filter((row) => row.finalStatus === 'HELD — JACKIE IDENTITY DECISION').length,
    titleHolds: manifestRows.filter((row) => row.finalStatus === 'HELD — JACKIE TITLE DECISION').length,
    paymentRows: paymentRows.length,
    paymentAllocationUnknown: paymentRows.filter((row) => row.finalPaymentStatus?.includes('ALLOCATION UNKNOWN')).length,
    unresolvedPayments: paymentRows.filter((row) => row.finalPaymentStatus === 'UNRESOLVED — JACKIE DECISION').length,
    draftStatements: statementRows.length,
    decisionPackagePath: wave2
      ? 'docs/operations/generated/2026-07-19-JM1-Royalty-Operations-Wave2-Decision-Packages.csv'
      : 'docs/operations/generated/2026-07-17-JM1-2026-Royalty-Jackie-Decision-Package.csv',
    decisionCards,
    decisionPackages: wave2?.packages || [],
    statementQueue: wave2?.statements || [],
    monthlyClose,
  }
}

function readRoyaltyWave2DecisionPackage() {
  return readJsonFile<{
    summary?: {
      statementReadiness?: {
        readyForJackieReview?: number
        exceptions?: number
      }
    }
    packages?: PublisherRoyaltyDecisionPackage[]
    statements?: PublisherRoyaltyStatementQueueItem[]
    monthlyClose?: {
      missingSourceActions?: PublisherRoyaltyReviewQueue['monthlyClose']['missingSourceActions']
    }
  }>('2026-07-19-JM1-Royalty-Operations-Wave2-Decision-Packages.json')
}

function readRoyaltySourceImportSummary() {
  const monthlyClose = readJsonFile<{
    sourceImportSummary?: {
      files?: number
      importedFiles?: number
      normalizedRows?: number
      coreRowsLoaded?: number
      heldForTitleDecision?: number
    }
  }>('2026-07-18-JM1-2026-Royalty-Monthly-Close.json')
  const reconciliation = readJsonFile<{
    rowCount?: number
    matched?: number
    heldTitle?: number
  }>('2026-07-18-JM1-2026-Royalty-Source-Row-Reconciliation.json')
  const coreLoad = readJsonFile<{ statements?: unknown[] }>('2026-07-18-JM1-2026-Royalty-Core-Load-Result.json')
  return {
    files: Number(monthlyClose?.sourceImportSummary?.files || 34),
    importedFiles: Number(monthlyClose?.sourceImportSummary?.importedFiles || 24),
    normalizedRows: Number(monthlyClose?.sourceImportSummary?.normalizedRows || reconciliation?.rowCount || 297),
    coreRowsLoaded: Number(monthlyClose?.sourceImportSummary?.coreRowsLoaded || reconciliation?.matched || 104),
    heldForTitleDecision: Number(monthlyClose?.sourceImportSummary?.heldForTitleDecision || reconciliation?.heldTitle || 193),
    statementPeriods: Array.isArray(coreLoad?.statements) ? coreLoad.statements.length : 6,
  }
}

function readRoyaltyMonthlyClose(): PublisherRoyaltyReviewQueue['monthlyClose'] {
  try {
    const raw = readFileSync(
      join(process.cwd(), 'docs/operations/generated', '2026-07-18-JM1-2026-Royalty-Monthly-Close.json'),
      'utf8',
    )
    const parsed = JSON.parse(raw) as PublisherRoyaltyReviewQueue['monthlyClose'] & {
      months?: PublisherRoyaltyMonthlyCloseItem[]
    }
    return {
      latestAcxMonthAvailable: stringValue(parsed.latestAcxMonthAvailable),
      spreadsheetStatus: stringValue(parsed.spreadsheetStatus),
      automation: {
        ingram: stringValue(parsed.automation?.ingram),
        kdp: stringValue(parsed.automation?.kdp),
        acx: stringValue(parsed.automation?.acx),
        directSales: stringValue(parsed.automation?.directSales),
      },
      generatedReportPolicy: generatedRoyaltyReportPolicy(),
      missingSourceActions: readRoyaltyWave2DecisionPackage()?.monthlyClose?.missingSourceActions || deriveRoyaltyMissingSourceActions(parsed.months || []),
      months: Array.isArray(parsed.months) ? parsed.months.map(applyGeneratedReportTimingPolicy) : [],
    }
  } catch {
    return {
      latestAcxMonthAvailable: '',
      spreadsheetStatus: '',
      automation: {
        ingram: '',
        kdp: '',
        acx: '',
        directSales: '',
      },
      generatedReportPolicy: generatedRoyaltyReportPolicy(),
      missingSourceActions: [],
      months: [],
    }
  }
}

function deriveRoyaltyMissingSourceActions(months: PublisherRoyaltyMonthlyCloseItem[]) {
  return months.flatMap((month) =>
    month.sources
      .filter((source) => source.state === 'UPLOAD REQUIRED')
      .map((source) => ({
        month: month.month,
        source: source.label,
        action:
          source.label === 'Direct Sales'
            ? 'Upload Direct Sales or Confirm No Activity'
            : `Upload ${source.label} source report`,
        state: source.state,
      })),
  )
}

function readRoyaltyDecisionCards(): PublisherRoyaltyDecisionCard[] {
  const reconciliation = readJsonFile<{
    rows?: Array<{
      month?: string
      sourceFile?: string
      sourceSystem?: string
      account?: string
      currency?: string
      isbn?: string
      title?: string
      units?: number
      net?: number
      gross?: number
      matchStatus?: string
      matchSource?: string
      rowNumber?: number
      lineItem?: string
    }>
  }>('2026-07-18-JM1-2026-Royalty-Source-Row-Reconciliation.json')

  const heldRows = (reconciliation?.rows || []).filter((row) => stringValue(row.matchStatus) !== 'MATCHED_CORE_IDENTIFIER')
  if (!heldRows.length) return readLegacyRoyaltyDecisionCards()

  const grouped = new Map<string, {
    month: string
    sourceSystem: string
    sourceFileNames: Set<string>
    sourceFileCount: number
    account: string
    currency: string
    identifier: string
    title: string
    affectedRows: number
    unitCount: number
    sourceNetCompensation: number
    rowNumbers: string[]
    lineItems: string[]
  }>()

  heldRows.forEach((row) => {
    const month = stringValue(row.month)
    const sourceSystem = stringValue(row.sourceSystem)
    const account = stringValue(row.account)
    const currency = stringValue(row.currency)
    const identifier = normalizeIdentifier(stringValue(row.isbn))
    const title = stringValue(row.title)
    const key = [sourceSystem, month, account, currency, identifier, normalizeTitle(title)].join('|')
    const current =
      grouped.get(key) ||
      {
        month,
        sourceSystem,
        sourceFileNames: new Set<string>(),
        sourceFileCount: 0,
        account,
        currency,
        identifier,
        title,
        affectedRows: 0,
        unitCount: 0,
        sourceNetCompensation: 0,
        rowNumbers: [],
        lineItems: [],
      }
    current.sourceFileNames.add(stringValue(row.sourceFile))
    current.sourceFileCount = current.sourceFileNames.size
    current.affectedRows += 1
    current.unitCount += Number(row.units || 0)
    current.sourceNetCompensation = roundCurrency(current.sourceNetCompensation + Number(row.net || 0))
    current.rowNumbers.push(stringValue(row.rowNumber))
    current.lineItems.push(stringValue(row.lineItem))
    grouped.set(key, current)
  })

  return [...grouped.values()]
    .sort((a, b) => Math.abs(b.sourceNetCompensation) - Math.abs(a.sourceNetCompensation))
    .map((group, index): PublisherRoyaltyDecisionCard => {
      const period = `2026-${group.month.padStart(2, '0')}`
      const decisionType = group.identifier ? 'Title Match / Identifier Match' : 'Title Match'
      const sourceFiles = [...group.sourceFileNames].filter(Boolean)
      return {
        key: `royalty-held-${period}-${group.sourceSystem}-${group.account || 'account'}-${group.identifier || normalizeTitle(group.title)}-${index + 1}`,
        decisionType,
        author: '',
        title: group.title,
        reportingPeriod: period,
        sourceSystem: group.sourceSystem,
        sourceFile: sourceFiles.length > 1 ? `${sourceFiles.length} source files` : sourceFiles[0] || 'Source file pending',
        account: group.account,
        currency: group.currency,
        identifier: group.identifier,
        format: inferRoyaltyDecisionFormat(group.sourceSystem, sourceFiles.join(' ')),
        unitCount: group.unitCount,
        sourceNetCompensation: group.sourceNetCompensation,
        affectedRows: group.affectedRows,
        confidence: 'medium',
        matchingBasis: group.identifier
          ? 'Source row carries an ISBN/identifier and reported title, but the identifier is not yet mapped to one canonical JM1 title in Core.'
          : 'Source row carries reported title text without a safely reusable canonical identifier mapping.',
        priorMatchingDecisions: 'No accepted durable mapping found in the current source-row reconciliation.',
        financialImpact: `${group.currency || 'USD'} ${group.sourceNetCompensation.toFixed(2)} across ${group.affectedRows} held row(s).`,
        amountAffected: group.sourceNetCompensation.toFixed(2),
        evidence: [
          `${group.sourceSystem} ${period}`,
          group.account ? `account ${group.account}` : '',
          group.currency,
          group.identifier ? `identifier ${group.identifier}` : 'identifier pending',
          `${group.affectedRows} source row(s)`,
          sourceFiles.length ? `files: ${sourceFiles.slice(0, 2).join('; ')}${sourceFiles.length > 2 ? '; ...' : ''}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        recommendedDecision: group.identifier
          ? `Map identifier ${group.identifier} to the canonical title and format for ${group.title}, then reuse that mapping for future imports.`
          : `Match reported title ${group.title} to the canonical title before import.`,
        alternatives:
          'Match to existing title; create format or edition relationship; classify as not JM1 title; classify duplicate source activity; defer for evidence.',
        downstreamEffect:
          'Approval persists a durable mapping, reevaluates the affected held source rows, imports eligible royalty activity, refreshes draft statements, and keeps author visibility off.',
        allowedActions: [{ id: 'review_royalty_statement', label: 'Open Review' }],
      }
    })
}

function readLegacyRoyaltyDecisionCards(): PublisherRoyaltyDecisionCard[] {
  return readCsvRows('2026-07-17-JM1-2026-Royalty-Jackie-Decision-Package.csv')
    .map((row, index): PublisherRoyaltyDecisionCard => {
      const decisionType = stringValue(row.decisionType)
      const manifestRowNumber = stringValue(row.manifestRowNumber)
      const author = stringValue(row.author)
      const title = stringValue(row.title)
      const amount = Number(stringValue(row.amountAffected)) || 0
      return {
        key: `royalty-decision-${manifestRowNumber || index + 1}`,
        decisionType,
        author,
        title,
        reportingPeriod: '2026 available royalty evidence',
        sourceSystem: 'Legacy decision package',
        sourceFile: '2026-07-17-JM1-2026-Royalty-Jackie-Decision-Package.csv',
        account: '',
        currency: 'USD',
        identifier: '',
        format: '',
        unitCount: 0,
        sourceNetCompensation: amount,
        affectedRows: 1,
        confidence: 'low',
        matchingBasis: 'Legacy consolidated decision package.',
        priorMatchingDecisions: 'Legacy decision package, pending Jackie review.',
        financialImpact: `USD ${amount.toFixed(2)}`,
        amountAffected: stringValue(row.amountAffected),
        evidence: manifestRowNumber ? `Manifest row ${manifestRowNumber}; consolidated royalty decision package.` : 'Consolidated royalty decision package.',
        recommendedDecision: stringValue(row.recommendedAction),
        alternatives: stringValue(row.alternatives),
        downstreamEffect: stringValue(row.consequence),
        allowedActions: [{ id: 'review_royalty_statement', label: 'Open Review' }],
      }
    })
    .filter((card) => card.decisionType || card.author || card.title)
}

function readCsvRows(fileName: string) {
  try {
    const file = readFileSync(join(process.cwd(), 'docs/operations/generated', fileName), 'utf8')
    const [headerLine, ...lines] = file.split(/\r?\n/).filter(Boolean)
    const headers = splitCsvLine(headerLine)
    return lines.map((line) => {
      const cells = splitCsvLine(line)
      return Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']))
    })
  } catch {
    return []
  }
}

function splitCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

function productionSharePointDesign() {
  return [
    '01_Titles/05_Proofreading',
    '01_Titles/06_Production/01_Interior-Layout',
    '01_Titles/06_Production/02_Cover-Design',
    '01_Titles/06_Production/03_Author-Proofs',
    '01_Titles/06_Production/04_Final-Print-Files',
    '01_Titles/06_Production/05_Production-QA',
    '01_Titles/07_Distribution',
    '01_Titles/08_Published-Catalog',
  ]
}

function ageBucket(days: number): PublisherQueueItem['ageBucket'] {
  if (days <= 2) return '0-2 days'
  if (days <= 7) return '3-7 days'
  if (days <= 14) return '8-14 days'
  if (days <= 30) return '15-30 days'
  return 'Over 30 days'
}

function overdueState(days: number, blocker: string): PublisherQueueItem['overdueState'] {
  if (blocker.toLowerCase().includes('hold')) return days > 14 ? 'stalled' : 'watch'
  if (days > 14) return 'stalled'
  if (days > 7) return 'overdue'
  if (days > 2) return 'watch'
  return 'current'
}

function publisherActionToEvent(action: PublisherActionId) {
  switch (action) {
    case 'place_asset_in_pipeline':
      return 'PUBLISHER_PIPELINE_STAGE_PLACEMENT'
    case 'advance_stage':
      return 'PUBLISHER_STAGE_ADVANCEMENT_REQUESTED'
    case 'begin_interior_layout':
      return 'INTERIOR_LAYOUT_STARTED'
    case 'begin_cover_design':
      return 'COVER_CREATIVE_BRIEF_STARTED'
    case 'review_royalty_statement':
      return 'ROYALTY_DRAFT_STATEMENT_REVIEW_REQUESTED'
    case 'view_thread':
      return 'AUTHOR_RESPONSE_THREAD_VIEWED'
    case 'confirm_classification':
      return 'AUTHOR_RESPONSE_CLASSIFICATION_CONFIRMED'
    case 'change_classification':
      return 'AUTHOR_RESPONSE_CLASSIFICATION_CHANGE_REQUESTED'
    case 'reconcile_response':
      return 'AUTHOR_RESPONSE_RECONCILE_REQUESTED'
    case 'retry_failed_transition':
      return 'AUTHOR_RESPONSE_FAILED_TRANSITION_RETRY_REQUESTED'
    case 'mark_non_decision_message':
      return 'AUTHOR_RESPONSE_MARKED_NON_DECISION'
    case 'initialize_developmental_editing':
      return 'PUBLISHER_DEVELOPMENTAL_EDITING_INITIALIZATION_RECORDED'
    case 'request_missing_information':
      return 'PUBLISHER_MISSING_INFORMATION_REQUEST_PREPARED'
    case 'return_for_correction':
      return 'PUBLISHER_RETURN_FOR_CORRECTION_RECORDED'
    case 'retry_failed_operation':
      return 'PUBLISHER_FAILED_OPERATION_RETRY_RECORDED'
    default:
      return 'PUBLISHER_OPERATIONAL_ACTION_RECORDED'
  }
}

function normalizeTitle(value: string) {
  return value.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ')
}

function normalizeIdentifier(value: string) {
  return value.replace(/[^0-9XxA-Za-z]/g, '').toUpperCase()
}

function inferRoyaltyDecisionFormat(sourceSystem: string, evidence: string) {
  const text = `${sourceSystem} ${evidence}`.toLowerCase()
  if (text.includes('acx') || text.includes('audio')) return 'Audiobook'
  if (text.includes('ebook') || text.includes('kdp') || text.includes('kindle')) return 'Ebook'
  if (text.includes('pod') || text.includes('print') || text.includes('wholesale')) return 'Print'
  if (text.includes('direct')) return 'Direct Sales'
  return 'Format pending'
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function readJsonFile<T>(fileName: string): T | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), 'docs/operations/generated', fileName), 'utf8')) as T
  } catch {
    return null
  }
}

function generatedRoyaltyReportPolicy() {
  return [
    'Automated royalty reports are generated no later than the 10th of the month.',
    'If an expected automated report does not exist before that deadline, it should not remain in an open waiting state for that generated report.',
    'Manual reports may still be created and uploaded at any time, so manual upload choices remain available without treating missing generated reports as zero activity.',
  ].join(' ')
}

function applyGeneratedReportTimingPolicy(month: PublisherRoyaltyMonthlyCloseItem): PublisherRoyaltyMonthlyCloseItem {
  const sources = month.sources.map((source) => {
    const automatedMissing =
      source.state === 'SOURCE MISSING' &&
      /lsi|ingram|acx/i.test(source.label) &&
      !/direct/i.test(source.label)

    if (!automatedMissing) return source

    return {
      ...source,
      state: 'KNOWN UNAVAILABLE',
      detail: `${source.detail}; automated report deadline policy applied: no generated report exists by the 10th, so no generated report is expected for this month.`,
    }
  })

  const waitingFor = month.waitingFor.map((item) =>
    /source missing|not found|missing/i.test(item)
      ? `${item} Generated-report timing rule: automated reports are issued no later than the 10th; manual reports may still be supplied later.`
      : item,
  )

  return {
    ...month,
    sources,
    waitingFor,
  }
}

function ageDays(value: string) {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return 0
  return Math.max(0, Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000)))
}

function escapeODataText(value: string) {
  return value.replace(/'/g, "''")
}

function extractId(entityUrl: string) {
  return entityUrl.match(/\(([0-9a-f-]{36})\)$/i)?.[1] || entityUrl
}
