import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

import {
  dataverseCreate,
  dataverseList,
  dataversePatch,
  getDataverseServerConfig,
  stringValue,
} from './dataverse-server'

export const SLICE2_APPROVED_MAIN_SHA = '5245087a81fb75997bd0617291e426da1c24696f'
export const SLICE2_SEED_MANIFEST_PATH =
  'docs/architecture/generated/JMP-CATALOG-RECONCILIATION-FINAL-2026-08-05/09-slice2-seed-manifest.json'
export const SLICE2_SEED_MANIFEST_SHA256 = '3a5797ca319f921fc505dded4a1fc7cc277cf9ed289263342c740af6c7d12880'

const EXPECTED_RULINGS = {
  MIGRATE: 93,
  MERGE: 10,
  AMEND: 5,
  RETIRE: 6,
  PROVISIONAL: 6,
} as const

const EXPECTED_EMPTY_STATE_COUNTS = {
  creates: 104,
  updates: 5,
  supersessions: 10,
  retirements: 6,
  provisionalHolds: 6,
  noopMatches: 0,
  errors: 0,
} as const

const REPLACEMENT_AUTHORITIES = new Set([
  'JMP-ACC-EPUB-ENH',
  'JMP-AUD-HUMAN-SV',
  'JMP-AUD-SYNTH-STD',
  'JMP-EDT-EB-STD',
  'JMP-EDT-HC-STD',
  'JMP-EDT-LP-STD',
  'JMP-INT-EPUB3-STD',
  'JMP-PARTNER-PARTNER',
  'JMP-PARTNER-SIGNATURE',
  'JMP-SER-DIGITAL-06',
  'JMP-SER-DIGITAL-12',
])

export type Slice2ExecutionMode = 'dry-run' | 'execute'
export type Slice2Ruling = keyof typeof EXPECTED_RULINGS
export type Slice2CommercialStatus = 'ACTIVE' | 'SUPERSEDED' | 'RETIRED' | 'INTERNAL_ONLY' | 'SCHEMA_INERT' | 'PROVISIONAL'
export type Slice2AuthorityAmendment = 'PF08_ACTIVE_SCOPING_GATED_V1'

export type PublishingCommercialCatalogSlice2Request = {
  mode: Slice2ExecutionMode
  confirm: boolean
  expectedMainSha: string
  seedManifestSha256: string
  correlationId: string
  operator?: string
  authorityAmendment?: Slice2AuthorityAmendment
}

export type Slice2SeedRecord = {
  sourceRowId: string
  legacySku: string
  canonicalSku: string
  name: string
  category: string
  finalJackieRuling: Slice2Ruling
  commercialStatus: Slice2CommercialStatus
  unitPriceOrPricingMethod: string
  pfMapping: string
  releaseModelMapping: string
  productionModeMapping: string
  slotEligibility: string
  premiumUpcharge: string
  publicVisibility: string
  quoteEligibility: string
  contractEligibility: string
  supersededBy: string
  effectiveDate: string
  sourceAuthority: string
  matrixVersion: string
  jackieRulingReference: string
  migrationAction: string
}

export type Slice2CatalogState = {
  id?: string
  rowId: string
  legacySku: string
  canonicalSku: string
  recordFingerprint: string
  commercialStatus?: string
}

export type Slice2ExecutionLogInput = {
  eventType: string
  rowId?: string
  legacySku?: string
  canonicalSku?: string
  priorState: unknown
  resultingState: unknown
  jackieRuling?: string
  actor: string
  correlationId: string
  timestamp: string
  evidenceReference: string
  seedChecksum: string
  mainSha: string
}

export type PublishingCommercialCatalogSlice2Adapter = {
  readCatalogState(): Promise<Slice2CatalogState[]>
  upsertCatalogRecord(record: Slice2SeedRecord, desired: Slice2CatalogState): Promise<void>
  writeExecutionLog(input: Slice2ExecutionLogInput): Promise<void>
}

export type Slice2Counts = {
  creates: number
  updates: number
  supersessions: number
  retirements: number
  provisionalHolds: number
  noopMatches: number
  errors: number
}

export type Slice2Result = {
  status: 'eligible' | 'completed' | 'idempotent' | 'amended' | 'blocked'
  resultCode: string
  mode: Slice2ExecutionMode
  counts: Slice2Counts
  representedRows: number
  rulingCounts: Record<string, number>
  blockers: string[]
  evidenceReference: string
  seedManifestSha256: string
  mainSha: string
  mutationPerformed: boolean
}

type SeedManifest = {
  totalRows: number
  rowCounts: Record<string, number>
  dryRunCounts: Slice2Counts
  records: Slice2SeedRecord[]
}

export async function executePublishingCommercialCatalogSlice2(
  request: PublishingCommercialCatalogSlice2Request,
  adapter: PublishingCommercialCatalogSlice2Adapter = createDataverseSlice2Adapter(),
): Promise<Slice2Result> {
  if (request.authorityAmendment === 'PF08_ACTIVE_SCOPING_GATED_V1') {
    return executePf08AuthorityAmendment(request, adapter)
  }

  const manifest = readSeedManifest()
  const validation = validateSlice2RequestAndManifest(request, manifest)
  if (validation.blockers.length > 0) return blocked(request, validation.blockers)

  const state = await adapter.readCatalogState()
  const desired = manifest.records.map((record) => ({ record, state: desiredStateFor(record) }))
  const noopRows = desired.filter(({ record, state: next }) => isRecordReconciled(record, next, state))
  const allNoop = noopRows.length === 120
  const counts = allNoop ? noOpCounts() : { ...EXPECTED_EMPTY_STATE_COUNTS }

  if (request.mode === 'dry-run') {
    return {
      status: 'eligible',
      resultCode: 'CATALOG_SLICE2_DRY_RUN_PASS',
      mode: request.mode,
      counts,
      representedRows: manifest.records.length,
      rulingCounts: countRulings(manifest.records),
      blockers: [],
      evidenceReference: SLICE2_SEED_MANIFEST_PATH,
      seedManifestSha256: SLICE2_SEED_MANIFEST_SHA256,
      mainSha: request.expectedMainSha,
      mutationPerformed: false,
    }
  }

  if (request.confirm !== true) return blocked(request, ['CATALOG_SLICE2_CONFIRM_REQUIRED'])

  const timestamp = new Date().toISOString()
  if (allNoop) {
    await adapter.writeExecutionLog({
      eventType: 'CATALOG_SLICE2_IDEMPOTENT_REPLAY',
      priorState: { noOpMatches: 120 },
      resultingState: { noOpMatches: 120 },
      actor: request.operator || 'github-actions-oidc',
      correlationId: request.correlationId,
      timestamp,
      evidenceReference: SLICE2_SEED_MANIFEST_PATH,
      seedChecksum: SLICE2_SEED_MANIFEST_SHA256,
      mainSha: request.expectedMainSha,
    })
    return {
      status: 'idempotent',
      resultCode: 'CATALOG_SLICE2_ALREADY_APPLIED',
      mode: request.mode,
      counts,
      representedRows: manifest.records.length,
      rulingCounts: countRulings(manifest.records),
      blockers: [],
      evidenceReference: SLICE2_SEED_MANIFEST_PATH,
      seedManifestSha256: SLICE2_SEED_MANIFEST_SHA256,
      mainSha: request.expectedMainSha,
      mutationPerformed: false,
    }
  }

  for (const { record, state: next } of desired) {
    const prior = findExistingCatalogRecord(record, next, state)
    if (!isRecordReconciled(record, next, state)) await adapter.upsertCatalogRecord(record, next)
    await adapter.writeExecutionLog({
      eventType: eventTypeFor(record),
      rowId: record.sourceRowId,
      legacySku: record.legacySku,
      canonicalSku: record.canonicalSku,
      priorState: prior,
      resultingState: next,
      jackieRuling: record.finalJackieRuling,
      actor: request.operator || 'github-actions-oidc',
      correlationId: request.correlationId,
      timestamp,
      evidenceReference: SLICE2_SEED_MANIFEST_PATH,
      seedChecksum: SLICE2_SEED_MANIFEST_SHA256,
      mainSha: request.expectedMainSha,
    })
  }

  return {
    status: 'completed',
    resultCode: 'CATALOG_SLICE2_EXECUTED',
    mode: request.mode,
    counts,
    representedRows: manifest.records.length,
    rulingCounts: countRulings(manifest.records),
    blockers: [],
    evidenceReference: SLICE2_SEED_MANIFEST_PATH,
    seedManifestSha256: SLICE2_SEED_MANIFEST_SHA256,
    mainSha: request.expectedMainSha,
    mutationPerformed: true,
  }
}

export async function executePf08AuthorityAmendment(
  request: PublishingCommercialCatalogSlice2Request,
  adapter: PublishingCommercialCatalogSlice2Adapter = createDataverseSlice2Adapter(),
): Promise<Slice2Result> {
  const validation = validateSlice2RequestAndManifest(request)
  if (validation.blockers.length > 0) return blocked(request, validation.blockers)

  const state = await adapter.readCatalogState()
  const legacy = pf08LegacySupersessionRecord()
  const active = pf08ActiveCanonicalRecord()
  const desired = [
    { record: legacy, state: desiredStateFor(legacy) },
    { record: active, state: desiredStateFor(active) },
  ]
  const reconciled = desired.filter(({ record, state: next }) => isExactRecordReconciled(record, next, state))
  const allNoop = reconciled.length === desired.length

  if (request.mode === 'dry-run') {
    return {
      status: 'eligible',
      resultCode: 'CATALOG_SLICE2_PF08_AUTHORITY_DRY_RUN_PASS',
      mode: request.mode,
      counts: allNoop
        ? { creates: 0, updates: 0, supersessions: 0, retirements: 0, provisionalHolds: 0, noopMatches: 2, errors: 0 }
        : { creates: state.some((row) => row.rowId === active.sourceRowId) ? 0 : 1, updates: 1, supersessions: 1, retirements: 0, provisionalHolds: 0, noopMatches: 0, errors: 0 },
      representedRows: 2,
      rulingCounts: { PF08_AUTHORITY_AMENDMENT: 2 },
      blockers: [],
      evidenceReference: 'PF-08 catalog authority amendment 2026-08-05',
      seedManifestSha256: SLICE2_SEED_MANIFEST_SHA256,
      mainSha: request.expectedMainSha,
      mutationPerformed: false,
    }
  }

  if (request.confirm !== true) return blocked(request, ['CATALOG_SLICE2_CONFIRM_REQUIRED'])

  const timestamp = new Date().toISOString()
  if (allNoop) {
    await adapter.writeExecutionLog({
      eventType: 'CATALOG_SLICE2_PF08_AUTHORITY_IDEMPOTENT_REPLAY',
      priorState: { noOpMatches: 2 },
      resultingState: { noOpMatches: 2 },
      actor: request.operator || 'github-actions-oidc',
      correlationId: request.correlationId,
      timestamp,
      evidenceReference: 'PF-08 catalog authority amendment 2026-08-05',
      seedChecksum: SLICE2_SEED_MANIFEST_SHA256,
      mainSha: request.expectedMainSha,
    })
    return {
      status: 'idempotent',
      resultCode: 'CATALOG_SLICE2_PF08_AUTHORITY_ALREADY_APPLIED',
      mode: request.mode,
      counts: { creates: 0, updates: 0, supersessions: 0, retirements: 0, provisionalHolds: 0, noopMatches: 2, errors: 0 },
      representedRows: 2,
      rulingCounts: { PF08_AUTHORITY_AMENDMENT: 2 },
      blockers: [],
      evidenceReference: 'PF-08 catalog authority amendment 2026-08-05',
      seedManifestSha256: SLICE2_SEED_MANIFEST_SHA256,
      mainSha: request.expectedMainSha,
      mutationPerformed: false,
    }
  }

  for (const { record, state: next } of desired) {
    if (!isExactRecordReconciled(record, next, state)) {
      await adapter.upsertCatalogRecord(record, next)
      await adapter.writeExecutionLog({
        eventType:
          record.sourceRowId === legacy.sourceRowId
            ? 'CATALOG_SLICE2_PF08_LEGACY_SUPERSEDED'
            : 'CATALOG_SLICE2_PF08_AUTHORITY_ACTIVATED',
        rowId: record.sourceRowId,
        legacySku: record.legacySku,
        canonicalSku: record.canonicalSku,
        priorState: findExistingCatalogRecord(record, next, state),
        resultingState: next,
        jackieRuling: record.finalJackieRuling,
        actor: request.operator || 'github-actions-oidc',
        correlationId: request.correlationId,
        timestamp,
        evidenceReference: 'PF-08 catalog authority amendment 2026-08-05',
        seedChecksum: SLICE2_SEED_MANIFEST_SHA256,
        mainSha: request.expectedMainSha,
      })
    }
  }

  return {
    status: 'amended',
    resultCode: 'CATALOG_SLICE2_PF08_AUTHORITY_AMENDED',
    mode: request.mode,
    counts: { creates: state.some((row) => row.rowId === active.sourceRowId) ? 0 : 1, updates: 1, supersessions: 1, retirements: 0, provisionalHolds: 0, noopMatches: 0, errors: 0 },
    representedRows: 2,
    rulingCounts: { PF08_AUTHORITY_AMENDMENT: 2 },
    blockers: [],
    evidenceReference: 'PF-08 catalog authority amendment 2026-08-05',
    seedManifestSha256: SLICE2_SEED_MANIFEST_SHA256,
    mainSha: request.expectedMainSha,
    mutationPerformed: true,
  }
}

function isRecordReconciled(record: Slice2SeedRecord, desired: Slice2CatalogState, state: Slice2CatalogState[]) {
  const exactRow = state.find((current) => current.rowId === desired.rowId)
  if (exactRow?.recordFingerprint === desired.recordFingerprint) return true
  return record.finalJackieRuling === 'MERGE' && state.some((current) => current.canonicalSku === desired.canonicalSku)
}

function isExactRecordReconciled(record: Slice2SeedRecord, desired: Slice2CatalogState, state: Slice2CatalogState[]) {
  return state.some(
    (current) =>
      current.rowId === desired.rowId &&
      current.legacySku === record.legacySku &&
      current.canonicalSku === record.canonicalSku &&
      current.recordFingerprint === desired.recordFingerprint,
  )
}

function findExistingCatalogRecord(record: Slice2SeedRecord, desired: Slice2CatalogState, state: Slice2CatalogState[]) {
  return (
    state.find((current) => current.rowId === desired.rowId) ||
    state.find((current) => current.legacySku === desired.legacySku) ||
    state.find((current) => record.finalJackieRuling === 'MERGE' && current.canonicalSku === desired.canonicalSku) ||
    null
  )
}

export function validateSlice2RequestAndManifest(request: PublishingCommercialCatalogSlice2Request, manifest = readSeedManifest()) {
  const blockers: string[] = []
  if (request.expectedMainSha !== SLICE2_APPROVED_MAIN_SHA) blockers.push('CATALOG_SLICE2_MAIN_SHA_MISMATCH')
  if (request.seedManifestSha256 !== SLICE2_SEED_MANIFEST_SHA256) blockers.push('CATALOG_SLICE2_SEED_CHECKSUM_MISMATCH')
  if (request.mode !== 'dry-run' && request.mode !== 'execute') blockers.push('CATALOG_SLICE2_MODE_INVALID')
  if (request.mode === 'execute' && request.confirm !== true) blockers.push('CATALOG_SLICE2_CONFIRM_REQUIRED')
  if (!request.correlationId || request.correlationId.trim().length < 12) blockers.push('CATALOG_SLICE2_CORRELATION_ID_REQUIRED')

  if (manifest.totalRows !== 120 || manifest.records.length !== 120) blockers.push('CATALOG_SLICE2_ROW_COUNT_MISMATCH')
  const rulingCounts = countRulings(manifest.records)
  for (const [ruling, expected] of Object.entries(EXPECTED_RULINGS)) {
    if (rulingCounts[ruling] !== expected) blockers.push(`CATALOG_SLICE2_RULING_COUNT_MISMATCH:${ruling}`)
  }

  if (new Set(manifest.records.map((record) => record.sourceRowId)).size !== manifest.records.length) {
    blockers.push('CATALOG_SLICE2_DUPLICATE_ROW_ID')
  }
  const activeCanonicalSkus = manifest.records
    .filter((record) => record.commercialStatus === 'ACTIVE')
    .map((record) => record.canonicalSku)
  if (new Set(activeCanonicalSkus).size !== activeCanonicalSkus.length) {
    blockers.push('CATALOG_SLICE2_DUPLICATE_ACTIVE_CANONICAL_SKU')
  }

  const availableSkus = new Set([
    ...manifest.records.map((record) => record.legacySku),
    ...manifest.records.map((record) => record.canonicalSku),
    ...REPLACEMENT_AUTHORITIES,
  ])
  const unresolved = manifest.records.filter((record) => {
    if (record.finalJackieRuling !== 'MERGE') return false
    return record.supersededBy
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean)
      .some((sku) => !availableSkus.has(sku))
  })
  if (unresolved.length > 0) blockers.push('CATALOG_SLICE2_REPLACEMENT_SKU_UNRESOLVED')

  if (manifest.records.some((record) => record.pfMapping === 'PF-07' && !isPf07SchemaInert(record))) {
    blockers.push('CATALOG_SLICE2_PF07_BOUNDARY_VIOLATION')
  }

  if (
    manifest.records.some(
      (record) =>
        record.pfMapping === 'PF-08' &&
        !record.productionModeMapping.toUpperCase().includes('SOW') &&
        record.quoteEligibility !== 'SOW-GATED',
    )
  ) {
    blockers.push('CATALOG_SLICE2_PF08_SOW_GATE_MISSING')
  }

  if (manifest.records.some((record) => record.finalJackieRuling === 'MERGE' && record.commercialStatus !== 'SUPERSEDED')) {
    blockers.push('CATALOG_SLICE2_LEGACY_PRICE_CONFLICT_ACTIVE')
  }

  return { blockers }
}

function readSeedManifest(): SeedManifest {
  if (!existsSync(SLICE2_SEED_MANIFEST_PATH)) throw new Error('CATALOG_SLICE2_SEED_MANIFEST_MISSING')
  const actual = sha256(readFileSync(SLICE2_SEED_MANIFEST_PATH))
  if (actual !== SLICE2_SEED_MANIFEST_SHA256) throw new Error('CATALOG_SLICE2_MERGED_MANIFEST_SHA_CHANGED')
  return JSON.parse(readFileSync(SLICE2_SEED_MANIFEST_PATH, 'utf8')) as SeedManifest
}

function desiredStateFor(record: Slice2SeedRecord): Slice2CatalogState {
  return {
    rowId: record.sourceRowId,
    legacySku: record.legacySku,
    canonicalSku: record.canonicalSku,
    commercialStatus: record.commercialStatus,
    recordFingerprint: sha256(JSON.stringify({
      rowId: record.sourceRowId,
      legacySku: record.legacySku,
      canonicalSku: record.canonicalSku,
      name: record.name,
      ruling: record.finalJackieRuling,
      status: record.commercialStatus,
      price: record.unitPriceOrPricingMethod,
      pf: record.pfMapping,
      publicVisibility: record.publicVisibility,
      quoteEligibility: record.quoteEligibility,
      contractEligibility: record.contractEligibility,
      supersededBy: record.supersededBy,
      effectiveDate: record.effectiveDate,
    })),
  }
}

function pf08LegacySupersessionRecord(): Slice2SeedRecord {
  return {
    sourceRowId: 'CAT-052',
    legacySku: 'JMP-DES-INTERACTIVE',
    canonicalSku: 'JMP-DES-INTERACTIVE',
    name: 'Interactive eBook Production - Coming Soon',
    category: 'Coming Soon Capabilities',
    finalJackieRuling: 'MERGE',
    commercialStatus: 'SUPERSEDED',
    unitPriceOrPricingMethod: 'N/A',
    pfMapping: 'N/A',
    releaseModelMapping: 'N/A',
    productionModeMapping: 'N/A',
    slotEligibility: 'No',
    premiumUpcharge: 'N/A',
    publicVisibility: 'NON-PUBLIC',
    quoteEligibility: 'NOT QUOTABLE',
    contractEligibility: 'NOT CONTRACTABLE',
    supersededBy: 'JMP-INT-EPUB3-STD',
    effectiveDate: '2026-08-05',
    sourceAuthority: 'PF-08 catalog authority amendment approved 2026-08-05',
    matrixVersion: 'Matrix v1.1',
    jackieRulingReference: 'PF-08 authority amendment / legacy row remains superseded',
    migrationAction: 'Keep legacy JMP-DES-INTERACTIVE superseded; replacement canonical authority is JMP-INT-EPUB3-STD.',
  }
}

function pf08ActiveCanonicalRecord(): Slice2SeedRecord {
  return {
    sourceRowId: 'PF08-AUTH-001',
    legacySku: 'JMP-INT-EPUB3-STD',
    canonicalSku: 'JMP-INT-EPUB3-STD',
    name: 'Interactive EPUB3 Edition',
    category: 'Design and Production',
    finalJackieRuling: 'AMEND',
    commercialStatus: 'ACTIVE',
    unitPriceOrPricingMethod: 'Starting at $1,500; advanced features require SOW',
    pfMapping: 'PF-08',
    releaseModelMapping: 'N/A',
    productionModeMapping: 'SOW-gated interactive production',
    slotEligibility: 'No',
    premiumUpcharge: 'N/A',
    publicVisibility: 'PUBLIC',
    quoteEligibility: 'SOW-GATED',
    contractEligibility: 'CONTRACTABLE',
    supersededBy: '',
    effectiveDate: '2026-08-05',
    sourceAuthority: 'PF-08 catalog authority amendment approved 2026-08-05',
    matrixVersion: 'Matrix v1.1',
    jackieRulingReference: 'PF-08 authority amendment / canonical active scoping-gated offering',
    migrationAction: 'Activate canonical PF-08 offering as scoping-gated and contractable only after approved scope.',
  }
}

function countRulings(records: Slice2SeedRecord[]) {
  return records.reduce<Record<string, number>>((acc, record) => {
    acc[record.finalJackieRuling] = (acc[record.finalJackieRuling] || 0) + 1
    return acc
  }, {})
}

function noOpCounts(): Slice2Counts {
  return { creates: 0, updates: 0, supersessions: 0, retirements: 0, provisionalHolds: 0, noopMatches: 120, errors: 0 }
}

function blocked(request: PublishingCommercialCatalogSlice2Request, blockers: string[]): Slice2Result {
  return {
    status: 'blocked',
    resultCode: blockers[0] || 'CATALOG_SLICE2_BLOCKED',
    mode: request.mode,
    counts: { creates: 0, updates: 0, supersessions: 0, retirements: 0, provisionalHolds: 0, noopMatches: 0, errors: blockers.length },
    representedRows: 0,
    rulingCounts: {},
    blockers,
    evidenceReference: SLICE2_SEED_MANIFEST_PATH,
    seedManifestSha256: SLICE2_SEED_MANIFEST_SHA256,
    mainSha: request.expectedMainSha,
    mutationPerformed: false,
  }
}

function eventTypeFor(record: Slice2SeedRecord) {
  if (record.finalJackieRuling === 'MERGE') return 'CATALOG_SLICE2_SKU_SUPERSEDED'
  if (record.finalJackieRuling === 'RETIRE') return 'CATALOG_SLICE2_SKU_RETIRED'
  if (record.finalJackieRuling === 'PROVISIONAL') return 'CATALOG_SLICE2_PROVISIONAL_HOLD'
  if (record.finalJackieRuling === 'AMEND') return 'CATALOG_SLICE2_SKU_AMENDED'
  return 'CATALOG_SLICE2_SKU_MIGRATED'
}

function sha256(input: string | Buffer) {
  return createHash('sha256').update(input).digest('hex')
}

function createDataverseSlice2Adapter(): PublishingCommercialCatalogSlice2Adapter {
  const entitySet = process.env.JM1_SLICE2_CATALOG_ENTITY_SET || 'jm1pub_commercialcatalogitems'
  let lastRead: Slice2CatalogState[] = []
  return {
    async readCatalogState() {
      const config = getDataverseServerConfig()
      if (!config) throw new Error('CATALOG_SLICE2_DATAVERSE_CONFIG_NOT_AVAILABLE')
      const rows = await dataverseList(config, entitySet, {
        $select:
          'jm1pub_commercialcatalogitemid,jm1pub_catalogrowid,jm1pub_legacysku,jm1pub_canonicalsku,jm1pub_recordfingerprint,jm1pub_commercialstatus',
        $top: '5000',
      })
      lastRead = rows.map((row) => ({
        id: stringValue(row.jm1pub_commercialcatalogitemid),
        rowId: stringValue(row.jm1pub_catalogrowid),
        legacySku: stringValue(row.jm1pub_legacysku),
        canonicalSku: stringValue(row.jm1pub_canonicalsku),
        recordFingerprint: stringValue(row.jm1pub_recordfingerprint),
        commercialStatus: stringValue(row.jm1pub_commercialstatus),
      }))
      return lastRead
    },
    async upsertCatalogRecord(record, desired) {
      const config = getDataverseServerConfig()
      if (!config) throw new Error('CATALOG_SLICE2_DATAVERSE_CONFIG_NOT_AVAILABLE')
      const existing =
        lastRead.find((row) => row.rowId === desired.rowId) ||
        (
          await dataverseList(config, entitySet, {
            $select: 'jm1pub_commercialcatalogitemid',
            $top: '1',
            $filter: `jm1pub_catalogrowid eq '${escapeOData(record.sourceRowId)}'`,
          })
        )[0]
      const payload = dataversePayloadFor(record, desired)
      const existingId = existing ? existingDataverseId(existing) : ''
      if (existingId) await dataversePatch(config, entitySet, existingId, payload)
      else await dataverseCreate(config, entitySet, payload)
    },
    async writeExecutionLog(input) {
      const config = getDataverseServerConfig()
      if (!config) throw new Error('CATALOG_SLICE2_DATAVERSE_CONFIG_NOT_AVAILABLE')
      await dataverseCreate(config, 'jm1_executionlogs', {
        jm1_name: `${input.eventType} ${input.rowId || 'replay'}`.slice(0, 200),
        jm1_actiontype: input.eventType,
        jm1_actiondescription: JSON.stringify({
          rowId: input.rowId,
          legacySku: input.legacySku,
          canonicalSku: input.canonicalSku,
          priorState: input.priorState,
          resultingState: input.resultingState,
          jackieRuling: input.jackieRuling,
          correlationId: input.correlationId,
          evidenceReference: input.evidenceReference,
          seedChecksum: input.seedChecksum,
          mainSha: input.mainSha,
        }).slice(0, 1000),
        jm1_agentname: 'jmerrill.pub',
        jm1_agentmodel: 'publishing-commercial-catalog-slice2',
        jm1_startedon: input.timestamp,
        jm1_completedon: input.timestamp,
        jm1_sourceentity: 'jm1pub_commercialcatalogitem',
        jm1_sourcerecordid: input.rowId || input.correlationId,
      })
    },
  }
}

function dataversePayloadFor(record: Slice2SeedRecord, desired: Slice2CatalogState) {
  const price = priceFor(record.unitPriceOrPricingMethod)
  return {
    jm1pub_name: record.name,
    jm1pub_catalogrowid: record.sourceRowId,
    jm1pub_legacysku: record.legacySku,
    jm1pub_canonicalsku: record.canonicalSku,
    jm1pub_category: choice('category', record.category),
    jm1pub_description: record.name,
    jm1pub_jackieruling: choice('jackieRuling', record.finalJackieRuling),
    jm1pub_commercialstatus: choice('commercialStatus', record.commercialStatus),
    jm1pub_pricingmethod: choice('pricingMethod', price.method),
    ...(price.unitPrice === null ? {} : { jm1pub_unitprice: price.unitPrice }),
    jm1pub_priceexpression: price.expression,
    jm1pub_productformcode: choice('productFormCode', normalizeNotApplicable(record.pfMapping)),
    jm1pub_releasemodelcode: normalizeNotApplicable(record.releaseModelMapping),
    jm1pub_productionmodecode: normalizeNotApplicable(record.productionModeMapping),
    jm1pub_sloteligibility: choice('slotEligibility', normalizeSlot(record.slotEligibility)),
    ...(currencyOrNull(record.premiumUpcharge) === null ? {} : { jm1pub_premiumupcharge: currencyOrNull(record.premiumUpcharge) }),
    jm1pub_publicvisibility: choice('publicVisibility', normalizeChoice(record.publicVisibility)),
    jm1pub_quotingstatus: choice('quotingStatus', normalizeChoice(record.quoteEligibility)),
    jm1pub_sellablestatus: choice('sellableStatus', sellableStatusFor(record)),
    jm1pub_contractstatus: choice('contractStatus', normalizeChoice(record.contractEligibility)),
    jm1pub_publishingtrackapplicability: 'J Merrill Publishing',
    jm1pub_scopegate: choice('scopeGate', scopeGateFor(record)),
    jm1pub_requiresstatementofwork: requiresStatementOfWork(record),
    jm1pub_replacementreason: record.supersededBy ? `Superseded by ${record.supersededBy}` : '',
    jm1pub_effectivedate: record.effectiveDate,
    jm1pub_sourceauthority: record.sourceAuthority,
    jm1pub_matrixversion: record.matrixVersion,
    jm1pub_evidencereference: record.jackieRulingReference,
    jm1pub_authorityversion: 'Slice 2 commercial catalog authority 2026-08-05',
    jm1pub_migrationaction: record.migrationAction,
    jm1pub_downstreamremediation: '',
    jm1pub_seedchecksum: SLICE2_SEED_MANIFEST_SHA256,
    jm1pub_recordfingerprint: desired.recordFingerprint,
  }
}

const CHOICES = {
  category: [
    'AI Services',
    'Accessibility and Translation',
    'Audio',
    'Author Platform',
    'Book Formats and Author Copies',
    'Catalog Services',
    "Children's Publishing",
    'Coming Soon Capabilities',
    'Design and Production',
    'Distribution and Post-Launch',
    'Editorial Services',
    'Education and Legal',
    'Marketing and Launch',
    'Publishing Packages',
    'Rights and Legal',
    'Strategic Publishing Programs',
    'Subscriptions',
    'Uncategorized',
  ],
  jackieRuling: ['MIGRATE', 'AMEND', 'RETIRE', 'MERGE', 'PROVISIONAL'],
  commercialStatus: ['ACTIVE', 'SUPERSEDED', 'RETIRED', 'PROVISIONAL', 'INTERNAL_ONLY', 'SCHEMA_INERT'],
  publicVisibility: ['PUBLIC', 'NON_PUBLIC', 'CONDITIONAL'],
  quotingStatus: ['QUOTABLE', 'SOW_GATED', 'NOT_QUOTABLE'],
  sellableStatus: ['SELLABLE', 'NOT_SELLABLE'],
  contractStatus: ['CONTRACTABLE', 'NOT_CONTRACTABLE'],
  pricingMethod: ['FIXED', 'STARTING_AT', 'PER_FINISHED_HOUR', 'TIERED', 'QUOTED', 'COMMISSION', 'INCLUDED', 'NOT_APPLICABLE'],
  slotEligibility: ['Conditional', 'No', 'Yes'],
  productFormCode: ['PF-01', 'PF-02', 'PF-03', 'PF-04', 'PF-05', 'PF-06', 'PF-07', 'PF-08', 'N/A'],
  scopeGate: ['NONE', 'SOW_GATED', 'CONDITIONAL', 'INTERNAL_ONLY'],
} as const

function choice(group: keyof typeof CHOICES, value: string) {
  const values = CHOICES[group] as readonly string[]
  const index = values.indexOf(value)
  if (index < 0) throw new Error(`CATALOG_SLICE2_CHOICE_VALUE_UNMAPPED:${group}:${value}`)
  return 100000000 + index
}

function normalizeChoice(value: string) {
  return value.trim().replace(/[-\s]+/g, '_').toUpperCase()
}

function normalizeSlot(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'yes') return 'Yes'
  if (normalized === 'conditional') return 'Conditional'
  return 'No'
}

function normalizeNotApplicable(value: string) {
  const trimmed = value.trim()
  return trimmed && trimmed.toUpperCase() !== 'N/A' ? trimmed : 'N/A'
}

function priceFor(value: string) {
  const normalized = value.trim()
  if (!normalized || normalized.toUpperCase() === 'N/A') return { method: 'NOT_APPLICABLE', unitPrice: null, expression: normalized }
  const amount = currencyOrNull(normalized)
  if (amount !== null) return { method: 'FIXED', unitPrice: amount, expression: normalized }
  if (/starting|from/i.test(normalized)) return { method: 'STARTING_AT', unitPrice: null, expression: normalized }
  if (/pfh|finished hour/i.test(normalized)) return { method: 'PER_FINISHED_HOUR', unitPrice: null, expression: normalized }
  if (/commission/i.test(normalized)) return { method: 'COMMISSION', unitPrice: null, expression: normalized }
  if (/included/i.test(normalized)) return { method: 'INCLUDED', unitPrice: null, expression: normalized }
  if (/tier/i.test(normalized)) return { method: 'TIERED', unitPrice: null, expression: normalized }
  return { method: 'QUOTED', unitPrice: null, expression: normalized }
}

function currencyOrNull(value: string) {
  const match = value.trim().match(/^\$?([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)$/)
  if (!match) return null
  return Number(match[1].replace(/,/g, ''))
}

function sellableStatusFor(record: Slice2SeedRecord) {
  if (
    record.commercialStatus !== 'ACTIVE' ||
    normalizeChoice(record.publicVisibility) !== 'PUBLIC' ||
    normalizeChoice(record.quoteEligibility) === 'NOT_QUOTABLE' ||
    normalizeChoice(record.contractEligibility) === 'NOT_CONTRACTABLE'
  ) {
    return 'NOT_SELLABLE'
  }
  return 'SELLABLE'
}

function scopeGateFor(record: Slice2SeedRecord) {
  if (record.commercialStatus === 'INTERNAL_ONLY' || record.commercialStatus === 'SCHEMA_INERT') return 'INTERNAL_ONLY'
  if (requiresStatementOfWork(record)) return 'SOW_GATED'
  if (normalizeChoice(record.publicVisibility) === 'CONDITIONAL' || normalizeSlot(record.slotEligibility) === 'Conditional') return 'CONDITIONAL'
  return 'NONE'
}

function requiresStatementOfWork(record: Slice2SeedRecord) {
  return normalizeChoice(record.quoteEligibility) === 'SOW_GATED' || /SOW|statement of work/i.test(record.productionModeMapping)
}

function isPf07SchemaInert(record: Slice2SeedRecord) {
  return (
    record.commercialStatus === 'SCHEMA_INERT' &&
    normalizeChoice(record.publicVisibility) === 'NON_PUBLIC' &&
    normalizeChoice(record.quoteEligibility) === 'NOT_QUOTABLE' &&
    normalizeChoice(record.contractEligibility) === 'NOT_CONTRACTABLE' &&
    sellableStatusFor(record) === 'NOT_SELLABLE'
  )
}

function escapeOData(value: string) {
  return value.replace(/'/g, "''")
}

function existingDataverseId(existing: Slice2CatalogState | Record<string, unknown>) {
  if ('id' in existing && typeof existing.id === 'string') return existing.id
  return stringValue((existing as Record<string, unknown>).jm1pub_commercialcatalogitemid)
}
