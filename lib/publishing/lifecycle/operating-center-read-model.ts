import {
  JMP_PUBLISHING_LIFECYCLE_REGISTRY,
  JMP_PUBLISHING_LIFECYCLE_VERSION,
  type StageCode,
  type SubstageCode,
  type WaitingOwner,
} from './registry'
import { mapLegacyLifecycleValue, type LegacyMappingInput, type LegacyMappingResult } from './legacy-mapping'

export type CanonicalMappingDisposition = LegacyMappingResult['resultCode']

export type CanonicalSystemAttentionSeverity = 'INFO' | 'ATTENTION' | 'BLOCKING'

export type CanonicalSystemAttentionCode =
  | 'NONE'
  | 'AUTHOR_ACK_FAILED'
  | 'WORKSPACE_PROVISIONING_FAILED'
  | 'PAYMENT_EVENT_FAILED'
  | 'PROVIDER_BACKPRESSURE'
  | 'FOUNDRY_PROVIDER_BACKPRESSURE'
  | 'ARTIFACT_MISSING'
  | 'ARTIFACT_AUTHORITY_UNRESOLVED'
  | 'TRANSITION_CONFLICT'
  | 'LIFECYCLE_SPLIT_BRAIN'
  | 'RUNTIME_HOLD'
  | 'DELIVERY_CERTIFICATION_REQUIRED'
  | 'EXTERNAL_STATUS_UNAVAILABLE'
  | 'DATA_GAP'

export type CanonicalReadinessState = 'READY' | 'NOT_READY' | 'BLOCKED' | 'NOT_APPLICABLE' | 'DATA_GAP'

export type CanonicalPublisherProjectionInput = {
  author: string
  bookTitle: string
  titleId?: string
  intakeId?: string
  legacyAuthority?: string
  legacySourceState: string
  pipelineStage?: string
  editorialStage?: string
  substage?: string
  packageState?: string
  qaState?: string
  executionState?: string
  executionMode?: string
  runtime?: string
  awaiting?: string
  owner?: string
  dependency?: string
  exactBlocker?: string
  nextAction?: string
  ageDays?: number
  evidenceLinks?: Array<{ label: string; href: string }>
  activeFormats?: string[]
  portfolioState?: string
}

export type CanonicalPublisherReadModel = {
  lifecycleVersion: typeof JMP_PUBLISHING_LIFECYCLE_VERSION
  author: string
  bookTitle: string
  prospectCommercialState: string
  authorRelationshipState: string
  titleLifecycleStage: {
    code: StageCode | 'DATA_GAP'
    number: string
    label: string
  }
  titleLifecycleSubstage: {
    code: SubstageCode | 'DATA_GAP'
    number: string
    label: string
    applicability: 'APPLICABLE' | 'NOT_APPLICABLE' | 'DATA_GAP'
  }
  legacySourceState: string
  canonicalMappingStatus: CanonicalMappingDisposition
  canonicalMappingReason: string
  status: string
  executionStatus: string
  waitingOn: WaitingOwner
  systemAttention: {
    code: CanonicalSystemAttentionCode
    severity: CanonicalSystemAttentionSeverity
    reason: string
  }
  authorActionRequired: {
    required: boolean
    label: 'YES' | 'NO'
    reason: string
  }
  sourceArtifact: {
    artifactType: string
    artifactId: string
    checksum: string
    version: string
    certificationState: string
    source: string
  }
  workingImprint: string
  recommendedImprint: string
  confirmedImprint: string
  packageRecommendation: string
  packageAccepted: string
  paymentPolicy: string
  paymentPlan: string
  paymentState: string
  joinedTheFamily: {
    value: 'YES' | 'NO' | 'DATA_GAP'
    reason: string
  }
  editorialState: string
  productionState: string
  coverState: string
  metadataState: string
  distributionState: Record<string, CanonicalReadinessState>
  postPublicationState: string
  workspaceState: string
  workspaceEntitlementState: string
  onboardingState: string
  royaltyPayoutReadiness: string
  readiness: {
    editorial: CanonicalReadinessState
    bookProduction: CanonicalReadinessState
    metadata: CanonicalReadinessState
    distribution: CanonicalReadinessState
    royaltyPayout: CanonicalReadinessState
    finalDeliveryPayment: CanonicalReadinessState
  }
  nextGovernedAction: {
    action: string
    confidence: 'CONFIRMED' | 'UNRESOLVED'
    reason: string
  }
  age: string
  dataGaps: Array<{
    field: string
    expectedSource: string
    currentSource: string
    available: boolean
    remediationWave: string
  }>
  sourceAttribution: string[]
}

export function canonicalPublisherLifecycleStages() {
  return JMP_PUBLISHING_LIFECYCLE_REGISTRY.map((stage) => ({
    id: stage.stageCode,
    label: `${String(stage.stageSequence).padStart(2, '0')} - ${stage.stageName}`,
    displayOrder: stage.stageSequence * 10,
    authorInputRequired: stage.contract.authorGateRequired || stage.substages.some((substage) => substage.contract.authorGateRequired),
    entryCondition: stage.contract.entryConditions.join(' '),
    closeCondition: stage.contract.exitConditions.join(' '),
    nextStageId: stage.contract.nextStage || '',
  }))
}

export function canonicalStageIdForPublisherState(value: string): StageCode {
  const mapping = mapLegacyLifecycleValue(legacyMappingInputForState(value, { titleId: 'context-present' }))
  if (mapping.canonicalStage) return mapping.canonicalStage
  const normalized = normalize(value)
  if (normalized.includes('PUBLISHED') || normalized.includes('ROYALT')) return 'POST_PUBLICATION'
  if (normalized.includes('DISTRIBUTION') || normalized.includes('CATALOG')) return 'DISTRIBUTION_RELEASE'
  if (normalized.includes('PRODUCTION')) return 'BOOK_PRODUCTION'
  if (normalized.includes('COVER') || normalized.includes('METADATA')) return 'DISTRIBUTION_READINESS'
  if (normalized.includes('INTAKE')) return 'INQUIRY_INTAKE'
  if (normalized.includes('RECOMMENDATION')) return 'EDITORIAL_REVIEW_RECOMMENDATION'
  return 'CLASSIFICATION'
}

export function projectCanonicalPublisherLifecycle(input: CanonicalPublisherProjectionInput): CanonicalPublisherReadModel {
  const mappingInput = legacyMappingInputForState(input.legacySourceState, input)
  const mapping = mapLegacyLifecycleValue(mappingInput)
  const stage = mapping.canonicalStage
    ? JMP_PUBLISHING_LIFECYCLE_REGISTRY.find((candidate) => candidate.stageCode === mapping.canonicalStage)
    : null
  const substage = mapping.canonicalSubstage
    ? stage?.substages.find((candidate) => candidate.substageCode === mapping.canonicalSubstage) ||
      JMP_PUBLISHING_LIFECYCLE_REGISTRY.flatMap((candidate) => candidate.substages).find(
        (candidate) => candidate.substageCode === mapping.canonicalSubstage,
      )
    : null
  const splitBrain = detectSplitBrain(input)
  const artifact = sourceArtifactFor(input, mapping)
  const waitingOn = canonicalWaitingOwner(input)
  const systemAttention = systemAttentionFor(input, mapping, splitBrain, artifact.artifactType === 'DATA_GAP')
  const authorActionRequired = authorActionFor(input, waitingOn, mapping)
  const dataGaps = dataGapsFor(input)
  const nextGovernedAction =
    mapping.resultCode === 'CANONICAL_MAPPING_CONFLICT' || mapping.resultCode === 'CANONICAL_MAPPING_INCOMPLETE'
      ? {
          action: 'Resolve lifecycle mapping conflict',
          confidence: 'UNRESOLVED' as const,
          reason: mapping.notes,
        }
      : {
          action: input.nextAction || nextActionFor(stage?.stageCode, substage?.substageCode, waitingOn),
          confidence: 'CONFIRMED' as const,
          reason: 'Derived from canonical lifecycle projection and current Operating Center evidence.',
        }

  return {
    lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
    author: input.author || 'DATA_GAP',
    bookTitle: input.bookTitle || 'DATA_GAP',
    prospectCommercialState: commercialStateFor(input),
    authorRelationshipState: relationshipStateFor(input),
    titleLifecycleStage: {
      code: stage?.stageCode || 'DATA_GAP',
      number: stage ? String(stage.stageSequence).padStart(2, '0') : 'DATA_GAP',
      label: stage ? stage.stageName : 'DATA_GAP',
    },
    titleLifecycleSubstage: {
      code: substage?.substageCode || 'DATA_GAP',
      number: stage && substage ? `${String(stage.stageSequence).padStart(2, '0')}${letterFor(substage.substageSequence)}` : 'DATA_GAP',
      label: substage?.substageName || 'DATA_GAP',
      applicability: substage?.substageCode === 'DEVELOPMENTAL_EDITING' && /starter/i.test(input.packageState || '')
        ? 'NOT_APPLICABLE'
        : substage
          ? 'APPLICABLE'
          : 'DATA_GAP',
    },
    legacySourceState: input.legacySourceState,
    canonicalMappingStatus: mapping.resultCode,
    canonicalMappingReason: mapping.notes,
    status: input.portfolioState || input.pipelineStage || input.editorialStage || 'DATA_GAP',
    executionStatus: executionStatusFor(input),
    waitingOn,
    systemAttention,
    authorActionRequired,
    sourceArtifact: artifact,
    workingImprint: 'DATA_GAP',
    recommendedImprint: 'DATA_GAP',
    confirmedImprint: 'DATA_GAP',
    packageRecommendation: packageRecommendationFor(input),
    packageAccepted: packageAcceptedFor(input),
    paymentPolicy: paymentPolicyFor(input),
    paymentPlan: paymentPlanFor(input),
    paymentState: paymentStateFor(input),
    joinedTheFamily: joinedFamilyFor(input),
    editorialState: input.editorialStage || 'DATA_GAP',
    productionState: productionStateFor(input),
    coverState: coverStateFor(input),
    metadataState: metadataStateFor(input),
    distributionState: distributionStateFor(input),
    postPublicationState: postPublicationStateFor(input),
    workspaceState: 'DATA_GAP',
    workspaceEntitlementState: 'DATA_GAP',
    onboardingState: 'DATA_GAP',
    royaltyPayoutReadiness: royaltyReadinessFor(input),
    readiness: readinessFor(input, mapping),
    nextGovernedAction,
    age: typeof input.ageDays === 'number' ? `${input.ageDays} day${input.ageDays === 1 ? '' : 's'}` : 'unknown',
    dataGaps,
    sourceAttribution: ['Dataverse', 'Publisher Operating Center read model', 'JMP lifecycle registry v1.0'],
  }
}

function legacyMappingInputForState(value: string, input: Partial<CanonicalPublisherProjectionInput>): LegacyMappingInput {
  const code = legacyCodeForState(value)
  return {
    legacyAuthority: code.startsWith('J') ? 'Pipeline Register J0-J8' : input.legacyAuthority || 'PackageStageCode',
    legacyValue: code,
    lifecycleContext: lifecycleContextFor(code, input),
    packageState: input.packageState,
  }
}

function legacyCodeForState(value: string) {
  const stagePrefix = value.split(/\s+-\s+/)[0] || value
  const normalized = normalize(stagePrefix)
  if (normalized.includes('PROOF')) return 'PROOFREADING'
  if (normalized.includes('INTERIOR') || normalized.includes('LAYOUT')) return 'INTERIOR_LAYOUT'
  if (normalized.includes('COPY')) return 'COPYEDITING'
  if (normalized.includes('LINE')) return 'LINE_EDITING'
  if (normalized.includes('DEVELOPMENTAL')) return 'DEVELOPMENTAL_EDITING'
  if (normalized.includes('COVER')) return 'COVER_DESIGN'
  if (normalized.includes('PRODUCTION')) return 'PRODUCTION_PROOF'
  if (normalized.includes('PACKAGE ACCEPTED')) return 'PACKAGE_ACCEPTED'
  if (normalized.includes('RECOMMENDATION')) return 'J2 Recommendation'
  if (normalized.includes('EDITORIAL REVIEW')) return 'EDITORIAL_REVIEW'
  if (normalized.includes('PUBLISHED') || normalized.includes('ONGOING')) return 'J8 Ongoing Relationship'
  if (normalized.includes('INTAKE') || normalized.includes('INQUIRY')) return 'J0 Inquiry'
  return value || 'UNKNOWN'
}

function lifecycleContextFor(code: string, input: Partial<CanonicalPublisherProjectionInput>): LegacyMappingInput['lifecycleContext'] {
  if (code !== 'EDITORIAL_REVIEW') return undefined
  if (!input.titleId || /prospect|intake|inquiry|recommendation/i.test(`${input.pipelineStage || ''} ${input.portfolioState || ''}`)) {
    return 'PROSPECT_INQUIRY'
  }
  return 'ACTIVE_CONTRACTED_AUTHOR'
}

function canonicalWaitingOwner(input: CanonicalPublisherProjectionInput): WaitingOwner {
  const owner = `${input.owner || ''} ${input.awaiting || ''}`
  if (/author/i.test(owner)) return 'Author'
  if (/external/i.test(owner)) return 'External'
  if (/automation|system|provider|capacity/i.test(owner)) return 'JMP/System'
  if (/prospect/i.test(owner)) return 'Prospect'
  return 'JMP'
}

function systemAttentionFor(
  input: CanonicalPublisherProjectionInput,
  mapping: LegacyMappingResult,
  splitBrain: string,
  artifactMissing: boolean,
): CanonicalPublisherReadModel['systemAttention'] {
  const text = `${input.exactBlocker || ''} ${input.dependency || ''} ${input.executionState || ''} ${input.packageState || ''}`
  if (splitBrain) return { code: 'LIFECYCLE_SPLIT_BRAIN', severity: 'BLOCKING', reason: splitBrain }
  if (mapping.resultCode === 'CANONICAL_MAPPING_CONFLICT') return { code: 'TRANSITION_CONFLICT', severity: 'BLOCKING', reason: mapping.notes }
  if (mapping.resultCode === 'CANONICAL_MAPPING_INCOMPLETE') return { code: 'DATA_GAP', severity: 'ATTENTION', reason: mapping.notes }
  if (/ack.*fail/i.test(text)) return { code: 'AUTHOR_ACK_FAILED', severity: 'ATTENTION', reason: 'Author acknowledgment failure is surfaced separately from Waiting On.' }
  if (/payment.*fail|stripe.*fail/i.test(text)) return { code: 'PAYMENT_EVENT_FAILED', severity: 'BLOCKING', reason: 'Payment event failure requires commercial attention.' }
  if (/provider|capacity|backpressure/i.test(text)) return { code: 'PROVIDER_BACKPRESSURE', severity: 'ATTENTION', reason: 'Runtime is waiting on provider capacity or backpressure.' }
  if (/hold/i.test(text)) return { code: 'RUNTIME_HOLD', severity: 'ATTENTION', reason: input.exactBlocker || input.dependency || 'Runtime hold surfaced from Operating Center evidence.' }
  if (artifactMissing && /author review|proof|line|copy|layout|production/i.test(input.legacySourceState)) {
    return { code: 'ARTIFACT_AUTHORITY_UNRESOLVED', severity: 'BLOCKING', reason: 'Current governing artifact is not explicitly attributed in the read model.' }
  }
  return { code: 'NONE', severity: 'INFO', reason: 'No canonical system attention condition is currently surfaced.' }
}

function authorActionFor(
  input: CanonicalPublisherProjectionInput,
  waitingOn: WaitingOwner,
  mapping: LegacyMappingResult,
): CanonicalPublisherReadModel['authorActionRequired'] {
  if (mapping.resultCode === 'CANONICAL_MAPPING_CONFLICT') {
    return { required: false, label: 'NO', reason: 'Resolve lifecycle mapping before assigning author action.' }
  }
  if (waitingOn === 'Author') {
    return { required: true, label: 'YES', reason: input.nextAction || input.exactBlocker || 'Author response or approval is required.' }
  }
  return { required: false, label: 'NO', reason: input.exactBlocker || input.dependency || 'No author action is currently required.' }
}

function sourceArtifactFor(input: CanonicalPublisherProjectionInput, mapping: LegacyMappingResult): CanonicalPublisherReadModel['sourceArtifact'] {
  const first = input.evidenceLinks?.[0]
  if (!first) {
    return {
      artifactType: 'DATA_GAP',
      artifactId: 'DATA_GAP',
      checksum: 'DATA_GAP',
      version: input.qaState || 'DATA_GAP',
      certificationState: 'DATA_GAP',
      source: 'DATA_GAP',
    }
  }
  return {
    artifactType: mapping.canonicalSubstage || mapping.canonicalStage || 'SOURCE_EVIDENCE',
    artifactId: first.href,
    checksum: 'DATA_GAP',
    version: input.qaState || 'Current',
    certificationState: input.packageState || 'DATA_GAP',
    source: first.label,
  }
}

function detectSplitBrain(input: CanonicalPublisherProjectionInput) {
  const text = `${input.pipelineStage || ''} ${input.editorialStage || ''} ${input.substage || ''} ${input.dependency || ''} ${input.exactBlocker || ''}`
  if (/proof/i.test(text) && /layout.*precede|without layout|layout missing|interior.*missing/i.test(text)) {
    return 'Dataverse/runtime evidence indicates Proofreading while Layout prerequisite evidence is unresolved.'
  }
  if (/proof/i.test(input.editorialStage || '') && /interior layout/i.test(input.pipelineStage || '')) {
    return 'Dataverse and runtime stages disagree between Proofreading and Interior Layout.'
  }
  return ''
}

function readinessFor(input: CanonicalPublisherProjectionInput, mapping: LegacyMappingResult): CanonicalPublisherReadModel['readiness'] {
  const blocked = mapping.resultCode === 'CANONICAL_MAPPING_CONFLICT' || mapping.resultCode === 'CANONICAL_MAPPING_INCOMPLETE'
  const text = `${input.pipelineStage || ''} ${input.editorialStage || ''} ${input.substage || ''} ${input.packageState || ''} ${input.dependency || ''}`
  return {
    editorial: blocked ? 'BLOCKED' : /editorial|developmental|line|copy/i.test(text) ? 'READY' : 'DATA_GAP',
    bookProduction: /production|layout|proof/i.test(text) ? (blocked ? 'BLOCKED' : 'READY') : 'DATA_GAP',
    metadata: /metadata/i.test(text) ? 'READY' : 'DATA_GAP',
    distribution: /distribution|catalog|published/i.test(text) ? 'READY' : 'DATA_GAP',
    royaltyPayout: /royalt/i.test(text) ? 'READY' : 'DATA_GAP',
    finalDeliveryPayment: /final delivery|paid in full/i.test(text) ? 'READY' : 'DATA_GAP',
  }
}

function dataGapsFor(input: CanonicalPublisherProjectionInput): CanonicalPublisherReadModel['dataGaps'] {
  const gaps: CanonicalPublisherReadModel['dataGaps'] = []
  if (!input.evidenceLinks?.length) {
    gaps.push({
      field: 'sourceChecksum',
      expectedSource: 'Artifact Registry',
      currentSource: 'Publisher Operating Center evidence links',
      available: false,
      remediationWave: 'Wave C - artifact authority binding',
    })
  }
  gaps.push({
    field: 'royaltyPayoutReadiness',
    expectedSource: 'Stripe Connect / royalty payout registry',
    currentSource: 'Royalty decision read model',
    available: /royalt/i.test(`${input.pipelineStage || ''} ${input.editorialStage || ''}`),
    remediationWave: 'Wave D - royalty payout canonicalization',
  })
  return gaps
}

function commercialStateFor(input: CanonicalPublisherProjectionInput) {
  if (/package accepted/i.test(input.packageState || input.legacySourceState)) return 'PACKAGE_ACCEPTED'
  if (/payment|agreement/i.test(input.packageState || input.dependency || '')) return input.packageState || input.dependency || 'DATA_GAP'
  return 'DATA_GAP'
}

function relationshipStateFor(input: CanonicalPublisherProjectionInput) {
  if (/joined|active author/i.test(`${input.packageState || ''} ${input.portfolioState || ''}`)) return 'ACTIVE_AUTHOR'
  if (input.titleId && !/prospect|intake/i.test(`${input.pipelineStage || ''} ${input.portfolioState || ''}`)) return 'DATA_GAP'
  return 'PROSPECT'
}

function packageRecommendationFor(input: CanonicalPublisherProjectionInput) {
  if (/recommendation/i.test(input.legacySourceState)) return input.packageState || 'Recommendation visible'
  return input.packageState || 'DATA_GAP'
}

function packageAcceptedFor(input: CanonicalPublisherProjectionInput) {
  return /package accepted/i.test(`${input.packageState || ''} ${input.legacySourceState}`) ? 'YES' : 'DATA_GAP'
}

function paymentPolicyFor(input: CanonicalPublisherProjectionInput) {
  return /8[- ]?pay|payment plan/i.test(`${input.packageState || ''} ${input.dependency || ''}`) ? 'Payment plan' : 'DATA_GAP'
}

function paymentPlanFor(input: CanonicalPublisherProjectionInput) {
  const match = `${input.packageState || ''} ${input.dependency || ''}`.match(/\b(\d+)[- ]?pay\b/i)
  return match ? `${match[1]}-Pay` : 'DATA_GAP'
}

function paymentStateFor(input: CanonicalPublisherProjectionInput) {
  if (/paid/i.test(`${input.packageState || ''} ${input.dependency || ''}`)) return input.packageState || input.dependency || 'Payment evidence surfaced'
  return 'DATA_GAP'
}

function joinedFamilyFor(input: CanonicalPublisherProjectionInput): CanonicalPublisherReadModel['joinedTheFamily'] {
  const text = `${input.packageState || ''} ${input.dependency || ''} ${input.portfolioState || ''}`
  if (/joined the family/i.test(text)) return { value: 'YES', reason: 'Canonical event surfaced by read model.' }
  if (/package accepted|payment option/i.test(text)) return { value: 'NO', reason: 'Package/payment option state alone is not Joined the Family.' }
  return { value: 'DATA_GAP', reason: 'Agreement plus required initial payment evidence is not available in this read model item.' }
}

function executionStatusFor(input: CanonicalPublisherProjectionInput) {
  if (/provider|capacity|backpressure/i.test(`${input.exactBlocker || ''} ${input.dependency || ''}`)) return 'WAITING_FOR_PROVIDER_CAPACITY'
  if (/hold/i.test(`${input.exactBlocker || ''} ${input.dependency || ''}`)) return 'RUNTIME_HOLD'
  return input.executionState || 'DATA_GAP'
}

function productionStateFor(input: CanonicalPublisherProjectionInput) {
  return /production|layout|proof/i.test(input.legacySourceState) ? input.legacySourceState : 'DATA_GAP'
}

function coverStateFor(input: CanonicalPublisherProjectionInput) {
  return /cover/i.test(input.legacySourceState) ? input.legacySourceState : 'DATA_GAP'
}

function metadataStateFor(input: CanonicalPublisherProjectionInput) {
  return /metadata/i.test(input.legacySourceState) ? input.legacySourceState : 'DATA_GAP'
}

function distributionStateFor(input: CanonicalPublisherProjectionInput) {
  const formats = input.activeFormats?.length ? input.activeFormats : ['Paperback', 'Hardcover', 'Ebook', 'Audiobook']
  return Object.fromEntries(formats.map((format) => [format, /distribution|published|catalog/i.test(input.legacySourceState) ? 'READY' : 'DATA_GAP'])) as Record<string, CanonicalReadinessState>
}

function postPublicationStateFor(input: CanonicalPublisherProjectionInput) {
  return /published|royalt|ongoing/i.test(input.legacySourceState) ? input.legacySourceState : 'DATA_GAP'
}

function royaltyReadinessFor(input: CanonicalPublisherProjectionInput) {
  return /royalt/i.test(`${input.legacySourceState} ${input.pipelineStage || ''}`) ? 'Royalty review read model available' : 'NOT YET AVAILABLE'
}

function nextActionFor(stage?: StageCode, substage?: SubstageCode, waitingOn?: WaitingOwner) {
  if (waitingOn === 'Author') return 'Await author package decision'
  if (substage === 'PACKAGE_ACCEPTANCE') return 'Generate payment options from canonical Offer Engine'
  if (substage === 'JOINED_THE_FAMILY') return 'Provision Author Workspace entitlement'
  if (substage === 'LINE_EDITING') return 'Queue Line Editing'
  if (stage === 'BOOK_PRODUCTION') return 'Create Interior Layout artifact'
  if (stage === 'DISTRIBUTION_RELEASE') return 'Confirm distribution release evidence'
  if (stage === 'POST_PUBLICATION') return 'Maintain post-publication stewardship'
  return 'Review current title state'
}

function letterFor(sequence: number) {
  return String.fromCharCode(64 + sequence)
}

function normalize(value: string) {
  return value.trim().replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').toUpperCase()
}
