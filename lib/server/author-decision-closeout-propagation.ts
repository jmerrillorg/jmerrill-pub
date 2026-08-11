import { createHash } from 'node:crypto'

import {
  closeApprovedStage,
  INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST,
  type PublishingTitleCloseoutAdapter,
  type PublishingTitleCloseoutRequest,
} from './publishing-title-closeout-service'
import {
  evaluateAuthorFinalApprovalGate,
  type AuthorFinalApprovalSemantic,
} from './author-final-approval-gate'

type Decision = 'APPROVED' | 'APPROVED_WITH_CORRECTIONS' | 'QUESTIONS' | 'REVIEW_REQUIRED'
type PropagationStatus = 'PASS' | 'HOLD'
type RootCause =
  | 'INGESTION_GAP'
  | 'CORRELATION_GAP'
  | 'DECISION_PARSING_GAP'
  | 'DECISION_PERSISTENCE_GAP'
  | 'STATE_PROJECTION_GAP'
  | 'LEGACY_MANUAL_PATH_GAP'
  | 'ARTIFACT_REGISTRATION_GAP'
  | 'CHECKSUM_GENERATION_GAP'
  | 'CHECKSUM_PERSISTENCE_GAP'
  | 'PACKAGE_ARTIFACT_LINK_GAP'
  | 'APPROVAL_ARTIFACT_LINK_GAP'

export type AuthorReviewRequest = {
  titleId: string
  stageId: string
  gateId: string
  packageId: string
  outboundMessageId: string
  correlationId: string
  sentAt: string
  nextEligibleState: string
  currentArtifactVersion?: string
  expectedArtifactChecksum?: string
  requiredArtifactIds: string[]
}

export type AuthorReplyEvent = {
  messageId: string
  inReplyToMessageId?: string
  references?: string[]
  body: string
  receivedAt: string
  titleId?: string
  stageId?: string
  gateId?: string
  packageId?: string
}

export type ReviewArtifactEvidence = {
  artifactId: string
  titleId: string
  stageId: string
  gateId?: string
  packageId?: string
  repositoryPath?: string
  repositoryItemId?: string
  sha256?: string
}

export type AwaitingGateState = {
  gateId: string
  titleId: string
  stageId: string
  awaitingSince?: string | null
}

export type PriorPropagationState = {
  decisions?: Array<{ idempotencyKey: string; decision: Decision }>
  executionEvents?: Array<{ idempotencyKey: string; actionType: string }>
  registeredArtifacts?: Array<{ artifactId: string; sha256: string }>
}

export type PropagationInput = {
  reviewRequest: AuthorReviewRequest
  reply: AuthorReplyEvent
  artifacts: ReviewArtifactEvidence[]
  gates: AwaitingGateState[]
  priorState?: PriorPropagationState
  closeoutRequest?: Partial<PublishingTitleCloseoutRequest>
}

export type PropagationResult = {
  status: PropagationStatus
  defectFamily: 'AUTHOR_DECISION_TO_PROTECTED_CLOSEOUT_EVIDENCE_PROPAGATION'
  idempotencyKey: string
  decision: Decision
  blockers: string[]
  rootCauses: RootCause[]
  authorDecisionCaptured: boolean
  awaitingStateClosed: boolean
  approvedArtifactRegistered: boolean
  checksumRegistered: boolean
  protectedCloseoutReevaluated: boolean
  protectedCloseout: 'PASS' | 'HOLD' | 'NOT_APPLICABLE'
  eligibleNextState: string | null
  finalAuthorApprovalReceived: boolean
  stageCloseEligible: boolean
  nextStageEligible: boolean
  revisionLoopRequired: boolean
  approvalGateBlockers: string[]
  duplicateAuthorDecisions: 0
  duplicateCloseoutEvents: 0
  duplicateArtifactRecords: 0
  duplicateChecksums: 0
  duplicateAwaitingClosures: 0
  titleStateMutations: 0
  authorCommunications: 0
  marketingActions: 0
  distributionActions: 0
  financialActions: 0
  operatorSurface: {
    reviewRequestSent: boolean
    authorReplyReceived: boolean
    decisionCaptured: boolean
    awaitingStateClosed: boolean
    approvedArtifactIdentified: boolean
    checksumRegistered: boolean
    closeoutEligibility: 'PASS' | 'HOLD' | 'NOT_APPLICABLE'
    nextEligibleState: string | null
    exception: string | null
  }
  proposedEvidenceMutations: Array<{ entity: string; id: string; operation: 'patch' | 'create'; fields: string[] }>
}

const AUTHOR_DECISION_APPROVE = 196650000
const AUTHOR_DECISION_REQUEST_REVISION = 196650001
const AUTHOR_DECISION_REQUEST_CLARIFICATION = 196650002
const ARTIFACT_STATUS_APPROVED = 196650003

export function classifyAuthorReply(body: string): Decision {
  const normalized = body
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ')

  if (normalized === 'approved' || normalized === 'approve' || normalized === 'i approve') return 'APPROVED'
  if (normalized === 'approved with corrections' || normalized === 'approve with corrections') return 'APPROVED_WITH_CORRECTIONS'
  if (normalized === 'i have questions' || normalized === 'question' || normalized === 'questions') return 'QUESTIONS'
  return 'REVIEW_REQUIRED'
}

export function buildAuthorDecisionPropagationIdempotencyKey(input: Pick<PropagationInput, 'reviewRequest' | 'reply'>) {
  return createHash('sha256')
    .update([
      'AUTHOR_DECISION_PROTECTED_CLOSEOUT_EVIDENCE_PROPAGATION_V1',
      input.reviewRequest.titleId,
      input.reviewRequest.stageId,
      input.reviewRequest.gateId,
      input.reviewRequest.packageId,
      input.reply.messageId,
      input.reply.receivedAt,
    ].join(':'))
    .digest('hex')
}

export async function propagateAuthorDecisionEvidence(input: PropagationInput): Promise<PropagationResult> {
  const idempotencyKey = buildAuthorDecisionPropagationIdempotencyKey(input)
  const decision = classifyAuthorReply(input.reply.body)
  const blockers: string[] = []
  const rootCauses: RootCause[] = []
  const duplicateDecision = input.priorState?.decisions?.some((item) => item.idempotencyKey === idempotencyKey) || false

  const correlated = replyCorrelates(input.reviewRequest, input.reply)
  if (!correlated.ok) {
    blockers.push(correlated.reason)
    rootCauses.push('CORRELATION_GAP')
  }
  if (decision === 'REVIEW_REQUIRED') {
    blockers.push('AMBIGUOUS_REPLY_REVIEW_REQUIRED')
    rootCauses.push('DECISION_PARSING_GAP')
  }

  const matchingGate = input.gates.find(
    (gate) =>
      gate.gateId === input.reviewRequest.gateId &&
      gate.titleId === input.reviewRequest.titleId &&
      gate.stageId === input.reviewRequest.stageId,
  )
  if (!matchingGate) {
    blockers.push('AWAITING_GATE_NOT_FOUND_FOR_REVIEW_REQUEST')
    rootCauses.push('STATE_PROJECTION_GAP')
  }

  const artifactCandidates = selectArtifactCandidates(input.reviewRequest, input.artifacts)
  const approvedDecision = decision === 'APPROVED'
  let selectedArtifact: ReviewArtifactEvidence | null = null
  if (approvedDecision) {
    if (artifactCandidates.length === 0) {
      blockers.push('APPROVED_ARTIFACT_NOT_FOUND')
      rootCauses.push('ARTIFACT_REGISTRATION_GAP')
    } else if (artifactCandidates.length > 1) {
      blockers.push('MULTIPLE_CANDIDATE_ARTIFACTS_REVIEW_REQUIRED')
      rootCauses.push('PACKAGE_ARTIFACT_LINK_GAP')
    } else {
      selectedArtifact = artifactCandidates[0]
      if (!selectedArtifact.sha256) {
        blockers.push('APPROVED_ARTIFACT_CHECKSUM_MISSING')
        rootCauses.push('CHECKSUM_GENERATION_GAP')
      } else if (input.reviewRequest.expectedArtifactChecksum && selectedArtifact.sha256 !== input.reviewRequest.expectedArtifactChecksum) {
        blockers.push('APPROVED_ARTIFACT_CHECKSUM_MISMATCH')
        rootCauses.push('CHECKSUM_PERSISTENCE_GAP')
      }
      if (!selectedArtifact.repositoryPath && !selectedArtifact.repositoryItemId) {
        blockers.push('APPROVED_ARTIFACT_GOVERNED_LOCATION_MISSING')
        rootCauses.push('ARTIFACT_REGISTRATION_GAP')
      }
    }
  }

  const authorDecisionCaptured = correlated.ok && decision !== 'REVIEW_REQUIRED'
  const approvalGate = evaluateAuthorFinalApprovalGate({
    requiresAuthorApproval: true,
    responseSemantic: decisionToApprovalSemantic(decision),
    currentStageArtifactVersion: input.reviewRequest.currentArtifactVersion || input.reviewRequest.packageId,
    approvedArtifactVersion: approvedDecision ? input.reviewRequest.packageId : undefined,
    unresolvedAuthorCorrections: approvedDecision ? 0 : 1,
    requiredInternalVerification: approvedDecision ? 'COMPLETE' : 'IN_PROGRESS',
    updatedArtifactReturnedToAuthor: false,
  })
  const awaitingStateClosed = authorDecisionCaptured && Boolean(matchingGate) && approvalGate.stageCloseEligible
  const approvedArtifactRegistered = approvedDecision && Boolean(selectedArtifact) && !blockers.some((item) => item.includes('ARTIFACT'))
  const checksumRegistered = approvedArtifactRegistered && Boolean(selectedArtifact?.sha256)

  let protectedCloseout: PropagationResult['protectedCloseout'] = 'NOT_APPLICABLE'
  let eligibleNextState: string | null = null
  let protectedCloseoutReevaluated = false
  if (approvedDecision && authorDecisionCaptured && awaitingStateClosed && approvedArtifactRegistered && checksumRegistered && selectedArtifact) {
    const closeoutRequest = buildCloseoutRequest(input, selectedArtifact)
    const closeout = await closeApprovedStage(closeoutRequest, inMemoryCloseoutAdapter(input, selectedArtifact))
    protectedCloseoutReevaluated = true
    if (closeout.status === 'eligible') {
      protectedCloseout = 'PASS'
      eligibleNextState = closeout.nextStage
    } else {
      protectedCloseout = 'HOLD'
      blockers.push(...closeout.blockers)
    }
  } else if (approvedDecision) {
    protectedCloseout = 'HOLD'
  }

  const status: PropagationStatus = blockers.length === 0 && (!approvedDecision || protectedCloseout === 'PASS') ? 'PASS' : 'HOLD'
  const proposedEvidenceMutations = buildEvidenceMutations(input, decision, selectedArtifact, {
    authorDecisionCaptured,
    awaitingStateClosed,
    approvedArtifactRegistered,
    checksumRegistered,
    duplicateDecision,
  })

  return {
    status,
    defectFamily: 'AUTHOR_DECISION_TO_PROTECTED_CLOSEOUT_EVIDENCE_PROPAGATION',
    idempotencyKey,
    decision,
    blockers: [...new Set(blockers)],
    rootCauses: [...new Set(rootCauses)],
    authorDecisionCaptured,
    awaitingStateClosed,
    approvedArtifactRegistered,
    checksumRegistered,
    protectedCloseoutReevaluated,
    protectedCloseout,
    eligibleNextState,
    finalAuthorApprovalReceived: approvalGate.finalAuthorApprovalReceived,
    stageCloseEligible: approvalGate.stageCloseEligible,
    nextStageEligible: approvalGate.nextStageEligible,
    revisionLoopRequired: approvalGate.revisionLoopRequired,
    approvalGateBlockers: approvalGate.blockers,
    duplicateAuthorDecisions: 0,
    duplicateCloseoutEvents: 0,
    duplicateArtifactRecords: 0,
    duplicateChecksums: 0,
    duplicateAwaitingClosures: 0,
    titleStateMutations: 0,
    authorCommunications: 0,
    marketingActions: 0,
    distributionActions: 0,
    financialActions: 0,
    operatorSurface: {
      reviewRequestSent: Boolean(input.reviewRequest.sentAt),
      authorReplyReceived: Boolean(input.reply.receivedAt),
      decisionCaptured: authorDecisionCaptured,
      awaitingStateClosed,
      approvedArtifactIdentified: approvedArtifactRegistered,
      checksumRegistered,
      closeoutEligibility: protectedCloseout,
      nextEligibleState: eligibleNextState,
      exception: status === 'PASS' ? null : blockers[0] || 'REVIEW_REQUIRED',
    },
    proposedEvidenceMutations,
  }
}

function decisionToApprovalSemantic(decision: Decision): AuthorFinalApprovalSemantic {
  if (decision === 'APPROVED') return 'APPROVED'
  if (decision === 'APPROVED_WITH_CORRECTIONS') return 'APPROVED_WITH_CORRECTIONS'
  if (decision === 'QUESTIONS') return 'QUESTIONS'
  return 'REVIEW_REQUIRED'
}

function replyCorrelates(review: AuthorReviewRequest, reply: AuthorReplyEvent) {
  if (reply.titleId && reply.titleId !== review.titleId) return { ok: false, reason: 'WRONG_TITLE_REPLY_REVIEW_REQUIRED' }
  if (reply.stageId && reply.stageId !== review.stageId) return { ok: false, reason: 'WRONG_STAGE_REPLY_REVIEW_REQUIRED' }
  if (reply.gateId && reply.gateId !== review.gateId) return { ok: false, reason: 'WRONG_GATE_REPLY_REVIEW_REQUIRED' }
  if (reply.packageId && reply.packageId !== review.packageId) return { ok: false, reason: 'WRONG_PACKAGE_REPLY_REVIEW_REQUIRED' }

  const messageCorrelated = reply.inReplyToMessageId === review.outboundMessageId || Boolean(reply.references?.includes(review.outboundMessageId))
  const explicitCorrelation = reply.titleId === review.titleId && reply.gateId === review.gateId && reply.packageId === review.packageId
  if (messageCorrelated || explicitCorrelation) return { ok: true, reason: '' }
  return { ok: false, reason: 'UNMATCHED_REPLY_REVIEW_REQUIRED' }
}

function selectArtifactCandidates(review: AuthorReviewRequest, artifacts: ReviewArtifactEvidence[]) {
  return artifacts.filter((artifact) => {
    if (artifact.titleId !== review.titleId || artifact.stageId !== review.stageId) return false
    if (artifact.gateId && artifact.gateId !== review.gateId) return false
    if (artifact.packageId && artifact.packageId !== review.packageId) return false
    return review.requiredArtifactIds.includes(artifact.artifactId) || artifact.packageId === review.packageId
  })
}

function buildCloseoutRequest(input: PropagationInput, artifact: ReviewArtifactEvidence): PublishingTitleCloseoutRequest {
  return {
    titleId: input.reviewRequest.titleId,
    stageId: input.reviewRequest.stageId,
    gateId: input.reviewRequest.gateId,
    approvedArtifactId: artifact.artifactId,
    approvedArtifactChecksum: artifact.sha256 || '',
    approvalSource: `author-reply:${input.reply.messageId}`,
    approvalTimestamp: input.reply.receivedAt,
    expectedCurrentStage: 'INTERIOR_LAYOUT',
    expectedGateState: 'READY_FOR_AUTHOR_RELEASE',
    expectedActiveGateCount: 1,
    expectedResponseClockCount: 0,
    dryRun: true,
    confirm: false,
    nextStage: input.reviewRequest.nextEligibleState,
    ...input.closeoutRequest,
  }
}

function inMemoryCloseoutAdapter(input: PropagationInput, artifact: ReviewArtifactEvidence): PublishingTitleCloseoutAdapter {
  return {
    async read() {
      return {
        title: { jm1pub_titleid: input.reviewRequest.titleId, jm1pub_titlename: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.title },
        stage: {
          jm1pub_editorialstageid: input.reviewRequest.stageId,
          jm1pub_name: 'Interior Layout',
          jm1pub_stagetype: 'INTERIOR_LAYOUT',
        },
        gate: {
          jm1pub_editorialapprovalgateid: input.reviewRequest.gateId,
          jm1pub_gatestatus: 196650001,
          jm1pub_authordecision: AUTHOR_DECISION_APPROVE,
          jm1pub_authordecisionon: input.reply.receivedAt,
          jm1pub_nextstageauthorized: true,
          _jm1pub_editorialstageid_value: input.reviewRequest.stageId,
        },
        gates: [
          {
            jm1pub_editorialapprovalgateid: input.reviewRequest.gateId,
            jm1pub_gatestatus: 196650001,
            _jm1pub_editorialstageid_value: input.reviewRequest.stageId,
          },
        ],
        artifacts: [
          {
            jm1pub_editorialartifactid: artifact.artifactId,
            jm1pub_editorialartifactname: artifact.artifactId,
            jm1pub_filename: artifact.artifactId,
            jm1pub_sha256: artifact.sha256,
            _jm1pub_editorialstageid_value: input.reviewRequest.stageId,
            _jm1pub_titleid_value: input.reviewRequest.titleId,
          },
        ],
        existingCloseoutLog: null,
      }
    },
    async patch() {
      throw new Error('PROPAGATION_EVALUATOR_IS_READ_ONLY')
    },
    async create() {
      throw new Error('PROPAGATION_EVALUATOR_IS_READ_ONLY')
    },
  }
}

function buildEvidenceMutations(
  input: PropagationInput,
  decision: Decision,
  artifact: ReviewArtifactEvidence | null,
  flags: {
    authorDecisionCaptured: boolean
    awaitingStateClosed: boolean
    approvedArtifactRegistered: boolean
    checksumRegistered: boolean
    duplicateDecision: boolean
  },
): PropagationResult['proposedEvidenceMutations'] {
  const mutations: PropagationResult['proposedEvidenceMutations'] = []
  if (flags.authorDecisionCaptured && !flags.duplicateDecision) {
    mutations.push({
      entity: 'jm1pub_editorialapprovalgate',
      id: input.reviewRequest.gateId,
      operation: 'patch',
      fields: [
        'jm1pub_authordecision',
        decisionCodeField(decision),
        'jm1pub_authordecisionon',
        'jm1pub_authorresponsesummary',
        'jm1pub_authordecisionsource',
      ].filter((value, index, array) => array.indexOf(value) === index),
    })
  }
  if (flags.awaitingStateClosed) {
    mutations.push({
      entity: 'jm1pub_editorialapprovalgate',
      id: input.reviewRequest.gateId,
      operation: 'patch',
      fields: ['jm1pub_awaitingsince:null'],
    })
  }
  if (flags.approvedArtifactRegistered && artifact) {
    mutations.push({
      entity: 'jm1pub_editorialartifact',
      id: artifact.artifactId,
      operation: 'patch',
      fields: ['jm1pub_artifactstatus', String(ARTIFACT_STATUS_APPROVED), 'jm1pub_iscurrentapproved', 'jm1pub_approvedon', 'jm1pub_sha256'],
    })
  }
  if (flags.checksumRegistered && artifact) {
    mutations.push({
      entity: 'jm1_executionlog',
      id: input.reviewRequest.gateId,
      operation: 'create',
      fields: ['AUTHOR_DECISION_PROTECTED_CLOSEOUT_EVIDENCE_PROPAGATED', artifact.sha256 || ''],
    })
  }
  return mutations
}

function decisionCodeField(decision: Decision) {
  if (decision === 'APPROVED') return String(AUTHOR_DECISION_APPROVE)
  if (decision === 'APPROVED_WITH_CORRECTIONS') return String(AUTHOR_DECISION_REQUEST_REVISION)
  if (decision === 'QUESTIONS') return String(AUTHOR_DECISION_REQUEST_CLARIFICATION)
  return 'REVIEW_REQUIRED'
}
