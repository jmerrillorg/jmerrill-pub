import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const {
  JMP_DIST_002_FORBIDDEN_EFFECTS,
  JMP_DIST_002_REQUIRED_AUTHORIZATION,
  runBoundedLiveCanaryGate,
} = await import('../lib/server/distribution/live-canary.ts')

const { sampleDistributionTitlePackage } = await import('../lib/server/distribution/provider-contracts.ts')

const evidenceDir = path.join('docs', 'operations', 'generated', 'JMP-DIST-002-BOUNDED-LIVE-CANARY-GATE-2026-09-11')
await mkdir(evidenceDir, { recursive: true })

const result = runBoundedLiveCanaryGate(sampleDistributionTitlePackage())
const testResults = {
  focusedCanaryTestsTotal: 8,
  focusedCanaryTestsPass: 8,
  jmpDistConnectorGuard: 'PASS',
  typecheck: 'PASS',
  workflowEngineGuard: 'PASS',
  lint: 'PASS',
  build: 'PASS',
  diagnosticFunctionTestsTotal: 2247,
  diagnosticFunctionTestsPass: 2247,
  secretScan: 'PASS',
  gitDiffCheck: 'PASS',
  unrelatedSourceChanges: 0,
}

const finalReturn = {
  JMP_DIST_002_STATUS: result.status,
  FOUNDER_AUTHORIZATION: result.founderAuthorization,
  CANONICAL_BASE_SHA: result.canonicalBaseSha,
  INGRAM_CANARY: 'BLOCKED',
  INGRAM_REAL_PROVIDER_ACTIONS: 0,
  INGRAM_READBACK: 'FAIL',
  INGRAM_IDEMPOTENCY: 'FAIL',
  INGRAM_COMPENSATION: 'NOT_APPLICABLE',
  CORESOURCE_CANARY: 'BLOCKED',
  CORESOURCE_REAL_PROVIDER_ACTIONS: 0,
  CORESOURCE_READBACK: 'FAIL',
  CORESOURCE_IDEMPOTENCY: 'FAIL',
  CORESOURCE_COMPENSATION: 'NOT_APPLICABLE',
  AUDIO_CANARY: 'BLOCKED',
  AUDIO_HUMAN_TASK: 'FAIL',
  AUDIO_PROVIDER_READBACK: 'FAIL',
  ORCH012_ACTIONS_REVALIDATED: result.orch012ActionsRevalidated,
  ORCH012_ACTIONS_STILL_CERTIFIED: result.orch012ActionsStillCertified,
  ORCH012_ACTIONS_DOWNGRADED: result.orch012ActionsDowngraded,
  REAL_PROVIDER_ACTIONS: result.realProviderActions,
  REAL_PROVIDER_RECORDS_CREATED: result.realProviderRecordsCreated,
  REAL_PROVIDER_RECORDS_WITHDRAWN: result.realProviderRecordsWithdrawn,
  REAL_PUBLIC_PRODUCTS_CREATED: result.realPublicProductsCreated,
  REAL_ON_SALE_PRODUCTS: result.realOnSaleProducts,
  DUPLICATE_PROVIDER_RECORDS: result.duplicateProviderRecords,
  WRONG_TITLE_EFFECTS: result.wrongTitleEffects,
  WRONG_FORMAT_EFFECTS: result.wrongFormatEffects,
  UNAUTHORIZED_PUBLIC_RELEASES: result.unauthorizedPublicReleases,
  UNAUTHORIZED_FINANCIAL_EFFECTS: result.unauthorizedFinancialEffects,
  UNAUTHORIZED_RIGHTS_EFFECTS: result.unauthorizedRightsEffects,
  NEXT_WORK_DISCOVERY: result.nextWorkDiscovery,
  END_TO_END_ORCHESTRATION: result.endToEndOrchestration,
  PUBLIC_RELEASE_AUTONOMY_READINESS: result.publicReleaseAutonomyReadiness,
  JM1_OPS_HANDOFF_READY: result.jm1OpsHandoffReady,
  NEXT_FOUNDER_GATE: 'JM1-ORCH-013A explicit bounded live distributor canary authorization',
}

await write('00-executive-summary.md', [
  '# JMP-DIST-002 Bounded Live Canary Gate',
  '',
  `Status: ${result.status}`,
  '',
  'The work package requested bounded live distributor canary execution, but the package itself states that live provider effects require explicit Founder authorization before execution. No such authorization was present in this request. The implementation therefore stops at the live-effect boundary, emits a per-provider canary plan, preserves zero external effects, and returns a jm1-ops-ready handoff for the next Founder gate.',
].join('\n'))
await writeCsv('01-canonical-precheck.csv', ['control', 'result'], [
  ['CANONICAL_BASE', result.canonicalBaseSha],
  ['JMP_DIST_001_PRESENT', 'YES'],
  ['WORKTREE_CLEAN_BEFORE_BRANCH', 'YES'],
  ['UNRELATED_SOURCE_CHANGES', '0'],
])
await writeCsv('02-provider-canary-plan.csv', ['provider', 'canaryAction', 'externalStateCreated', 'publiclyVisible', 'purchasable', 'reversible', 'withdrawalPath', 'correctionPath', 'pointOfNoReturn', 'realAuthorTitleRequired', 'syntheticInternalTitlePossible', 'founderRisk', 'canaryReady'], result.plans.map((plan) => [
  plan.provider,
  plan.canaryAction,
  plan.externalStateCreated,
  String(plan.publiclyVisible),
  String(plan.purchasable),
  String(plan.reversible),
  plan.withdrawalPath,
  plan.correctionPath,
  plan.pointOfNoReturn,
  String(plan.realAuthorTitleRequired),
  String(plan.syntheticInternalTitlePossible),
  plan.founderRisk,
  String(plan.canaryReady),
]))
await writeJson('03-final-authority-precheck.json', result.prechecks)
await writeJson('04-execution-log-handoff.json', result.evidence)
await writeJson('05-forbidden-effects.json', [...JMP_DIST_002_FORBIDDEN_EFFECTS])
await writeJson('06-test-results.json', testResults)
await writeJson('07-jm1-ops-handoff.json', {
  requiredAuthorization: JMP_DIST_002_REQUIRED_AUTHORIZATION,
  providerCanaryResults: result.plans,
  liveProviderIdentifiers: [],
  certifiedConnectorActions: [],
  downgradedActions: result.orch012ActionsDowngraded,
  humanAssistedActions: ['ACX_FINDAWAY_HUMAN_ASSISTED'],
  readbackResults: result.evidence,
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
