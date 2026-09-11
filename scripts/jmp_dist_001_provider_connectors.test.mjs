import assert from 'node:assert/strict'
import test from 'node:test'

const {
  DISTRIBUTION_PROVIDERS,
  ORCH012_ACTION_MAP,
  ORCH_012_EXPECTED_ACTIONS,
  buildProviderPayload,
  classifyProviderError,
  normalizeProviderReadback,
  providerContract,
  runProviderContractProof,
  sampleDistributionTitlePackage,
  validateTitlePackage,
} = await import('../lib/server/distribution/provider-contracts.ts')

test('ORCH-012 action contract maps all certified bounded distribution actions', () => {
  assert.equal(ORCH012_ACTION_MAP.length, ORCH_012_EXPECTED_ACTIONS)
  assert.equal(new Set(ORCH012_ACTION_MAP.map(([id]) => id)).size, ORCH_012_EXPECTED_ACTIONS)
})

test('provider contracts are bounded and require live canary before external submission', () => {
  for (const provider of DISTRIBUTION_PROVIDERS) {
    const contract = providerContract(provider)
    assert.equal(contract.liveSubmissionPermitted, false)
    assert.equal(contract.liveCanaryRequired, true)
    assert.match(contract.safeProofMode, /CONTRACT_PAYLOAD_ONLY|HUMAN_ASSISTED_PACKAGE_ONLY/)
  }
})

test('safe payload generation has no external effect and no committed credentials', () => {
  const titlePackage = sampleDistributionTitlePackage()
  const proof = runProviderContractProof(titlePackage)

  assert.equal(proof.realExternalSubmissions, 0)
  assert.equal(proof.realPublicReleases, 0)
  assert.equal(proof.secretsCommitted, 0)
  assert.deepEqual(proof.connectorsImplemented, [...DISTRIBUTION_PROVIDERS])

  for (const payload of proof.payloads) {
    assert.equal(payload.externalEffect, 'NONE')
    assert.equal(payload.submissionMode, 'SAFE_CONTRACT_PROOF')
    assert.equal(JSON.stringify(payload).includes('secret'), false)
    assert.equal(JSON.stringify(payload).includes('token'), false)
  }
})

test('artifact authority fails closed without SharePoint DriveId, ItemId, checksum, and version', () => {
  const titlePackage = sampleDistributionTitlePackage()
  titlePackage.assets = titlePackage.assets.map((asset) =>
    asset.role === 'INTERIOR'
      ? { role: asset.role, fileName: asset.fileName }
      : asset,
  )

  assert.deepEqual(
    validateTitlePackage(titlePackage, 'INGRAM_CONTENT'),
    ['SHAREPOINT_ITEM_AUTHORITY_INCOMPLETE_INTERIOR'],
  )
  assert.throws(() => buildProviderPayload(titlePackage, 'INGRAM_CONTENT'), /SHAREPOINT_ITEM_AUTHORITY_INCOMPLETE_INTERIOR/)
})

test('idempotency is stable for the same governed package and changes when asset version changes', () => {
  const titlePackage = sampleDistributionTitlePackage()
  const first = buildProviderPayload(titlePackage, 'INGRAM_CONTENT').idempotencyKey
  const second = buildProviderPayload(titlePackage, 'INGRAM_CONTENT').idempotencyKey
  assert.equal(first, second)

  const revised = sampleDistributionTitlePackage()
  revised.assets = revised.assets.map((asset) => asset.role === 'INTERIOR' ? { ...asset, version: '1.0.1' } : asset)
  const revisedKey = buildProviderPayload(revised, 'INGRAM_CONTENT').idempotencyKey
  assert.notEqual(first, revisedKey)
})

test('HTTP success without provider business status is not accepted', () => {
  const readback = normalizeProviderReadback('CORESOURCE', { httpStatus: 200 })

  assert.equal(readback.externalAccepted, false)
  assert.equal(readback.normalizedStatus, 'READBACK_INCOMPLETE_REQUIRES_MANUAL_RECONCILIATION')
})

test('provider errors route to correction or founder review classes', () => {
  assert.equal(classifyProviderError('ISBN mismatch'), 'ISBN_METADATA_CORRECTION_REQUIRED')
  assert.equal(classifyProviderError('Rights territory conflict'), 'RIGHTS_OR_TERRITORY_REQUIRES_FOUNDER_REVIEW')
  assert.equal(classifyProviderError('Asset file rejected'), 'ASSET_AUTHORITY_CORRECTION_REQUIRED')
  assert.equal(classifyProviderError('List price invalid'), 'PRICING_METADATA_CORRECTION_REQUIRED')
})

test('proof classification remains canary-gated until provider authenticated draft proof exists', () => {
  const proof = runProviderContractProof(sampleDistributionTitlePackage())

  assert.equal(proof.status, 'JMP_DIST_001_PROVIDER_CONTRACT_PASS_WITH_LIVE_CANARY_REQUIRED')
  assert.equal(proof.liveCanaryRequired, true)
  assert.deepEqual(proof.liveCanaryProviders, [...DISTRIBUTION_PROVIDERS])
  assert.deepEqual(proof.implementationGaps, ['LIVE_CANARY_REQUIRED_FOR_PROVIDER_AUTHENTICATED_DRAFT_OR_SANDBOX_PROOF'])
})
