import { headers } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { dataverseCreate, getDataverseServerConfig } from './dataverse-server'

export type PublisherSectionKey =
  | 'today'
  | 'pipeline'
  | 'production'
  | 'catalog'
  | 'authors'
  | 'royalties'
  | 'invitations'
  | 'exceptions'

export type PublisherQueueItem = {
  id: string
  title: string
  author: string
  section: PublisherSectionKey
  state: string
  owner: 'Jackie' | 'Publisher' | 'Author' | 'Production' | 'External'
  nextAction: string
  ageDays: number
  dueDate?: string
  blocker?: string
  actionHref: string
  priority: 'P0' | 'P1' | 'P2'
}

export type PublisherActionContract = {
  key: string
  label: string
  entryCriteria: string[]
  affectedRecords: string[]
  eventType: string
  authorFacingConsequence: string
  rollback: string
}

export type ProductionReadiness = {
  title: string
  author: string
  editorialState: string
  interiorState: string
  coverState: string
  readiness:
    | 'READY FOR INTERIOR LAYOUT'
    | 'ALREADY IN INTERIOR LAYOUT — PLACE AT CURRENT STATE'
    | 'BLOCKED — FINAL MANUSCRIPT'
    | 'BLOCKED — PROOFREADING'
    | 'BLOCKED — TRIM/FORMAT DECISION'
    | 'BLOCKED — IMAGES'
    | 'BLOCKED — ISBN/METADATA'
    | 'BLOCKED — PUBLISHER DECISION'
    | 'NOT YET ELIGIBLE'
  nextAction: string
  sourceFiles: string
  sharePointParent: string
}

export type CoverReadiness = {
  title: string
  author: string
  coverState: string
  readiness:
    | 'READY FOR CREATIVE BRIEF'
    | 'CREATIVE BRIEF IN PROGRESS'
    | 'READY FOR CONCEPTS'
    | 'CONCEPTS IN PROGRESS'
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
  nextAction: string
  rightsEvidence: string
}

export type ProductionPipelineStage = {
  stageCode: string
  label: string
  jStage: 'J7' | 'J8'
  lane: 'Parallel Production' | 'Author Review' | 'Production Assembly' | 'Distribution Preparation' | 'Distribution' | 'Post-Release'
  timingGovernance: string
  owner: 'JM1 Automation' | 'Publisher' | 'External'
  workStatus: string
  qaStatus: string
  releaseStatus: string
  currentSignal: string
  nextAction: string
}

export type RoyaltyDecisionSummary = {
  manifestRows: number
  loadedRows: number
  identityHolds: number
  titleHolds: number
  paymentRows: number
  paymentAllocationUnknown: number
  unresolvedPayments: number
  draftStatements: number
  decisionPackagePath: string
}

export type PublisherOperatingCenterModel = {
  generatedAt: string
  repository: {
    name: string
    route: string
    deployment: string
    branch: string
  }
  operator: {
    email: string
    role: 'Publisher' | 'Administrator'
    authMode: string
  }
  navigation: Array<{ key: PublisherSectionKey; label: string }>
  today: Record<string, PublisherQueueItem[]>
  pipelineItems: PublisherQueueItem[]
  production: {
    interior: ProductionReadiness[]
    cover: CoverReadiness[]
    pipelineV2: ProductionPipelineStage[]
    sharePointDesign: string[]
  }
  royalties: RoyaltyDecisionSummary
  actionContracts: PublisherActionContract[]
}

export type PublisherActionRequest = {
  action: string
  title?: string
  author?: string
  reason?: string
  requestedState?: string
}

export function requirePublisherOperator() {
  const incomingHeaders = headers()
  const principal = parseClientPrincipal(incomingHeaders.get('x-ms-client-principal'))
  const email =
    principal?.userDetails ||
    incomingHeaders.get('x-ms-client-principal-name') ||
    incomingHeaders.get('x-jm1-publisher-email') ||
    ''
  const normalizedEmail = email.toLowerCase().trim()
  const allowlist = getPublisherAllowlist()

  if (allowlist.includes(normalizedEmail)) {
    return {
      ok: true as const,
      operator: {
        email: normalizedEmail,
        role: normalizedEmail === 'jm1-admin@jmerrill.one' ? ('Administrator' as const) : ('Publisher' as const),
        authMode: principal ? 'azure-static-web-apps-principal' : 'publisher-header',
      },
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return {
      ok: true as const,
      operator: {
        email: normalizedEmail || 'jm1-admin@jmerrill.one',
        role: 'Administrator' as const,
        authMode: 'local-development-bypass',
      },
    }
  }

  return {
    ok: false as const,
    reason: 'Publisher Operating Center requires an authorized JM1 workforce identity.',
  }
}

export function buildPublisherOperatingCenterModel(
  operator: PublisherOperatingCenterModel['operator'],
): PublisherOperatingCenterModel {
  const pipelineItems = buildPipelineItems()
  const today = groupTodayItems(pipelineItems)
  const royalties = readRoyaltySummary()

  return {
    generatedAt: new Date().toISOString(),
    repository: {
      name: 'jmerrill-pub',
      route: '/publisher/operating-center',
      deployment: 'Azure Static Web Apps / jmerrill.pub',
      branch: 'main',
    },
    operator,
    navigation: [
      { key: 'today', label: 'Publisher Today' },
      { key: 'pipeline', label: 'Active Pipeline' },
      { key: 'production', label: 'Production' },
      { key: 'catalog', label: 'Published Catalog' },
      { key: 'authors', label: 'Authors' },
      { key: 'royalties', label: 'Royalties' },
      { key: 'invitations', label: 'Invitations' },
      { key: 'exceptions', label: 'Exceptions' },
    ],
    today,
    pipelineItems,
    production: {
      interior: buildInteriorReadinessQueue(),
      cover: buildCoverReadinessQueue(),
      pipelineV2: buildProductionPipelineV2Stages(),
      sharePointDesign: [
        '01_Titles/05_Proofreading',
        '01_Titles/06_Production/01_Interior-Layout',
        '01_Titles/06_Production/02_Cover-Design',
        '01_Titles/06_Production/03_Author-Proofs',
        '01_Titles/06_Production/04_Production-Assembly',
        '01_Titles/06_Production/05_EPUB-Generation',
        '01_Titles/06_Production/06_Accessibility-QA',
        '01_Titles/07_Distribution/01_Distribution-Readiness',
        '01_Titles/07_Distribution/02_Mock-Distribution',
        '01_Titles/07_Distribution/03_Publisher-Validation',
        '01_Titles/07_Distribution/04_Live-Distribution',
        '01_Titles/08_Post-Release-Verification',
      ],
    },
    royalties,
    actionContracts: buildActionContracts(),
  }
}

function buildProductionPipelineV2Stages(): ProductionPipelineStage[] {
  return [
    {
      stageCode: 'PRODUCTION_START',
      label: 'Production Start',
      jStage: 'J7',
      lane: 'Parallel Production',
      timingGovernance: 'IMMEDIATE_AUTOMATED_TRANSITION',
      owner: 'JM1 Automation',
      workStatus: 'READY_AFTER_PROOFREADING_APPROVAL',
      qaStatus: 'NOT_APPLICABLE',
      releaseStatus: 'INTERNAL_ONLY',
      currentSignal: 'Begins after Proofreading approval.',
      nextAction: 'Create Interior Layout and Cover Design workstreams together.',
    },
    {
      stageCode: 'INTERIOR_LAYOUT',
      label: 'Interior Layout',
      jStage: 'J7',
      lane: 'Parallel Production',
      timingGovernance: 'INTERNAL_SERVICE_LEVEL_TARGET',
      owner: 'JM1 Automation',
      workStatus: 'WORKSTREAM_CONFIGURED',
      qaStatus: 'INTERIOR_QA_PENDING',
      releaseStatus: 'HELD_UNTIL_UNIFIED_PACKAGE',
      currentSignal: 'Independent production workstream.',
      nextAction: 'Generate interior proof and interior QA evidence.',
    },
    {
      stageCode: 'COVER_DESIGN',
      label: 'Cover Design',
      jStage: 'J7',
      lane: 'Parallel Production',
      timingGovernance: 'INTERNAL_SERVICE_LEVEL_TARGET',
      owner: 'JM1 Automation',
      workStatus: 'WORKSTREAM_CONFIGURED',
      qaStatus: 'COVER_QA_PENDING',
      releaseStatus: 'HELD_UNTIL_UNIFIED_PACKAGE',
      currentSignal: 'Starts at Production Start; full wrap may wait for page count.',
      nextAction: 'Create cover proof, ebook cover, and cover QA evidence.',
    },
    {
      stageCode: 'INTERIOR_QA',
      label: 'Interior QA',
      jStage: 'J7',
      lane: 'Parallel Production',
      timingGovernance: 'INTERNAL_SERVICE_LEVEL_TARGET',
      owner: 'JM1 Automation',
      workStatus: 'AWAITING_INTERIOR_OUTPUT',
      qaStatus: 'RENDER_AND_LAYOUT_QA_REQUIRED',
      releaseStatus: 'HELD_UNTIL_UNIFIED_PACKAGE',
      currentSignal: 'Validates interior proof, page geometry, front matter, back matter, and render evidence.',
      nextAction: 'Pass interior proof into the unified Production Review Package after QA.',
    },
    {
      stageCode: 'COVER_QA',
      label: 'Cover QA',
      jStage: 'J7',
      lane: 'Parallel Production',
      timingGovernance: 'INTERNAL_SERVICE_LEVEL_TARGET',
      owner: 'JM1 Automation',
      workStatus: 'AWAITING_COVER_OUTPUT',
      qaStatus: 'WRAP_AND_METADATA_QA_REQUIRED',
      releaseStatus: 'HELD_UNTIL_UNIFIED_PACKAGE',
      currentSignal: 'Validates front cover, full wrap, spine calculation, barcode safe area, and print readiness.',
      nextAction: 'Pass cover proof into the unified Production Review Package after QA.',
    },
    {
      stageCode: 'PRODUCTION_REVIEW_PACKAGE',
      label: 'Production Review Package',
      jStage: 'J7',
      lane: 'Author Review',
      timingGovernance: 'TIME_BASED_AUTHOR_RELEASE_CADENCE',
      owner: 'JM1 Automation',
      workStatus: 'WAITING_FOR_INTERIOR_AND_COVER_QA',
      qaStatus: 'PACKAGE_QA_REQUIRED',
      releaseStatus: 'AUTHOR_RELEASE_CADENCE',
      currentSignal: 'Unified author-facing package.',
      nextAction: 'Deliver one package containing interior proof, cover proof, notes, and review instructions.',
    },
    {
      stageCode: 'AUTHOR_PRODUCTION_REVIEW',
      label: 'Author Production Review',
      jStage: 'J7',
      lane: 'Author Review',
      timingGovernance: 'AUTHOR_RESPONSE_CLOCK',
      owner: 'Publisher',
      workStatus: 'AWAITING_AUTHOR_RESPONSE',
      qaStatus: 'NOT_APPLICABLE',
      releaseStatus: 'DELIVERED_TO_AUTHOR',
      currentSignal: 'Author reviews the single production package instead of separate interior and cover emails.',
      nextAction: 'Persist author decision and route approved artifacts into Production Assembly.',
    },
    {
      stageCode: 'PRODUCTION_ASSEMBLY',
      label: 'Production Assembly',
      jStage: 'J7',
      lane: 'Production Assembly',
      timingGovernance: 'INTERNAL_SERVICE_LEVEL_TARGET',
      owner: 'JM1 Automation',
      workStatus: 'FAIL_CLOSED_ARTIFACT_VALIDATION',
      qaStatus: 'REQUIRED_ARTIFACT_QA',
      releaseStatus: 'NO_DOWNSTREAM_WHILE_BLOCKED',
      currentSignal: 'Fails closed if required artifacts are missing.',
      nextAction: 'Validate approved interior, cover, print PDF, EPUB, metadata, accessibility, ISBN, pricing, and payloads.',
    },
    {
      stageCode: 'EPUB_GENERATION',
      label: 'EPUB Generation',
      jStage: 'J7',
      lane: 'Production Assembly',
      timingGovernance: 'INTERNAL_SERVICE_LEVEL_TARGET',
      owner: 'JM1 Automation',
      workStatus: 'READY_AFTER_AUTHOR_PRODUCTION_APPROVAL',
      qaStatus: 'EPUB_QA_REQUIRED',
      releaseStatus: 'BLOCKS_DISTRIBUTION_READINESS',
      currentSignal: 'Required before distribution readiness.',
      nextAction: 'Generate validated EPUB with navigation, metadata, accessibility tagging, and QA evidence.',
    },
    {
      stageCode: 'ACCESSIBILITY_QA',
      label: 'Accessibility QA',
      jStage: 'J7',
      lane: 'Production Assembly',
      timingGovernance: 'INTERNAL_SERVICE_LEVEL_TARGET',
      owner: 'JM1 Automation',
      workStatus: 'READY_AFTER_EPUB_GENERATION',
      qaStatus: 'ACCESSIBILITY_QA_REQUIRED',
      releaseStatus: 'BLOCKS_DISTRIBUTION_READINESS',
      currentSignal: 'Validates EPUB tagging, navigation, and accessibility assets before distributor readiness.',
      nextAction: 'Record accessibility evidence or exact remediation blocker.',
    },
    {
      stageCode: 'METADATA_VALIDATION',
      label: 'Metadata Validation',
      jStage: 'J7',
      lane: 'Production Assembly',
      timingGovernance: 'INTERNAL_SERVICE_LEVEL_TARGET',
      owner: 'JM1 Automation',
      workStatus: 'READY_AFTER_EPUB_GENERATION',
      qaStatus: 'METADATA_QA_REQUIRED',
      releaseStatus: 'BLOCKS_DISTRIBUTION_READINESS',
      currentSignal: 'Validates title metadata, BISAC/BIC, keywords, ISBN relationships, price, territories, and payload fields.',
      nextAction: 'Record metadata validation evidence or exact missing-field blocker.',
    },
    {
      stageCode: 'DISTRIBUTION_READINESS',
      label: 'Distribution Readiness',
      jStage: 'J7',
      lane: 'Distribution Preparation',
      timingGovernance: 'INTERNAL_SERVICE_LEVEL_TARGET',
      owner: 'JM1 Automation',
      workStatus: 'WAITING_FOR_ASSEMBLY_EPUB_ACCESSIBILITY_METADATA',
      qaStatus: 'FORMAT_READINESS_QA',
      releaseStatus: 'NO_LIVE_DISTRIBUTION',
      currentSignal: 'No live distributor submission.',
      nextAction: 'Validate formats, metadata, identifiers, accessibility, and distributor payloads.',
    },
    {
      stageCode: 'MOCK_DISTRIBUTION',
      label: 'Mock Distribution',
      jStage: 'J7',
      lane: 'Distribution Preparation',
      timingGovernance: 'EXTERNAL_DEPENDENCY_WINDOW',
      owner: 'JM1 Automation',
      workStatus: 'VALIDATION_ONLY',
      qaStatus: 'DISTRIBUTOR_VALIDATION_REQUIRED',
      releaseStatus: 'MUST_NOT_PUBLISH',
      currentSignal: 'Commissioning gate only.',
      nextAction: 'Validate distributor payload behavior without publishing, listing, royalties, or financial postings.',
    },
    {
      stageCode: 'PUBLISHER_VALIDATION',
      label: 'Publisher Validation',
      jStage: 'J7',
      lane: 'Distribution Preparation',
      timingGovernance: 'PUBLISHER_DECISION_HOLD',
      owner: 'Publisher',
      workStatus: 'WAITING_FOR_PUBLISHER_VALIDATION',
      qaStatus: 'FINAL_CHECKLIST_REQUIRED',
      releaseStatus: 'BLOCKS_LIVE_DISTRIBUTION',
      currentSignal: 'Publisher confirms readiness before live distribution.',
      nextAction: 'Record publication-readiness decision.',
    },
    {
      stageCode: 'LIVE_DISTRIBUTION',
      label: 'Live Distribution',
      jStage: 'J8',
      lane: 'Distribution',
      timingGovernance: 'EXTERNAL_DEPENDENCY_WINDOW',
      owner: 'External',
      workStatus: 'WAITING_FOR_LIVE_DISTRIBUTION_APPROVAL',
      qaStatus: 'DISTRIBUTOR_ACCEPTANCE_MONITORING',
      releaseStatus: 'LIVE_SUBMISSION_ONLY_AFTER_APPROVAL',
      currentSignal: 'Allowed only after Publisher Validation.',
      nextAction: 'Submit live distributor payloads and monitor acceptance.',
    },
    {
      stageCode: 'POST_RELEASE_VERIFICATION',
      label: 'Post-Release Verification',
      jStage: 'J8',
      lane: 'Post-Release',
      timingGovernance: 'INTERNAL_SERVICE_LEVEL_TARGET',
      owner: 'JM1 Automation',
      workStatus: 'WAITING_FOR_DISTRIBUTOR_RESPONSE',
      qaStatus: 'PUBLIC_STATE_RECONCILIATION',
      releaseStatus: 'POST_RELEASE_MONITORING',
      currentSignal: 'Verifies published-state truth.',
      nextAction: 'Confirm listings, metadata, availability, and operational evidence.',
    },
  ]
}

export async function recordPublisherAction(operatorEmail: string, action: PublisherActionRequest) {
  const correlationId = randomUUID()
  const config = getDataverseServerConfig()
  const now = new Date().toISOString()
  const eventType = mapPublisherActionEvent(action.action)

  if (!config) {
    return {
      ok: true,
      status: 'accepted-without-core-write',
      correlationId,
      eventType,
      message: 'Publisher action accepted locally; Dataverse configuration is unavailable in this runtime.',
    }
  }

  const record = await dataverseCreate(config, 'jm1_executionlogs', {
    jm1_name: `${eventType} — ${action.title || action.author || 'Publisher action'}`,
    jm1_actiontype: eventType,
    jm1_actiondescription: [
      `Publisher action requested by ${operatorEmail}.`,
      `Action: ${action.action}.`,
      action.title ? `Title: ${action.title}.` : '',
      action.author ? `Author: ${action.author}.` : '',
      action.requestedState ? `Requested state: ${action.requestedState}.` : '',
      action.reason ? `Reason: ${action.reason}.` : '',
      `Correlation ID: ${correlationId}.`,
      'This initial operating-center action records the governed request and does not fabricate prior-stage history.',
    ]
      .filter(Boolean)
      .join(' '),
    jm1_agentname: 'Publisher Operating Center',
    jm1_agentmodel: 'JM1 governed web runtime',
    jm1_bandlevel: 835500000,
    jm1_executionstatus: 835500001,
    jm1_startedon: now,
    jm1_completedon: now,
    jm1_sourceentity: 'publisher_operating_center',
    jm1_sourcerecordid: correlationId,
  })

  return {
    ok: true,
    status: 'logged',
    correlationId,
    eventType,
    executionLogId: typeof record?.jm1_executionlogid === 'string' ? record.jm1_executionlogid : '',
  }
}

function buildPipelineItems(): PublisherQueueItem[] {
  return [
    {
      id: 'intentional-leader-copyediting',
      title: 'The Intentional Leader, Volume I',
      author: 'Jackie Smith, Jr.',
      section: 'production',
      state: 'Copyediting — Author Review',
      owner: 'Author',
      nextAction: 'Await copyediting author response before CAP-004 Proofreading',
      ageDays: 0,
      blocker: 'Author response gate',
      actionHref: '#production',
      priority: 'P0',
    },
    {
      id: 'before-you-were-born-dev',
      title: 'Before You Were Born',
      author: 'Author relationship pending current Core readback',
      section: 'pipeline',
      state: 'Developmental Editing — In Progress',
      owner: 'Publisher',
      nextAction: 'Continue CAP-001 developmental execution',
      ageDays: 1,
      actionHref: '#pipeline',
      priority: 'P1',
    },
    {
      id: 'generals-will-dev',
      title: "The General's Will and Last Testament",
      author: 'Author relationship pending current Core readback',
      section: 'pipeline',
      state: 'Developmental Editing — In Progress',
      owner: 'Publisher',
      nextAction: 'Continue CAP-001 developmental execution',
      ageDays: 1,
      actionHref: '#pipeline',
      priority: 'P1',
    },
    {
      id: 'long-watch-editorial',
      title: 'The Long Watch',
      author: 'Author relationship active',
      section: 'pipeline',
      state: 'Editorial Review',
      owner: 'Publisher',
      nextAction: 'Continue editorial review independently',
      ageDays: 2,
      actionHref: '#pipeline',
      priority: 'P1',
    },
    {
      id: 'establishing-glory-library',
      title: 'Establishing Glory: The Library',
      author: 'Jackie Smith, Jr.',
      section: 'exceptions',
      state: 'Compilation reconciliation',
      owner: 'Publisher',
      nextAction: 'Resolve source compilation placement before active production movement',
      ageDays: 2,
      blocker: 'Compilation source reconciliation',
      actionHref: '#exceptions',
      priority: 'P1',
    },
  ]
}

function buildInteriorReadinessQueue(): ProductionReadiness[] {
  return [
    {
      title: 'The Intentional Leader, Volume I',
      author: 'Jackie Smith, Jr.',
      editorialState: 'Copyediting — Author Review',
      interiorState: 'Not Started',
      coverState: 'Not Started',
      readiness: 'BLOCKED — PROOFREADING',
      nextAction: 'Begin CAP-004 Proofreading after copyediting author approval is recorded.',
      sourceFiles: 'Current copyedited manuscript available; final proofread manuscript not yet approved.',
      sharePointParent: '01_Titles/05_Proofreading until proofreading completes; production folder only after approved transition.',
    },
    {
      title: 'Before You Were Born',
      author: 'Author relationship pending current Core readback',
      editorialState: 'Developmental Editing — In Progress',
      interiorState: 'Not Started',
      coverState: 'Creative brief not started',
      readiness: 'NOT YET ELIGIBLE',
      nextAction: 'Complete Developmental, Line Editing, Copyediting, and Proofreading gates.',
      sourceFiles: 'Editorial manuscript in development.',
      sharePointParent: '01_Titles/02_Developmental-Editing',
    },
    {
      title: "The General's Will and Last Testament",
      author: 'Author relationship pending current Core readback',
      editorialState: 'Developmental Editing — In Progress',
      interiorState: 'Not Started',
      coverState: 'Creative brief not started',
      readiness: 'NOT YET ELIGIBLE',
      nextAction: 'Complete Developmental, Line Editing, Copyediting, and Proofreading gates.',
      sourceFiles: 'Editorial manuscript in development.',
      sharePointParent: '01_Titles/02_Developmental-Editing',
    },
  ]
}

function buildCoverReadinessQueue(): CoverReadiness[] {
  return [
    {
      title: 'The Intentional Leader, Volume I',
      author: 'Jackie Smith, Jr.',
      coverState: 'Ready for Creative Brief',
      readiness: 'READY FOR CREATIVE BRIEF',
      nextAction: 'Create controlled cover creative brief while full wrap waits for final page count.',
      rightsEvidence: 'Use licensed or publisher-owned assets only; generative/source provenance required.',
    },
    {
      title: 'Before You Were Born',
      author: 'Author relationship pending current Core readback',
      coverState: 'Blocked',
      readiness: 'BLOCKED — COPY',
      nextAction: 'Wait for stable title metadata, description, and creative direction.',
      rightsEvidence: 'No cover imagery rights package confirmed.',
    },
    {
      title: "The General's Will and Last Testament",
      author: 'Author relationship pending current Core readback',
      coverState: 'Blocked',
      readiness: 'BLOCKED — COPY',
      nextAction: 'Wait for stable title metadata, description, and creative direction.',
      rightsEvidence: 'No cover imagery rights package confirmed.',
    },
  ]
}

function groupTodayItems(items: PublisherQueueItem[]) {
  const empty = {
    'Waiting for Jackie': [] as PublisherQueueItem[],
    'Waiting for Authors': [] as PublisherQueueItem[],
    'Active Editorial': [] as PublisherQueueItem[],
    Proofreading: [] as PublisherQueueItem[],
    'Interior Layout': [] as PublisherQueueItem[],
    'Cover Design': [] as PublisherQueueItem[],
    'Production Review': [] as PublisherQueueItem[],
    'Distribution and Catalog': [] as PublisherQueueItem[],
    'Royalty Statements Awaiting Review': [] as PublisherQueueItem[],
    'Payment Decisions': [] as PublisherQueueItem[],
    'Author Invitation Readiness': [] as PublisherQueueItem[],
    'Alerts and Failed Transitions': [] as PublisherQueueItem[],
    'Recently Moved Assets': [] as PublisherQueueItem[],
  }

  items.forEach((item) => {
    if (item.owner === 'Author') empty['Waiting for Authors'].push(item)
    if (item.state.includes('Developmental') || item.state.includes('Editorial')) empty['Active Editorial'].push(item)
    if (item.state.includes('Copyediting')) empty.Proofreading.push(item)
    if (item.section === 'exceptions') empty['Alerts and Failed Transitions'].push(item)
  })

  empty['Royalty Statements Awaiting Review'].push({
    id: 'royalty-2026-decision-package',
    title: '2026 Royalty Decision Package',
    author: 'Multiple authors',
    section: 'royalties',
    state: 'Draft Statements — Internal Review',
    owner: 'Jackie',
    nextAction: 'Review consolidated identity, title, and payment decisions',
    ageDays: 0,
    actionHref: '#royalties',
    priority: 'P0',
  })
  empty['Payment Decisions'].push({
    id: 'royalty-payment-allocation',
    title: '2026 Payment Evidence',
    author: 'Multiple authors',
    section: 'royalties',
    state: 'Payment Allocation Required',
    owner: 'Jackie',
    nextAction: 'Allocate or classify 53 payment-evidence rows',
    ageDays: 0,
    actionHref: '#royalties',
    priority: 'P0',
  })
  empty['Cover Design'].push({
    id: 'intentional-leader-cover-brief',
    title: 'The Intentional Leader, Volume I',
    author: 'Jackie Smith, Jr.',
    section: 'production',
    state: 'Cover Design — Ready for Creative Brief',
    owner: 'Publisher',
    nextAction: 'Create cover creative brief; full wrap waits for page count',
    ageDays: 0,
    actionHref: '#production',
    priority: 'P1',
  })

  return empty
}

function buildActionContracts(): PublisherActionContract[] {
  return [
    {
      key: 'place-asset-in-pipeline',
      label: 'Place Asset in Pipeline',
      entryCriteria: ['Publisher identity verified', 'Canonical title selected', 'Canonical asset selected', 'Placement reason provided'],
      affectedRecords: ['Title', 'Publishing Asset', 'Editorial/production stage', 'SharePoint folder reference', 'Execution log'],
      eventType: 'PUBLISHER_PIPELINE_STAGE_PLACEMENT',
      authorFacingConsequence: 'Author Workspace preview refreshes only if author visibility is enabled.',
      rollback: 'Write corrective placement event; do not erase prior event history.',
    },
    {
      key: 'advance-stage',
      label: 'Advance to Next Stage',
      entryCriteria: ['Current stage exit criteria complete', 'Required gates closed', 'No active blocker unless override reason supplied'],
      affectedRecords: ['Current stage', 'Next stage', 'Gate', 'SharePoint location', 'Execution log'],
      eventType: 'PUBLISHER_STAGE_ADVANCEMENT_REQUESTED',
      authorFacingConsequence: 'Author state updates only after Core stage readback succeeds.',
      rollback: 'Place on hold or write corrective transition event with restart action.',
    },
    {
      key: 'begin-interior-layout',
      label: 'Begin Interior Layout',
      entryCriteria: ['Final editorial manuscript approved', 'Proofreading complete or approved exception', 'Trim and format inputs available'],
      affectedRecords: ['Interior Layout stage', 'Production intake package', 'SharePoint production folder', 'Execution log'],
      eventType: 'INTERIOR_LAYOUT_STARTED',
      authorFacingConsequence: 'No author task appears until an internal QA-approved proof is released.',
      rollback: 'Return to production hold with blocker and restart action.',
    },
    {
      key: 'begin-cover-design',
      label: 'Begin Cover Design',
      entryCriteria: ['Title metadata stable', 'Creative direction available', 'Rights constraints documented'],
      affectedRecords: ['Cover Design stage', 'Creative brief', 'Rights/source evidence', 'Execution log'],
      eventType: 'COVER_CREATIVE_BRIEF_STARTED',
      authorFacingConsequence: 'No author review appears until publisher-approved concepts are released.',
      rollback: 'Return to cover brief hold with reason.',
    },
  ]
}

function readRoyaltySummary(): RoyaltyDecisionSummary {
  const base = process.cwd()
  const manifestPath = join(base, 'docs/operations/generated/2026-07-17-JM1-2026-Royalty-Manifest-Final-Status.csv')
  const paymentPath = join(base, 'docs/operations/generated/2026-07-17-JM1-2026-Royalty-Payment-Final-Classification.csv')
  const statementPath = join(base, 'docs/operations/generated/2026-07-17-JM1-2026-Royalty-Draft-Statement-Set.csv')
  const decisionPackagePath = 'docs/operations/generated/2026-07-17-JM1-2026-Royalty-Jackie-Decision-Package.csv'

  const manifestRows = readCsvRows(manifestPath)
  const paymentRows = readCsvRows(paymentPath)
  const statementRows = readCsvRows(statementPath)

  return {
    manifestRows: manifestRows.length,
    loadedRows: manifestRows.filter((row) => row.finalStatus === 'LOADED — DRAFT STATEMENT').length,
    identityHolds: manifestRows.filter((row) => row.finalStatus === 'HELD — JACKIE IDENTITY DECISION').length,
    titleHolds: manifestRows.filter((row) => row.finalStatus === 'HELD — JACKIE TITLE DECISION').length,
    paymentRows: paymentRows.length,
    paymentAllocationUnknown: paymentRows.filter((row) =>
      row.finalPaymentStatus?.includes('ALLOCATION UNKNOWN'),
    ).length,
    unresolvedPayments: paymentRows.filter((row) => row.finalPaymentStatus === 'UNRESOLVED — JACKIE DECISION').length,
    draftStatements: statementRows.length,
    decisionPackagePath,
  }
}

function readCsvRows(path: string) {
  try {
    const [headerLine, ...lines] = readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean)
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

function getPublisherAllowlist() {
  const configured = process.env.PUBLISHER_OPERATING_CENTER_ALLOWED_EMAILS || ''
  return Array.from(new Set(['jm1-admin@jmerrill.one', ...configured.split(',')].map((email) => email.trim().toLowerCase()).filter(Boolean)))
}

function parseClientPrincipal(raw: string | null) {
  if (!raw) return null
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8')
    const parsed = JSON.parse(decoded) as { userDetails?: string }
    return parsed
  } catch {
    return null
  }
}

function mapPublisherActionEvent(action: string) {
  const known: Record<string, string> = {
    'place-asset-in-pipeline': 'PUBLISHER_PIPELINE_STAGE_PLACEMENT',
    'advance-stage': 'PUBLISHER_STAGE_ADVANCEMENT_REQUESTED',
    'begin-interior-layout': 'INTERIOR_LAYOUT_STARTED',
    'begin-cover-design': 'COVER_CREATIVE_BRIEF_STARTED',
    'review-royalty-statement': 'ROYALTY_DRAFT_STATEMENT_REVIEW_REQUESTED',
  }
  return known[action] || 'PUBLISHER_OPERATING_CENTER_ACTION_RECORDED'
}
