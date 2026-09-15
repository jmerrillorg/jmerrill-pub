import type { PublisherTitleOperatingCard } from '@/lib/server/publisher-operating-center'

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
  summary: {
    totalTitles: number
    placedTitles: number
    reconciliationRequired: number
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
  const placed = projected.filter((item): item is HumanPipelineCard => item.confidence !== 'RECONCILIATION_REQUIRED')
  const reconciliationRequired = projected.filter(
    (item): item is HumanPipelineReconciliationCard => item.confidence === 'RECONCILIATION_REQUIRED',
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
    summary: {
      totalTitles: liveCards.length,
      placedTitles: placed.length,
      reconciliationRequired: reconciliationRequired.length,
      needsJackie: placed.filter((card) => card.waitingOn === 'Jackie').length,
      waitingOnAuthor: placed.filter((card) => card.waitingOn === 'Author').length,
      waitingOnSystem: placed.filter((card) => card.waitingOn === 'System').length,
      blocked: placed.filter((card) => card.attention === 'Blocked').length,
      exceptions: placed.filter((card) => card.attention === 'Exception').length + reconciliationRequired.length,
    },
  }
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
