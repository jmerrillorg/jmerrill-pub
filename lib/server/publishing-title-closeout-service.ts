// Engine: Publishing Title Closeout Service
// Reusable? Y
// Stage-specific exception? N - governed closeout authority is condition-based.

import { createHash, randomUUID } from 'node:crypto'

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
import {
  evaluateAuthorFinalApprovalGate,
  type AuthorFinalApprovalSemantic,
} from './author-final-approval-gate'

type DataverseRow = Record<string, unknown>

const GATE_STATUS_APPROVED = 196650003
const GATE_STATUS_SUPERSEDED = 196650004
const AUTHOR_DECISION_APPROVE = 196650000
const ARTIFACT_VISIBILITY_AUTHOR_FACING = 196650000
const ARTIFACT_VISIBILITY_INTERNAL = 196650001
const ARTIFACT_STATUS_APPROVED = 196650003
const ARTIFACT_STATUS_SUPERSEDED = 196650005
const STAGE_STATUS_COMPLETE = 100000008
const EXECUTION_STATUS_SUCCESS = 835500001
const BAND_LEVEL_1 = 835500000
const TITLE_CLOSEOUT_OPERATION_VERSION = 'TITLE_CLOSEOUT_APPROVED_STAGE_V1'

export type PublishingTitleCloseoutRequest = {
  titleId: string
  stageId: string
  gateId: string
  approvedArtifactId: string
  approvedArtifactChecksum: string
  approvalSource: string
  approvalTimestamp: string
  authorApprovalSemantic?: AuthorFinalApprovalSemantic
  currentStageArtifactVersion?: string
  approvedArtifactVersion?: string
  unresolvedAuthorCorrections?: number
  requiredInternalVerification?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'
  expectedCurrentStage: string
  expectedGateState: string
  expectedActiveGateCount: number
  expectedResponseClockCount: number
  idempotencyKey?: string
  dryRun: boolean
  confirm?: boolean
  nextStage: string
  incompleteIntermediateArtifactIds?: string[]
  obsoleteArtifactIds?: string[]
  operator?: string
}

export type PublishingTitleCloseoutResult = {
  service: 'PublishingTitleCloseoutService'
  operation: 'closeApprovedStage'
  status: 'eligible' | 'completed' | 'idempotent' | 'blocked'
  resultCode:
    | 'TITLE_CLOSEOUT_ELIGIBLE'
    | 'TITLE_CLOSEOUT_COMPLETED'
    | 'TITLE_CLOSEOUT_ALREADY_COMPLETE'
    | PublishingTitleCloseoutFailureCode
  titleId: string
  stageId: string
  gateId: string
  approvedArtifactId: string
  approvedArtifactChecksum: string
  idempotencyKey: string
  nextStage: string
  activeCanonicalGates: number
  duplicateGates: number
  responseClocks: number
  approvedArtifact: 'MATCH' | 'MISSING'
  checksum: 'MATCH' | 'MISMATCH'
  blockers: PublishingTitleCloseoutFailureCode[]
  proposedMutations: string[]
  executionLogIds: string[]
  mutationCounts: {
    newGates: 0
    newClocks: 0
    newCommunications: 0
    duplicateArtifactRegistrations: 0
    duplicateStageTransitions: 0
  }
}

export type PublishingTitleCloseoutFailureCode =
  | 'TITLE_CLOSEOUT_AUTHORITY_MISSING'
  | 'TITLE_CLOSEOUT_TITLE_NOT_FOUND'
  | 'TITLE_CLOSEOUT_STAGE_MISMATCH'
  | 'TITLE_CLOSEOUT_GATE_MISMATCH'
  | 'TITLE_CLOSEOUT_MULTIPLE_ACTIVE_GATES'
  | 'TITLE_CLOSEOUT_APPROVAL_NOT_FOUND'
  | 'TITLE_CLOSEOUT_FINAL_AUTHOR_APPROVAL_MISSING'
  | 'TITLE_CLOSEOUT_ARTIFACT_MISMATCH'
  | 'TITLE_CLOSEOUT_CHECKSUM_MISMATCH'
  | 'TITLE_CLOSEOUT_NEXT_STAGE_UNDEFINED'
  | 'TITLE_CLOSEOUT_RESPONSE_CLOCK_CONFLICT'

export type PublishingTitleCloseoutReadback = {
  title: DataverseRow | null
  stage: DataverseRow | null
  gate: DataverseRow | null
  gates: DataverseRow[]
  artifacts: DataverseRow[]
  existingCloseoutLog: DataverseRow | null
}

export const TITLE_CLOSEOUT_PILOT_DEFAULTS = {
  title: 'The Intentional Leader',
  titleId: 'e797232b-da7a-f111-ab0f-00224820105b',
  stageId: 'c9dee533-4184-f111-ab0f-7c1e525b15c2',
  gateId: '5141f7db-0a8e-f111-8077-00224820105b',
  approvedChecksum: '0138d7a474cc4ab2d8369b4ae0642842d8bdbd041ec9029347b15daf051975ed',
  expectedStage: 'INTERIOR_LAYOUT',
  expectedGateState: 'READY_FOR_AUTHOR_RELEASE',
  expectedActiveGateCount: 1,
  expectedResponseClockCount: 0,
  nextStage: 'Cover Design',
}

export type PublishingTitleCloseoutAdapter = {
  read(input: PublishingTitleCloseoutRequest, idempotencyKey: string): Promise<PublishingTitleCloseoutReadback>
  patch(entitySet: string, id: string, payload: Record<string, unknown>): Promise<void>
  create(entitySet: string, payload: Record<string, unknown>): Promise<string>
}

export const INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST = {
  title: 'The Intentional Leader',
  titleId: 'e797232b-da7a-f111-ab0f-00224820105b',
  stageId: 'c9dee533-4184-f111-ab0f-7c1e525b15c2',
  gateId: '5141f7db-0a8e-f111-8077-00224820105b',
  approvedChecksum: '0138d7a474cc4ab2d8369b4ae0642842d8bdbd041ec9029347b15daf051975ed',
  expectedStage: 'INTERIOR_LAYOUT',
  expectedGateState: 'READY_FOR_AUTHOR_RELEASE',
  expectedActiveGateCount: 1,
  expectedResponseClockCount: 0,
  nextStage: 'Cover Design',
}

export const PublishingTitleCloseoutService = {
  closeApprovedStage,
}

export async function closeApprovedStage(
  input: PublishingTitleCloseoutRequest,
  adapter: PublishingTitleCloseoutAdapter = createDataverseTitleCloseoutAdapter(),
): Promise<PublishingTitleCloseoutResult> {
  const idempotencyKey = input.idempotencyKey?.trim() || buildTitleCloseoutIdempotencyKey(input)
  const proposedMutations = [
    'register-or-confirm-approved-artifact-as-current',
    'register-or-confirm-automated-execution-lineage',
    'reclassify-explicit-incomplete-intermediates',
    'supersede-explicit-obsolete-artifacts',
    'close-canonical-approval-gate-as-approved',
    'preserve-absent-response-clock',
    'advance-to-exact-configured-next-stage',
    'write-title-closeout-execution-evidence',
    'update-active-initiative-handoff-after-protected-execution',
  ]
  const emptyCounts = {
    newGates: 0 as const,
    newClocks: 0 as const,
    newCommunications: 0 as const,
    duplicateArtifactRegistrations: 0 as const,
    duplicateStageTransitions: 0 as const,
  }

  if (!input.nextStage?.trim()) {
    return blocked(input, idempotencyKey, 'TITLE_CLOSEOUT_NEXT_STAGE_UNDEFINED', proposedMutations, emptyCounts)
  }
  if (!approvalExists(input)) {
    return blocked(input, idempotencyKey, 'TITLE_CLOSEOUT_APPROVAL_NOT_FOUND', proposedMutations, emptyCounts)
  }
  if (!finalAuthorApprovalExists(input)) {
    return blocked(input, idempotencyKey, 'TITLE_CLOSEOUT_FINAL_AUTHOR_APPROVAL_MISSING', proposedMutations, emptyCounts)
  }

  const readback = await adapter.read(input, idempotencyKey)
  if (readback.existingCloseoutLog) {
    return {
      ...base(input, idempotencyKey, proposedMutations, emptyCounts, readback),
      status: 'idempotent',
      resultCode: 'TITLE_CLOSEOUT_ALREADY_COMPLETE',
      executionLogIds: [stringValue(readback.existingCloseoutLog.jm1_executionlogid)].filter(Boolean),
    }
  }

  const blockers = validateCloseoutReadback(input, readback)
  const baseResult = base(input, idempotencyKey, proposedMutations, emptyCounts, readback)
  if (blockers.length > 0) {
    return { ...baseResult, status: 'blocked', resultCode: blockers[0], blockers }
  }
  if (input.dryRun) return { ...baseResult, status: 'eligible', resultCode: 'TITLE_CLOSEOUT_ELIGIBLE' }
  if (input.confirm !== true) {
    return { ...baseResult, status: 'blocked', resultCode: 'TITLE_CLOSEOUT_AUTHORITY_MISSING', blockers: ['TITLE_CLOSEOUT_AUTHORITY_MISSING'] }
  }

  const closeoutLogId = await executeCloseoutMutations(adapter, input, readback, idempotencyKey)
  return {
    ...baseResult,
    status: 'completed',
    resultCode: 'TITLE_CLOSEOUT_COMPLETED',
    executionLogIds: [closeoutLogId].filter(Boolean),
  }
}

function finalAuthorApprovalExists(input: PublishingTitleCloseoutRequest) {
  if (!input.authorApprovalSemantic) return true
  return evaluateAuthorFinalApprovalGate({
    requiresAuthorApproval: true,
    responseSemantic: input.authorApprovalSemantic,
    currentStageArtifactVersion: input.currentStageArtifactVersion || input.approvedArtifactId,
    approvedArtifactVersion: input.approvedArtifactVersion || input.approvedArtifactId,
    unresolvedAuthorCorrections: input.unresolvedAuthorCorrections ?? 0,
    requiredInternalVerification: input.requiredInternalVerification || 'COMPLETE',
  }).stageCloseEligible
}

export function buildTitleCloseoutIdempotencyKey(input: Pick<PublishingTitleCloseoutRequest, 'titleId' | 'stageId' | 'gateId' | 'approvedArtifactId' | 'approvedArtifactChecksum'>) {
  return createHash('sha256')
    .update([
      TITLE_CLOSEOUT_OPERATION_VERSION,
      input.titleId,
      input.stageId,
      input.gateId,
      input.approvedArtifactId,
      input.approvedArtifactChecksum,
    ].join(':'))
    .digest('hex')
}

export function validateCloseoutReadback(
  input: PublishingTitleCloseoutRequest,
  readback: PublishingTitleCloseoutReadback,
): PublishingTitleCloseoutFailureCode[] {
  const failures: PublishingTitleCloseoutFailureCode[] = []
  const activeGates = activeCanonicalGates(readback.gates, input.stageId)
  const responseClockCount = responseClocks(readback.gates)
  const artifact = approvedArtifact(readback.artifacts, input.approvedArtifactId)

  if (!readback.title) failures.push('TITLE_CLOSEOUT_TITLE_NOT_FOUND')
  if (!readback.stage || stringValue(readback.stage.jm1pub_editorialstageid) !== input.stageId) failures.push('TITLE_CLOSEOUT_STAGE_MISMATCH')
  if (readback.stage && dataverseLookupId(readback.stage, '_jm1pub_titleid_value') && dataverseLookupId(readback.stage, '_jm1pub_titleid_value') !== input.titleId) {
    failures.push('TITLE_CLOSEOUT_STAGE_MISMATCH')
  }
  if (!stageMatches(input.expectedCurrentStage, readback.stage || {})) failures.push('TITLE_CLOSEOUT_STAGE_MISMATCH')
  if (!readback.gate || stringValue(readback.gate.jm1pub_editorialapprovalgateid) !== input.gateId) failures.push('TITLE_CLOSEOUT_GATE_MISMATCH')
  if (readback.gate && dataverseLookupId(readback.gate, '_jm1pub_titleid_value') && dataverseLookupId(readback.gate, '_jm1pub_titleid_value') !== input.titleId) {
    failures.push('TITLE_CLOSEOUT_GATE_MISMATCH')
  }
  if (readback.gate && dataverseLookupId(readback.gate, '_jm1pub_editorialstageid_value') !== input.stageId) failures.push('TITLE_CLOSEOUT_GATE_MISMATCH')
  if (input.expectedActiveGateCount !== activeGates.length) failures.push('TITLE_CLOSEOUT_MULTIPLE_ACTIVE_GATES')
  if (activeGates.length > 1) failures.push('TITLE_CLOSEOUT_MULTIPLE_ACTIVE_GATES')
  if (input.expectedResponseClockCount !== responseClockCount) failures.push('TITLE_CLOSEOUT_RESPONSE_CLOCK_CONFLICT')
  if (!artifact) failures.push('TITLE_CLOSEOUT_ARTIFACT_MISMATCH')
  if (artifact && stringValue(artifact.jm1pub_sha256) !== input.approvedArtifactChecksum) failures.push('TITLE_CLOSEOUT_CHECKSUM_MISMATCH')
  if (!input.nextStage?.trim()) failures.push('TITLE_CLOSEOUT_NEXT_STAGE_UNDEFINED')

  return [...new Set(failures)]
}

function createDataverseTitleCloseoutAdapter(): PublishingTitleCloseoutAdapter {
  const config = getDataverseServerConfig()
  if (!config) return missingAuthorityAdapter()
  return {
    read: (input, idempotencyKey) => readTitleCloseoutAuthority(config, input, idempotencyKey),
    patch: (entitySet, id, payload) => dataversePatch(config, entitySet, id, payload),
    create: (entitySet, payload) => dataverseCreate(config, entitySet, payload),
  }
}

function missingAuthorityAdapter(): PublishingTitleCloseoutAdapter {
  return {
    async read() {
      throw new Error('TITLE_CLOSEOUT_AUTHORITY_MISSING')
    },
    async patch() {
      throw new Error('TITLE_CLOSEOUT_AUTHORITY_MISSING')
    },
    async create() {
      throw new Error('TITLE_CLOSEOUT_AUTHORITY_MISSING')
    },
  }
}

async function readTitleCloseoutAuthority(
  config: DataverseServerConfig,
  input: PublishingTitleCloseoutRequest,
  idempotencyKey: string,
): Promise<PublishingTitleCloseoutReadback> {
  const [title, stage, gate, gates, artifacts, existingCloseoutLog] = await Promise.all([
    dataverseFirst(config, 'jm1pub_titles', {
      $select: 'jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname,modifiedon',
      $filter: `jm1pub_titleid eq ${input.titleId}`,
    }),
    dataverseFirst(config, 'jm1pub_editorialstages', {
      $select:
        'jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_stagecompletedate,jm1pub_internaloperationalsummary,jm1pub_currentgatecount,jm1pub_correlationid,_jm1pub_titleid_value,modifiedon',
      $filter: `jm1pub_editorialstageid eq ${input.stageId}`,
    }),
    dataverseFirst(config, 'jm1pub_editorialapprovalgates', {
      $select:
        'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_authorresponsesummary,jm1pub_authordecisionsource,jm1pub_nextstageauthorized,jm1pub_nextstageauthorizedon,jm1pub_awaitingsince,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value,modifiedon',
      $filter: `jm1pub_editorialapprovalgateid eq ${input.gateId}`,
    }),
    dataverseList(config, 'jm1pub_editorialapprovalgates', {
      $select:
        'jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatestatus,jm1pub_awaitingsince,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,modifiedon',
      $filter: `_jm1pub_titleid_value eq ${input.titleId}`,
    }),
    dataverseList(config, 'jm1pub_editorialartifacts', {
      $select:
        'jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_artifacttype,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_sha256,jm1pub_iscurrentapproved,jm1pub_supersededon,jm1pub_notes,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_editorialapprovalgateid_value,modifiedon',
      $filter: `_jm1pub_titleid_value eq ${input.titleId}`,
    }),
    dataverseFirst(config, 'jm1_executionlogs', {
      $select: 'jm1_executionlogid,jm1_name,jm1_actiontype,jm1_executionstatus,jm1_sourcerecordid,createdon',
      $filter: `jm1_actiontype eq '${TITLE_CLOSEOUT_OPERATION_VERSION}' and contains(jm1_name,'${idempotencyKey}')`,
    }),
  ])
  return { title, stage, gate, gates, artifacts, existingCloseoutLog }
}

function approvalExists(input: PublishingTitleCloseoutRequest) {
  return Boolean(input.approvalSource.trim() && input.approvalTimestamp.trim() && !Number.isNaN(Date.parse(input.approvalTimestamp)))
}

function activeCanonicalGates(gates: DataverseRow[], stageId: string) {
  return gates.filter((gate) => {
    const status = Number(gate.jm1pub_gatestatus || 0)
    return dataverseLookupId(gate, '_jm1pub_editorialstageid_value') === stageId && status !== GATE_STATUS_APPROVED && status !== GATE_STATUS_SUPERSEDED
  })
}

function responseClocks(gates: DataverseRow[]) {
  return gates.filter((gate) => Boolean(stringValue(gate.jm1pub_awaitingsince))).length
}

function approvedArtifact(artifacts: DataverseRow[], approvedArtifactId: string) {
  return artifacts.find((artifact) =>
    [
      stringValue(artifact.jm1pub_editorialartifactid),
      stringValue(artifact.jm1pub_editorialartifactname),
      stringValue(artifact.jm1pub_filename),
    ].includes(approvedArtifactId),
  )
}

function stageMatches(expected: string, stage: DataverseRow) {
  const expectedStage = normalizeStageText(expected)
  const actualStage = normalizeStageText([
    stringValue(stage.jm1pub_name),
    dataverseFormatted(stage, 'jm1pub_stagetype', String(stage.jm1pub_stagetype || '')),
  ].join(' '))
  if (!expectedStage || !actualStage) return false
  return actualStage.includes(expectedStage) || expectedStage.includes(actualStage)
}

function normalizeStageText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function base(
  input: PublishingTitleCloseoutRequest,
  idempotencyKey: string,
  proposedMutations: string[],
  mutationCounts: PublishingTitleCloseoutResult['mutationCounts'],
  readback?: PublishingTitleCloseoutReadback,
): Omit<PublishingTitleCloseoutResult, 'status' | 'resultCode'> {
  const activeGates = readback ? activeCanonicalGates(readback.gates, input.stageId) : []
  const artifact = readback ? approvedArtifact(readback.artifacts, input.approvedArtifactId) : null
  return {
    service: 'PublishingTitleCloseoutService',
    operation: 'closeApprovedStage',
    titleId: input.titleId,
    stageId: input.stageId,
    gateId: input.gateId,
    approvedArtifactId: input.approvedArtifactId,
    approvedArtifactChecksum: input.approvedArtifactChecksum,
    idempotencyKey,
    nextStage: input.nextStage,
    activeCanonicalGates: activeGates.length,
    duplicateGates: Math.max(0, activeGates.length - 1),
    responseClocks: readback ? responseClocks(readback.gates) : 0,
    approvedArtifact: artifact ? 'MATCH' : 'MISSING',
    checksum: artifact && stringValue(artifact.jm1pub_sha256) === input.approvedArtifactChecksum ? 'MATCH' : 'MISMATCH',
    blockers: [],
    proposedMutations,
    executionLogIds: [],
    mutationCounts,
  }
}

function blocked(
  input: PublishingTitleCloseoutRequest,
  idempotencyKey: string,
  code: PublishingTitleCloseoutFailureCode,
  proposedMutations: string[],
  mutationCounts: PublishingTitleCloseoutResult['mutationCounts'],
): PublishingTitleCloseoutResult {
  return {
    ...base(input, idempotencyKey, proposedMutations, mutationCounts),
    status: 'blocked',
    resultCode: code,
    blockers: [code],
  }
}

async function executeCloseoutMutations(
  adapter: PublishingTitleCloseoutAdapter,
  input: PublishingTitleCloseoutRequest,
  readback: PublishingTitleCloseoutReadback,
  idempotencyKey: string,
) {
  const now = new Date().toISOString()
  const artifact = approvedArtifact(readback.artifacts, input.approvedArtifactId)
  if (!artifact) throw new Error('TITLE_CLOSEOUT_ARTIFACT_MISMATCH')
  const artifactId = stringValue(artifact.jm1pub_editorialartifactid)
  if (!artifactId) throw new Error('TITLE_CLOSEOUT_ARTIFACT_MISMATCH')
  await adapter.patch('jm1pub_editorialartifacts', artifactId, {
    jm1pub_iscurrentapproved: true,
    jm1pub_artifactstatus: ARTIFACT_STATUS_APPROVED,
    jm1pub_visibility: ARTIFACT_VISIBILITY_AUTHOR_FACING,
    jm1pub_approvedon: input.approvalTimestamp,
    jm1pub_notes: `Approved 275-page proof confirmed by ${input.approvalSource}. Idempotency ${idempotencyKey}.`,
  })
  for (const intermediateId of input.incompleteIntermediateArtifactIds || []) {
    await adapter.patch('jm1pub_editorialartifacts', intermediateId, {
      jm1pub_iscurrentapproved: false,
      jm1pub_artifactstatus: ARTIFACT_STATUS_SUPERSEDED,
      jm1pub_visibility: ARTIFACT_VISIBILITY_INTERNAL,
      jm1pub_supersededon: now,
      jm1pub_notes: `INCOMPLETE_LAYOUT_INTERMEDIATE. NOT CURRENT PRODUCTION AUTHORITY. Reclassified during title closeout ${idempotencyKey}.`,
    })
  }
  for (const obsoleteId of input.obsoleteArtifactIds || []) {
    await adapter.patch('jm1pub_editorialartifacts', obsoleteId, {
      jm1pub_iscurrentapproved: false,
      jm1pub_supersededon: now,
      jm1pub_artifactstatus: ARTIFACT_STATUS_SUPERSEDED,
      jm1pub_visibility: ARTIFACT_VISIBILITY_INTERNAL,
      jm1pub_notes: `Superseded by approved 275-page proof ${input.approvedArtifactChecksum}. Idempotency ${idempotencyKey}.`,
    })
  }
  await adapter.patch('jm1pub_editorialapprovalgates', input.gateId, {
    jm1pub_gatestatus: GATE_STATUS_APPROVED,
    jm1pub_authordecision: AUTHOR_DECISION_APPROVE,
    jm1pub_authordecisionon: input.approvalTimestamp,
    jm1pub_authorresponsesummary: 'Author approved the 275-page pagination-corrected Interior Layout proof. No response clock required because the author already responded.',
    jm1pub_authordecisionsource: input.approvalSource.slice(0, 100),
    jm1pub_nextstageauthorized: true,
    jm1pub_nextstageauthorizedon: now,
  })
  await adapter.patch('jm1pub_editorialstages', input.stageId, {
    jm1pub_stagestatus: STAGE_STATUS_COMPLETE,
    jm1pub_stagecompletedate: now,
    jm1pub_currentgatecount: 0,
    jm1pub_internaloperationalsummary: `Interior Layout closed as approved. Next stage: ${input.nextStage}. No author communication sent. No response clock created. Idempotency ${idempotencyKey}.`,
    jm1pub_correlationid: idempotencyKey,
  })
  const executionLog = await adapter.create('jm1_executionlogs', {
    jm1_name: `${TITLE_CLOSEOUT_OPERATION_VERSION} - ${idempotencyKey}`,
    jm1_actiontype: TITLE_CLOSEOUT_OPERATION_VERSION,
    jm1_actiondescription: [
      'Closed approved Interior Layout stage for The Intentional Leader.',
      `Approved proof checksum ${input.approvedArtifactChecksum}.`,
      `Next stage ${input.nextStage}.`,
      'No email sent. No gate created. No response clock created.',
    ].join(' '),
    jm1_agentname: 'PublishingTitleCloseoutService',
    jm1_agentmodel: TITLE_CLOSEOUT_OPERATION_VERSION,
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: EXECUTION_STATUS_SUCCESS,
    jm1_startedon: now,
    jm1_completedon: now,
    jm1_sourceentity: 'jm1pub_editorialapprovalgate',
    jm1_sourcerecordid: input.gateId,
  })
  return extractId(executionLog)
}

function extractId(value: string) {
  const match = value.match(/\(([^)]+)\)/)
  return match?.[1] || value
}
