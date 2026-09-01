import {
  JMP_PUBLISHING_LIFECYCLE_REGISTRY,
  JMP_PUBLISHING_LIFECYCLE_VERSION,
  type StageCode,
  type SubstageCode,
  type WaitingOwner,
} from './registry'
import { mapLegacyLifecycleValue, type LegacyMappingInput, type LegacyMappingResult } from './legacy-mapping'
import {
  evaluateWaveC1ArtifactAuthority,
  evaluateWaveC1CommercialAuthority,
  evaluateWaveC1FormatAuthority,
  evaluateWaveC1WorkspaceAuthority,
  waveC1RoyaltyReadiness,
} from './wave-c1-evidence-authority'

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
  | 'RECONCILIATION_REQUIRED'

export type CanonicalReadinessState = 'READY' | 'NOT_READY' | 'BLOCKED' | 'NOT_APPLICABLE' | 'DATA_GAP'

export type CanonicalEvidenceStatus = 'SUPPORTED' | 'CONFLICT' | 'INCOMPLETE' | 'NOT_APPLICABLE'

export type CanonicalDataGapClassification = 'RESOLVABLE' | 'STRUCTURAL'

export type CanonicalCommercialModel =
  | 'CURRENT_MODEL'
  | 'LEGACY_MODEL'
  | 'GRANDFATHERED'
  | 'ROYALTY_SHARE'
  | 'COMPLIMENTARY_SPECIAL'
  | 'OTHER_GOVERNED_EXCEPTION'
  | 'DATA_GAP'

export type CanonicalGateStatus = 'PASS' | 'BLOCKED' | 'NOT_APPLICABLE' | 'INSUFFICIENT_EVIDENCE'

export type CanonicalStageTrustClassification =
  | 'TRUSTED_STAGE'
  | 'TRUSTED_STAGE_WITH_NONBLOCKING_DATA_GAP'
  | 'RECONCILIATION_REQUIRED'
  | 'INSUFFICIENT_TRANSITION_EVIDENCE'
  | 'COMMERCIAL_GATE_BLOCKED'
  | 'EDITORIAL_GATE_BLOCKED'
  | 'LEGACY_GOVERNED_EXCEPTION'

export type CanonicalWaitingTrustClassification =
  | 'TRUSTED_WAITING_ON'
  | 'NOT_WAITING'
  | 'RECONCILIATION_REQUIRED'
  | 'INSUFFICIENT_ACTION_EVIDENCE'

export type CanonicalTimerTrustClassification =
  | 'TRUSTED_TIMER'
  | 'NO_ACTIVE_TIMER'
  | 'INSUFFICIENT_TIMESTAMP_EVIDENCE'
  | 'RECONCILIATION_REQUIRED'

export type CanonicalWaitingOn =
  | 'WAITING_ON_AUTHOR'
  | 'WAITING_ON_JMP'
  | 'WAITING_ON_EDITOR'
  | 'WAITING_ON_EXTERNAL_VENDOR'
  | 'WAITING_ON_CONTRACT'
  | 'WAITING_ON_PAYMENT'
  | 'WAITING_ON_APPROVAL'
  | 'WAITING_ON_ARTIFACT'
  | 'WAITING_ON_SYSTEM'
  | 'NOT_WAITING'
  | 'RECONCILIATION_REQUIRED'

export type CanonicalEvidenceRecord = {
  source: string
  value: string
  confidence: 'DETERMINISTIC' | 'CONTEXTUAL' | 'CONFLICT' | 'INCOMPLETE'
}

export type CanonicalEvidenceFacet = {
  status: CanonicalEvidenceStatus
  value: string
  reason: string
  evidence: CanonicalEvidenceRecord[]
  dataGapReason?: string
  gapClassification?: CanonicalDataGapClassification
}

export type CanonicalReadinessDimension =
  | 'editorial'
  | 'bookProduction'
  | 'metadata'
  | 'distribution'
  | 'royaltyPayout'
  | 'finalDeliveryPayment'

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
  evidenceLinks?: Array<{ label: string; href: string; checksum?: string; artifactType?: string; version?: string; current?: boolean }>
  activeFormats?: string[]
  portfolioState?: string
  workspaceState?: string
  workspaceEntitlementState?: string
  onboardingState?: string
  commercialEvidenceText?: string
  pricingEvidenceText?: string
  agreementEvidenceText?: string
  agreementDocumentAvailable?: boolean
  contractStatus?: string
  providerStatus?: string
  signedDate?: string
  agreementExecutionLog?: boolean
  paymentEvidenceText?: string
  firstPaymentStatus?: string
  firstPaymentConfirmedOn?: string
  firstPaymentConfirmationSource?: string
  successfulPaymentEvent?: boolean
  requiredInitialPayment?: boolean
  correctCommercialContext?: boolean
  joinedFamilyEvidenceText?: string
  joinedFamilyEvent?: boolean
  commercialModel?: CanonicalCommercialModel | string
  authorAuthenticationEvidenceText?: string
  authorDecisionEvidenceText?: string
  authorDecisionCaptured?: boolean
  authorApproved?: boolean
  changesRequested?: boolean
  holdRequested?: boolean
  transitionAuthorized?: boolean
  waitingStartedAt?: string
  waitingStartEvent?: string
  waitingStartEventId?: string
  waitingStartEvidence?: string
  holdStartedAt?: string
  holdEndedAt?: string
  projectionAsOf?: string
  workspaceProvisioningEvidenceText?: string
  formatEvidenceText?: string
  artifactEvidenceSource?: string
  artifactStorageReference?: string
  artifactChecksumAlgorithm?: string
  artifactByteReadable?: boolean
  derivedFromArtifactId?: string
  duplicateCurrentArtifactCount?: number
  artifactChecksumMismatch?: boolean
  canonicalAuthorityClassification?: string
  canonicalTitleReference?: string
  canonicalAuthorContactReference?: string
  sourceAuthority?: string
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
  lifecycleEvidence: {
    artifact: {
      identity: CanonicalEvidenceFacet
      checksum: CanonicalEvidenceFacet
      provenance: CanonicalEvidenceFacet
      currentVersion: CanonicalEvidenceFacet
      ambiguity: CanonicalEvidenceFacet
    }
    authorWorkspace: {
      relationship: CanonicalEvidenceFacet
      entitlement: CanonicalEvidenceFacet
      activeWorkspace: CanonicalEvidenceFacet
      onboarding: CanonicalEvidenceFacet
    }
    commercial: {
      packageAccepted: CanonicalEvidenceFacet
      pricingLocked: CanonicalEvidenceFacet
      agreementExecuted: CanonicalEvidenceFacet
      initialPayment: CanonicalEvidenceFacet
      installments: CanonicalEvidenceFacet
      joinedFamily: CanonicalEvidenceFacet
    }
    formats: Array<{
      format: string
      identity: CanonicalEvidenceFacet
      distribution: CanonicalEvidenceFacet
      certification: CanonicalEvidenceFacet
      verifiedUrl: CanonicalEvidenceFacet
    }>
    readinessContracts: Record<CanonicalReadinessDimension, CanonicalEvidenceFacet>
    coverage: {
      artifactIdentity: CanonicalEvidenceStatus
      artifactChecksum: CanonicalEvidenceStatus
      artifactProvenance: CanonicalEvidenceStatus
      workspaceEntitlement: CanonicalEvidenceStatus
      workspaceActive: CanonicalEvidenceStatus
      onboarding: CanonicalEvidenceStatus
      packageAccepted: CanonicalEvidenceStatus
      pricingLocked: CanonicalEvidenceStatus
      agreementExecuted: CanonicalEvidenceStatus
      payment: CanonicalEvidenceStatus
      joinedFamily: CanonicalEvidenceStatus
      formatIdentity: CanonicalEvidenceStatus
      formatDistribution: CanonicalEvidenceStatus
      certification: CanonicalEvidenceStatus
    }
    conflictCount: number
  }
  canonicalAuthority: {
    classification: string
    canonicalTitleReference: string
    canonicalAuthorContactReference: string
    sourceAuthority: string
    currentAuthorityRelationship: string
    isCurrentOperationalAuthority: boolean
    requiresReconciliation: boolean
    lastProvenGovernedStage: StageCode | 'DATA_GAP'
    lastProvenGovernedSubstage: SubstageCode | 'DATA_GAP'
    lastProvenTransition: string
    transitionAuthority: string
    transitionEvidence: string
  }
  stageTruth: {
    commercialModel: CanonicalCommercialModel
    commercialGateStatus: CanonicalGateStatus
    editorialGateStatus: CanonicalGateStatus
    trustClassification: CanonicalStageTrustClassification
    blockingTransition: string
    blockingEvidence: string
    blockingPartyClass: WaitingOwner | 'NONE'
    artifactAuthorityRequired: 'YES' | 'NO'
    projectedStage: StageCode | 'DATA_GAP'
    projectedSubstage: SubstageCode | 'DATA_GAP'
    rawClaimedStage: StageCode | 'DATA_GAP'
    rawClaimedSubstage: SubstageCode | 'DATA_GAP'
    manualInterventionRequiredForRecompute: 'YES' | 'NO'
  }
  waitingTruth: {
    requiredNextAction: string
    waitingOn: CanonicalWaitingOn
    broadWaitingOwner: WaitingOwner
    waitingReason: string
    waitingStartedAt: string
    waitingStartEvent: string
    waitingStartEventId: string
    waitingStartEvidence: string
    elapsedWaitTime: string
    elapsedDays: number | null
    activeTimer: 'YES' | 'NO'
    holdStartedAt: string
    holdEndedAt: string
    activeWaitDuration: string
    calendarDuration: string
    waitingTrustClassification: CanonicalWaitingTrustClassification
    timerTrustClassification: CanonicalTimerTrustClassification
    exceptionReason: string
    timerDisplay: string
  }
  waveC1EvidenceAuthority: {
    artifact: ReturnType<typeof evaluateWaveC1ArtifactAuthority>
    commercial: ReturnType<typeof evaluateWaveC1CommercialAuthority>
    workspace: ReturnType<typeof evaluateWaveC1WorkspaceAuthority>
    formats: ReturnType<typeof evaluateWaveC1FormatAuthority>[]
    royalty: ReturnType<typeof waveC1RoyaltyReadiness>
    controlledWriteAuthorityEligible: 'NO' | 'LIMITED_COMMERCIAL_EVENT_WRITE_CANDIDATE'
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
    reason: string
    classification: CanonicalDataGapClassification
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
  const rawStage = mapping.canonicalStage
    ? JMP_PUBLISHING_LIFECYCLE_REGISTRY.find((candidate) => candidate.stageCode === mapping.canonicalStage)
    : null
  const rawSubstage = mapping.canonicalSubstage
    ? rawStage?.substages.find((candidate) => candidate.substageCode === mapping.canonicalSubstage) ||
      JMP_PUBLISHING_LIFECYCLE_REGISTRY.flatMap((candidate) => candidate.substages).find(
        (candidate) => candidate.substageCode === mapping.canonicalSubstage,
      )
    : null
  const canonicalAuthority = canonicalAuthorityFor(input, rawStage?.stageCode || 'DATA_GAP', rawSubstage?.substageCode || 'DATA_GAP', mapping)
  const splitBrain = detectSplitBrain(input)
  const artifact = sourceArtifactFor(input, mapping)
  const lifecycleEvidence = lifecycleEvidenceFor(input, mapping, artifact)
  const waveC1EvidenceAuthority = waveC1EvidenceAuthorityFor(input, artifact)
  const stageTruth = governedStageTruthFor(input, mapping, canonicalAuthority, lifecycleEvidence, waveC1EvidenceAuthority, rawStage?.stageCode || 'DATA_GAP', rawSubstage?.substageCode || 'DATA_GAP')
  const governedStage = stageTruth.projectedStage === 'DATA_GAP'
    ? null
    : JMP_PUBLISHING_LIFECYCLE_REGISTRY.find((candidate) => candidate.stageCode === stageTruth.projectedStage) || null
  const governedSubstage = stageTruth.projectedSubstage === 'DATA_GAP'
    ? null
    : (governedStage?.substages.find((candidate) => candidate.substageCode === stageTruth.projectedSubstage) ||
      JMP_PUBLISHING_LIFECYCLE_REGISTRY.flatMap((candidate) => candidate.substages).find(
        (candidate) => candidate.substageCode === stageTruth.projectedSubstage,
      ) || null)
  const waitingTruth = governedWaitingTruthFor(input, stageTruth, canonicalAuthority)
  const waitingOn = waitingTruth.broadWaitingOwner
  const systemAttention = canonicalAuthority.requiresReconciliation || !canonicalAuthority.isCurrentOperationalAuthority
    ? canonicalAuthority.requiresReconciliation
      ? {
        code: 'RECONCILIATION_REQUIRED' as const,
        severity: 'BLOCKING' as const,
        reason: `${canonicalAuthority.classification} cannot establish current lifecycle authority. ${canonicalAuthority.transitionEvidence}`,
      }
      : {
          code: 'NONE' as const,
          severity: 'INFO' as const,
          reason: `${canonicalAuthority.classification} is preserved as descriptive history and suppressed from current lifecycle authority.`,
        }
    : systemAttentionFor(input, mapping, splitBrain, artifact.artifactType === 'DATA_GAP')
  const authorActionRequired = authorActionFor(input, waitingOn, mapping)
  const dataGaps = dataGapsFor(input)
  const nextGovernedAction =
    canonicalAuthority.requiresReconciliation || !canonicalAuthority.isCurrentOperationalAuthority
      ? canonicalAuthority.requiresReconciliation
        ? {
          action: 'Reconcile canonical title authority before projecting current lifecycle movement',
          confidence: 'UNRESOLVED' as const,
          reason: `${canonicalAuthority.classification} is descriptive/history-only for Wave 2 projection authority.`,
        }
        : {
            action: 'Use canonical authority record for current lifecycle movement',
            confidence: 'CONFIRMED' as const,
            reason: `${canonicalAuthority.classification} remains queryable but cannot project current movement.`,
          }
      :
    mapping.resultCode === 'CANONICAL_MAPPING_CONFLICT' || mapping.resultCode === 'CANONICAL_MAPPING_INCOMPLETE'
      ? {
          action: 'Resolve lifecycle mapping conflict',
          confidence: 'UNRESOLVED' as const,
          reason: mapping.notes,
        }
      : stageTruth.trustClassification === 'COMMERCIAL_GATE_BLOCKED' ||
        stageTruth.trustClassification === 'EDITORIAL_GATE_BLOCKED' ||
        stageTruth.trustClassification === 'INSUFFICIENT_TRANSITION_EVIDENCE'
        ? {
            action: `Resolve ${stageTruth.blockingTransition}`,
            confidence: 'UNRESOLVED' as const,
            reason: stageTruth.blockingEvidence,
          }
      : {
          action: input.nextAction || nextActionFor(governedStage?.stageCode, governedSubstage?.substageCode, waitingOn),
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
      code: governedStage?.stageCode || 'DATA_GAP',
      number: governedStage ? String(governedStage.stageSequence).padStart(2, '0') : 'DATA_GAP',
      label: governedStage ? governedStage.stageName : 'DATA_GAP',
    },
    titleLifecycleSubstage: {
      code: governedSubstage?.substageCode || 'DATA_GAP',
      number: governedStage && governedSubstage ? `${String(governedStage.stageSequence).padStart(2, '0')}${letterFor(governedSubstage.substageSequence)}` : 'DATA_GAP',
      label: governedSubstage?.substageName || 'DATA_GAP',
      applicability: governedSubstage?.substageCode === 'DEVELOPMENTAL_EDITING' && /starter/i.test(input.packageState || '')
        ? 'NOT_APPLICABLE'
        : governedSubstage
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
    lifecycleEvidence,
    canonicalAuthority,
    stageTruth,
    waitingTruth,
    waveC1EvidenceAuthority,
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
    workspaceState: input.workspaceState || 'DATA_GAP',
    workspaceEntitlementState: input.workspaceEntitlementState || 'DATA_GAP',
    onboardingState: input.onboardingState || 'DATA_GAP',
    royaltyPayoutReadiness: royaltyReadinessFor(input),
    readiness: readinessFor(input, mapping),
    nextGovernedAction,
    age: waitingTruth.timerDisplay,
    dataGaps,
    sourceAttribution: ['Dataverse', 'Publisher Operating Center read model', 'JMP lifecycle registry v1.0'],
  }
}

function governedStageTruthFor(
  input: CanonicalPublisherProjectionInput,
  mapping: LegacyMappingResult,
  canonicalAuthority: CanonicalPublisherReadModel['canonicalAuthority'],
  lifecycleEvidence: CanonicalPublisherReadModel['lifecycleEvidence'],
  waveC1EvidenceAuthority: CanonicalPublisherReadModel['waveC1EvidenceAuthority'],
  rawClaimedStage: StageCode | 'DATA_GAP',
  rawClaimedSubstage: SubstageCode | 'DATA_GAP',
): CanonicalPublisherReadModel['stageTruth'] {
  const commercialModel = commercialModelFor(input, canonicalAuthority)
  const claimedSequence = stageSequence(rawClaimedStage)
  const text = stageTruthText(input)
  const mapped = mapping.resultCode !== 'CANONICAL_MAPPING_CONFLICT' && mapping.resultCode !== 'CANONICAL_MAPPING_INCOMPLETE'

  const base: Omit<CanonicalPublisherReadModel['stageTruth'], 'commercialGateStatus' | 'editorialGateStatus' | 'trustClassification' | 'blockingTransition' | 'blockingEvidence' | 'blockingPartyClass' | 'artifactAuthorityRequired' | 'projectedStage' | 'projectedSubstage'> = {
    commercialModel,
    rawClaimedStage,
    rawClaimedSubstage,
    manualInterventionRequiredForRecompute: 'NO',
  }

  if (!canonicalAuthority.isCurrentOperationalAuthority) {
    return {
      ...base,
      commercialGateStatus: 'NOT_APPLICABLE',
      editorialGateStatus: 'NOT_APPLICABLE',
      trustClassification: canonicalAuthority.requiresReconciliation ? 'RECONCILIATION_REQUIRED' : 'INSUFFICIENT_TRANSITION_EVIDENCE',
      blockingTransition: canonicalAuthority.requiresReconciliation ? 'CANONICAL_AUTHORITY_RECONCILIATION' : 'NONCURRENT_RECORD_SUPPRESSION',
      blockingEvidence: canonicalAuthority.transitionEvidence,
      blockingPartyClass: canonicalAuthority.requiresReconciliation ? 'JMP/System' : 'NONE',
      artifactAuthorityRequired: 'NO',
      projectedStage: 'DATA_GAP',
      projectedSubstage: 'DATA_GAP',
    }
  }

  if (!mapped || rawClaimedStage === 'DATA_GAP') {
    return {
      ...base,
      commercialGateStatus: 'INSUFFICIENT_EVIDENCE',
      editorialGateStatus: 'INSUFFICIENT_EVIDENCE',
      trustClassification: 'INSUFFICIENT_TRANSITION_EVIDENCE',
      blockingTransition: 'LIFECYCLE_MAPPING',
      blockingEvidence: mapping.notes || 'No explicit lifecycle mapping can establish a governed stage.',
      blockingPartyClass: 'JMP/System',
      artifactAuthorityRequired: /artifact|manuscript|proof|layout|editorial/i.test(text) ? 'YES' : 'NO',
      projectedStage: 'DATA_GAP',
      projectedSubstage: 'DATA_GAP',
    }
  }

  const commercialException = commercialModel !== 'CURRENT_MODEL'
  const commercialGate = commercialGateFor(input, lifecycleEvidence, waveC1EvidenceAuthority, rawClaimedStage, commercialModel)
  if (commercialGate.status === 'BLOCKED') {
    return {
      ...base,
      commercialGateStatus: 'BLOCKED',
      editorialGateStatus: 'NOT_APPLICABLE',
      trustClassification: 'COMMERCIAL_GATE_BLOCKED',
      blockingTransition: commercialGate.transition,
      blockingEvidence: commercialGate.evidence,
      blockingPartyClass: commercialGate.party,
      artifactAuthorityRequired: 'NO',
      projectedStage: commercialGate.projectedStage,
      projectedSubstage: commercialGate.projectedSubstage,
    }
  }

  if (commercialException && rawClaimedStage === 'POST_PUBLICATION') {
    return {
      ...base,
      commercialGateStatus: commercialGate.status,
      editorialGateStatus: 'NOT_APPLICABLE',
      trustClassification: 'LEGACY_GOVERNED_EXCEPTION',
      blockingTransition: 'NONE',
      blockingEvidence: `${commercialModel} post-publication authority prevents false application of current-model commercial/editorial prerequisites.`,
      blockingPartyClass: 'NONE',
      artifactAuthorityRequired: 'NO',
      projectedStage: rawClaimedStage,
      projectedSubstage: rawClaimedSubstage,
    }
  }

  const editorialGate = editorialGateFor(input, lifecycleEvidence, rawClaimedStage, rawClaimedSubstage)
  if (editorialGate.status === 'BLOCKED') {
    return {
      ...base,
      commercialGateStatus: commercialGate.status,
      editorialGateStatus: 'BLOCKED',
      trustClassification: 'EDITORIAL_GATE_BLOCKED',
      blockingTransition: editorialGate.transition,
      blockingEvidence: editorialGate.evidence,
      blockingPartyClass: editorialGate.party,
      artifactAuthorityRequired: editorialGate.artifactAuthorityRequired,
      projectedStage: editorialGate.projectedStage,
      projectedSubstage: editorialGate.projectedSubstage,
    }
  }

  return {
    ...base,
    commercialGateStatus: commercialGate.status,
    editorialGateStatus: editorialGate.status,
    trustClassification: commercialException
      ? 'LEGACY_GOVERNED_EXCEPTION'
      : lifecycleEvidence.conflictCount > 0 || lifecycleEvidence.coverage.artifactChecksum === 'INCOMPLETE'
        ? 'TRUSTED_STAGE_WITH_NONBLOCKING_DATA_GAP'
        : 'TRUSTED_STAGE',
    blockingTransition: 'NONE',
    blockingEvidence: commercialException
      ? `${commercialModel} prevents false application of current-model commercial prerequisites.`
      : 'All applicable surfaced transition prerequisites pass for the projected stage.',
    blockingPartyClass: 'NONE',
    artifactAuthorityRequired: lifecycleEvidence.coverage.artifactIdentity === 'INCOMPLETE' && claimedSequence >= stageSequence('EDITORIAL_PRODUCTION') ? 'YES' : 'NO',
    projectedStage: rawClaimedStage,
    projectedSubstage: rawClaimedSubstage,
  }
}

function commercialModelFor(
  input: CanonicalPublisherProjectionInput,
  canonicalAuthority: CanonicalPublisherReadModel['canonicalAuthority'],
): CanonicalCommercialModel {
  const explicit = normalize(String(input.commercialModel || ''))
  if (explicit.includes('CURRENT')) return 'CURRENT_MODEL'
  if (explicit.includes('GRANDFATHER')) return 'GRANDFATHERED'
  if (explicit.includes('ROYALTY')) return 'ROYALTY_SHARE'
  if (explicit.includes('COMPLIMENTARY') || explicit.includes('SPECIAL')) return 'COMPLIMENTARY_SPECIAL'
  if (explicit.includes('LEGACY')) return 'LEGACY_MODEL'
  if (explicit.includes('EXCEPTION')) return 'OTHER_GOVERNED_EXCEPTION'

  const text = stageTruthText(input)
  if (/GRANDFATHER|LEGACY 8 PAY|4%|FOUR PERCENT|OLD CONTRACT|PRIOR CONTRACT/.test(text)) return 'GRANDFATHERED'
  if (/ROYALTY SHARE|TRADITIONAL|JM SIGNATURE|NO AUTHOR PAYMENT/.test(text)) return 'ROYALTY_SHARE'
  if (/COMPLIMENTARY|SPECIAL|NO COST|SCHOLARSHIP/.test(text)) return 'COMPLIMENTARY_SPECIAL'
  if (/PACKAGE_SELECTED|PACKAGE ACCEPTED|PAYMENT OPTION|PRICING LOCKED|SIGNED|PAID CONFIRMED/.test(text)) return 'CURRENT_MODEL'
  if (canonicalAuthority.classification === 'CANONICAL_PUBLISHED_TITLE') return 'LEGACY_MODEL'
  return 'DATA_GAP'
}

function commercialGateFor(
  input: CanonicalPublisherProjectionInput,
  lifecycleEvidence: CanonicalPublisherReadModel['lifecycleEvidence'],
  waveC1EvidenceAuthority: CanonicalPublisherReadModel['waveC1EvidenceAuthority'],
  claimedStage: StageCode | 'DATA_GAP',
  commercialModel: CanonicalCommercialModel,
) {
  const claimedSequence = stageSequence(claimedStage)
  const packageAccepted = lifecycleEvidence.commercial.packageAccepted.status === 'SUPPORTED' ||
    /PACKAGE_SELECTED|PACKAGE ACCEPTED|ACCEPTED PACKAGE|AUTHOR SELECTED PACKAGE/.test(stageTruthText(input))
  const agreementExecuted = waveC1EvidenceAuthority.commercial.agreementExecuted.status === 'SUPPORTED' &&
    waveC1EvidenceAuthority.commercial.agreementExecuted.strength === 'AUTHORITATIVE'
  const paymentReceived = waveC1EvidenceAuthority.commercial.initialPayment.status === 'SUPPORTED' &&
    waveC1EvidenceAuthority.commercial.initialPayment.strength === 'AUTHORITATIVE'
  const joined = agreementExecuted && paymentReceived

  if (commercialModel !== 'CURRENT_MODEL') {
    return {
      status: commercialModel === 'DATA_GAP' && claimedSequence >= stageSequence('COMMERCIAL_ACTIVATION') ? 'INSUFFICIENT_EVIDENCE' as const : 'NOT_APPLICABLE' as const,
      transition: 'NONE',
      evidence: `${commercialModel} applicability does not force modern commercial prerequisites.`,
      party: 'NONE' as const,
      projectedStage: claimedStage,
      projectedSubstage: 'DATA_GAP' as const,
    }
  }

  if (claimedSequence >= stageSequence('COMMERCIAL_ACTIVATION') && !packageAccepted) {
    return {
      status: 'BLOCKED' as const,
      transition: 'PACKAGE_ACCEPTED',
      evidence: 'Current-model commercial activation requires package-acceptance evidence.',
      party: 'Prospect' as const,
      projectedStage: 'EDITORIAL_REVIEW_RECOMMENDATION' as const,
      projectedSubstage: 'PUBLISHING_RECOMMENDATION' as const,
    }
  }

  if (claimedSequence >= stageSequence('AUTHOR_ONBOARDING') && (!agreementExecuted || !paymentReceived)) {
    return {
      status: 'BLOCKED' as const,
      transition: !agreementExecuted ? 'AGREEMENT_EXECUTED' : 'INITIAL_PAYMENT_RECEIVED',
      evidence: 'Current-model Joined the Family requires authoritative executed-agreement proof plus required initial-payment proof.',
      party: !agreementExecuted ? 'Author' as const : 'External' as const,
      projectedStage: 'COMMERCIAL_ACTIVATION' as const,
      projectedSubstage: 'COMMERCIAL_ACTIVATION_EVENT' as const,
    }
  }

  return {
    status: claimedSequence >= stageSequence('COMMERCIAL_ACTIVATION') ? 'PASS' as const : 'NOT_APPLICABLE' as const,
    transition: joined ? 'JOINED_THE_FAMILY' : packageAccepted ? 'PACKAGE_ACCEPTED' : 'NONE',
    evidence: joined
      ? 'Agreement execution and initial payment are authoritative.'
      : packageAccepted
        ? 'Package acceptance is surfaced; Joined the Family is not required for this stage.'
        : 'No commercial gate applies to this projected stage.',
    party: 'NONE' as const,
    projectedStage: claimedStage,
    projectedSubstage: 'DATA_GAP' as const,
  }
}

function editorialGateFor(
  input: CanonicalPublisherProjectionInput,
  lifecycleEvidence: CanonicalPublisherReadModel['lifecycleEvidence'],
  claimedStage: StageCode | 'DATA_GAP',
  claimedSubstage: SubstageCode | 'DATA_GAP',
) {
  const text = stageTruthText(input)
  const claimedSequence = stageSequence(claimedStage)
  const editorialSequence = editorialSubstageSequence(claimedSubstage)
  const artifactIdentitySupported = lifecycleEvidence.artifact.identity.status === 'SUPPORTED'
  const authorAuthenticated = /AUTHENTICATED|SESSION|LOGIN|PORTAL ACCESS/.test(text) || Boolean(input.authorAuthenticationEvidenceText)
  const approvalCaptured =
    input.authorApproved === true ||
    input.transitionAuthorized === true ||
    input.authorDecisionCaptured === true ||
    /AUTHOR APPROVED|APPROVED_COPY|APPROVED_LINE|APPROVED_DEVELOPMENTAL|APPROVAL_EVIDENCE_BOUND|NEXTSTAGEAUTHORIZED|NEXT STAGE AUTHORIZED/.test(text)
  const changesRequested = input.changesRequested === true || /CHANGES REQUESTED|REVISION REQUESTED|REQUESTED CHANGES/.test(text)
  const holdRequested = input.holdRequested === true || /HOLD REQUESTED|AUTHOR HOLD|PROJECT HOLD/.test(text)

  if (claimedSequence < stageSequence('EDITORIAL_PRODUCTION')) {
    return {
      status: 'NOT_APPLICABLE' as const,
      transition: 'NONE',
      evidence: 'No editorial sequence gate applies before editorial production.',
      party: 'NONE' as const,
      artifactAuthorityRequired: 'NO' as const,
      projectedStage: claimedStage,
      projectedSubstage: claimedSubstage,
    }
  }

  if (changesRequested || holdRequested) {
    return {
      status: 'BLOCKED' as const,
      transition: changesRequested ? 'AUTHOR_CHANGES_REQUESTED' : 'AUTHOR_HOLD_REQUESTED',
      evidence: changesRequested ? 'Requested changes prevent later-stage advancement.' : 'Author hold preserves current gate without manufacturing advancement.',
      party: 'Author' as const,
      artifactAuthorityRequired: 'YES' as const,
      projectedStage: 'EDITORIAL_PRODUCTION' as const,
      projectedSubstage: priorAuthorReviewSubstage(claimedSubstage),
    }
  }

  if (!artifactIdentitySupported) {
    return {
      status: 'BLOCKED' as const,
      transition: 'CURRENT_ARTIFACT_BOUND',
      evidence: 'Editorial production requires a current artifact bound to the canonical title; artifact existence alone is insufficient.',
      party: 'JMP/System' as const,
      artifactAuthorityRequired: 'YES' as const,
      projectedStage: 'AUTHOR_ONBOARDING' as const,
      projectedSubstage: 'AUTHOR_ONBOARDING_TASKS' as const,
    }
  }

  if (claimedSequence >= stageSequence('BOOK_PRODUCTION') && !approvalCaptured) {
    return {
      status: 'BLOCKED' as const,
      transition: authorAuthenticated ? 'AUTHOR_APPROVAL_NOT_AUTHENTICATION' : 'PRIOR_AUTHOR_GATE_RESOLVED',
      evidence: authorAuthenticated
        ? 'Author authentication is not final editorial approval and cannot authorize production movement.'
        : 'Book production requires the applicable prior editorial author approval chain.',
      party: 'Author' as const,
      artifactAuthorityRequired: 'YES' as const,
      projectedStage: 'BOOK_PRODUCTION' as const,
      projectedSubstage: 'DATA_GAP' as const,
    }
  }

  if (editorialSequence >= editorialSubstageSequence('LINE_EDITING') && !approvalCaptured) {
    return {
      status: 'BLOCKED' as const,
      transition: authorAuthenticated ? 'AUTHOR_APPROVAL_NOT_AUTHENTICATION' : 'PRIOR_AUTHOR_GATE_RESOLVED',
      evidence: authorAuthenticated
        ? 'Author authentication is not author approval and cannot authorize the next editorial stage.'
        : 'Later editorial stage requires resolved prior author approval evidence.',
      party: 'Author' as const,
      artifactAuthorityRequired: 'YES' as const,
      projectedStage: 'EDITORIAL_PRODUCTION' as const,
      projectedSubstage: priorAuthorReviewSubstage(claimedSubstage),
    }
  }

  return {
    status: 'PASS' as const,
    transition: 'EDITORIAL_TRANSITION_PREREQUISITES',
    evidence: 'Applicable editorial transition prerequisites are surfaced.',
    party: 'NONE' as const,
    artifactAuthorityRequired: 'NO' as const,
    projectedStage: claimedStage,
    projectedSubstage: claimedSubstage,
  }
}

function governedWaitingTruthFor(
  input: CanonicalPublisherProjectionInput,
  stageTruth: CanonicalPublisherReadModel['stageTruth'],
  canonicalAuthority: CanonicalPublisherReadModel['canonicalAuthority'],
): CanonicalPublisherReadModel['waitingTruth'] {
  const now = parseTimestamp(input.projectionAsOf) || new Date()
  const blocked = stageTruth.blockingTransition !== 'NONE'
  const onHold = input.holdRequested === true || /hold/i.test(`${input.exactBlocker || ''} ${input.dependency || ''}`)
  const waiting = waitingSemanticsFor(input, stageTruth, canonicalAuthority, blocked, onHold)
  const startedAt = input.waitingStartedAt || ''
  const started = parseTimestamp(startedAt)
  const holdStarted = parseTimestamp(input.holdStartedAt)
  const holdEnded = parseTimestamp(input.holdEndedAt)
  const calendarDays = started ? Math.max(0, Math.floor((now.getTime() - started.getTime()) / 86400000)) : null
  const heldDays =
    started && holdStarted
      ? Math.max(0, Math.floor(((holdEnded || now).getTime() - holdStarted.getTime()) / 86400000))
      : 0
  const activeDays = calendarDays === null ? null : Math.max(0, calendarDays - heldDays)
  const timerTrustClassification: CanonicalTimerTrustClassification =
    waiting.waitingTrustClassification === 'RECONCILIATION_REQUIRED'
      ? 'RECONCILIATION_REQUIRED'
      : waiting.waitingTrustClassification === 'NOT_WAITING' || onHold
        ? 'NO_ACTIVE_TIMER'
        : started && input.waitingStartEvent
          ? 'TRUSTED_TIMER'
          : 'INSUFFICIENT_TIMESTAMP_EVIDENCE'
  const elapsedWaitTime =
    timerTrustClassification === 'TRUSTED_TIMER' && activeDays !== null
      ? `${activeDays} day${activeDays === 1 ? '' : 's'}`
      : timerTrustClassification === 'NO_ACTIVE_TIMER'
        ? 'NONE'
        : 'NOT_AUTHORITATIVE'

  return {
    requiredNextAction: waiting.requiredNextAction,
    waitingOn: waiting.waitingOn,
    broadWaitingOwner: broadWaitingOwnerFor(waiting.waitingOn),
    waitingReason: waiting.waitingReason,
    waitingStartedAt: timerTrustClassification === 'TRUSTED_TIMER' ? startedAt : '',
    waitingStartEvent: timerTrustClassification === 'TRUSTED_TIMER' ? input.waitingStartEvent || '' : '',
    waitingStartEventId: timerTrustClassification === 'TRUSTED_TIMER' ? input.waitingStartEventId || '' : '',
    waitingStartEvidence: timerTrustClassification === 'TRUSTED_TIMER' ? input.waitingStartEvidence || '' : '',
    elapsedWaitTime,
    elapsedDays: timerTrustClassification === 'TRUSTED_TIMER' ? activeDays : null,
    activeTimer: timerTrustClassification === 'TRUSTED_TIMER' ? 'YES' : 'NO',
    holdStartedAt: input.holdStartedAt || '',
    holdEndedAt: input.holdEndedAt || '',
    activeWaitDuration: timerTrustClassification === 'TRUSTED_TIMER' ? elapsedWaitTime : 'NONE',
    calendarDuration: calendarDays === null ? 'NOT_AUTHORITATIVE' : `${calendarDays} day${calendarDays === 1 ? '' : 's'}`,
    waitingTrustClassification: waiting.waitingTrustClassification,
    timerTrustClassification,
    exceptionReason: timerExceptionReason(waiting.waitingTrustClassification, timerTrustClassification, onHold),
    timerDisplay:
      timerTrustClassification === 'TRUSTED_TIMER'
        ? elapsedWaitTime
        : timerTrustClassification === 'NO_ACTIVE_TIMER'
          ? 'No active timer'
          : timerTrustClassification === 'RECONCILIATION_REQUIRED'
            ? 'Reconciliation required before timer starts'
            : 'Timing evidence unavailable',
  }
}

function waitingSemanticsFor(
  input: CanonicalPublisherProjectionInput,
  stageTruth: CanonicalPublisherReadModel['stageTruth'],
  canonicalAuthority: CanonicalPublisherReadModel['canonicalAuthority'],
  blocked: boolean,
  onHold: boolean,
): Pick<
  CanonicalPublisherReadModel['waitingTruth'],
  'requiredNextAction' | 'waitingOn' | 'waitingReason' | 'waitingTrustClassification'
> {
  if (canonicalAuthority.requiresReconciliation || stageTruth.trustClassification === 'RECONCILIATION_REQUIRED') {
    return {
      requiredNextAction: 'Reconcile canonical title authority',
      waitingOn: 'RECONCILIATION_REQUIRED',
      waitingReason: 'SYSTEM_RECONCILIATION',
      waitingTrustClassification: 'RECONCILIATION_REQUIRED',
    }
  }

  if (
    !canonicalAuthority.isCurrentOperationalAuthority ||
    (stageTruth.trustClassification === 'LEGACY_GOVERNED_EXCEPTION' && stageTruth.projectedStage === 'POST_PUBLICATION')
  ) {
    return {
      requiredNextAction: 'No current governed action is outstanding',
      waitingOn: 'NOT_WAITING',
      waitingReason: 'NO_CURRENT_GOVERNED_ACTION',
      waitingTrustClassification: 'NOT_WAITING',
    }
  }

  if (onHold) {
    return {
      requiredNextAction: input.nextAction || 'Resume from governed hold when authorized',
      waitingOn: semanticWaitingOnFor(stageTruth.blockingPartyClass === 'NONE' ? canonicalWaitingOwner(input) : stageTruth.blockingPartyClass),
      waitingReason: 'GOVERNED_HOLD',
      waitingTrustClassification: 'TRUSTED_WAITING_ON',
    }
  }

  if (blocked) {
    return waitingForBlockingTransition(stageTruth)
  }

  if (
    (input.authorApproved === true || input.transitionAuthorized === true || input.authorDecisionCaptured === true) &&
    /AUTHOR.*REVIEW.*DELIVER/i.test(input.waitingStartEvent || '')
  ) {
    return {
      requiredNextAction: 'No current governed action is outstanding',
      waitingOn: 'NOT_WAITING',
      waitingReason: 'AUTHOR_GATE_RESOLVED',
      waitingTrustClassification: 'NOT_WAITING',
    }
  }

  const explicitAction = input.nextAction || input.waitingStartEvent || ''
  const explicitReason = waitingReasonFromAction(explicitAction)
  const owner = ownerForWaitingReason(explicitReason, canonicalWaitingOwner(input))
  if (explicitAction && (owner !== 'WAITING_ON_JMP' || input.waitingStartedAt)) {
    return {
      requiredNextAction: input.nextAction || input.waitingStartEvent || 'Current governed action became outstanding',
      waitingOn: owner,
      waitingReason: explicitReason,
      waitingTrustClassification: 'TRUSTED_WAITING_ON',
    }
  }

  if (explicitAction && stageTruth.trustClassification === 'TRUSTED_STAGE') {
    return {
      requiredNextAction: input.nextAction || input.waitingStartEvent || 'Current governed action became outstanding',
      waitingOn: owner,
      waitingReason: explicitReason,
      waitingTrustClassification: 'INSUFFICIENT_ACTION_EVIDENCE',
    }
  }

  return {
    requiredNextAction: 'No current governed action is outstanding',
    waitingOn: 'NOT_WAITING',
    waitingReason: 'NO_CURRENT_GOVERNED_ACTION',
    waitingTrustClassification: 'NOT_WAITING',
  }
}

function waitingForBlockingTransition(
  stageTruth: CanonicalPublisherReadModel['stageTruth'],
): Pick<
  CanonicalPublisherReadModel['waitingTruth'],
  'requiredNextAction' | 'waitingOn' | 'waitingReason' | 'waitingTrustClassification'
> {
  switch (stageTruth.blockingTransition) {
    case 'PACKAGE_ACCEPTED':
      return waiting('Record author package acceptance', 'Prospect', 'AUTHOR_PACKAGE_ACCEPTANCE')
    case 'AGREEMENT_EXECUTED':
      return waiting('Obtain executed publishing agreement', 'WAITING_ON_CONTRACT', 'CONTRACT_EXECUTION_REQUIRED')
    case 'INITIAL_PAYMENT_RECEIVED':
      return waiting('Receive required initial payment', 'WAITING_ON_PAYMENT', 'INITIAL_PAYMENT_REQUIRED')
    case 'CURRENT_ARTIFACT_BOUND':
      return waiting('Bind the current governed artifact', 'WAITING_ON_ARTIFACT', 'ARTIFACT_REQUIRED')
    case 'AUTHOR_APPROVAL_NOT_AUTHENTICATION':
    case 'PRIOR_AUTHOR_GATE_RESOLVED':
      return waiting('Obtain governed author approval', 'Author', 'AUTHOR_EDITORIAL_APPROVAL')
    case 'AUTHOR_CHANGES_REQUESTED':
      return waiting('Process author-requested changes', 'WAITING_ON_EDITOR', 'AUTHOR_CHANGES_REQUESTED')
    case 'AUTHOR_HOLD_REQUESTED':
      return waiting('Resume from author hold when authorized', 'Author', 'GOVERNED_HOLD')
    case 'LIFECYCLE_MAPPING':
    case 'CANONICAL_AUTHORITY_RECONCILIATION':
      return {
        requiredNextAction: 'Reconcile canonical title authority',
        waitingOn: 'RECONCILIATION_REQUIRED',
        waitingReason: 'SYSTEM_RECONCILIATION',
        waitingTrustClassification: 'RECONCILIATION_REQUIRED',
      }
    default:
      return waiting(`Resolve ${stageTruth.blockingTransition}`, stageTruth.blockingPartyClass === 'NONE' ? 'JMP/System' : stageTruth.blockingPartyClass, 'SYSTEM_RECONCILIATION')
  }
}

function waiting(requiredNextAction: string, waitingOn: WaitingOwner | CanonicalWaitingOn, waitingReason: string) {
  return {
    requiredNextAction,
    waitingOn: waitingOn.startsWith('WAITING_ON_') || waitingOn === 'NOT_WAITING' || waitingOn === 'RECONCILIATION_REQUIRED'
      ? waitingOn as CanonicalWaitingOn
      : semanticWaitingOnFor(waitingOn as WaitingOwner),
    waitingReason,
    waitingTrustClassification: 'TRUSTED_WAITING_ON' as const,
  }
}

function waitingReasonFromAction(action: string) {
  const normalized = normalize(action)
  if (/AUTHOR.*REVIEW.*DELIVER|AUTHOR.*APPROV|AUTHOR.*REVIEW|RESPONSE/.test(normalized)) return 'AUTHOR_EDITORIAL_APPROVAL'
  if (/RESUME|QUEUE|EDITOR|LINE|COPY|DEVELOPMENTAL/.test(normalized)) return 'EDITORIAL_WORK_IN_PROGRESS'
  if (/CONTRACT|AGREEMENT|SIGN/.test(normalized)) return 'CONTRACT_EXECUTION_REQUIRED'
  if (/PAYMENT|INVOICE|STRIPE/.test(normalized)) return 'INITIAL_PAYMENT_REQUIRED'
  if (/PUBLISHER|JACKIE|APPROVAL/.test(normalized)) return 'PUBLISHER_REVIEW_REQUIRED'
  if (/VENDOR|DISTRIBUTOR|EXTERNAL/.test(normalized)) return 'EXTERNAL_VENDOR_ACTION'
  if (/ARTIFACT|MANUSCRIPT|PROOF/.test(normalized)) return 'ARTIFACT_REQUIRED'
  return 'SYSTEM_RECONCILIATION'
}

function ownerForWaitingReason(reason: string, fallback: WaitingOwner): CanonicalWaitingOn {
  if (reason === 'AUTHOR_EDITORIAL_APPROVAL') return 'WAITING_ON_AUTHOR'
  if (reason === 'CONTRACT_EXECUTION_REQUIRED') return 'WAITING_ON_CONTRACT'
  if (reason === 'INITIAL_PAYMENT_REQUIRED') return fallback === 'Prospect' ? 'WAITING_ON_AUTHOR' : 'WAITING_ON_PAYMENT'
  if (reason === 'EDITORIAL_WORK_IN_PROGRESS') return fallback === 'Author' ? 'WAITING_ON_EDITOR' : semanticWaitingOnFor(fallback)
  if (reason === 'PUBLISHER_REVIEW_REQUIRED') return 'WAITING_ON_JMP'
  if (reason === 'EXTERNAL_VENDOR_ACTION') return 'WAITING_ON_EXTERNAL_VENDOR'
  if (reason === 'ARTIFACT_REQUIRED') return 'WAITING_ON_ARTIFACT'
  return semanticWaitingOnFor(fallback)
}

function semanticWaitingOnFor(owner: WaitingOwner): CanonicalWaitingOn {
  if (owner === 'Author') return 'WAITING_ON_AUTHOR'
  if (owner === 'Prospect') return 'WAITING_ON_AUTHOR'
  if (owner === 'External') return 'WAITING_ON_EXTERNAL_VENDOR'
  if (owner === 'JMP/System') return 'WAITING_ON_SYSTEM'
  return 'WAITING_ON_JMP'
}

function broadWaitingOwnerFor(owner: CanonicalWaitingOn): WaitingOwner {
  if (owner === 'WAITING_ON_AUTHOR') return 'Author'
  if (owner === 'WAITING_ON_EXTERNAL_VENDOR') return 'External'
  if (owner === 'WAITING_ON_SYSTEM' || owner === 'RECONCILIATION_REQUIRED') return 'JMP/System'
  if (owner === 'WAITING_ON_CONTRACT' || owner === 'WAITING_ON_PAYMENT' || owner === 'WAITING_ON_ARTIFACT' || owner === 'WAITING_ON_APPROVAL') return 'JMP/System'
  return 'JMP'
}

function timerExceptionReason(
  waitingTrust: CanonicalWaitingTrustClassification,
  timerTrust: CanonicalTimerTrustClassification,
  onHold: boolean,
) {
  if (waitingTrust === 'RECONCILIATION_REQUIRED') return 'Canonical responsibility must be reconciled before a timer can start.'
  if (waitingTrust === 'NOT_WAITING') return 'No current governed action is outstanding.'
  if (onHold) return 'Governed hold suppresses active wait accumulation.'
  if (timerTrust === 'INSUFFICIENT_TIMESTAMP_EVIDENCE') return 'No authoritative responsibility-transfer event timestamp is surfaced; CreatedOn/ModifiedOn/ageDays fallback is prohibited.'
  return 'Authoritative responsibility-transfer event anchors the timer.'
}

function parseTimestamp(value?: string) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function stageSequence(stage: StageCode | 'DATA_GAP') {
  return JMP_PUBLISHING_LIFECYCLE_REGISTRY.find((candidate) => candidate.stageCode === stage)?.stageSequence || 0
}

function editorialSubstageSequence(substage: SubstageCode | 'DATA_GAP') {
  const found = JMP_PUBLISHING_LIFECYCLE_REGISTRY
    .find((stage) => stage.stageCode === 'EDITORIAL_PRODUCTION')
    ?.substages.find((candidate) => candidate.substageCode === substage)
  return found?.substageSequence || 0
}

function priorAuthorReviewSubstage(substage: SubstageCode | 'DATA_GAP'): SubstageCode {
  if (substage === 'COPYEDITING' || substage === 'COPY_AUTHOR_REVIEW') return 'LINE_AUTHOR_REVIEW'
  if (substage === 'LINE_EDITING' || substage === 'LINE_AUTHOR_REVIEW') return 'DEVELOPMENTAL_AUTHOR_REVIEW'
  return 'DEVELOPMENTAL_AUTHOR_REVIEW'
}

function stageTruthText(input: CanonicalPublisherProjectionInput) {
  return normalize([
    input.legacySourceState,
    input.pipelineStage,
    input.editorialStage,
    input.substage,
    input.packageState,
    input.qaState,
    input.executionState,
    input.dependency,
    input.exactBlocker,
    input.commercialEvidenceText,
    input.pricingEvidenceText,
    input.agreementEvidenceText,
    input.contractStatus,
    input.providerStatus,
    input.paymentEvidenceText,
    input.firstPaymentStatus,
    input.firstPaymentConfirmedOn,
    input.firstPaymentConfirmationSource,
    input.joinedFamilyEvidenceText,
    input.authorAuthenticationEvidenceText,
    input.authorDecisionEvidenceText,
    input.artifactEvidenceSource,
    input.artifactStorageReference,
    ...(input.evidenceLinks || []).flatMap((link) => [link.label, link.href, link.checksum || '', link.artifactType || '', link.version || '']),
  ].filter(Boolean).join(' '))
}

function canonicalAuthorityFor(
  input: CanonicalPublisherProjectionInput,
  provenStage: StageCode | 'DATA_GAP',
  provenSubstage: SubstageCode | 'DATA_GAP',
  mapping: LegacyMappingResult,
): CanonicalPublisherReadModel['canonicalAuthority'] {
  const classification = normalizeAuthorityClassification(input.canonicalAuthorityClassification)
  const sourceAuthority = input.sourceAuthority || 'Publisher Operating Center projection input'
  const currentClassifications = new Set(['CANONICAL_CURRENT_TITLE', 'CANONICAL_PUBLISHED_TITLE', 'CANONICAL_EDITION', 'UNCLASSIFIED_LEGACY_COMPATIBILITY'])
  const unresolvedClassifications = new Set(['REQUIRES_RECONCILIATION', 'ORPHAN'])
  const noncurrentClassifications = new Set(['DUPLICATE_RECORD', 'LEGACY_TITLE_RECORD', 'LEGACY_RECORD', 'PLACEHOLDER', 'HISTORICAL_VERSION', 'NONCURRENT_HISTORICAL_RECORD'])
  const isCurrentOperationalAuthority = currentClassifications.has(classification)
  const requiresReconciliation = unresolvedClassifications.has(classification)
  const relationship = isCurrentOperationalAuthority
    ? 'CURRENT_OPERATIONAL_AUTHORITY'
    : requiresReconciliation
      ? 'RECONCILIATION_REQUIRED'
      : noncurrentClassifications.has(classification)
        ? 'NONCURRENT_REFERENCE_ONLY'
        : 'RECONCILIATION_REQUIRED'
  const trusted = isCurrentOperationalAuthority && mapping.resultCode !== 'CANONICAL_MAPPING_CONFLICT' && mapping.resultCode !== 'CANONICAL_MAPPING_INCOMPLETE'

  return {
    classification,
    canonicalTitleReference: input.canonicalTitleReference || input.titleId || 'DATA_GAP',
    canonicalAuthorContactReference: input.canonicalAuthorContactReference || 'DATA_GAP',
    sourceAuthority,
    currentAuthorityRelationship: relationship,
    isCurrentOperationalAuthority,
    requiresReconciliation: requiresReconciliation || (!isCurrentOperationalAuthority && !noncurrentClassifications.has(classification)),
    lastProvenGovernedStage: trusted ? provenStage : 'DATA_GAP',
    lastProvenGovernedSubstage: trusted ? provenSubstage : 'DATA_GAP',
    lastProvenTransition: trusted ? `${provenStage}${provenSubstage !== 'DATA_GAP' ? `:${provenSubstage}` : ''}` : 'RECONCILIATION_REQUIRED',
    transitionAuthority: trusted ? 'JMP lifecycle registry v1.0 + Wave 1 canonical authority fields' : 'Wave 1 canonical authority boundary',
    transitionEvidence: trusted
      ? `Projected from ${classification} record using ${mapping.resultCode}.`
      : `Projection suppressed because ${classification} is not proven current operational authority.`,
  }
}

function normalizeAuthorityClassification(value?: string) {
  const normalized = normalize(value || '')
  if (!normalized) return 'UNCLASSIFIED_LEGACY_COMPATIBILITY'
  if (normalized.includes('CANONICAL_CURRENT')) return 'CANONICAL_CURRENT_TITLE'
  if (normalized.includes('CANONICAL_PUBLISHED')) return 'CANONICAL_PUBLISHED_TITLE'
  if (normalized.includes('CANONICAL_EDITION')) return 'CANONICAL_EDITION'
  if (normalized.includes('DUPLICATE')) return 'DUPLICATE_RECORD'
  if (normalized.includes('LEGACY')) return 'LEGACY_TITLE_RECORD'
  if (normalized.includes('PLACEHOLDER')) return 'PLACEHOLDER'
  if (normalized.includes('HISTORICAL')) return 'HISTORICAL_VERSION'
  if (normalized.includes('ORPHAN')) return 'ORPHAN'
  if (normalized.includes('REQUIRES_RECONCILIATION') || normalized.includes('RECONCILIATION')) return 'REQUIRES_RECONCILIATION'
  return value || 'UNKNOWN'
}

function waveC1EvidenceAuthorityFor(
  input: CanonicalPublisherProjectionInput,
  artifact: CanonicalPublisherReadModel['sourceArtifact'],
): CanonicalPublisherReadModel['waveC1EvidenceAuthority'] {
  const artifactAuthority = evaluateWaveC1ArtifactAuthority({
    artifactId: artifact.artifactId === 'DATA_GAP' ? '' : artifact.artifactId,
    artifactType: artifact.artifactType,
    artifactStatus: artifact.certificationState,
    artifactTitleId: input.titleId,
    expectedTitleId: input.titleId,
    evidenceSource: input.artifactEvidenceSource || artifact.source,
    storageReference: input.artifactStorageReference || artifact.artifactId,
    checksum: artifact.checksum === 'DATA_GAP' ? '' : artifact.checksum,
    checksumAlgorithm: input.artifactChecksumAlgorithm,
    version: artifact.version,
    current: input.evidenceLinks?.[0]?.current,
    byteReadable: input.artifactByteReadable,
    derivedFromArtifactId: input.derivedFromArtifactId,
    duplicateCurrentCount: input.duplicateCurrentArtifactCount,
    checksumMismatch: input.artifactChecksumMismatch,
  })
  const commercialAuthority = evaluateWaveC1CommercialAuthority({
    packageState: input.packageState,
    commercialEvidenceText: input.commercialEvidenceText,
    pricingEvidenceText: input.pricingEvidenceText,
    agreementEvidenceText: input.agreementEvidenceText,
    agreementDocumentAvailable: input.agreementDocumentAvailable,
    contractStatus: input.contractStatus,
    providerStatus: input.providerStatus,
    signedDate: input.signedDate,
    agreementExecutionLog: input.agreementExecutionLog,
    paymentEvidenceText: input.paymentEvidenceText,
    firstPaymentStatus: input.firstPaymentStatus,
    firstPaymentConfirmedOn: input.firstPaymentConfirmedOn,
    firstPaymentConfirmationSource: input.firstPaymentConfirmationSource,
    successfulPaymentEvent: input.successfulPaymentEvent,
    requiredInitialPayment: input.requiredInitialPayment,
    correctCommercialContext: input.correctCommercialContext,
    joinedFamilyEvidenceText: input.joinedFamilyEvidenceText,
    joinedFamilyEvent: input.joinedFamilyEvent,
  })
  const workspaceAuthority = evaluateWaveC1WorkspaceAuthority({
    authorRelationshipState: relationshipStateFor(input),
    joinedFamilyEvent: input.joinedFamilyEvent,
    entitlementEvidenceText: input.workspaceEntitlementState,
    workspaceProvisioningEvidenceText: input.workspaceProvisioningEvidenceText,
    workspaceActiveEvidenceText: input.workspaceState,
    onboardingState: input.onboardingState,
  })
  const formats = (input.activeFormats?.length ? input.activeFormats : ['Paperback', 'Hardcover', 'Ebook', 'Audiobook']).map((format) =>
    evaluateWaveC1FormatAuthority({
      format,
      identityEvidenceText: input.formatEvidenceText,
      distributionEvidenceText: input.formatEvidenceText,
      liveUrl: input.formatEvidenceText?.match(/https?:\/\/\S+/)?.[0],
      liveState: input.legacySourceState,
      certificationEvidenceText: input.formatEvidenceText,
    }),
  )
  const royalty = waveC1RoyaltyReadiness()
  return {
    artifact: artifactAuthority,
    commercial: commercialAuthority,
    workspace: workspaceAuthority,
    formats,
    royalty,
    controlledWriteAuthorityEligible: commercialAuthority.controlledWriteAuthorityEligible,
  }
}

function legacyMappingInputForState(value: string, input: Partial<CanonicalPublisherProjectionInput>): LegacyMappingInput {
  const code = legacyCodeForState(value)
  return {
    legacyAuthority: code.startsWith('J')
      ? 'Pipeline Register J0-J8'
      : code === 'PACKAGE_ACCEPTED'
        ? 'Opportunity/Commercial'
        : input.legacyAuthority || 'PackageStageCode',
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
  if (normalized.includes('JOINED') || normalized.includes('FAMILY')) return 'J4 Onboarding'
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
    artifactType: first.artifactType || mapping.canonicalSubstage || mapping.canonicalStage || 'SOURCE_EVIDENCE',
    artifactId: first.href,
    checksum: first.checksum || checksumFromText(`${first.label} ${first.href}`) || 'DATA_GAP',
    version: first.version || input.qaState || 'Current',
    certificationState: input.packageState || 'DATA_GAP',
    source: first.label,
  }
}

function lifecycleEvidenceFor(
  input: CanonicalPublisherProjectionInput,
  mapping: LegacyMappingResult,
  artifact: CanonicalPublisherReadModel['sourceArtifact'],
): CanonicalPublisherReadModel['lifecycleEvidence'] {
  const artifactLinks = input.evidenceLinks || []
  const sourceText = [
    input.legacySourceState,
    input.pipelineStage,
    input.editorialStage,
    input.substage,
    input.packageState,
    input.qaState,
    input.dependency,
    input.portfolioState,
    input.commercialEvidenceText,
    input.formatEvidenceText,
    ...artifactLinks.flatMap((link) => [link.label, link.href, link.checksum || '', link.version || '']),
  ].join(' ')
  const commercialText = `${input.packageState || ''} ${input.dependency || ''} ${input.portfolioState || ''} ${input.commercialEvidenceText || ''}`
  const artifactIdentity = artifact.artifactId === 'DATA_GAP'
    ? dataGapFacet('No governing artifact identifier is surfaced by the current read-model item.', 'Artifact Registry', 'RESOLVABLE')
    : supportedFacet(artifact.artifactId, artifact.source, 'Artifact identifier is surfaced by an evidence link.', mapping.resultCode === 'CANONICAL_MAPPING_CONTEXTUAL' ? 'CONTEXTUAL' : 'DETERMINISTIC')
  const artifactChecksum = artifact.checksum === 'DATA_GAP'
    ? dataGapFacet('Checksum is not available on the surfaced artifact evidence.', 'Artifact Registry checksum field', 'RESOLVABLE')
    : supportedFacet(artifact.checksum, artifact.source, 'Checksum is attached to the governing artifact evidence.')
  const artifactProvenance = artifactLinks.length
    ? supportedFacet(artifactLinks.map((link) => link.label).join('; '), 'Publisher Operating Center evidence links', 'Artifact provenance is traceable to surfaced source links.', 'CONTEXTUAL')
    : dataGapFacet('No provenance link is surfaced for the governing artifact.', 'Dataverse/SharePoint artifact lineage', 'RESOLVABLE')
  const currentVersion = artifactLinks.some((link) => link.current === false) || /superseded|obsolete|replaced/i.test(sourceText)
    ? conflictFacet('Superseded artifact evidence is present; current governing version must be confirmed.', 'Artifact lineage')
    : artifact.artifactId === 'DATA_GAP'
      ? dataGapFacet('Current version cannot be determined without a governing artifact.', 'Artifact Registry current-version flag', 'RESOLVABLE')
      : supportedFacet(artifact.version, artifact.source, 'Current artifact version is projected from surfaced QA/version evidence.', 'CONTEXTUAL')
  const ambiguity = mapping.resultCode === 'CANONICAL_MAPPING_CONFLICT'
    ? conflictFacet(mapping.notes, 'Lifecycle mapping registry')
    : /conflict|split.?brain|ambiguous/i.test(sourceText)
      ? conflictFacet('Source evidence contains ambiguity or conflict markers.', 'Operating Center source evidence')
      : supportedFacet('No surfaced artifact ambiguity', 'Publisher Operating Center read model', 'No artifact ambiguity is surfaced in this item.', 'CONTEXTUAL')

  const relationship = relationshipStateFor(input) === 'DATA_GAP'
    ? dataGapFacet('Author relationship state is not explicitly recorded.', 'Author relationship registry', 'STRUCTURAL')
    : supportedFacet(relationshipStateFor(input), 'Lifecycle projection', 'Relationship is projected independently from title stage.', 'CONTEXTUAL')
  const entitlement = input.workspaceEntitlementState
    ? supportedFacet(input.workspaceEntitlementState, 'Workspace entitlement source', 'Workspace entitlement evidence is surfaced.')
    : dataGapFacet('Workspace entitlement is not present in the current title projection.', 'Author workspace entitlement registry', 'STRUCTURAL')
  const activeWorkspace = input.workspaceState
    ? supportedFacet(input.workspaceState, 'Author workspace source', 'Workspace active-state evidence is surfaced.')
    : dataGapFacet('Workspace active state is not present in the current title projection.', 'Author workspace registry', 'STRUCTURAL')
  const onboarding = input.onboardingState
    ? supportedFacet(input.onboardingState, 'Author onboarding source', 'Onboarding state evidence is surfaced.')
    : dataGapFacet('Onboarding nuance is not present in the current title projection.', 'Author onboarding registry', 'STRUCTURAL')

  const packageAccepted = evidenceFromRegex(commercialText, /package accepted/i, 'Package accepted', 'Package acceptance evidence is surfaced.', 'Commercial package event ledger')
  const pricingLocked = evidenceFromRegex(commercialText, /pricing locked|locked price|price locked|quote locked/i, 'Pricing locked', 'Pricing lock evidence is surfaced.', 'Commercial pricing ledger')
  const agreementExecuted = evidenceFromRegex(commercialText, /agreement executed|agreement signed|signed agreement|contract executed/i, 'Agreement executed', 'Agreement execution evidence is surfaced.', 'Agreement ledger')
  const initialPayment = evidenceFromRegex(commercialText, /initial payment|first payment|deposit|paid/i, 'Initial payment', 'Initial payment evidence is surfaced.', 'Stripe payment ledger')
  const installments = evidenceFromRegex(commercialText, /\b(2|4|8)[- ]?pay\b|installment/i, paymentPlanFor(input), 'Installment plan evidence is surfaced.', 'Stripe payment ledger')
  const joinedFamily = joinedFamilyFor(input).value === 'YES'
    ? agreementExecuted.status === 'SUPPORTED' && initialPayment.status === 'SUPPORTED'
      ? supportedFacet('Joined the Family', 'Commercial event chain', 'Joined the Family is supported by agreement and payment evidence.')
      : conflictFacet('Joined the Family is surfaced without both agreement execution and initial payment evidence.', 'Commercial event chain')
    : joinedFamilyFor(input).value === 'NO'
      ? supportedFacet('Not Joined the Family', 'Commercial event chain', joinedFamilyFor(input).reason, 'CONTEXTUAL')
      : dataGapFacet(joinedFamilyFor(input).reason, 'Agreement plus initial payment ledgers', 'STRUCTURAL')

  const formats = formatEvidenceFor(input)
  const readinessContracts = readinessContractsFor(input, mapping, {
    packageAccepted,
    agreementExecuted,
    initialPayment,
    formats,
    artifactIdentity,
  })
  const coverage = {
    artifactIdentity: artifactIdentity.status,
    artifactChecksum: artifactChecksum.status,
    artifactProvenance: artifactProvenance.status,
    workspaceEntitlement: entitlement.status,
    workspaceActive: activeWorkspace.status,
    onboarding: onboarding.status,
    packageAccepted: packageAccepted.status,
    pricingLocked: pricingLocked.status,
    agreementExecuted: agreementExecuted.status,
    payment: initialPayment.status,
    joinedFamily: joinedFamily.status,
    formatIdentity: aggregateStatus(formats.map((format) => format.identity.status)),
    formatDistribution: aggregateStatus(formats.map((format) => format.distribution.status)),
    certification: aggregateStatus(formats.map((format) => format.certification.status)),
  }
  const allStatuses = [
    artifactIdentity,
    artifactChecksum,
    artifactProvenance,
    currentVersion,
    ambiguity,
    relationship,
    entitlement,
    activeWorkspace,
    onboarding,
    packageAccepted,
    pricingLocked,
    agreementExecuted,
    initialPayment,
    installments,
    joinedFamily,
    ...Object.values(readinessContracts),
    ...formats.flatMap((format) => [format.identity, format.distribution, format.certification, format.verifiedUrl]),
  ].map((facet) => facet.status)

  return {
    artifact: {
      identity: artifactIdentity,
      checksum: artifactChecksum,
      provenance: artifactProvenance,
      currentVersion,
      ambiguity,
    },
    authorWorkspace: {
      relationship,
      entitlement,
      activeWorkspace,
      onboarding,
    },
    commercial: {
      packageAccepted,
      pricingLocked,
      agreementExecuted,
      initialPayment,
      installments,
      joinedFamily,
    },
    formats,
    readinessContracts,
    coverage,
    conflictCount: allStatuses.filter((status) => status === 'CONFLICT').length,
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

function readinessContractsFor(
  input: CanonicalPublisherProjectionInput,
  mapping: LegacyMappingResult,
  evidence: {
    packageAccepted: CanonicalEvidenceFacet
    agreementExecuted: CanonicalEvidenceFacet
    initialPayment: CanonicalEvidenceFacet
    formats: CanonicalPublisherReadModel['lifecycleEvidence']['formats']
    artifactIdentity: CanonicalEvidenceFacet
  },
): CanonicalPublisherReadModel['lifecycleEvidence']['readinessContracts'] {
  const readiness = readinessFor(input, mapping)
  return {
    editorial: readinessFacet(readiness.editorial, evidence.artifactIdentity, 'Editorial readiness requires a governing editorial artifact and non-conflicting lifecycle stage.'),
    bookProduction: readinessFacet(readiness.bookProduction, evidence.artifactIdentity, 'Book production readiness requires current production artifact evidence.'),
    metadata: readiness.metadata === 'READY'
      ? supportedFacet('Metadata ready', 'Lifecycle projection', 'Metadata readiness is surfaced by title state.', 'CONTEXTUAL')
      : dataGapFacet('Metadata readiness is not supported by surfaced evidence.', 'Metadata readiness registry', 'RESOLVABLE'),
    distribution: readiness.distribution === 'READY' && evidence.formats.some((format) => format.distribution.status === 'SUPPORTED')
      ? supportedFacet('Distribution ready', 'Format distribution evidence', 'At least one format has distribution evidence.')
      : dataGapFacet('Distribution readiness is not supported by format-level release evidence.', 'Distribution platform registry', 'STRUCTURAL'),
    royaltyPayout: readiness.royaltyPayout === 'READY'
      ? supportedFacet('Royalty payout review surfaced', 'Royalty decision read model', 'Royalty readiness is surfaced by post-publication state.', 'CONTEXTUAL')
      : dataGapFacet('Royalty payout readiness remains outside the Operating Center title projection.', 'Stripe Connect / royalty payout registry', 'STRUCTURAL'),
    finalDeliveryPayment: evidence.agreementExecuted.status === 'SUPPORTED' && evidence.initialPayment.status === 'SUPPORTED'
      ? supportedFacet('Final delivery payment prerequisites partially surfaced', 'Commercial evidence chain', 'Agreement and initial payment evidence are surfaced.', 'CONTEXTUAL')
      : dataGapFacet('Final delivery payment readiness lacks complete agreement/payment evidence.', 'Commercial payment ledger', 'STRUCTURAL'),
  }
}

function readinessFacet(
  readiness: CanonicalReadinessState,
  evidence: CanonicalEvidenceFacet,
  reason: string,
): CanonicalEvidenceFacet {
  if (readiness === 'BLOCKED') return conflictFacet('Readiness is blocked by lifecycle mapping conflict or incomplete mapping.', 'Lifecycle registry')
  if (readiness === 'READY' && evidence.status === 'SUPPORTED') return supportedFacet('READY', evidence.evidence[0]?.source || 'Readiness projection', reason, evidence.evidence[0]?.confidence || 'CONTEXTUAL')
  if (readiness === 'NOT_APPLICABLE') return { status: 'NOT_APPLICABLE', value: 'NOT_APPLICABLE', reason, evidence: [] }
  return dataGapFacet(reason, 'Canonical readiness evidence', 'RESOLVABLE')
}

function formatEvidenceFor(input: CanonicalPublisherProjectionInput): CanonicalPublisherReadModel['lifecycleEvidence']['formats'] {
  const formats = input.activeFormats?.length ? input.activeFormats : ['Paperback', 'Hardcover', 'Ebook', 'Audiobook']
  const text = `${input.legacySourceState} ${input.pipelineStage || ''} ${input.substage || ''} ${input.packageState || ''} ${input.formatEvidenceText || ''}`
  return formats.map((format) => {
    const formatPattern = new RegExp(format.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const formatSeen = formatPattern.test(text) || Boolean(input.activeFormats?.includes(format))
    const formatContext = evidenceContextForFormat(input.formatEvidenceText || text, format)
    const distributionReady = formatContext !== '' && /submitted|live|released|catalog|distribution|published/i.test(formatContext)
    const certified = formatContext !== '' && /certified|approved|ready/i.test(formatContext)
    const verifiedUrl = formatContext !== '' && /https?:\/\//i.test(formatContext)
    return {
      format,
      identity: formatSeen
        ? supportedFacet(format, 'Format projection', 'Format identity is surfaced by active format or format evidence.', 'CONTEXTUAL')
        : dataGapFacet(`No ${format} identity evidence is surfaced.`, 'Format registry', 'STRUCTURAL'),
      distribution: distributionReady
        ? supportedFacet('Distribution evidence surfaced', 'Distribution evidence', `${format} distribution state is surfaced.`, 'CONTEXTUAL')
        : dataGapFacet(`${format} distribution/live state is not surfaced.`, 'Distribution platform registry', 'STRUCTURAL'),
      certification: certified
        ? supportedFacet('Certification evidence surfaced', 'Readiness evidence', `${format} certification/readiness evidence is surfaced.`, 'CONTEXTUAL')
        : dataGapFacet(`${format} certification evidence is not surfaced.`, 'Certification/readiness ledger', 'STRUCTURAL'),
      verifiedUrl: verifiedUrl
        ? supportedFacet('Verified URL surfaced', 'Distribution evidence', `${format} verified URL evidence is surfaced.`, 'CONTEXTUAL')
        : dataGapFacet(`${format} verified URL is not surfaced.`, 'Distribution platform URL registry', 'STRUCTURAL'),
    }
  })
}

function evidenceContextForFormat(text: string, format: string) {
  return text
    .split(/[.;\n]/)
    .filter((part) => new RegExp(format.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(part))
    .join(' ')
}

function evidenceFromRegex(text: string, pattern: RegExp, value: string, reason: string, expectedSource: string): CanonicalEvidenceFacet {
  return pattern.test(text)
    ? supportedFacet(value, expectedSource, reason, 'CONTEXTUAL')
    : dataGapFacet(`${reason.replace(' is surfaced.', '')} is not surfaced.`, expectedSource, 'STRUCTURAL')
}

function supportedFacet(
  value: string,
  source: string,
  reason: string,
  confidence: CanonicalEvidenceRecord['confidence'] = 'DETERMINISTIC',
): CanonicalEvidenceFacet {
  return {
    status: 'SUPPORTED',
    value: value || 'SUPPORTED',
    reason,
    evidence: [{ source, value: value || 'SUPPORTED', confidence }],
  }
}

function conflictFacet(reason: string, source: string): CanonicalEvidenceFacet {
  return {
    status: 'CONFLICT',
    value: 'CONFLICT',
    reason,
    evidence: [{ source, value: reason, confidence: 'CONFLICT' }],
  }
}

function dataGapFacet(reason: string, source: string, classification: CanonicalDataGapClassification): CanonicalEvidenceFacet {
  return {
    status: 'INCOMPLETE',
    value: 'DATA_GAP',
    reason,
    dataGapReason: reason,
    gapClassification: classification,
    evidence: [{ source, value: 'DATA_GAP', confidence: 'INCOMPLETE' }],
  }
}

function aggregateStatus(statuses: CanonicalEvidenceStatus[]): CanonicalEvidenceStatus {
  if (statuses.includes('CONFLICT')) return 'CONFLICT'
  if (statuses.length && statuses.every((status) => status === 'SUPPORTED')) return 'SUPPORTED'
  if (statuses.length && statuses.every((status) => status === 'NOT_APPLICABLE')) return 'NOT_APPLICABLE'
  return 'INCOMPLETE'
}

function checksumFromText(text: string) {
  return text.match(/\b[a-f0-9]{64}\b/i)?.[0] || ''
}

function dataGapsFor(input: CanonicalPublisherProjectionInput): CanonicalPublisherReadModel['dataGaps'] {
  const gaps: CanonicalPublisherReadModel['dataGaps'] = []
  const checksumAvailable = input.evidenceLinks?.some((link) => link.checksum || checksumFromText(`${link.label} ${link.href}`)) || false
  if (!input.evidenceLinks?.length) {
    gaps.push({
      field: 'sourceChecksum',
      expectedSource: 'Artifact Registry',
      currentSource: 'Publisher Operating Center evidence links',
      available: false,
      remediationWave: 'Wave C - artifact authority binding',
      reason: 'No artifact evidence link is available to carry checksum/provenance.',
      classification: 'RESOLVABLE',
    })
  } else if (!checksumAvailable) {
    gaps.push({
      field: 'sourceChecksum',
      expectedSource: 'Artifact Registry',
      currentSource: 'Publisher Operating Center evidence links',
      available: false,
      remediationWave: 'Wave C - artifact checksum completion',
      reason: 'Artifact identity is present, but checksum is not attached.',
      classification: 'RESOLVABLE',
    })
  }
  if (!input.workspaceState || !input.workspaceEntitlementState || !input.onboardingState) {
    gaps.push({
      field: 'workspaceEntitlementActiveOnboarding',
      expectedSource: 'Author workspace and onboarding registries',
      currentSource: 'Publisher Operating Center title projection',
      available: false,
      remediationWave: 'Wave C - author workspace evidence completion',
      reason: 'Workspace active state, entitlement, or onboarding nuance is not surfaced on the title item.',
      classification: 'STRUCTURAL',
    })
  }
  gaps.push({
    field: 'royaltyPayoutReadiness',
    expectedSource: 'Stripe Connect / royalty payout registry',
    currentSource: 'Royalty decision read model',
    available: /royalt/i.test(`${input.pipelineStage || ''} ${input.editorialStage || ''}`),
    remediationWave: 'Wave D - royalty payout canonicalization',
    reason: 'Royalty payout readiness requires the payout registry, not only title lifecycle evidence.',
    classification: 'STRUCTURAL',
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
