import {
  JMP_PUBLISHING_LIFECYCLE_REGISTRY,
  SYSTEM_ATTENTION_CODES,
  WAITING_OWNERS,
  flattenSubstages,
  type ArtifactType,
  type CommercialState,
  type ExecutionStatus,
  type RelationshipState,
  type StageApplicability,
  type StageCode,
  type SubstageCode,
  type SystemAttentionCode,
  type WaitingOwner,
} from './registry'

export type LifecycleValidationCode =
  | 'OK'
  | 'INVALID_STAGE'
  | 'INVALID_SUBSTAGE'
  | 'INVALID_TRANSITION'
  | 'REQUIRED_STAGE_NOT_COMPLETE'
  | 'REQUIRED_ARTIFACT_MISSING'
  | 'REQUIRED_AUTHOR_GATE_MISSING'
  | 'REQUIRED_COMMERCIAL_GATE_MISSING'
  | 'STAGE_NOT_APPLICABLE'
  | 'LIFECYCLE_MAPPING_CONFLICT'
  | 'INVALID_WAITING_OWNER'
  | 'INVALID_SYSTEM_ATTENTION'

export type ValidationResult = {
  ok: boolean
  code: LifecycleValidationCode
  reason: string
}

export type ArtifactEvidence = {
  artifactId: string
  artifactType: ArtifactType
  checksum: string
  version?: string
  derivedFrom?: string
  certificationState?: 'DRAFT' | 'CERTIFIED'
  approvalState?: 'PENDING' | 'APPROVED' | 'REJECTED'
}

export type HumanGateEvidence = {
  decisionMaker: string
  decision: 'APPROVE' | 'REQUEST_REVISION' | 'REQUEST_CLARIFICATION' | 'HOLD' | 'DECLINE' | 'AMBIGUOUS'
  channel: 'email' | 'portal' | 'phone/verbal' | 'other approved channel'
  occurredOn: string
  recordedBy: string
  artifactId: string
  artifactChecksum: string
  artifactVersion?: string
  titleId: string
  gateId: string
  nextStageAuthorization: boolean
  replayKey?: string
}

export type TitleScope = {
  substageApplicability?: Partial<Record<SubstageCode, StageApplicability>>
  intendedFormats?: Partial<Record<'paperback' | 'hardcover' | 'ebook' | 'audiobook', 'READY' | 'PENDING' | 'NOT_APPLICABLE'>>
}

export type TransitionRequest = {
  fromStage: StageCode
  fromSubstage?: SubstageCode
  toStage: StageCode
  toSubstage?: SubstageCode
  titleScope?: TitleScope
  completedSubstages?: SubstageCode[]
  artifacts?: ArtifactEvidence[]
  humanGate?: HumanGateEvidence
  commercialStates?: CommercialState[]
  executionStatus?: ExecutionStatus
  terminalEvent?: 'RETIRED' | 'RIGHTS_REVERTED' | 'CONTRACT_EXPIRED' | 'TERMINATED'
}

export type LifecycleStateCombination = {
  commercial?: CommercialState
  titleStage?: StageCode
  titleSubstage?: SubstageCode
  relationship?: RelationshipState
}

const substageIndex = new Map(flattenSubstages().map(({ stage, substage }) => [substage.substageCode, { stage, substage }]))

const stageIndex = new Map(JMP_PUBLISHING_LIFECYCLE_REGISTRY.map((stage) => [stage.stageCode, stage]))

export function getCanonicalStage(stageCode: string) {
  return stageIndex.get(stageCode as StageCode) || null
}

export function getCanonicalSubstage(substageCode: string) {
  return substageIndex.get(substageCode as SubstageCode) || null
}

export function validateWaitingOwner(value: string): ValidationResult {
  return (WAITING_OWNERS as readonly string[]).includes(value)
    ? ok(`Waiting owner ${value} is governed.`)
    : fail('INVALID_WAITING_OWNER', `Waiting owner ${value || '[empty]'} is not governed.`)
}

export function validateSystemAttention(value: string): ValidationResult {
  return (SYSTEM_ATTENTION_CODES as readonly string[]).includes(value)
    ? ok(`System Attention ${value} is governed.`)
    : fail('INVALID_SYSTEM_ATTENTION', `System Attention ${value || '[empty]'} is not governed.`)
}

export function validateWaitingOwnerAndSystemAttention(input: {
  waitingOn: WaitingOwner | string
  systemAttention: SystemAttentionCode | string
}): ValidationResult {
  const waiting = validateWaitingOwner(input.waitingOn)
  if (!waiting.ok) return waiting
  const attention = validateSystemAttention(input.systemAttention)
  if (!attention.ok) return attention
  return ok('Waiting On and System Attention are independently valid; neither rewrites the other.')
}

export function isStageApplicable(scope: TitleScope | undefined, substageCode: SubstageCode): boolean {
  return scope?.substageApplicability?.[substageCode] !== 'NOT_APPLICABLE'
}

export function evaluateJoinedFamily(states: CommercialState[] = []): {
  joined: boolean
  reason: string
} {
  const agreement = states.includes('AGREEMENT_EXECUTED')
  const initialPayment = states.includes('INITIAL_PAYMENT_RECEIVED')
  if (agreement && initialPayment) {
    return { joined: true, reason: 'Agreement executed plus required initial payment received equals JOINED_THE_FAMILY.' }
  }
  if (agreement) return { joined: false, reason: 'Agreement executed only is not JOINED_THE_FAMILY.' }
  if (initialPayment) return { joined: false, reason: 'Initial payment received only is not JOINED_THE_FAMILY.' }
  if (states.includes('PACKAGE_ACCEPTED')) return { joined: false, reason: 'Package accepted is not JOINED_THE_FAMILY.' }
  return { joined: false, reason: 'Joined the Family prerequisites are missing.' }
}

export function validateLifecycleStateCombination(_input: LifecycleStateCombination): ValidationResult {
  return ok('Commercial, title, and author relationship states may differ without contradiction.')
}

export function validateHumanGate(gate: HumanGateEvidence | undefined, artifact: ArtifactEvidence | undefined): ValidationResult {
  if (!gate) return fail('REQUIRED_AUTHOR_GATE_MISSING', 'Required author/human gate evidence is missing.')
  if (!gate.decisionMaker || !gate.occurredOn || !gate.recordedBy || !gate.gateId) {
    return fail('REQUIRED_AUTHOR_GATE_MISSING', 'Required author/human gate fields are incomplete.')
  }
  if (gate.decision !== 'APPROVE') {
    return fail('REQUIRED_AUTHOR_GATE_MISSING', `Decision ${gate.decision} does not authorize next stage.`)
  }
  if (!gate.nextStageAuthorization) {
    return fail('REQUIRED_AUTHOR_GATE_MISSING', 'Gate does not authorize next stage.')
  }
  if (!artifact) return fail('REQUIRED_ARTIFACT_MISSING', 'Approval cannot be validated without artifact evidence.')
  if (gate.artifactId !== artifact.artifactId) {
    return fail('REQUIRED_AUTHOR_GATE_MISSING', 'Approval is bound to a different artifact.')
  }
  if (gate.artifactChecksum !== artifact.checksum) {
    return fail('REQUIRED_AUTHOR_GATE_MISSING', 'Approval checksum does not match artifact checksum.')
  }
  return ok(`Valid ${gate.channel} approval is bound to artifact ${artifact.artifactId}.`)
}

export function isTransitionAllowed(input: TransitionRequest): boolean {
  return validateTransition(input).ok
}

export function validateTransition(input: TransitionRequest): ValidationResult {
  const from = getCanonicalStage(input.fromStage)
  const to = getCanonicalStage(input.toStage)
  if (!from) return fail('INVALID_STAGE', `Invalid fromStage ${input.fromStage}.`)
  if (!to) return fail('INVALID_STAGE', `Invalid toStage ${input.toStage}.`)

  if (input.fromSubstage && !getCanonicalSubstage(input.fromSubstage)) {
    return fail('INVALID_SUBSTAGE', `Invalid fromSubstage ${input.fromSubstage}.`)
  }
  if (input.toSubstage && !getCanonicalSubstage(input.toSubstage)) {
    return fail('INVALID_SUBSTAGE', `Invalid toSubstage ${input.toSubstage}.`)
  }
  if (input.toSubstage && !isStageApplicable(input.titleScope, input.toSubstage)) {
    return fail('STAGE_NOT_APPLICABLE', `${input.toSubstage} is not applicable for this title scope.`)
  }

  if (input.fromStage === 'INQUIRY_INTAKE' && input.toSubstage === 'PRODUCTION_FINALIZATION') {
    return fail('INVALID_TRANSITION', 'Intake cannot transition directly to Production Finalization.')
  }

  if (input.toStage === 'AUTHOR_ONBOARDING' && input.toSubstage === 'JOINED_THE_FAMILY') {
    const joined = evaluateJoinedFamily(input.commercialStates)
    return joined.joined ? ok(joined.reason) : fail('REQUIRED_COMMERCIAL_GATE_MISSING', joined.reason)
  }

  if (input.toSubstage === 'LINE_EDITING') {
    if (isStageApplicable(input.titleScope, 'DEVELOPMENTAL_EDITING')) {
      const approvedDevelopmental = findArtifact(input, 'APPROVED_DEVELOPMENTAL_ARTIFACT')
      if (!approvedDevelopmental) {
        return fail('REQUIRED_ARTIFACT_MISSING', 'Line Editing requires an approved Developmental artifact when Developmental applies.')
      }
    }
    return ok('Line Editing transition is allowed for this title scope.')
  }

  if (input.toSubstage === 'COPYEDITING') {
    if (isStageApplicable(input.titleScope, 'LINE_EDITING')) {
      const approvedLine = findArtifact(input, 'APPROVED_LINE_ARTIFACT')
      if (!approvedLine) return fail('REQUIRED_ARTIFACT_MISSING', 'Copyediting requires an approved Line artifact when Line applies.')
    }
    return ok('Copyediting transition is allowed for this title scope.')
  }

  if (input.fromSubstage === 'PROOFREADING' && input.toSubstage === 'INTERIOR_LAYOUT') {
    return fail('INVALID_TRANSITION', 'Proofreading cannot transition backward to Interior Layout.')
  }

  if (input.fromSubstage === 'COPY_AUTHOR_REVIEW' && input.toSubstage === 'PROOFREADING') {
    return fail('INVALID_TRANSITION', 'Copy approval cannot transition to Proof without Layout.')
  }

  if (input.toSubstage === 'PROOFREADING') {
    const layout = findArtifact(input, 'LAYOUT_ARTIFACT')
    if (!layout) return fail('REQUIRED_ARTIFACT_MISSING', 'Proofreading requires an Interior Layout artifact.')
    return ok('Proofreading transition has required Layout artifact.')
  }

  if (input.toSubstage === 'FINAL_AUTHOR_APPROVAL') {
    const proof = findArtifact(input, 'PROOF_ARTIFACT')
    const gate = validateHumanGate(input.humanGate, proof)
    return gate.ok ? ok('Final Author Approval has proof artifact and valid gate.') : gate
  }

  if (input.toSubstage === 'PRODUCTION_FINALIZATION') {
    const finalInterior = findArtifact(input, 'FINAL_INTERIOR')
    if (!finalInterior) return fail('REQUIRED_ARTIFACT_MISSING', 'Production Finalization requires Final Interior artifact.')
    if (!input.completedSubstages?.includes('FINAL_AUTHOR_APPROVAL')) {
      return fail('REQUIRED_STAGE_NOT_COMPLETE', 'Production Finalization requires Final Author Approval.')
    }
    return ok('Production Finalization prerequisites are satisfied.')
  }

  if (input.fromStage === 'POST_PUBLICATION' && input.toStage === 'DISTRIBUTION_RELEASE') {
    return fail('INVALID_TRANSITION', 'Post-publication workstreams do not push the title back into Stage 09.')
  }

  if (input.toStage === 'DISTRIBUTION_RELEASE') {
    const distributionArtifact = findArtifact(input, 'DISTRIBUTION_ARTIFACT')
    if (!distributionArtifact) {
      return fail('REQUIRED_ARTIFACT_MISSING', 'Distribution requested but certified distribution artifact is missing.')
    }
    return ok('Distribution transition has required artifact evidence.')
  }

  return ok('Transition is allowed by canonical lifecycle registry.')
}

export function validateParallelPreparatoryWork(input: {
  titleStage: StageCode
  activities: Array<'COVER_CONCEPT' | 'METADATA_DRAFT' | 'MARKETING_PREPARATION' | 'DISTRIBUTION_PREPARATION' | 'FULL_WRAP_FINALIZED'>
  artifacts?: ArtifactEvidence[]
}): ValidationResult {
  if (input.activities.includes('FULL_WRAP_FINALIZED') && !input.artifacts?.some((artifact) => artifact.artifactType === 'FINAL_INTERIOR')) {
    return fail('REQUIRED_ARTIFACT_MISSING', 'Full wrap finalization requires final page count/spine/specifications from final interior.')
  }
  return ok('Parallel preparatory work is allowed without advancing title lifecycle stage.')
}

export function validateStage10Workstream(event: 'ROYALTY_EVENT' | 'METADATA_UPDATE' | 'SALES_IMPORT' | 'MARKETING_OPPORTUNITY' | 'TERMINAL_EVENT'): ValidationResult {
  if (event === 'TERMINAL_EVENT') return ok('Governed terminal event may end Stage 10 according to future policy.')
  return ok(`${event} remains inside persistent POST_PUBLICATION stewardship.`)
}

function findArtifact(input: TransitionRequest, artifactType: ArtifactType) {
  return input.artifacts?.find((artifact) => artifact.artifactType === artifactType)
}

function ok(reason: string): ValidationResult {
  return { ok: true, code: 'OK', reason }
}

function fail(code: LifecycleValidationCode, reason: string): ValidationResult {
  return { ok: false, code, reason }
}
