import assert from 'node:assert/strict'
import test from 'node:test'

const {
  assertProviderEffectAllowed,
  commissionProviderAuth,
  discoverCredentialReferences,
} = await import('../lib/server/distribution/provider-auth.ts')

test('credential discovery returns reference names only and never secret values', () => {
  const references = discoverCredentialReferences([
    'INGRAM_CONTENT_API_TOKEN',
    'CORESOURCE_CLIENT_SECRET',
    'ACX_OPERATOR_ACCOUNT_REFERENCE',
    'DATAVERSE_CLIENT_SECRET',
  ], 'AZURE_KEY_VAULT')

  assert.equal(references.length, 3)
  assert.deepEqual(references.map((reference) => reference.provider).sort(), [
    'ACX_FINDAWAY_HUMAN_ASSISTED',
    'CORESOURCE',
    'INGRAM_CONTENT',
  ])
  for (const reference of references) {
    assert.equal(reference.exists, true)
    assert.equal(reference.targetBinding, 'KEY_VAULT_REFERENCE')
    assert.equal('value' in reference, false)
  }
})

test('empty credential inventory blocks every provider with exact provider configuration reasons', () => {
  const result = commissionProviderAuth([])

  assert.equal(result.status, 'JMP_DIST_003_BLOCKED_BY_EXACT_PROVIDER_CONFIGURATION')
  assert.equal(result.founderCanaryAuthorization, 'PRESENT')
  assert.equal(result.credentialValuesLogged, 0)
  assert.equal(result.credentialValuesCommitted, 0)
  assert.equal(result.realProviderActions, 0)
  assert.equal(result.realProviderRecordsCreated, 0)
  assert.equal(result.realPublicProducts, 0)
  assert.equal(result.realOnSaleProducts, 0)

  const ingram = result.providerAuth.find((model) => model.provider === 'INGRAM_CONTENT')
  const coresource = result.providerAuth.find((model) => model.provider === 'CORESOURCE')
  const audio = result.providerAuth.find((model) => model.provider === 'ACX_FINDAWAY_HUMAN_ASSISTED')

  assert.equal(ingram.accountStatus, 'BLOCKED_CREDENTIAL_NOT_FOUND')
  assert.equal(coresource.accountStatus, 'BLOCKED_CREDENTIAL_NOT_FOUND')
  assert.equal(audio.accountStatus, 'BLOCKED_ACCOUNT_CONFIGURATION')
})

test('credential reference alone does not mark machine providers ready until adapter/connectivity are proven', () => {
  const references = discoverCredentialReferences(['INGRAM_CONTENT_API_TOKEN'], 'AZURE_KEY_VAULT')
  const result = commissionProviderAuth(references)
  const ingram = result.providerAuth.find((model) => model.provider === 'INGRAM_CONTENT')

  assert.equal(ingram.credentialReferenceName, 'INGRAM_CONTENT_API_TOKEN')
  assert.equal(ingram.accountStatus, 'BLOCKED_PROVIDER_API_NOT_ENABLED')
  assert.equal(ingram.adapterStatus, 'FAIL')
  assert.equal(ingram.connectivity, 'FAIL')
  assert.equal(ingram.canaryReady, 'NO')
  assert.equal(ingram.blockers.includes('LIVE_ADAPTER_NOT_ENABLED'), true)
})

test('audio may become human-assisted ready with account reference but no fabricated API autonomy', () => {
  const references = discoverCredentialReferences(['FINDAWAY_OPERATOR_ACCOUNT_REFERENCE'], 'AZURE_KEY_VAULT')
  const result = commissionProviderAuth(references)
  const audio = result.providerAuth.find((model) => model.provider === 'ACX_FINDAWAY_HUMAN_ASSISTED')

  assert.equal(result.status, 'JMP_DIST_003_PROVIDER_AUTH_PASS_CANARY_PARTIAL')
  assert.equal(audio.accountStatus, 'HUMAN_ASSISTED_READY')
  assert.equal(audio.authType, 'HUMAN_ASSISTED')
  assert.equal(audio.canaryReady, 'HUMAN_ASSISTED')
  assert.equal(audio.canaryExecuted, 'NO')
  assert.equal(audio.blockers.includes('AUDIO_PROVIDER_READBACK_ADAPTER_NOT_PROVEN'), true)
})

test('provider effect firewall requires full action context', () => {
  const result = assertProviderEffectAllowed({
    provider: 'INGRAM_CONTENT',
    executionMode: 'NONPUBLIC_CANARY',
  })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'ACTION_CONTEXT_INCOMPLETE')
  assert.equal(result.missing.includes('founderAuthorizationId'), true)
  assert.equal(result.missing.includes('idempotencyKey'), true)
})

test('provider effect firewall denies live distribution beyond authorized canary boundary', () => {
  const result = assertProviderEffectAllowed({
    founderAuthorizationId: 'JMP-DIST-002-FOUNDER-AUTH',
    orchActionId: 'ORCH012-DIST-025',
    workItemId: 'work-item',
    enterpriseWorkId: 'enterprise-work',
    workProjectionId: 'projection',
    titleId: 'title',
    formatId: 'PAPERBACK',
    provider: 'INGRAM_CONTENT',
    executionMode: 'LIVE_DISTRIBUTION',
    idempotencyKey: 'idempotency-key',
  })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'EXECUTION_MODE_EXCEEDS_AUTHORIZED_BOUNDARY')
})

test('provider effect firewall allows complete non-public canary context', () => {
  const result = assertProviderEffectAllowed({
    founderAuthorizationId: 'JMP-DIST-002-FOUNDER-AUTH',
    orchActionId: 'ORCH012-DIST-025',
    workItemId: 'work-item',
    enterpriseWorkId: 'enterprise-work',
    workProjectionId: 'projection',
    titleId: 'title',
    formatId: 'PAPERBACK',
    provider: 'INGRAM_CONTENT',
    executionMode: 'NONPUBLIC_CANARY',
    idempotencyKey: 'idempotency-key',
  })

  assert.equal(result.ok, true)
  assert.equal(result.reason, 'ACTION_CONTEXT_AUTHORIZED')
})
