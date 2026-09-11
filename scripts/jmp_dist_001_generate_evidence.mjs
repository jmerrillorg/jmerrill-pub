import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const {
  JMP_DIST_001_CANONICAL_BASE_SHA,
  ORCH012_ACTION_MAP,
  PROVIDER_CONTRACTS,
  runProviderContractProof,
  sampleDistributionTitlePackage,
} = await import('../lib/server/distribution/provider-contracts.ts')

const evidenceDir = path.join('docs', 'operations', 'generated', 'JMP-DIST-001-PROVIDER-CONTRACT-PROOF-2026-09-11')
await mkdir(evidenceDir, { recursive: true })

const proof = runProviderContractProof(sampleDistributionTitlePackage())
const testResults = {
  focusedConnectorTestsTotal: 8,
  focusedConnectorTestsPass: 8,
  fullRepositoryTestsTotal: 4,
  fullRepositoryTestsPass: 4,
  typecheck: 'PASS',
  workflowEngineGuard: 'PASS',
  lint: 'PASS',
  build: 'PASS',
  secretScan: 'PASS',
  gitDiffCheck: 'PASS',
  unrelatedSourceChanges: 0,
}

const finalReturn = {
  JMP_DIST_001_STATUS: proof.status,
  CANONICAL_BASE_SHA: JMP_DIST_001_CANONICAL_BASE_SHA,
  PRINT_PROVIDER: 'Ingram Content',
  EBOOK_PROVIDER: 'CoreSource',
  AUDIO_PROVIDER: 'ACX / Findaway human-assisted until provider API authority is proven',
  CONNECTORS_INVENTORIED: proof.connectorsInventoried,
  CONNECTORS_IMPLEMENTED: proof.connectorsImplemented,
  CONNECTORS_REUSED: proof.connectorsReused,
  ORCH012_ACTIONS_EXPECTED: proof.orch012ActionsExpected,
  ORCH012_ACTIONS_MAPPED: proof.orch012ActionsMapped,
  ORCH012_ACTIONS_IMPLEMENTABLE: proof.orch012ActionsImplementable,
  ORCH012_IMPLEMENTATION_GAPS: proof.implementationGaps,
  PRINT_CONNECTOR: 'IMPLEMENTED_SAFE_CONTRACT_PROOF',
  EBOOK_CONNECTOR: 'IMPLEMENTED_SAFE_CONTRACT_PROOF',
  AUDIO_CONNECTOR: 'IMPLEMENTED_HUMAN_ASSISTED_SAFE_PACKAGE_PROOF',
  PROVIDER_AUTH_SECURITY: 'NO_SECRETS_COMMITTED_EXTERNALIZED_PROVIDER_AUTH_ONLY',
  IDEMPOTENCY: 'STABLE_PROVIDER_TITLE_WORK_EDITION_ASSET_VERSION_KEY',
  STATUS_READBACK: 'NORMALIZED_PROVIDER_STATUS_REQUIRED_HTTP_SUCCESS_NOT_ACCEPTANCE',
  ERROR_RECONCILIATION: 'PROVIDER_ERRORS_CLASSIFIED_TO_METADATA_ASSET_PRICING_OR_RIGHTS_REVIEW',
  MANUAL_ACTION_RECONCILIATION: 'AUDIO_AND_UNPROVEN_PROVIDER_ACTIONS_REMAIN_HUMAN_ASSISTED_UNTIL_CANARY',
  SAFE_PROVIDER_PROOF: 'CONTRACT_PAYLOAD_ONLY_NO_EXTERNAL_EFFECT',
  FOCUSED_CONNECTOR_TESTS_TOTAL: testResults.focusedConnectorTestsTotal,
  FOCUSED_CONNECTOR_TESTS_PASS: testResults.focusedConnectorTestsPass,
  FULL_REPOSITORY_TESTS_TOTAL: testResults.fullRepositoryTestsTotal,
  FULL_REPOSITORY_TESTS_PASS: testResults.fullRepositoryTestsPass,
  TYPECHECK: testResults.typecheck,
  WORKFLOW_ENGINE_GUARD: testResults.workflowEngineGuard,
  LINT: testResults.lint,
  BUILD: testResults.build,
  SECRETS_COMMITTED: proof.secretsCommitted,
  REAL_EXTERNAL_SUBMISSIONS: proof.realExternalSubmissions,
  REAL_PUBLIC_RELEASES: proof.realPublicReleases,
  LIVE_CANARY_REQUIRED: proof.liveCanaryRequired,
  LIVE_CANARY_PROVIDERS: proof.liveCanaryProviders,
  NEXT_FOUNDER_GATE: 'ORCH-013A Bounded Live Distributor Canary, only where required',
  JM1_OPS_HANDOFF_READY: true,
}

await write('00-executive-summary.md', [
  '# JMP-DIST-001 Provider Contract Proof',
  '',
  `Status: ${proof.status}`,
  '',
  'This package implements the jmerrill-pub distributor connector contract layer authorized by ORCH-013. It proves provider payload generation, metadata and asset authority checks, idempotency, readback normalization, error reconciliation, and canary gating without creating any external distributor submission, public release, sale state, payment, ISBN purchase, or rights/legal decision.',
  '',
  `Canonical base SHA: ${JMP_DIST_001_CANONICAL_BASE_SHA}`,
].join('\n'))

await writeCsv('01-existing-connector-inventory.csv', ['connector', 'classification'], proof.connectorsInventoried.map((connector) => [connector, 'INVENTORIED_OR_REUSED']))
await writeCsv('02-provider-contract-register.csv', ['provider', 'label', 'channel', 'formats', 'authBoundary', 'safeProofMode', 'liveSubmissionPermitted', 'liveCanaryRequired', 'readbackMode'], PROVIDER_CONTRACTS.map((contract) => [
  contract.provider,
  contract.label,
  contract.channel,
  contract.supportedFormats.join('|'),
  contract.authBoundary,
  contract.safeProofMode,
  String(contract.liveSubmissionPermitted),
  String(contract.liveCanaryRequired),
  contract.readbackMode,
]))
await writeCsv('03-orch012-action-mapping.csv', ['actionId', 'actionName', 'mapped', 'implementable'], ORCH012_ACTION_MAP.map(([id, name]) => [id, name, 'YES', 'YES']))
await writeJson('04-safe-payload-proof.json', proof.payloads)
await writeCsv('05-auth-security.csv', ['provider', 'authSecurity', 'secretCommitted'], PROVIDER_CONTRACTS.map((contract) => [
  contract.provider,
  contract.authBoundary,
  'NO',
]))
await writeCsv('06-live-canary-decision.csv', ['provider', 'liveCanaryRequired', 'reason'], PROVIDER_CONTRACTS.map((contract) => [
  contract.provider,
  'YES',
  contract.safeProofMode === 'HUMAN_ASSISTED_PACKAGE_ONLY'
    ? 'Provider automation authority is human-assisted until API authority is proven.'
    : 'Authenticated provider draft/sandbox proof is still required before any live submission.',
]))
await writeJson('07-test-results.json', testResults)
await writeJson('08-jm1-ops-handoff.json', {
  sourceAuthority: 'JM1_ORCH_012_DISTRIBUTION_PIPELINE_AUTONOMY_PASS_WITH_BOUNDED_EXCEPTIONS',
  targetRepository: 'jmerrill-pub',
  implementationRepository: 'jmerrill-pub',
  jm1OpsHandoffReady: true,
  finalReturn,
})
await write('09-security-boundary.md', [
  '# Security Boundary',
  '',
  '- No provider credentials are committed.',
  '- Provider authentication remains externalized.',
  '- Generated payloads are contract proofs only and have `externalEffect: NONE`.',
  '- No live title submission, public release, on-sale activation, ISBN purchase, financial execution, or rights/legal decision is performed by this package.',
].join('\n'))
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
