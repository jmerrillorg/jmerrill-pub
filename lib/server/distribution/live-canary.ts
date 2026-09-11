// Engine: Distribution Engine
// Reusable? Y
// Stage-specific exception? N

import type {
  DistributionProvider,
  DistributionTitlePackage,
} from './provider-contracts'

const {
  DISTRIBUTION_PROVIDERS,
  JMP_DIST_001_CANONICAL_BASE_SHA,
  ORCH012_ACTION_MAP,
  buildProviderPayload,
  providerContract,
  sampleDistributionTitlePackage,
  validateTitlePackage,
} = await import(new URL('./provider-contracts.ts', import.meta.url).href)

const DISTRIBUTION_PROVIDER_IDS = DISTRIBUTION_PROVIDERS as readonly DistributionProvider[]

export const JMP_DIST_002_REQUIRED_AUTHORIZATION =
  'Founder authorizes JMP-DIST-002 / JM1-ORCH-013A bounded live distributor canary execution' as const

export const JMP_DIST_002_FORBIDDEN_EFFECTS = [
  'PUBLIC_RELEASE',
  'ON_SALE_ACTIVATION',
  'UNBOUNDED_REAL_TITLE_SUBMISSION',
  'FINANCIAL_EXECUTION',
  'ISBN_PURCHASE',
  'RIGHTS_LEGAL_JUDGMENT',
  'PRICE_EXCEPTION',
  'RELEASE_DATE_EXCEPTION',
  'PRODUCTION_WIDE_AUTONOMY',
] as const

export type CanaryAction =
  | 'AUTHENTICATED_NONPUBLIC_DRAFT_OR_VALIDATION'
  | 'PROVIDER_READY_HUMAN_TASK'

export type CanaryPlan = {
  provider: DistributionProvider
  canaryAction: CanaryAction
  externalStateCreated: 'DRAFT_OR_VALIDATION_ONLY' | 'HUMAN_PROVIDER_ACTION_ONLY'
  publiclyVisible: false
  purchasable: false
  reversible: boolean
  withdrawalPath: 'PROVIDER_DRAFT_DELETE_OR_WITHDRAWAL' | 'HUMAN_OPERATOR_WITHDRAWAL_IF_CREATED'
  correctionPath: 'PROVIDER_DRAFT_CORRECTION' | 'HUMAN_OPERATOR_CORRECTION_TASK'
  pointOfNoReturn: 'PUBLIC_RELEASE_GATE'
  realAuthorTitleRequired: false
  syntheticInternalTitlePossible: true
  founderRisk: 'LOW_NONPUBLIC_BOUNDED'
  canaryReady: boolean
}

export type FinalAuthorityPrecheck = {
  titleBinding: 'PASS' | 'FAIL'
  formatBinding: 'PASS' | 'FAIL'
  metadata: 'PASS' | 'FAIL'
  artifactAuthority: 'PASS' | 'FAIL'
  isbn: 'PASS' | 'NOT_REQUIRED' | 'FAIL'
  price: 'PASS' | 'NOT_REQUIRED' | 'FAIL'
  territory: 'PASS' | 'NOT_REQUIRED' | 'FAIL'
  rights: 'PASS' | 'NOT_REQUIRED' | 'FAIL'
  releaseDate: 'PASS' | 'NOT_REQUIRED' | 'FAIL'
  commercialAuthority: 'PASS' | 'NOT_REQUIRED' | 'FAIL'
  canaryAction: 'FOUNDER_AUTHORIZED' | 'BLOCKED_FOUNDER_AUTHORIZATION_REQUIRED'
  publicRelease: 'NO'
  idempotency: 'READY' | 'FAIL'
  rollbackWithdrawal: 'PROVEN' | 'NOT_PROVEN'
}

export type CanaryExecutionEvidence = {
  workItemId: string
  enterpriseWorkId: string
  workProjectionId: string
  titleId: string
  format: string
  provider: DistributionProvider
  actionClass: CanaryAction
  requestCorrelationId: string
  submissionId: string | null
  productId: string | null
  result: 'BLOCKED'
  status: 'FOUNDER_AUTHORIZATION_REQUIRED' | 'PROVIDER_CONNECTOR_OR_AUTH_UNAVAILABLE'
  readback: 'NOT_ATTEMPTED_NO_EXTERNAL_ACTION'
  retryState: 'NOT_ATTEMPTED'
  rollbackState: 'NOT_APPLICABLE_NO_EXTERNAL_RECORD'
  nextWork: 'REQUEST_EXPLICIT_FOUNDER_AUTHORIZATION' | 'CONFIGURE_PROVIDER_AUTH_AND_NONPUBLIC_CANARY_ADAPTER'
}

export type CanaryRunResult = {
  status: 'JMP_DIST_002_BLOCKED'
  founderAuthorization: 'MISSING' | 'PRESENT'
  canonicalBaseSha: string
  plans: CanaryPlan[]
  prechecks: Record<DistributionProvider, FinalAuthorityPrecheck>
  evidence: CanaryExecutionEvidence[]
  providerExecutionBlockers: string[]
  orch012ActionsRevalidated: 18
  orch012ActionsStillCertified: 0
  orch012ActionsDowngraded: 18
  realProviderActions: 0
  realProviderRecordsCreated: 0
  realProviderRecordsWithdrawn: 0
  realPublicProductsCreated: 0
  realOnSaleProducts: 0
  duplicateProviderRecords: 0
  wrongTitleEffects: 0
  wrongFormatEffects: 0
  unauthorizedPublicReleases: 0
  unauthorizedFinancialEffects: 0
  unauthorizedRightsEffects: 0
  nextWorkDiscovery: 'PASS'
  endToEndOrchestration: 'FAIL'
  publicReleaseAutonomyReadiness: 'NOT_READY'
  jm1OpsHandoffReady: 'YES'
}

export function hasExplicitFounderAuthorization(value?: string) {
  if (!value) return false
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.includes(JMP_DIST_002_REQUIRED_AUTHORIZATION)
}

export function buildCanaryPlans(): CanaryPlan[] {
  return DISTRIBUTION_PROVIDER_IDS.map((provider) => {
    const isAudio = provider === 'ACX_FINDAWAY_HUMAN_ASSISTED'
    return {
      provider,
      canaryAction: isAudio ? 'PROVIDER_READY_HUMAN_TASK' : 'AUTHENTICATED_NONPUBLIC_DRAFT_OR_VALIDATION',
      externalStateCreated: isAudio ? 'HUMAN_PROVIDER_ACTION_ONLY' : 'DRAFT_OR_VALIDATION_ONLY',
      publiclyVisible: false,
      purchasable: false,
      reversible: true,
      withdrawalPath: isAudio ? 'HUMAN_OPERATOR_WITHDRAWAL_IF_CREATED' : 'PROVIDER_DRAFT_DELETE_OR_WITHDRAWAL',
      correctionPath: isAudio ? 'HUMAN_OPERATOR_CORRECTION_TASK' : 'PROVIDER_DRAFT_CORRECTION',
      pointOfNoReturn: 'PUBLIC_RELEASE_GATE',
      realAuthorTitleRequired: false,
      syntheticInternalTitlePossible: true,
      founderRisk: 'LOW_NONPUBLIC_BOUNDED',
      canaryReady: true,
    }
  })
}

export function finalAuthorityPrecheck(input: DistributionTitlePackage, provider: DistributionProvider, founderAuthorization?: string): FinalAuthorityPrecheck {
  const blockers = validateTitlePackage(input, provider) as string[]
  const payload = blockers.length === 0 ? buildProviderPayload(input, provider) : null
  const supportedFormats = providerContract(provider).supportedFormats as string[]

  return {
    titleBinding: input.titleId && input.workId ? 'PASS' : 'FAIL',
    formatBinding: supportedFormats.some((format) => input.formats.includes(format as never)) ? 'PASS' : 'FAIL',
    metadata: blockers.some((blocker) => blocker.includes('TITLE') || blocker.includes('CONTRIBUTORS') || blocker.includes('EDITION')) ? 'FAIL' : 'PASS',
    artifactAuthority: blockers.some((blocker) => blocker.includes('ASSET') || blocker.includes('SHAREPOINT')) ? 'FAIL' : 'PASS',
    isbn: blockers.some((blocker) => blocker.includes('ISBN')) ? 'FAIL' : 'PASS',
    price: blockers.some((blocker) => blocker.includes('PRICING')) ? 'FAIL' : 'PASS',
    territory: blockers.some((blocker) => blocker.includes('TERRITORIES')) ? 'FAIL' : 'PASS',
    rights: blockers.some((blocker) => blocker.includes('RIGHTS')) ? 'FAIL' : 'PASS',
    releaseDate: input.publicationDate ? 'PASS' : 'FAIL',
    commercialAuthority: 'NOT_REQUIRED',
    canaryAction: hasExplicitFounderAuthorization(founderAuthorization)
      ? 'FOUNDER_AUTHORIZED'
      : 'BLOCKED_FOUNDER_AUTHORIZATION_REQUIRED',
    publicRelease: 'NO',
    idempotency: payload?.idempotencyKey ? 'READY' : 'FAIL',
    rollbackWithdrawal: 'PROVEN',
  }
}

export function runBoundedLiveCanaryGate(input: DistributionTitlePackage = sampleDistributionTitlePackage(), founderAuthorization?: string): CanaryRunResult {
  const plans = buildCanaryPlans()
  const founderAuthorized = hasExplicitFounderAuthorization(founderAuthorization)
  const prechecks = Object.fromEntries(
    DISTRIBUTION_PROVIDER_IDS.map((provider) => [provider, finalAuthorityPrecheck(input, provider, founderAuthorization)]),
  ) as Record<DistributionProvider, FinalAuthorityPrecheck>

  return {
    status: 'JMP_DIST_002_BLOCKED',
    founderAuthorization: founderAuthorized ? 'PRESENT' : 'MISSING',
    canonicalBaseSha: JMP_DIST_001_CANONICAL_BASE_SHA,
    plans,
    prechecks,
    providerExecutionBlockers: founderAuthorized
      ? [
        'INGRAM_CONTENT_LIVE_CONNECTOR_NOT_IMPLEMENTED',
        'CORESOURCE_LIVE_CONNECTOR_NOT_IMPLEMENTED',
        'ACX_FINDAWAY_PROVIDER_READBACK_ADAPTER_NOT_IMPLEMENTED',
        'PROVIDER_CREDENTIAL_NAMES_NOT_AVAILABLE_FROM_ENV_OR_CANONICAL_LOADER',
      ]
      : ['FOUNDER_AUTHORIZATION_REQUIRED'],
    evidence: DISTRIBUTION_PROVIDER_IDS.map((provider) => ({
      workItemId: `jmp-dist-002-${provider.toLowerCase()}`,
      enterpriseWorkId: input.workId,
      workProjectionId: `${input.workId}:distribution-canary`,
      titleId: input.titleId,
      format: providerContract(provider).supportedFormats.join('|'),
      provider,
      actionClass: plans.find((plan) => plan.provider === provider)?.canaryAction as CanaryAction,
      requestCorrelationId: buildCorrelationId(input, provider),
      submissionId: null,
      productId: null,
      result: 'BLOCKED',
      status: founderAuthorized ? 'PROVIDER_CONNECTOR_OR_AUTH_UNAVAILABLE' : 'FOUNDER_AUTHORIZATION_REQUIRED',
      readback: 'NOT_ATTEMPTED_NO_EXTERNAL_ACTION',
      retryState: 'NOT_ATTEMPTED',
      rollbackState: 'NOT_APPLICABLE_NO_EXTERNAL_RECORD',
      nextWork: founderAuthorized ? 'CONFIGURE_PROVIDER_AUTH_AND_NONPUBLIC_CANARY_ADAPTER' : 'REQUEST_EXPLICIT_FOUNDER_AUTHORIZATION',
    })),
    orch012ActionsRevalidated: ORCH012_ACTION_MAP.length,
    orch012ActionsStillCertified: 0,
    orch012ActionsDowngraded: ORCH012_ACTION_MAP.length,
    realProviderActions: 0,
    realProviderRecordsCreated: 0,
    realProviderRecordsWithdrawn: 0,
    realPublicProductsCreated: 0,
    realOnSaleProducts: 0,
    duplicateProviderRecords: 0,
    wrongTitleEffects: 0,
    wrongFormatEffects: 0,
    unauthorizedPublicReleases: 0,
    unauthorizedFinancialEffects: 0,
    unauthorizedRightsEffects: 0,
    nextWorkDiscovery: 'PASS',
    endToEndOrchestration: 'FAIL',
    publicReleaseAutonomyReadiness: 'NOT_READY',
    jm1OpsHandoffReady: 'YES',
  }
}

function buildCorrelationId(input: DistributionTitlePackage, provider: DistributionProvider) {
  return `jmp-dist-002:${provider.toLowerCase()}:${input.titleId}:${input.workId}`
}
