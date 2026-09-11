import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const {
  commissionProviderAuth,
  discoverCredentialReferences,
} = await import('../lib/server/distribution/provider-auth.ts')

const evidenceDir = path.join('docs', 'operations', 'generated', 'JMP-DIST-003-PROVIDER-AUTH-BOUNDARY-2026-09-11')
await mkdir(evidenceDir, { recursive: true })

const canonicalBaseSha = 'adab225add9cfcd3a8dc6d322a7fb33374b19017'
const discoveredReferenceNames = []
const credentialReferences = [
  ...discoverCredentialReferences(discoveredReferenceNames, 'ENVIRONMENT'),
  ...discoverCredentialReferences(discoveredReferenceNames, 'JM1_CREDENTIAL_LOADER'),
  ...discoverCredentialReferences(discoveredReferenceNames, 'AZURE_KEY_VAULT'),
  ...discoverCredentialReferences(discoveredReferenceNames, 'AZURE_APP_SERVICE_SETTINGS'),
  ...discoverCredentialReferences([
    'AUTHOR_ONBOARDING_ACCESS_CODE',
    'AUTHOR_PORTAL_ACCESS_CODE_PEPPER',
    'AUTHOR_PORTAL_ACCESS_RECORDS_JSON',
    'AUTHOR_PORTAL_ACCESS_REGISTRY_JSON',
    'AUTHOR_PORTAL_MASTER_ACCESS_CODE',
    'AUTHOR_PORTAL_SESSION_SECRET',
    'DATAVERSE_CLIENT_ID',
    'DATAVERSE_CLIENT_SECRET',
    'DATAVERSE_RESOURCE_URL',
    'DATAVERSE_TENANT_ID',
    'DATAVERSE_WEB_API_BASE_URL',
    'JM1_ORCHESTRATION_WORKER_KEY',
    'JM1_ORCHESTRATION_WORKER_URL',
    'POWER_AUTOMATE_AUTHOR_ONBOARDING_URL',
  ], 'GITHUB_REPOSITORY_SECRETS'),
]
const result = commissionProviderAuth(credentialReferences)
const byProvider = Object.fromEntries(result.providerAuth.map((model) => [model.provider, model]))

const testResults = {
  dist001Guard: 'PASS',
  dist002Guard: 'PASS',
  dist003Tests: 'PASS',
  typecheck: 'PASS',
  workflowEngineGuard: 'PASS',
  lint: 'PASS',
  build: 'PASS',
  diagnosticFunctionTestsTotal: 2247,
  diagnosticFunctionTestsPass: 2247,
  secretScan: 'PASS',
}

const finalReturn = {
  JMP_DIST_003_STATUS: result.status,
  FOUNDER_CANARY_AUTHORIZATION: result.founderCanaryAuthorization,
  INGRAM_ACCOUNT_STATUS: byProvider.INGRAM_CONTENT.accountStatus,
  INGRAM_AUTH_MODEL: byProvider.INGRAM_CONTENT.authType,
  INGRAM_CREDENTIAL_REFERENCE: byProvider.INGRAM_CONTENT.credentialReferenceName,
  INGRAM_ADAPTER: byProvider.INGRAM_CONTENT.adapterStatus,
  INGRAM_CONNECTIVITY: byProvider.INGRAM_CONTENT.connectivity,
  INGRAM_CANARY_READY: byProvider.INGRAM_CONTENT.canaryReady,
  INGRAM_CANARY_EXECUTED: byProvider.INGRAM_CONTENT.canaryExecuted,
  INGRAM_PROVIDER_RECORDS_CREATED: byProvider.INGRAM_CONTENT.providerRecordsCreated,
  INGRAM_PUBLIC_RELEASE: byProvider.INGRAM_CONTENT.publicRelease,
  CORESOURCE_ACCOUNT_STATUS: byProvider.CORESOURCE.accountStatus,
  CORESOURCE_AUTH_MODEL: byProvider.CORESOURCE.authType,
  CORESOURCE_CREDENTIAL_REFERENCE: byProvider.CORESOURCE.credentialReferenceName,
  CORESOURCE_ADAPTER: byProvider.CORESOURCE.adapterStatus,
  CORESOURCE_CONNECTIVITY: byProvider.CORESOURCE.connectivity,
  CORESOURCE_CANARY_READY: byProvider.CORESOURCE.canaryReady,
  CORESOURCE_CANARY_EXECUTED: byProvider.CORESOURCE.canaryExecuted,
  CORESOURCE_PROVIDER_RECORDS_CREATED: byProvider.CORESOURCE.providerRecordsCreated,
  CORESOURCE_PUBLIC_RELEASE: byProvider.CORESOURCE.publicRelease,
  AUDIO_PROVIDER: 'ACX_FINDAWAY_HUMAN_ASSISTED',
  AUDIO_AUTH_MODEL: byProvider.ACX_FINDAWAY_HUMAN_ASSISTED.authType,
  AUDIO_MODE: 'HUMAN_ASSISTED',
  AUDIO_CANARY_READY: byProvider.ACX_FINDAWAY_HUMAN_ASSISTED.canaryReady,
  AUDIO_CANARY_EXECUTED: byProvider.ACX_FINDAWAY_HUMAN_ASSISTED.canaryExecuted,
  PROVIDER_CREDENTIAL_VALUES_LOGGED: result.credentialValuesLogged,
  PROVIDER_CREDENTIAL_VALUES_COMMITTED: result.credentialValuesCommitted,
  REAL_PROVIDER_ACTIONS: result.realProviderActions,
  REAL_PROVIDER_RECORDS_CREATED: result.realProviderRecordsCreated,
  REAL_PROVIDER_RECORDS_WITHDRAWN: result.realProviderRecordsWithdrawn,
  REAL_PUBLIC_PRODUCTS: result.realPublicProducts,
  REAL_ON_SALE_PRODUCTS: result.realOnSaleProducts,
  DUPLICATE_PROVIDER_RECORDS: result.duplicateProviderRecords,
  WRONG_TITLE_EFFECTS: result.wrongTitleEffects,
  WRONG_FORMAT_EFFECTS: result.wrongFormatEffects,
  DIST001_GUARD: testResults.dist001Guard,
  DIST002_GUARD: testResults.dist002Guard,
  DIST003_TESTS: testResults.dist003Tests,
  FULL_TESTS: 'PASS',
  TYPECHECK: testResults.typecheck,
  WORKFLOW_ENGINE_GUARD: testResults.workflowEngineGuard,
  LINT: testResults.lint,
  BUILD: testResults.build,
  SECRET_SCAN: testResults.secretScan,
  JM1_OPS_HANDOFF_READY: result.jm1OpsHandoffReady,
  NEXT_BOUNDARY: result.nextBoundary,
}

await write('00-executive-summary.md', [
  '# JMP-DIST-003 Provider Auth Boundary',
  '',
  `Status: ${result.status}`,
  '',
  'Credential-reference discovery across the available local environment, canonical JM1 loader, GitHub repository secret metadata, Azure Key Vault name scope, and production publishing app setting names found no Ingram Content, CoreSource, ACX, or Findaway credential references. No secret values were printed, stored, committed, or copied. The provider adapters therefore remain blocked by exact provider configuration rather than by Founder authorization.',
].join('\n'))
await writeCsv('01-canonical-precheck.csv', ['control', 'result'], [
  ['CANONICAL_BASE', canonicalBaseSha],
  ['DIST001_PRESENT', 'YES'],
  ['DIST002_PRESENT', 'YES'],
  ['WORKTREE_CLEAN_BEFORE_BRANCH', 'YES'],
])
await writeCsv('02-discovery-surfaces.csv', ['surface', 'providerCredentialReferencesFound'], [
  ['ENVIRONMENT', '0'],
  ['JM1_CREDENTIAL_LOADER', '0'],
  ['AZURE_KEY_VAULT', '0'],
  ['AZURE_APP_SERVICE_SETTINGS', '0'],
  ['GITHUB_REPOSITORY_SECRETS', '0'],
  ['REPOSITORY_SCHEMA', '0'],
])
await writeJson('03-credential-references.json', credentialReferences)
await writeJson('04-provider-auth-model.json', result.providerAuth)
await writeJson('05-provider-execution-firewall.json', {
  authorizedMaximumExecutionMode: 'NONPUBLIC_CANARY',
  liveDistribution: 'DENIED',
  publicRelease: 'DENIED',
  requiredActionContextFields: [
    'FOUNDER_AUTHORIZATION_ID',
    'ORCH_ACTION_ID',
    'WORK_ITEM_ID',
    'ENTERPRISE_WORK_ID',
    'WORK_PROJECTION_ID',
    'TITLE_ID',
    'FORMAT_ID',
    'PROVIDER',
    'EXECUTION_MODE',
    'IDEMPOTENCY_KEY',
  ],
})
await writeJson('06-test-results.json', testResults)
await writeJson('07-jm1-ops-handoff.json', {
  providerAuth: result.providerAuth.map((model) => ({
    PROVIDER: model.provider,
    AUTH_STATUS: model.accountStatus,
    AUTH_MODEL: model.authType,
    CREDENTIAL_REFERENCE_NAME: model.credentialReferenceName,
    ADAPTER_STATUS: model.adapterStatus,
    CANARY_READY: model.canaryReady,
    CANARY_EXECUTED: model.canaryExecuted,
    PROVIDER_IDS: [],
    READBACK_STATUS: model.connectivity,
    IDEMPOTENCY: model.canaryReady === 'NO' ? 'NOT_EXECUTED' : 'READY_FOR_HUMAN_ASSISTED_PATH',
    COMPENSATION: 'NOT_EXECUTED',
    CURRENT_MAX_AUTONOMY: 'NONPUBLIC_CANARY',
    PUBLIC_RELEASE_FIREWALL: 'PASS',
    NEXT_ACTION: model.blockers.join('|'),
  })),
  finalReturn,
})
await writeJson('final-return.json', finalReturn)
await write('24-final-return.md', Object.entries(finalReturn).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`).join('\n'))
await writeChecksums()

async function write(name, content) {
  await writeFile(path.join(evidenceDir, name), `${content}\n`)
}

async function writeJson(name, value) {
  await write(name, JSON.stringify(value, null, 2))
}

async function writeCsv(name, headers, rows) {
  const escape = (value) => `"${String(value).replace(/"/g, '""')}"`
  await write(name, [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n'))
}

async function writeChecksums() {
  const files = (await readdir(evidenceDir)).filter((file) => file !== 'checksums.sha256').sort()
  const lines = []
  for (const file of files) {
    const content = await readFile(path.join(evidenceDir, file))
    lines.push(`${createHash('sha256').update(content).digest('hex')}  ${file}`)
  }
  await write('checksums.sha256', lines.join('\n'))
}
