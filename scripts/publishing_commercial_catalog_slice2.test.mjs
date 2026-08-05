import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const service = jiti('../lib/server/publishing-commercial-catalog-slice2-service.ts')
const route = readFileSync(new URL('../app/api/publishing/catalog/slice2/route.ts', import.meta.url), 'utf8')
const workflow = readFileSync(new URL('../.github/workflows/publishing-commercial-catalog-slice2.yml', import.meta.url), 'utf8')
const pf08Workflow = readFileSync(
  new URL('../.github/workflows/publishing-commercial-catalog-pf08-amendment.yml', import.meta.url),
  'utf8',
)
const serviceSource = readFileSync(
  new URL('../lib/server/publishing-commercial-catalog-slice2-service.ts', import.meta.url),
  'utf8',
)

const {
  SLICE2_APPROVED_MAIN_SHA,
  SLICE2_SEED_MANIFEST_SHA256,
  executePublishingCommercialCatalogSlice2,
  validateSlice2RequestAndManifest,
} = service

const baseRequest = {
  mode: 'dry-run',
  confirm: false,
  expectedMainSha: SLICE2_APPROVED_MAIN_SHA,
  seedManifestSha256: SLICE2_SEED_MANIFEST_SHA256,
  correlationId: 'slice2-test-correlation-id',
  operator: 'repo:jmerrillorg/jmerrill-pub:environment:jmerrill-pub-production',
}

function memoryAdapter(existing = []) {
  const state = [...existing]
  return {
    state,
    upserts: [],
    logs: [],
    async readCatalogState() {
      return state
    },
    async upsertCatalogRecord(record, desired) {
      this.upserts.push({ record, desired })
      const index = state.findIndex((row) => row.rowId === desired.rowId)
      if (index >= 0) state[index] = desired
      else state.push(desired)
    },
    async writeExecutionLog(input) {
      this.logs.push(input)
    },
  }
}

function manifestFixture(overrides = {}) {
  const records = Array.from({ length: 120 }, (_, index) => {
    const n = index + 1
    const sourceRowId = `CAT-${String(n).padStart(3, '0')}`
    let ruling = 'MIGRATE'
    let commercialStatus = 'ACTIVE'
    let canonicalSku = `JMP-TEST-${String(n).padStart(3, '0')}`
    let supersededBy = ''
    let publicVisibility = 'PUBLIC'
    let quoteEligibility = 'QUOTABLE'
    let contractEligibility = 'CONTRACTABLE'
    let pfMapping = 'N/A'
    let productionModeMapping = 'N/A'
    if (n <= 10) {
      ruling = 'MERGE'
      commercialStatus = 'SUPERSEDED'
      canonicalSku = 'JMP-AUD-SYNTH-STD'
      supersededBy = 'JMP-AUD-SYNTH-STD'
      publicVisibility = 'NON-PUBLIC'
      quoteEligibility = 'NOT QUOTABLE'
      contractEligibility = 'NOT CONTRACTABLE'
    } else if (n <= 15) {
      ruling = 'AMEND'
    } else if (n <= 21) {
      ruling = 'RETIRE'
      commercialStatus = 'RETIRED'
      publicVisibility = 'NON-PUBLIC'
      quoteEligibility = 'NOT QUOTABLE'
      contractEligibility = 'NOT CONTRACTABLE'
    } else if (n <= 27) {
      ruling = 'PROVISIONAL'
      commercialStatus = 'PROVISIONAL'
      publicVisibility = 'NON-PUBLIC'
      quoteEligibility = 'NOT QUOTABLE'
      contractEligibility = 'NOT CONTRACTABLE'
    }
    return {
      sourceRowId,
      legacySku: `JMP-LEGACY-${String(n).padStart(3, '0')}`,
      canonicalSku,
      name: `Test SKU ${n}`,
      category: 'Test',
      finalJackieRuling: ruling,
      commercialStatus,
      unitPriceOrPricingMethod: '$1',
      pfMapping,
      releaseModelMapping: 'N/A',
      productionModeMapping,
      slotEligibility: 'No',
      premiumUpcharge: 'N/A',
      publicVisibility,
      quoteEligibility,
      contractEligibility,
      supersededBy,
      effectiveDate: '2026-08-05',
      sourceAuthority: 'Matrix v1.1 + completed Jackie ruling workbook',
      matrixVersion: 'Matrix v1.1',
      jackieRulingReference: `Fixture / ${sourceRowId}`,
      migrationAction: 'Fixture action',
    }
  })
  return {
    totalRows: 120,
    rowCounts: { MIGRATE: 93, MERGE: 10, AMEND: 5, RETIRE: 6, PROVISIONAL: 6 },
    dryRunCounts: { creates: 104, updates: 5, supersessions: 10, retirements: 6, provisionalHolds: 6, noopMatches: 0, errors: 0 },
    records,
    ...overrides,
  }
}

test('protected endpoint is OIDC-only and fail closed', () => {
  assert.match(route, /GitHub Actions OIDC bearer token required/)
  assert.match(route, /status:\s*401/)
  assert.match(route, /audience:\s*'jm1-pub-catalog-slice2'/)
  assert.match(route, /Confirmed Slice 2 execution requires confirm=true/)
  assert.match(route, /Unsupported Slice 2 authority amendment/)
  assert.match(route, /authorityAmendment:\s*body\.authorityAmendment/)
})

test('valid dry-run returns approved counts without mutation', async () => {
  const mock = memoryAdapter()
  const result = await executePublishingCommercialCatalogSlice2(baseRequest, mock)
  assert.equal(result.status, 'eligible')
  assert.deepEqual(result.counts, {
    creates: 104,
    updates: 5,
    supersessions: 10,
    retirements: 6,
    provisionalHolds: 6,
    noopMatches: 0,
    errors: 0,
  })
  assert.equal(result.representedRows, 120)
  assert.equal(mock.upserts.length, 0)
  assert.equal(mock.logs.length, 0)
})

test('wrong main SHA fails', () => {
  const result = validateSlice2RequestAndManifest({ ...baseRequest, expectedMainSha: 'bad' })
  assert.ok(result.blockers.includes('CATALOG_SLICE2_MAIN_SHA_MISMATCH'))
})

test('wrong seed checksum fails', () => {
  const result = validateSlice2RequestAndManifest({ ...baseRequest, seedManifestSha256: 'bad' })
  assert.ok(result.blockers.includes('CATALOG_SLICE2_SEED_CHECKSUM_MISMATCH'))
})

test('row count not 120 fails', () => {
  const result = validateSlice2RequestAndManifest(baseRequest, manifestFixture({ totalRows: 119 }))
  assert.ok(result.blockers.includes('CATALOG_SLICE2_ROW_COUNT_MISMATCH'))
})

test('ruling counts mismatch fails', () => {
  const manifest = manifestFixture()
  manifest.records[119].finalJackieRuling = 'AMEND'
  const result = validateSlice2RequestAndManifest(baseRequest, manifest)
  assert.ok(result.blockers.some((blocker) => blocker.startsWith('CATALOG_SLICE2_RULING_COUNT_MISMATCH')))
})

test('unresolved replacement SKU fails', () => {
  const manifest = manifestFixture()
  manifest.records[0].supersededBy = 'JMP-UNKNOWN'
  const result = validateSlice2RequestAndManifest(baseRequest, manifest)
  assert.ok(result.blockers.includes('CATALOG_SLICE2_REPLACEMENT_SKU_UNRESOLVED'))
})

test('duplicate active canonical SKU fails', () => {
  const manifest = manifestFixture()
  manifest.records[30].canonicalSku = manifest.records[31].canonicalSku
  const result = validateSlice2RequestAndManifest(baseRequest, manifest)
  assert.ok(result.blockers.includes('CATALOG_SLICE2_DUPLICATE_ACTIVE_CANONICAL_SKU'))
})

test('PF-07 public or quotable fails', () => {
  const manifest = manifestFixture()
  manifest.records[30].pfMapping = 'PF-07'
  manifest.records[30].publicVisibility = 'PUBLIC'
  const result = validateSlice2RequestAndManifest(baseRequest, manifest)
  assert.ok(result.blockers.includes('CATALOG_SLICE2_PF07_BOUNDARY_VIOLATION'))
})

test('PF-08 not SOW-gated fails', () => {
  const manifest = manifestFixture()
  manifest.records[30].pfMapping = 'PF-08'
  manifest.records[30].productionModeMapping = 'Standard production'
  manifest.records[30].quoteEligibility = 'QUOTABLE'
  const result = validateSlice2RequestAndManifest(baseRequest, manifest)
  assert.ok(result.blockers.includes('CATALOG_SLICE2_PF08_SOW_GATE_MISSING'))
})

test('execute without confirm=true fails', async () => {
  const result = await executePublishingCommercialCatalogSlice2({ ...baseRequest, mode: 'execute', confirm: false }, memoryAdapter())
  assert.equal(result.status, 'blocked')
  assert.ok(result.blockers.includes('CATALOG_SLICE2_CONFIRM_REQUIRED'))
})

test('first execution mutates rows and writes row-level logs', async () => {
  const mock = memoryAdapter()
  const result = await executePublishingCommercialCatalogSlice2({ ...baseRequest, mode: 'execute', confirm: true }, mock)
  assert.equal(result.status, 'completed')
  assert.equal(result.mutationPerformed, true)
  assert.equal(mock.upserts.length, 118)
  assert.equal(mock.logs.length, 120)
  assert.equal(new Set(mock.state.map((row) => row.canonicalSku)).size, mock.state.length)
  assert.equal(mock.logs.every((log) => log.seedChecksum === SLICE2_SEED_MANIFEST_SHA256), true)
  assert.equal(mock.logs.every((log) => log.mainSha === SLICE2_APPROVED_MAIN_SHA), true)
})

test('second execution is idempotent with one replay log', async () => {
  const mock = memoryAdapter()
  await executePublishingCommercialCatalogSlice2({ ...baseRequest, mode: 'execute', confirm: true }, mock)
  mock.upserts = []
  mock.logs = []
  const result = await executePublishingCommercialCatalogSlice2({ ...baseRequest, mode: 'execute', confirm: true }, mock)
  assert.equal(result.status, 'idempotent')
  assert.deepEqual(result.counts, {
    creates: 0,
    updates: 0,
    supersessions: 0,
    retirements: 0,
    provisionalHolds: 0,
    noopMatches: 120,
    errors: 0,
  })
  assert.equal(mock.upserts.length, 0)
  assert.equal(mock.logs.length, 1)
  assert.equal(mock.logs[0].eventType, 'CATALOG_SLICE2_IDEMPOTENT_REPLAY')
})

test('PF-08 authority amendment creates active canonical record and keeps legacy superseded', async () => {
  const mock = memoryAdapter([
    {
      id: 'existing-cat-052',
      rowId: 'CAT-052',
      legacySku: 'JMP-DES-INTERACTIVE',
      canonicalSku: 'JMP-INT-EPUB3-STD',
      commercialStatus: 'SUPERSEDED',
      recordFingerprint: 'prior-pf08-fingerprint',
    },
  ])
  const request = {
    ...baseRequest,
    mode: 'execute',
    confirm: true,
    authorityAmendment: 'PF08_ACTIVE_SCOPING_GATED_V1',
  }

  const result = await executePublishingCommercialCatalogSlice2(request, mock)

  assert.equal(result.status, 'amended')
  assert.equal(result.resultCode, 'CATALOG_SLICE2_PF08_AUTHORITY_AMENDED')
  assert.equal(result.representedRows, 2)
  assert.equal(mock.upserts.length, 2)
  assert.equal(mock.logs.length, 2)

  const legacy = mock.state.find((row) => row.rowId === 'CAT-052')
  const active = mock.state.find((row) => row.rowId === 'PF08-AUTH-001')
  assert.equal(legacy?.legacySku, 'JMP-DES-INTERACTIVE')
  assert.equal(legacy?.canonicalSku, 'JMP-DES-INTERACTIVE')
  assert.equal(legacy?.commercialStatus, 'SUPERSEDED')
  assert.equal(active?.legacySku, 'JMP-INT-EPUB3-STD')
  assert.equal(active?.canonicalSku, 'JMP-INT-EPUB3-STD')
  assert.equal(active?.commercialStatus, 'ACTIVE')
  assert.equal(new Set(mock.state.map((row) => `${row.commercialStatus}:${row.canonicalSku}`)).size, mock.state.length)
  assert.equal(mock.logs.some((log) => log.eventType === 'CATALOG_SLICE2_PF08_AUTHORITY_ACTIVATED'), true)
})

test('PF-08 authority amendment is idempotent after activation', async () => {
  const mock = memoryAdapter([
    {
      id: 'existing-cat-052',
      rowId: 'CAT-052',
      legacySku: 'JMP-DES-INTERACTIVE',
      canonicalSku: 'JMP-INT-EPUB3-STD',
      commercialStatus: 'SUPERSEDED',
      recordFingerprint: 'prior-pf08-fingerprint',
    },
  ])
  const request = {
    ...baseRequest,
    mode: 'execute',
    confirm: true,
    authorityAmendment: 'PF08_ACTIVE_SCOPING_GATED_V1',
  }
  await executePublishingCommercialCatalogSlice2(request, mock)
  mock.upserts = []
  mock.logs = []

  const result = await executePublishingCommercialCatalogSlice2(request, mock)

  assert.equal(result.status, 'idempotent')
  assert.equal(result.resultCode, 'CATALOG_SLICE2_PF08_AUTHORITY_ALREADY_APPLIED')
  assert.equal(result.counts.noopMatches, 2)
  assert.equal(mock.upserts.length, 0)
  assert.equal(mock.logs.length, 1)
  assert.equal(mock.logs[0].eventType, 'CATALOG_SLICE2_PF08_AUTHORITY_IDEMPOTENT_REPLAY')
})

test('workflow is governed, protected, and does not expose local production secrets', () => {
  assert.match(workflow, /publishing-commercial-catalog-slice2/)
  assert.match(workflow, /environment:\s*jmerrill-pub-production/)
  assert.match(workflow, /id-token:\s*write/)
  assert.match(workflow, /audience=jm1-pub-catalog-slice2/)
  assert.match(workflow, /npm run jm1-bootstrap -- --initiative "Publishing Commercial Catalog Slice 2" --mode "production-mutation"/)
  assert.match(workflow, /npm run catalog-reconciliation-final-guard/)
  assert.doesNotMatch(workflow, /DATAVERSE_CLIENT_SECRET|AZURE_CLIENT_SECRET|client-secret/i)
})

test('PF-08 amendment workflow is governed, protected, and scoped to the named amendment', () => {
  assert.match(pf08Workflow, /publishing-commercial-catalog-pf08-amendment/)
  assert.match(pf08Workflow, /environment:\s*jmerrill-pub-production/)
  assert.match(pf08Workflow, /id-token:\s*write/)
  assert.match(pf08Workflow, /audience=jm1-pub-catalog-slice2/)
  assert.match(pf08Workflow, /AUTHORITY_AMENDMENT:\s*PF08_ACTIVE_SCOPING_GATED_V1/)
  assert.match(pf08Workflow, /authorityAmendment:\s*\$authorityAmendment/)
  assert.match(pf08Workflow, /CATALOG_SLICE2_PF08_AUTHORITY_DRY_RUN_PASS/)
  assert.match(pf08Workflow, /CATALOG_SLICE2_PF08_AUTHORITY_AMENDED/)
  assert.match(pf08Workflow, /CATALOG_SLICE2_PF08_AUTHORITY_ALREADY_APPLIED/)
  assert.doesNotMatch(pf08Workflow, /DATAVERSE_CLIENT_SECRET|AZURE_CLIENT_SECRET|client-secret/i)
})

test('service source does not print secret values', () => {
  assert.doesNotMatch(serviceSource, /console\.log\([^)]*(secret|token|password)/i)
})
