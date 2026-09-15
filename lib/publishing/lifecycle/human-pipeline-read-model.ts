import type { PublisherTitleOperatingCard } from '@/lib/server/publisher-operating-center'
import {
  NONCURRENT_HISTORICAL_REFERENCES,
  isKnownNoncurrentHistoricalReferenceId,
  type NoncurrentHistoricalReference,
} from './noncurrent-historical-reference-registry'

export type HumanPipelineStageId =
  | '01_INQUIRY'
  | '02_INTAKE'
  | '03_EDITORIAL_REVIEW'
  | '04_AUTHOR_DECISION'
  | '05_AGREEMENT_PAYMENT'
  | '06_ONBOARDING'
  | '07_DEVELOPMENTAL_EDITING'
  | '08_LINE_EDITING'
  | '09_COPYEDITING'
  | '10_PROOFREADING'
  | '11_INTERIOR_LAYOUT'
  | '12_COVER_DESIGN'
  | '13_PRODUCTION'
  | '14_DISTRIBUTION'
  | '15_PUBLICATION'
  | '16_POST_PUBLICATION'

export type HumanPipelineWaitingOn = 'Jackie' | 'Author' | 'System' | 'External' | 'Not Waiting'

export type HumanPipelineAttention = 'On Track' | 'Attention' | 'Blocked' | 'Exception'

export type HumanPipelineStage = {
  id: HumanPipelineStageId
  number: string
  label: string
  shortLabel: string
  description: string
}

export type HumanPipelineCard = {
  key: string
  title: string
  author: string
  imprint: string
  package: string
  conciseStatus: string
  waitingOn: HumanPipelineWaitingOn
  attention: HumanPipelineAttention
  stageId: HumanPipelineStageId
  stageLabel: string
  substage: string
  reason: string
  nextAction: string
  blocker: string
  targetDate: string
  recentMovement: string
  operatingCenterUrl: string
  confidence: 'HIGH' | 'MEDIUM'
}

export type HumanPipelineReconciliationCard = Omit<HumanPipelineCard, 'stageId' | 'stageLabel' | 'confidence'> & {
  attemptedStage: string
  ambiguityReason: string
  evidenceAuthority: string
  resolutionClass: string
  proposedRepair: string
  missingEvidence: string
  safeToAutomate: string
  confidence: 'RECONCILIATION_REQUIRED'
}

export type HumanPipelineView = {
  generatedAt: string
  authoritySource: string
  route: '/publisher/pipeline'
  operatingCenterRoute: '/publisher/operating-center'
  stages: HumanPipelineStage[]
  cards: HumanPipelineCard[]
  reconciliationRequired: HumanPipelineReconciliationCard[]
  suppressedHistoricalReferences: NoncurrentHistoricalReference[]
  summary: {
    totalTitles: number
    placedTitles: number
    reconciliationRequired: number
    suppressedHistoricalReferences: number
    needsJackie: number
    waitingOnAuthor: number
    waitingOnSystem: number
    blocked: number
    exceptions: number
  }
}

export const HUMAN_PUBLISHING_PIPELINE_STAGES: HumanPipelineStage[] = [
  stage('01_INQUIRY', '01', 'Inquiry', 'Inquiry', 'Prospect signal has been received.'),
  stage('02_INTAKE', '02', 'Intake', 'Intake', 'Submission facts and source evidence are being normalized.'),
  stage('03_EDITORIAL_REVIEW', '03', 'Editorial Review', 'Review', 'Publisher review and pre-contract editorial recommendation work.'),
  stage('04_AUTHOR_DECISION', '04', 'Author Decision', 'Decision', 'Author decides whether to continue from the recommendation/package offer.'),
  stage('05_AGREEMENT_PAYMENT', '05', 'Agreement & Payment', 'Agreement', 'Agreement execution and required commercial activation.'),
  stage('06_ONBOARDING', '06', 'Onboarding', 'Onboarding', 'Author access, workspace, and joined-family setup.'),
  stage('07_DEVELOPMENTAL_EDITING', '07', 'Developmental Editing', 'Developmental', 'Developmental editing work and author review.'),
  stage('08_LINE_EDITING', '08', 'Line Editing', 'Line', 'Line editing work and author review.'),
  stage('09_COPYEDITING', '09', 'Copyediting', 'Copyediting', 'Copyediting work and author review.'),
  stage('10_PROOFREADING', '10', 'Proofreading', 'Proofreading', 'Proof review and final text approval.'),
  stage('11_INTERIOR_LAYOUT', '11', 'Interior Layout', 'Layout', 'Interior formatting, layout, and page-count work.'),
  stage('12_COVER_DESIGN', '12', 'Cover Design', 'Cover', 'Cover concept, cover production, and wrap-readiness work.'),
  stage('13_PRODUCTION', '13', 'Production', 'Production', 'Final book-production assembly and certification.'),
  stage('14_DISTRIBUTION', '14', 'Distribution', 'Distribution', 'Distributor submission and channel-readiness work.'),
  stage('15_PUBLICATION', '15', 'Publication', 'Publication', 'Launch release and publication activation.'),
  stage('16_POST_PUBLICATION', '16', 'Post-Publication', 'Post-Pub', 'Published-title stewardship, catalog, royalties, and ongoing operations.'),
]

export function buildHumanPublishingPipelineView(
  cards: PublisherTitleOperatingCard[],
  generatedAt: string,
): HumanPipelineView {
  const liveCards = cards.filter((card) => card.liveClassification === 'LIVE')
  const projected = liveCards.map(projectHumanPipelineCard)
  const currentProjected = projected.filter((item) => !isSuppressedHistoricalReference(item))
  const placed = currentProjected.filter((item): item is HumanPipelineCard => item.confidence !== 'RECONCILIATION_REQUIRED')
  const reconciliationRequired = currentProjected.filter(
    (item): item is HumanPipelineReconciliationCard => item.confidence === 'RECONCILIATION_REQUIRED',
  )
  const suppressedHistoricalReferences = NONCURRENT_HISTORICAL_REFERENCES.filter((reference) =>
    projected.some((item) => item.key === reference.WorkId),
  )

  return {
    generatedAt,
    authoritySource:
      'Derived from buildPublisherOperatingCenterSnapshot().titleOperatingView.cards and the governed Publisher Operating Center lifecycle read model.',
    route: '/publisher/pipeline',
    operatingCenterRoute: '/publisher/operating-center',
    stages: HUMAN_PUBLISHING_PIPELINE_STAGES,
    cards: placed,
    reconciliationRequired,
    suppressedHistoricalReferences,
    summary: {
      totalTitles: liveCards.length,
      placedTitles: placed.length,
      reconciliationRequired: reconciliationRequired.length,
      suppressedHistoricalReferences: suppressedHistoricalReferences.length,
      needsJackie: placed.filter((card) => card.waitingOn === 'Jackie').length,
      waitingOnAuthor: placed.filter((card) => card.waitingOn === 'Author').length,
      waitingOnSystem: placed.filter((card) => card.waitingOn === 'System').length,
      blocked: placed.filter((card) => card.attention === 'Blocked').length,
      exceptions: placed.filter((card) => card.attention === 'Exception').length + reconciliationRequired.length,
    },
  }
}

export function isSuppressedHistoricalReference(
  card: HumanPipelineCard | HumanPipelineReconciliationCard,
) {
  return (
    isKnownNoncurrentHistoricalReferenceId(card.key) &&
    card.confidence === 'RECONCILIATION_REQUIRED' &&
    'resolutionClass' in card &&
    card.resolutionClass === 'TRUE_DATA_DEFECT' &&
    card.ambiguityReason === 'DUPLICATE_HISTORICAL_RECORD_REFERENCE' &&
    card.safeToAutomate === 'YES_READ_MODEL_SUPPRESSION_ONLY'
  )
}

function stage(
  id: HumanPipelineStageId,
  number: string,
  label: string,
  shortLabel: string,
  description: string,
): HumanPipelineStage {
  return { id, number, label: `${number} - ${label}`, shortLabel, description }
}

function projectHumanPipelineCard(
  card: PublisherTitleOperatingCard,
): HumanPipelineCard | HumanPipelineReconciliationCard {
  const stageId = humanStageIdForOperatingCard(card)
  const base = {
    key: card.key,
    title: card.title,
    author: card.author,
    imprint: firstUseful([
      card.canonicalLifecycle.confirmedImprint,
      card.canonicalLifecycle.recommendedImprint,
      card.canonicalLifecycle.workingImprint,
    ], 'Imprint pending'),
    package: firstUseful([
      card.canonicalLifecycle.packageAccepted,
      card.canonicalLifecycle.packageRecommendation,
      card.currentArtifact.reviewState,
    ], 'Package pending'),
    conciseStatus: conciseStatusFor(card),
    waitingOn: waitingOnForCard(card),
    attention: attentionForCard(card),
    substage: readable(card.canonicalLifecycle.titleLifecycleSubstage.label),
    reason: readable(card.canonicalLifecycle.waitingTruth.waitingReason || card.canonicalLifecycle.nextGovernedAction.reason),
    nextAction: readable(card.nextAction || card.canonicalLifecycle.nextGovernedAction.action),
    blocker: readable(card.blocker),
    targetDate: readable(card.targetDate),
    recentMovement: readable(card.latestMovement),
    operatingCenterUrl: operatingCenterUrlForCard(card),
  }

  if (!stageId) {
    return {
      ...base,
      attemptedStage: readable(card.canonicalLifecycle.titleLifecycleStage.label),
      ambiguityReason: ambiguityReasonFor(card),
      evidenceAuthority: evidenceAuthorityFor(card),
      resolutionClass: resolutionClassFor(card),
      proposedRepair: proposedRepairFor(card),
      missingEvidence: missingEvidenceFor(card),
      safeToAutomate: safeToAutomateFor(card),
      confidence: 'RECONCILIATION_REQUIRED',
    }
  }

  const stage = HUMAN_PUBLISHING_PIPELINE_STAGES.find((item) => item.id === stageId)
  return {
    ...base,
    stageId,
    stageLabel: stage?.label || stageId,
    confidence: card.canonicalLifecycle.canonicalMappingStatus === 'CANONICAL_MAPPING_EXACT' ? 'HIGH' : 'MEDIUM',
  }
}

function humanStageIdForOperatingCard(card: PublisherTitleOperatingCard): HumanPipelineStageId | null {
  const lifecycle = card.canonicalLifecycle
  const stageCode = lifecycle.titleLifecycleStage.code
  const substageCode = lifecycle.titleLifecycleSubstage.code

  if (
    stageCode === 'DATA_GAP' ||
    lifecycle.canonicalMappingStatus === 'CANONICAL_MAPPING_CONFLICT' ||
    lifecycle.canonicalMappingStatus === 'CANONICAL_MAPPING_INCOMPLETE' ||
    lifecycle.canonicalAuthority.requiresReconciliation ||
    lifecycle.stageTruth.trustClassification === 'RECONCILIATION_REQUIRED'
  ) {
    return null
  }

  switch (substageCode) {
    case 'INQUIRY':
      return '01_INQUIRY'
    case 'INTAKE':
      return '02_INTAKE'
    case 'CLASSIFICATION_REVIEW':
    case 'PRE_CONTRACT_EDITORIAL_REVIEW':
    case 'PUBLISHING_RECOMMENDATION':
      return '03_EDITORIAL_REVIEW'
    case 'PACKAGE_ACCEPTANCE':
      return '04_AUTHOR_DECISION'
    case 'COMMERCIAL_ACTIVATION_EVENT':
      return '05_AGREEMENT_PAYMENT'
    case 'JOINED_THE_FAMILY':
    case 'AUTHOR_ONBOARDING_TASKS':
      return '06_ONBOARDING'
    case 'DEVELOPMENTAL_EDITING':
    case 'DEVELOPMENTAL_AUTHOR_REVIEW':
      return '07_DEVELOPMENTAL_EDITING'
    case 'LINE_EDITING':
    case 'LINE_AUTHOR_REVIEW':
      return '08_LINE_EDITING'
    case 'COPYEDITING':
    case 'COPY_AUTHOR_REVIEW':
      return '09_COPYEDITING'
    case 'PROOFREADING':
    case 'FINAL_AUTHOR_APPROVAL':
      return '10_PROOFREADING'
    case 'INTERIOR_LAYOUT':
      return '11_INTERIOR_LAYOUT'
    case 'COVER_CONCEPT':
      return '12_COVER_DESIGN'
    case 'PRODUCTION_FINALIZATION':
      return '13_PRODUCTION'
    case 'METADATA_DRAFT':
    case 'FORMAT_DISTRIBUTION_READINESS':
    case 'DISTRIBUTOR_SUBMISSION':
      return '14_DISTRIBUTION'
    case 'LAUNCH_RELEASE':
      return '15_PUBLICATION'
    case 'POST_PUBLICATION_STEWARDSHIP':
      return '16_POST_PUBLICATION'
    case 'DATA_GAP':
      return null
    default:
      break
  }

  if (stageCode === 'POST_PUBLICATION') return '16_POST_PUBLICATION'
  if (stageCode === 'DISTRIBUTION_RELEASE') return '14_DISTRIBUTION'
  return null
}

function waitingOnForCard(card: PublisherTitleOperatingCard): HumanPipelineWaitingOn {
  if (card.waitingOn === 'Jackie') return 'Jackie'
  if (card.waitingOn === 'Author') return 'Author'
  if (card.waitingOn === 'Automation') return 'System'
  if (card.waitingOn === 'External') return 'External'
  return 'Not Waiting'
}

function attentionForCard(card: PublisherTitleOperatingCard): HumanPipelineAttention {
  if (
    card.canonicalLifecycle.canonicalAuthority.requiresReconciliation ||
    card.canonicalLifecycle.systemAttention.code === 'RECONCILIATION_REQUIRED'
  ) {
    return 'Exception'
  }
  if (card.blocker || card.canonicalLifecycle.systemAttention.severity === 'BLOCKING') return 'Blocked'
  if (card.urgency === 'watch' || card.canonicalLifecycle.systemAttention.severity === 'ATTENTION') return 'Attention'
  return 'On Track'
}

function conciseStatusFor(card: PublisherTitleOperatingCard) {
  if (card.waitingOn === 'Jackie') return 'Needs Jackie'
  if (card.waitingOn === 'Author') return 'Waiting on author'
  if (card.waitingOn === 'Automation') return 'System processing'
  if (card.blocker) return 'Blocked'
  return readable(card.humanStatus || card.canonicalLifecycle.status || 'On track')
}

function operatingCenterUrlForCard(card: PublisherTitleOperatingCard) {
  const params = new URLSearchParams()
  if (card.titleId) params.set('titleId', card.titleId)
  if (card.intakeId) params.set('intakeId', card.intakeId)
  if (card.diagnosticId) params.set('diagnosticId', card.diagnosticId)
  if (!params.size) params.set('recordId', card.key)
  return `/publisher/operating-center?${params.toString()}`
}

function firstUseful(values: Array<string | undefined | null>, fallback: string) {
  return values.map(readable).find((value) => value && value !== 'DATA_GAP' && value !== 'Not applicable') || fallback
}

function readable(value: string | undefined | null) {
  if (!value) return ''
  return value.replaceAll('_', ' ').replace(/\s+/g, ' ').trim()
}

function ambiguityReasonFor(card: PublisherTitleOperatingCard) {
  const lifecycle = card.canonicalLifecycle
  const authority = lifecycle.canonicalAuthority

  if (
    authority.classification === 'DUPLICATE_RECORD' &&
    authority.currentAuthorityRelationship === 'NONCURRENT_REFERENCE_ONLY'
  ) {
    return 'DUPLICATE_HISTORICAL_RECORD_REFERENCE'
  }

  if (lifecycle.canonicalMappingStatus === 'CANONICAL_MAPPING_CONFLICT') return 'CONFLICTING_STAGE_EVIDENCE'
  if (lifecycle.stageTruth.blockingTransition === 'LIFECYCLE_MAPPING') return 'MISSING_CANONICAL_STAGE_EVENT'
  if (lifecycle.stageTruth.artifactAuthorityRequired === 'YES') return 'MISSING_REQUIRED_ARTIFACT'
  if (
    /format|paperback|hardcover|ebook|audio/i.test(
      `${lifecycle.waitingTruth.waitingReason} ${lifecycle.stageTruth.blockingEvidence}`,
    )
  ) {
    return 'FORMAT_LEVEL_VS_WORK_LEVEL_CONFLICT'
  }

  return 'OTHER_EXACT_GOVERNED_REASON'
}

function evidenceAuthorityFor(card: PublisherTitleOperatingCard) {
  const lifecycle = card.canonicalLifecycle
  const references = card.technical.evidenceReferences.filter(Boolean)
  return firstUseful([
    references.join('; '),
    lifecycle.canonicalAuthority.sourceAuthority,
    lifecycle.artifactTruth.authoritySource,
    lifecycle.stageTruth.blockingEvidence,
  ], 'Publisher Operating Center projection input')
}

function resolutionClassFor(card: PublisherTitleOperatingCard) {
  const lifecycle = card.canonicalLifecycle
  const authority = lifecycle.canonicalAuthority
  const text = `${card.title} ${card.author} ${card.blocker} ${lifecycle.waitingTruth.waitingReason} ${lifecycle.waitingTruth.requiredNextAction}`

  if (
    authority.classification === 'DUPLICATE_RECORD' &&
    authority.currentAuthorityRelationship === 'NONCURRENT_REFERENCE_ONLY'
  ) {
    return 'TRUE_DATA_DEFECT'
  }

  if (lifecycle.waitingTruth.broadWaitingOwner === 'External') return 'EXTERNAL_DEPENDENCY'
  if (/decision|payment|identity hold|title hold|approved|Jackie|founder/i.test(text)) {
    return 'HUMAN_BUSINESS_DECISION_REQUIRED'
  }
  if (lifecycle.stageTruth.blockingTransition === 'LIFECYCLE_MAPPING') return 'GOVERNED_EVENT_BACKFILL_REQUIRED'
  return 'DETERMINISTIC_REPAIR'
}

function proposedRepairFor(card: PublisherTitleOperatingCard) {
  const lifecycle = card.canonicalLifecycle
  const authority = lifecycle.canonicalAuthority

  if (
    authority.classification === 'DUPLICATE_RECORD' &&
    authority.currentAuthorityRelationship === 'NONCURRENT_REFERENCE_ONLY'
  ) {
    return 'Suppress or archive noncurrent duplicate reference; do not create a lifecycle event.'
  }

  if (resolutionClassFor(card) === 'HUMAN_BUSINESS_DECISION_REQUIRED') {
    return 'Prepare a compact founder decision packet from the governed evidence.'
  }

  if (resolutionClassFor(card) === 'GOVERNED_EVENT_BACKFILL_REQUIRED') {
    return 'Backfill only if governed historical evidence proves the event, title, sequence, and authority.'
  }

  if (resolutionClassFor(card) === 'EXTERNAL_DEPENDENCY') {
    return 'Wait for the external/provider evidence source before placement.'
  }

  return card.nextAction || lifecycle.nextGovernedAction.action || 'Repair the projection/read-model mapping.'
}

function missingEvidenceFor(card: PublisherTitleOperatingCard) {
  const lifecycle = card.canonicalLifecycle
  const authority = lifecycle.canonicalAuthority

  if (
    authority.classification === 'DUPLICATE_RECORD' &&
    authority.currentAuthorityRelationship === 'NONCURRENT_REFERENCE_ONLY'
  ) {
    return 'None for active lifecycle placement; record is noncurrent.'
  }

  return firstUseful([
    lifecycle.stageTruth.blockingEvidence,
    lifecycle.waitingTruth.exceptionReason,
    lifecycle.artifactTruth.exceptionReason,
  ], 'Governed stage evidence is incomplete.')
}

function safeToAutomateFor(card: PublisherTitleOperatingCard) {
  const lifecycle = card.canonicalLifecycle
  const authority = lifecycle.canonicalAuthority

  if (
    authority.classification === 'DUPLICATE_RECORD' &&
    authority.currentAuthorityRelationship === 'NONCURRENT_REFERENCE_ONLY'
  ) {
    return 'YES_READ_MODEL_SUPPRESSION_ONLY'
  }

  if (resolutionClassFor(card) === 'DETERMINISTIC_REPAIR') return 'YES_PROJECTION_REPAIR_ONLY'
  return 'NO'
}
