import {
  EDITORIAL_SYSTEM_STAGE_CONTRACTS,
  evaluateStageCompletion,
  type StageCompletionEvidence,
} from './editorial-system-contract'
import { validatePublishingStageEvent, type PublishingStageEvent } from './stage-runtime-event'
import type { HumanPipelineStageId } from './human-pipeline-read-model'

export type StageRuntimePhase =
  | 'WAITING' | 'ELIGIBLE' | 'RUNNING' | 'HUMAN_HOLD' | 'EXTERNAL_HOLD'
  | 'FAILED' | 'RETRY_WAIT' | 'COMPLETED' | 'ADVANCED'

export type StageRuntimeState = {
  titleId: string
  stageId: string
  stageCode: HumanPipelineStageId
  executionId: string
  phase: StageRuntimePhase
  gateEvidenceReference?: string
  completionEvidenceReference?: string
  lastEventKey?: string
  nextStage?: HumanPipelineStageId | 'PERSISTENT_STEWARDSHIP' | 'TERMINAL_BY_GOVERNED_EVENT'
}

function deny(reason: string): never {
  throw new Error(`PUBLISHING_STAGE_RUNTIME_${reason}`)
}

function requirePhase(state: StageRuntimeState, phases: StageRuntimePhase[]) {
  if (!phases.includes(state.phase)) deny(`INVALID_TRANSITION_FROM_${state.phase}`)
}

export function reducePublishingStageEvent(
  state: StageRuntimeState,
  event: PublishingStageEvent,
  completionEvidence?: StageCompletionEvidence,
): StageRuntimeState {
  validatePublishingStageEvent(event)
  if (state.titleId.toLowerCase() !== event.titleId.toLowerCase() ||
      state.stageId.toLowerCase() !== event.stageId.toLowerCase() ||
      state.stageCode !== event.stageCode || state.executionId !== event.executionId) {
    deny('CORRELATION_MISMATCH')
  }
  if (state.lastEventKey === event.idempotencyKey) return state
  const next = { ...state, lastEventKey: event.idempotencyKey }
  switch (event.eventType) {
    case 'STAGE_ELIGIBLE':
      requirePhase(state, ['WAITING'])
      return { ...next, phase: 'ELIGIBLE' }
    case 'STAGE_STARTED':
      requirePhase(state, ['ELIGIBLE', 'RETRY_WAIT'])
      return { ...next, phase: 'RUNNING' }
    case 'STAGE_BLOCKED':
      requirePhase(state, ['ELIGIBLE', 'RUNNING'])
      return { ...next, phase: 'FAILED', gateEvidenceReference: event.evidenceReference }
    case 'HUMAN_ACTION_REQUIRED':
      requirePhase(state, ['RUNNING'])
      return { ...next, phase: 'HUMAN_HOLD', gateEvidenceReference: event.evidenceReference }
    case 'EXTERNAL_ACTION_REQUIRED':
      requirePhase(state, ['RUNNING'])
      return { ...next, phase: 'EXTERNAL_HOLD', gateEvidenceReference: event.evidenceReference }
    case 'HUMAN_ACTION_COMPLETED':
      requirePhase(state, ['HUMAN_HOLD'])
      if (!state.gateEvidenceReference) deny('HUMAN_GATE_NOT_OPEN')
      return { ...next, phase: 'RUNNING', gateEvidenceReference: undefined }
    case 'EXTERNAL_ACTION_COMPLETED':
      requirePhase(state, ['EXTERNAL_HOLD'])
      if (!state.gateEvidenceReference) deny('EXTERNAL_GATE_NOT_OPEN')
      return { ...next, phase: 'RUNNING', gateEvidenceReference: undefined }
    case 'STAGE_FAILED':
      requirePhase(state, ['RUNNING', 'ELIGIBLE'])
      return { ...next, phase: 'FAILED' }
    case 'STAGE_RETRY_SCHEDULED':
      requirePhase(state, ['FAILED'])
      return { ...next, phase: 'RETRY_WAIT' }
    case 'STAGE_COMPLETED': {
      requirePhase(state, ['RUNNING'])
      if (!completionEvidence) deny('COMPLETION_EVIDENCE_MISSING')
      const result = evaluateStageCompletion(EDITORIAL_SYSTEM_STAGE_CONTRACTS[state.stageCode], completionEvidence)
      if (!result.nextTransitionAuthorized) deny('COMPLETION_EVIDENCE_DENIED')
      return { ...next, phase: 'COMPLETED', completionEvidenceReference: event.evidenceReference }
    }
    case 'TITLE_ADVANCED': {
      requirePhase(state, ['COMPLETED'])
      if (!state.completionEvidenceReference) deny('COMPLETION_NOT_PERSISTED')
      return { ...next, phase: 'ADVANCED', nextStage: EDITORIAL_SYSTEM_STAGE_CONTRACTS[state.stageCode].nextTransition }
    }
    case 'STAGE_RECONCILED':
      requirePhase(state, ['FAILED', 'RETRY_WAIT', 'HUMAN_HOLD', 'EXTERNAL_HOLD'])
      return { ...next, phase: state.phase }
    case 'PUBLICATION_CONFIRMED':
      requirePhase(state, ['RUNNING'])
      return { ...next, phase: 'RUNNING' }
    case 'TITLE_CREATED':
      requirePhase(state, ['WAITING'])
      return { ...next, phase: 'WAITING' }
    default:
      return deny('EVENT_UNSUPPORTED')
  }
}
