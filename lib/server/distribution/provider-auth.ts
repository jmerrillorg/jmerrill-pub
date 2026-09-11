// Engine: Distribution Engine
// Reusable? Y
// Stage-specific exception? N

import type { DistributionProvider } from './provider-contracts'

const { DISTRIBUTION_PROVIDERS } = await import(new URL('./provider-contracts.ts', import.meta.url).href)
const DISTRIBUTION_PROVIDER_IDS = DISTRIBUTION_PROVIDERS as readonly DistributionProvider[]

export const DISTRIBUTION_EXECUTION_MODES = [
  'MOCK',
  'VALIDATION',
  'NONPUBLIC_CANARY',
  'LIVE_DISTRIBUTION',
] as const

export type DistributionExecutionMode = (typeof DISTRIBUTION_EXECUTION_MODES)[number]

export type CredentialDiscoverySource =
  | 'ENVIRONMENT'
  | 'JM1_CREDENTIAL_LOADER'
  | 'AZURE_KEY_VAULT'
  | 'AZURE_APP_SERVICE_SETTINGS'
  | 'GITHUB_REPOSITORY_SECRETS'
  | 'REPOSITORY_SCHEMA'

export type CredentialReference = {
  provider: DistributionProvider
  credentialReferenceName: string
  source: CredentialDiscoverySource
  exists: boolean
  currentlyBound: boolean
  targetBinding: 'RUNTIME_ENVIRONMENT' | 'KEY_VAULT_REFERENCE' | 'HUMAN_ASSISTED_ACCOUNT' | 'NOT_BOUND'
  rotationStatus: 'KNOWN' | 'UNKNOWN'
}

export type ProviderAuthModel = {
  provider: DistributionProvider
  accountStatus:
    | 'BLOCKED_CREDENTIAL_NOT_FOUND'
    | 'BLOCKED_PROVIDER_API_NOT_ENABLED'
    | 'BLOCKED_ACCOUNT_CONFIGURATION'
    | 'HUMAN_ASSISTED_READY'
    | 'LIVE_CANARY_READY'
  authType: 'API_KEY_OR_TOKEN' | 'OAUTH_OR_TOKEN' | 'HUMAN_ASSISTED' | 'UNKNOWN'
  tokenLifetime: 'PROVIDER_DEFINED' | 'NOT_APPLICABLE' | 'UNKNOWN'
  refreshModel: 'PROVIDER_DEFINED' | 'HUMAN_LOGIN' | 'UNKNOWN'
  serviceAccountSupported: 'UNKNOWN' | 'NO' | 'YES'
  mfaInteractionRequired: 'UNKNOWN' | 'POSSIBLE' | 'NO'
  apiScope: 'NONPUBLIC_CANARY_READ_VALIDATE_SUBMIT_ONLY' | 'HUMAN_PROVIDER_UI_ONLY' | 'UNKNOWN'
  leastPrivilegeAvailable: 'UNKNOWN' | 'YES' | 'NO'
  persistentSecretRequiredByProvider: 'UNKNOWN' | 'YES' | 'NO'
  credentialReferenceName: string | null
  adapterStatus: 'PASS' | 'FAIL'
  connectivity: 'PASS' | 'FAIL'
  canaryReady: 'YES' | 'NO' | 'HUMAN_ASSISTED'
  canaryExecuted: 'YES' | 'NO'
  providerRecordsCreated: 0
  publicRelease: 'NO'
  blockers: string[]
}

export type ProviderActionContext = {
  founderAuthorizationId?: string
  orchActionId?: string
  workItemId?: string
  enterpriseWorkId?: string
  workProjectionId?: string
  titleId?: string
  formatId?: string
  provider?: DistributionProvider
  executionMode?: DistributionExecutionMode
  idempotencyKey?: string
}

export type ProviderAuthCommissioningResult = {
  status: 'JMP_DIST_003_BLOCKED_BY_EXACT_PROVIDER_CONFIGURATION' | 'JMP_DIST_003_PROVIDER_AUTH_PASS_CANARY_PARTIAL'
  founderCanaryAuthorization: 'PRESENT'
  credentialValuesLogged: 0
  credentialValuesCommitted: 0
  providerAuth: ProviderAuthModel[]
  realProviderActions: 0
  realProviderRecordsCreated: 0
  realProviderRecordsWithdrawn: 0
  realPublicProducts: 0
  realOnSaleProducts: 0
  duplicateProviderRecords: 0
  wrongTitleEffects: 0
  wrongFormatEffects: 0
  jm1OpsHandoffReady: 'YES'
  nextBoundary: string
}

const PROVIDER_KEYWORDS: Record<DistributionProvider, string[]> = {
  INGRAM_CONTENT: ['INGRAM', 'INGRAM_CONTENT'],
  CORESOURCE: ['CORESOURCE', 'CORE_SOURCE', 'CORE-SOURCE'],
  ACX_FINDAWAY_HUMAN_ASSISTED: ['ACX', 'FINDAWAY'],
}

export function discoverCredentialReferences(referenceNames: string[], source: CredentialDiscoverySource): CredentialReference[] {
  const uniqueNames = Array.from(new Set(referenceNames.map((name) => name.trim()).filter(Boolean)))
  const discovered: CredentialReference[] = []
  for (const provider of DISTRIBUTION_PROVIDER_IDS) {
    for (const name of uniqueNames) {
      if (!PROVIDER_KEYWORDS[provider].some((keyword) => name.toUpperCase().includes(keyword))) continue
      discovered.push({
        provider,
        credentialReferenceName: name,
        source,
        exists: true,
        currentlyBound: source === 'ENVIRONMENT' || source === 'AZURE_APP_SERVICE_SETTINGS',
        targetBinding: source === 'AZURE_KEY_VAULT' ? 'KEY_VAULT_REFERENCE' : 'RUNTIME_ENVIRONMENT',
        rotationStatus: 'UNKNOWN',
      })
    }
  }
  return discovered
}

export function assertProviderEffectAllowed(context: ProviderActionContext, authorizedMaximum: DistributionExecutionMode = 'NONPUBLIC_CANARY') {
  const missing = [
    'founderAuthorizationId',
    'orchActionId',
    'workItemId',
    'enterpriseWorkId',
    'workProjectionId',
    'titleId',
    'formatId',
    'provider',
    'executionMode',
    'idempotencyKey',
  ].filter((field) => !context[field as keyof ProviderActionContext])

  if (missing.length > 0) {
    return { ok: false as const, reason: 'ACTION_CONTEXT_INCOMPLETE', missing }
  }

  if (modeRank(context.executionMode as DistributionExecutionMode) > modeRank(authorizedMaximum)) {
    return { ok: false as const, reason: 'EXECUTION_MODE_EXCEEDS_AUTHORIZED_BOUNDARY', missing: [] }
  }

  return { ok: true as const, reason: 'ACTION_CONTEXT_AUTHORIZED', missing: [] }
}

export function commissionProviderAuth(references: CredentialReference[]): ProviderAuthCommissioningResult {
  const providerAuth = DISTRIBUTION_PROVIDER_IDS.map((provider) => buildProviderAuthModel(provider, references))
  const allBlocked = providerAuth.every((model) => model.canaryReady === 'NO')

  return {
    status: allBlocked ? 'JMP_DIST_003_BLOCKED_BY_EXACT_PROVIDER_CONFIGURATION' : 'JMP_DIST_003_PROVIDER_AUTH_PASS_CANARY_PARTIAL',
    founderCanaryAuthorization: 'PRESENT',
    credentialValuesLogged: 0,
    credentialValuesCommitted: 0,
    providerAuth,
    realProviderActions: 0,
    realProviderRecordsCreated: 0,
    realProviderRecordsWithdrawn: 0,
    realPublicProducts: 0,
    realOnSaleProducts: 0,
    duplicateProviderRecords: 0,
    wrongTitleEffects: 0,
    wrongFormatEffects: 0,
    jm1OpsHandoffReady: 'YES',
    nextBoundary: allBlocked
      ? 'Configure existing provider credential references and provider-supported non-public canary adapters; no broader authority granted.'
      : 'Execute only provider-specific non-public canaries whose auth and adapter prechecks pass.',
  }
}

function buildProviderAuthModel(provider: DistributionProvider, references: CredentialReference[]): ProviderAuthModel {
  const providerReferences = references.filter((reference) => reference.provider === provider && reference.exists)
  const credentialReferenceName = providerReferences[0]?.credentialReferenceName || null
  const isAudio = provider === 'ACX_FINDAWAY_HUMAN_ASSISTED'

  if (isAudio && credentialReferenceName) {
    return {
      provider,
      accountStatus: 'HUMAN_ASSISTED_READY',
      authType: 'HUMAN_ASSISTED',
      tokenLifetime: 'NOT_APPLICABLE',
      refreshModel: 'HUMAN_LOGIN',
      serviceAccountSupported: 'UNKNOWN',
      mfaInteractionRequired: 'POSSIBLE',
      apiScope: 'HUMAN_PROVIDER_UI_ONLY',
      leastPrivilegeAvailable: 'UNKNOWN',
      persistentSecretRequiredByProvider: 'UNKNOWN',
      credentialReferenceName,
      adapterStatus: 'PASS',
      connectivity: 'FAIL',
      canaryReady: 'HUMAN_ASSISTED',
      canaryExecuted: 'NO',
      providerRecordsCreated: 0,
      publicRelease: 'NO',
      blockers: ['AUDIO_PROVIDER_READBACK_ADAPTER_NOT_PROVEN'],
    }
  }

  if (!credentialReferenceName) {
    return {
      provider,
      accountStatus: isAudio ? 'BLOCKED_ACCOUNT_CONFIGURATION' : 'BLOCKED_CREDENTIAL_NOT_FOUND',
      authType: isAudio ? 'HUMAN_ASSISTED' : 'UNKNOWN',
      tokenLifetime: isAudio ? 'NOT_APPLICABLE' : 'UNKNOWN',
      refreshModel: isAudio ? 'HUMAN_LOGIN' : 'UNKNOWN',
      serviceAccountSupported: isAudio ? 'NO' : 'UNKNOWN',
      mfaInteractionRequired: isAudio ? 'POSSIBLE' : 'UNKNOWN',
      apiScope: isAudio ? 'HUMAN_PROVIDER_UI_ONLY' : 'UNKNOWN',
      leastPrivilegeAvailable: 'UNKNOWN',
      persistentSecretRequiredByProvider: 'UNKNOWN',
      credentialReferenceName: null,
      adapterStatus: 'FAIL',
      connectivity: 'FAIL',
      canaryReady: 'NO',
      canaryExecuted: 'NO',
      providerRecordsCreated: 0,
      publicRelease: 'NO',
      blockers: isAudio
        ? ['AUDIO_PROVIDER_ACCOUNT_REFERENCE_NOT_CONFIGURED', 'AUDIO_PROVIDER_READBACK_ADAPTER_NOT_PROVEN']
        : ['CREDENTIAL_NOT_FOUND', 'LIVE_ADAPTER_NOT_ENABLED', 'CONNECTIVITY_NOT_PROVEN'],
    }
  }

  return {
    provider,
    accountStatus: 'BLOCKED_PROVIDER_API_NOT_ENABLED',
    authType: 'API_KEY_OR_TOKEN',
    tokenLifetime: 'PROVIDER_DEFINED',
    refreshModel: 'PROVIDER_DEFINED',
    serviceAccountSupported: 'UNKNOWN',
    mfaInteractionRequired: 'UNKNOWN',
    apiScope: 'NONPUBLIC_CANARY_READ_VALIDATE_SUBMIT_ONLY',
    leastPrivilegeAvailable: 'UNKNOWN',
    persistentSecretRequiredByProvider: 'YES',
    credentialReferenceName,
    adapterStatus: 'FAIL',
    connectivity: 'FAIL',
    canaryReady: 'NO',
    canaryExecuted: 'NO',
    providerRecordsCreated: 0,
    publicRelease: 'NO',
    blockers: ['LIVE_ADAPTER_NOT_ENABLED', 'CONNECTIVITY_NOT_PROVEN'],
  }
}

function modeRank(mode: DistributionExecutionMode) {
  return DISTRIBUTION_EXECUTION_MODES.indexOf(mode)
}
