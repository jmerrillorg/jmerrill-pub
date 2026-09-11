import assert from 'node:assert/strict'
import test from 'node:test'

const {
  JMP_DIST_002_FORBIDDEN_EFFECTS,
  JMP_DIST_002_REQUIRED_AUTHORIZATION,
  buildCanaryPlans,
  finalAuthorityPrecheck,
  hasExplicitFounderAuthorization,
  runBoundedLiveCanaryGate,
} = await import('../lib/server/distribution/live-canary.ts')

const {
  DISTRIBUTION_PROVIDERS,
  ORCH012_ACTION_MAP,
  sampleDistributionTitlePackage,
} = await import('../lib/server/distribution/provider-contracts.ts')

test('JMP-DIST-002 requires the explicit Founder authorization phrase before live effects', () => {
  assert.equal(hasExplicitFounderAuthorization(), false)
  assert.equal(hasExplicitFounderAuthorization('REQUESTED_AUTHORIZATION only'), false)
  assert.equal(hasExplicitFounderAuthorization(JMP_DIST_002_REQUIRED_AUTHORIZATION), true)
})

test('canary plan prefers non-public reversible provider actions', () => {
  const plans = buildCanaryPlans()

  assert.equal(plans.length, DISTRIBUTION_PROVIDERS.length)
  for (const plan of plans) {
    assert.equal(plan.publiclyVisible, false)
    assert.equal(plan.purchasable, false)
    assert.equal(plan.reversible, true)
    assert.equal(plan.pointOfNoReturn, 'PUBLIC_RELEASE_GATE')
    assert.equal(plan.realAuthorTitleRequired, false)
    assert.equal(plan.syntheticInternalTitlePossible, true)
  }
})

test('final authority precheck blocks canary action when Founder authorization is absent', () => {
  const precheck = finalAuthorityPrecheck(sampleDistributionTitlePackage(), 'INGRAM_CONTENT')

  assert.equal(precheck.titleBinding, 'PASS')
  assert.equal(precheck.formatBinding, 'PASS')
  assert.equal(precheck.artifactAuthority, 'PASS')
  assert.equal(precheck.idempotency, 'READY')
  assert.equal(precheck.publicRelease, 'NO')
  assert.equal(precheck.canaryAction, 'BLOCKED_FOUNDER_AUTHORIZATION_REQUIRED')
})

test('bounded live canary gate returns BLOCKED with zero external effects before authorization', () => {
  const result = runBoundedLiveCanaryGate(sampleDistributionTitlePackage())

  assert.equal(result.status, 'JMP_DIST_002_BLOCKED')
  assert.equal(result.founderAuthorization, 'MISSING')
  assert.equal(result.realProviderActions, 0)
  assert.equal(result.realProviderRecordsCreated, 0)
  assert.equal(result.realProviderRecordsWithdrawn, 0)
  assert.equal(result.realPublicProductsCreated, 0)
  assert.equal(result.realOnSaleProducts, 0)
  assert.equal(result.unauthorizedFinancialEffects, 0)
  assert.equal(result.unauthorizedRightsEffects, 0)
  assert.equal(result.unauthorizedPublicReleases, 0)
})

test('execution evidence is jm1-ops handoff ready and contains no provider identifiers before provider action', () => {
  const result = runBoundedLiveCanaryGate(sampleDistributionTitlePackage())

  assert.equal(result.jm1OpsHandoffReady, 'YES')
  assert.equal(result.evidence.length, DISTRIBUTION_PROVIDERS.length)
  for (const item of result.evidence) {
    assert.equal(item.submissionId, null)
    assert.equal(item.productId, null)
    assert.equal(item.readback, 'NOT_ATTEMPTED_NO_EXTERNAL_ACTION')
    assert.equal(item.nextWork, 'REQUEST_EXPLICIT_FOUNDER_AUTHORIZATION')
  }
})

test('ORCH-012 actions are revalidated but downgraded while live proof is blocked', () => {
  const result = runBoundedLiveCanaryGate(sampleDistributionTitlePackage())

  assert.equal(result.orch012ActionsRevalidated, 18)
  assert.equal(result.orch012ActionsRevalidated, ORCH012_ACTION_MAP.length)
  assert.equal(result.orch012ActionsStillCertified, 0)
  assert.equal(result.orch012ActionsDowngraded, 18)
})

test('forbidden public, financial, ISBN, and rights effects remain outside canary scope', () => {
  assert.deepEqual(
    [...JMP_DIST_002_FORBIDDEN_EFFECTS],
    [
      'PUBLIC_RELEASE',
      'ON_SALE_ACTIVATION',
      'UNBOUNDED_REAL_TITLE_SUBMISSION',
      'FINANCIAL_EXECUTION',
      'ISBN_PURCHASE',
      'RIGHTS_LEGAL_JUDGMENT',
      'PRICE_EXCEPTION',
      'RELEASE_DATE_EXCEPTION',
      'PRODUCTION_WIDE_AUTONOMY',
    ],
  )
})

test('safe runner does not implement live provider execution even with authorization', () => {
  assert.throws(
    () => runBoundedLiveCanaryGate(sampleDistributionTitlePackage(), JMP_DIST_002_REQUIRED_AUTHORIZATION),
    /Live provider execution is intentionally not implemented/,
  )
})
