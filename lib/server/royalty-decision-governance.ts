import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  dataverseCreate,
  dataverseFirst,
  getDataverseServerConfig,
  stringValue,
  type DataverseServerConfig,
} from './dataverse-server'

const EXECUTION_STATUS_SUCCESS = 835500001
const BAND_LEVEL_1 = 835500000

export const ROYALTY_DECISION_ACTION_TYPE = 'ROYALTY_MAPPING_DECISION_RECORDED'
export const ROYALTY_DECISION_EVIDENCE_VERSION = '2026-07-19-WAVE2'

export const ROYALTY_DECISION_TYPES = [
  'APPROVE_MAPPING',
  'CORRECT_MAPPING',
  'OUT_OF_SCOPE',
  'DEFER',
] as const

export type RoyaltyDecisionType = (typeof ROYALTY_DECISION_TYPES)[number]

export type RoyaltyDecisionInput = {
  packageId: string
  decisionType: RoyaltyDecisionType
  operatorEmail: string
  evidenceVersion?: string
  canonicalWorkId?: string
  formatAssetId?: string
  rightsholderId?: string
  royaltyProfileId?: string
  outOfScopeReason?: string
  deferReason?: string
  evidenceNeeded?: string
  supersedesDecisionId?: string
  correlationId?: string
}

export type RoyaltyDecisionResult = {
  status: 'RECORDED' | 'IDEMPOTENT'
  decisionId: string
  packageId: string
  decisionType: RoyaltyDecisionType
  evidenceVersion: string
  correlationId: string
  idempotencyKey: string
  downstream: {
    durableIdentifierMapping: 'PENDING_RECOMPUTE' | 'NOT_APPLICABLE'
    rowReevaluation: 'PENDING_RECOMPUTE' | 'HELD'
    draftStatementRefresh: 'PENDING_RECOMPUTE' | 'NOT_APPLICABLE'
    authorVisibility: 'OFF'
    royaltyPayments: 0
    authorStatementsReleased: 0
  }
}

type RoyaltyDecisionPackageEvidence = {
  packageKey: string
  reportedTitle: string
  identifiers?: string[]
  statementPeriods?: string[]
  affectedRows?: number
  financialImpact?: number
  confidence?: string
}

export async function recordRoyaltyMappingDecision(input: RoyaltyDecisionInput): Promise<RoyaltyDecisionResult> {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const prepared = prepareRoyaltyDecision(input)
  const existing = await findExistingRoyaltyDecision(config, prepared.idempotencyKey)
  if (existing?.jm1_executionlogid) {
    return {
      ...prepared.result,
      status: 'IDEMPOTENT',
      decisionId: stringValue(existing.jm1_executionlogid),
    }
  }

  const created = await dataverseCreate(config, 'jm1_executionlogs', {
    jm1_name: `${ROYALTY_DECISION_ACTION_TYPE} - ${prepared.package.packageKey}`.slice(0, 200),
    jm1_actiontype: ROYALTY_DECISION_ACTION_TYPE,
    jm1_actiondescription: prepared.description.slice(0, 1000),
    jm1_agentname: 'Publisher Operating Center',
    jm1_agentmodel: 'jmerrill.pub',
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: EXECUTION_STATUS_SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: 'royalty_decision_package',
    jm1_sourcerecordid: prepared.package.packageKey,
  })

  return {
    ...prepared.result,
    decisionId: extractId(created) || prepared.result.decisionId,
  }
}

export function prepareRoyaltyDecision(input: RoyaltyDecisionInput) {
  assertFounderDecisionIdentity(input.operatorEmail)

  const evidenceVersion = input.evidenceVersion || currentRoyaltyEvidenceVersion()
  const decisionType = normalizeDecisionType(input.decisionType)
  const decisionPackage = findRoyaltyDecisionPackage(input.packageId)

  validateDecisionPayload(decisionType, input)

  const correlationId = input.correlationId || randomUUID()
  const idempotencyKey = buildRoyaltyDecisionIdempotencyKey({
    ...input,
    decisionType,
    evidenceVersion,
  })
  const safePayload = {
    DecisionId: `decision:${idempotencyKey}`,
    PackageId: decisionPackage.packageKey,
    DecisionType: decisionType,
    CanonicalWorkId: input.canonicalWorkId || '',
    FormatAssetId: input.formatAssetId || '',
    RightsholderId: input.rightsholderId || '',
    RoyaltyProfileId: input.royaltyProfileId || '',
    Identifier: (decisionPackage.identifiers || []).join(';'),
    DecidedBy: input.operatorEmail,
    DecidedAt: new Date().toISOString(),
    EvidenceVersion: evidenceVersion,
    CorrelationId: correlationId,
    SupersedesDecisionId: input.supersedesDecisionId || '',
    OutOfScopeReason: input.outOfScopeReason || '',
    DeferReason: input.deferReason || '',
    EvidenceNeeded: input.evidenceNeeded || '',
    IdempotencyKey: idempotencyKey,
    Boundary:
      'No author visibility, no royalty payment, no statement release, no contract-rate inference.',
  }

  const description = [
    'Founder royalty mapping decision recorded.',
    `payload=${JSON.stringify(safePayload)}`,
  ].join(' ')

  const releasesRows = decisionType === 'APPROVE_MAPPING' || decisionType === 'CORRECT_MAPPING'

  return {
    package: decisionPackage,
    idempotencyKey,
    description,
    result: {
      status: 'RECORDED' as const,
      decisionId: `decision:${idempotencyKey}`,
      packageId: decisionPackage.packageKey,
      decisionType,
      evidenceVersion,
      correlationId,
      idempotencyKey,
      downstream: {
        durableIdentifierMapping: releasesRows ? 'PENDING_RECOMPUTE' as const : 'NOT_APPLICABLE' as const,
        rowReevaluation: releasesRows ? 'PENDING_RECOMPUTE' as const : 'HELD' as const,
        draftStatementRefresh: releasesRows ? 'PENDING_RECOMPUTE' as const : 'NOT_APPLICABLE' as const,
        authorVisibility: 'OFF' as const,
        royaltyPayments: 0 as const,
        authorStatementsReleased: 0 as const,
      },
    },
  }
}

export function currentRoyaltyEvidenceVersion() {
  const wave2 = readRoyaltyDecisionEvidence()
  return stringValue(wave2.summary?.generatedAt) || ROYALTY_DECISION_EVIDENCE_VERSION
}

export function findRoyaltyDecisionPackage(packageId: string): RoyaltyDecisionPackageEvidence {
  const normalized = clean(packageId)
  if (!normalized) throw new Error('royalty_package_id_required')

  const wave2 = readRoyaltyDecisionEvidence()
  const found = (wave2.packages || []).find((item) => item.packageKey === normalized)
  if (!found) throw new Error('royalty_package_not_found')
  return found
}

function validateDecisionPayload(decisionType: RoyaltyDecisionType, input: RoyaltyDecisionInput) {
  if (decisionType === 'APPROVE_MAPPING' || decisionType === 'CORRECT_MAPPING') {
    const missing = [
      ['canonicalWorkId', input.canonicalWorkId],
      ['formatAssetId', input.formatAssetId],
      ['rightsholderId', input.rightsholderId],
      ['royaltyProfileId', input.royaltyProfileId],
    ].filter(([, value]) => !clean(value))
    if (missing.length) {
      throw new Error(`CONTRACT_AUTHORITY_REQUIRED:${missing.map(([field]) => field).join(',')}`)
    }
  }

  if (decisionType === 'OUT_OF_SCOPE' && !clean(input.outOfScopeReason)) {
    throw new Error('out_of_scope_reason_required')
  }

  if (decisionType === 'DEFER' && !clean(input.deferReason)) {
    throw new Error('defer_reason_required')
  }
}

function assertFounderDecisionIdentity(email: string) {
  const allowed = (process.env.PUBLISHER_ROYALTY_DECISION_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  const normalized = clean(email).toLowerCase()
  if (!normalized) throw new Error('ANONYMOUS_DECISION_DENIED')
  if (allowed.length && !allowed.includes(normalized)) throw new Error('WRONG_OPERATOR_DENIED')
  if (!allowed.length && !normalized.endsWith('@jmerrill.one')) throw new Error('WRONG_OPERATOR_DENIED')
}

function normalizeDecisionType(value: string): RoyaltyDecisionType {
  const normalized = clean(value).toUpperCase()
  if (!ROYALTY_DECISION_TYPES.includes(normalized as RoyaltyDecisionType)) {
    throw new Error('unsupported_royalty_decision_type')
  }
  return normalized as RoyaltyDecisionType
}

function buildRoyaltyDecisionIdempotencyKey(input: RoyaltyDecisionInput & { evidenceVersion: string }) {
  const parts = [
    input.packageId,
    input.evidenceVersion,
    input.decisionType,
    input.canonicalWorkId || '',
    input.formatAssetId || '',
    input.rightsholderId || '',
    input.royaltyProfileId || '',
    input.outOfScopeReason || '',
    input.deferReason || '',
    input.evidenceNeeded || '',
  ]
  return createHash('sha256').update(parts.join('|')).digest('hex')
}

async function findExistingRoyaltyDecision(config: DataverseServerConfig, idempotencyKey: string) {
  return dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon',
    $filter: `jm1_actiontype eq '${ROYALTY_DECISION_ACTION_TYPE}' and contains(jm1_actiondescription,'${escapeODataText(
      idempotencyKey,
    )}')`,
    $top: '1',
  })
}

function readRoyaltyDecisionEvidence(): {
  summary?: { generatedAt?: string }
  packages?: RoyaltyDecisionPackageEvidence[]
} {
  const raw = readFileSync(
    join(process.cwd(), 'docs/operations/generated/2026-07-19-JM1-Royalty-Operations-Wave2-Decision-Packages.json'),
    'utf8',
  )
  return JSON.parse(raw)
}

function extractId(entityUrl: string) {
  return entityUrl.match(/\(([^)]+)\)/)?.[1] || ''
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function escapeODataText(value: string) {
  return value.replace(/'/g, "''")
}
