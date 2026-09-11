// Engine: Distribution Engine
// Reusable? Y
// Stage-specific exception? N

export const JMP_DIST_001_CANONICAL_BASE_SHA = 'fd352662e1f8e1b746809188ddd0305a973ca8bd' as const
export const ORCH_012_EXPECTED_ACTIONS = 18 as const

export const DISTRIBUTION_PROVIDERS = [
  'INGRAM_CONTENT',
  'CORESOURCE',
  'ACX_FINDAWAY_HUMAN_ASSISTED',
] as const

export type DistributionProvider = (typeof DISTRIBUTION_PROVIDERS)[number]

export type DistributionFormat = 'PAPERBACK' | 'HARDCOVER' | 'EPUB' | 'AUDIOBOOK'

export type DistributionArtifactRef = {
  role: 'INTERIOR' | 'COVER' | 'EPUB' | 'AUDIO_MASTER' | 'SUPPLEMENTAL_METADATA'
  sharePointDriveId?: string
  sharePointItemId?: string
  sha256?: string
  version?: string
  fileName?: string
}

export type DistributionTitlePackage = {
  titleId: string
  workId: string
  canonicalTitle: string
  contributors: string[]
  imprint: 'J Merrill Publishing' | 'J Merrill Publishing, Inc.'
  edition: string
  language: string
  publicationDate: string
  territories: string[]
  formats: DistributionFormat[]
  isbnByFormat: Partial<Record<DistributionFormat, string>>
  pricingByFormat: Partial<Record<DistributionFormat, { currency: string; amount: number }>>
  rightsCertifiedByFounder: boolean
  assets: DistributionArtifactRef[]
}

export type ProviderContract = {
  provider: DistributionProvider
  label: string
  channel: 'PRINT' | 'EBOOK' | 'AUDIO'
  supportedFormats: DistributionFormat[]
  authBoundary: 'EXTERNALIZED_SECRET_REQUIRED' | 'HUMAN_ASSISTED_PROVIDER_ACCOUNT'
  safeProofMode: 'CONTRACT_PAYLOAD_ONLY' | 'HUMAN_ASSISTED_PACKAGE_ONLY'
  liveSubmissionPermitted: false
  liveCanaryRequired: true
  readbackMode: 'PROVIDER_STATUS_NORMALIZATION' | 'MANUAL_PROVIDER_READBACK_NORMALIZATION'
}

export type ProviderPayload = {
  provider: DistributionProvider
  idempotencyKey: string
  externalEffect: 'NONE'
  submissionMode: 'SAFE_CONTRACT_PROOF'
  title: string
  imprint: string
  formats: DistributionFormat[]
  identifiers: Partial<Record<DistributionFormat, string>>
  pricing: Partial<Record<DistributionFormat, { currency: string; amount: number }>>
  assetAuthority: Array<Required<Pick<DistributionArtifactRef, 'role' | 'sharePointDriveId' | 'sharePointItemId' | 'sha256' | 'version'>>>
}

export type ProofResult = {
  status: 'JMP_DIST_001_PROVIDER_CONTRACT_PASS_WITH_LIVE_CANARY_REQUIRED'
  canonicalBaseSha: typeof JMP_DIST_001_CANONICAL_BASE_SHA
  connectorsInventoried: string[]
  connectorsImplemented: DistributionProvider[]
  connectorsReused: string[]
  orch012ActionsExpected: typeof ORCH_012_EXPECTED_ACTIONS
  orch012ActionsMapped: number
  orch012ActionsImplementable: number
  implementationGaps: string[]
  providerContracts: ProviderContract[]
  payloads: ProviderPayload[]
  liveCanaryRequired: true
  liveCanaryProviders: DistributionProvider[]
  realExternalSubmissions: 0
  realPublicReleases: 0
  secretsCommitted: 0
}

export const PROVIDER_CONTRACTS: ProviderContract[] = [
  {
    provider: 'INGRAM_CONTENT',
    label: 'Ingram Content',
    channel: 'PRINT',
    supportedFormats: ['PAPERBACK', 'HARDCOVER'],
    authBoundary: 'EXTERNALIZED_SECRET_REQUIRED',
    safeProofMode: 'CONTRACT_PAYLOAD_ONLY',
    liveSubmissionPermitted: false,
    liveCanaryRequired: true,
    readbackMode: 'PROVIDER_STATUS_NORMALIZATION',
  },
  {
    provider: 'CORESOURCE',
    label: 'CoreSource',
    channel: 'EBOOK',
    supportedFormats: ['EPUB'],
    authBoundary: 'EXTERNALIZED_SECRET_REQUIRED',
    safeProofMode: 'CONTRACT_PAYLOAD_ONLY',
    liveSubmissionPermitted: false,
    liveCanaryRequired: true,
    readbackMode: 'PROVIDER_STATUS_NORMALIZATION',
  },
  {
    provider: 'ACX_FINDAWAY_HUMAN_ASSISTED',
    label: 'ACX / Findaway human-assisted audio',
    channel: 'AUDIO',
    supportedFormats: ['AUDIOBOOK'],
    authBoundary: 'HUMAN_ASSISTED_PROVIDER_ACCOUNT',
    safeProofMode: 'HUMAN_ASSISTED_PACKAGE_ONLY',
    liveSubmissionPermitted: false,
    liveCanaryRequired: true,
    readbackMode: 'MANUAL_PROVIDER_READBACK_NORMALIZATION',
  },
]

export const ORCH012_ACTION_MAP = [
  ['ORCH012-DIST-001', 'TITLE_METADATA_VALIDATION'],
  ['ORCH012-DIST-002', 'ISBN_BINDING'],
  ['ORCH012-DIST-003', 'FORMAT_DEFINITION'],
  ['ORCH012-DIST-004', 'PRINT_ASSET_READINESS'],
  ['ORCH012-DIST-005', 'COVER_ASSET_READINESS'],
  ['ORCH012-DIST-006', 'INTERIOR_ASSET_READINESS'],
  ['ORCH012-DIST-007', 'EBOOK_ASSET_READINESS'],
  ['ORCH012-DIST-008', 'AUDIO_ASSET_READINESS'],
  ['ORCH012-DIST-009', 'ACCESSIBILITY_VALIDATION'],
  ['ORCH012-DIST-010', 'PRICING_METADATA_BINDING'],
  ['ORCH012-DIST-011', 'TERRITORY_BINDING'],
  ['ORCH012-DIST-012', 'DISTRIBUTION_CHANNEL_BINDING'],
  ['ORCH012-DIST-013', 'RELEASE_DATE_CALCULATION'],
  ['ORCH012-DIST-014', 'RELEASE_DATE_VALIDATION'],
  ['ORCH012-DIST-018', 'DISTRIBUTOR_STATUS_READBACK'],
  ['ORCH012-DIST-019', 'DISTRIBUTOR_ERROR_RECONCILIATION'],
  ['ORCH012-DIST-025', 'INTERNAL_SUBMISSION_PACKAGE_PREPARATION'],
  ['ORCH012-DIST-026', 'PRODUCTION_READINESS_DERIVATION'],
] as const

const PROVIDER_FORMATS: Record<DistributionProvider, DistributionFormat[]> = {
  INGRAM_CONTENT: ['PAPERBACK', 'HARDCOVER'],
  CORESOURCE: ['EPUB'],
  ACX_FINDAWAY_HUMAN_ASSISTED: ['AUDIOBOOK'],
}

export function providerContract(provider: DistributionProvider) {
  const contract = PROVIDER_CONTRACTS.find((candidate) => candidate.provider === provider)
  if (!contract) throw new Error(`Unknown distribution provider: ${provider}`)
  return contract
}

export function validateTitlePackage(input: DistributionTitlePackage, provider: DistributionProvider) {
  const blockers: string[] = []
  if (!input.titleId) blockers.push('TITLE_ID_MISSING')
  if (!input.workId) blockers.push('WORK_ID_MISSING')
  if (!input.canonicalTitle) blockers.push('CANONICAL_TITLE_MISSING')
  if (!input.contributors.length) blockers.push('CONTRIBUTORS_MISSING')
  if (!input.edition) blockers.push('EDITION_MISSING')
  if (!input.publicationDate) blockers.push('PUBLICATION_DATE_MISSING')
  if (!input.territories.length) blockers.push('TERRITORIES_MISSING')
  if (!input.rightsCertifiedByFounder) blockers.push('RIGHTS_CERTIFICATION_REQUIRES_FOUNDER')

  const requiredFormats = input.formats.filter((format) => PROVIDER_FORMATS[provider].includes(format))
  if (!requiredFormats.length) blockers.push('NO_PROVIDER_SUPPORTED_FORMAT')

  for (const format of requiredFormats) {
    if (!input.isbnByFormat[format]) blockers.push(`ISBN_MISSING_${format}`)
    if (!input.pricingByFormat[format]) blockers.push(`PRICING_MISSING_${format}`)
  }

  const requiredRoles = requiredAssetRoles(provider)
  for (const role of requiredRoles) {
    const artifact = input.assets.find((candidate) => candidate.role === role)
    if (!artifact) {
      blockers.push(`ASSET_MISSING_${role}`)
      continue
    }
    if (!artifact.sharePointDriveId || !artifact.sharePointItemId || !artifact.sha256 || !artifact.version) {
      blockers.push(`SHAREPOINT_ITEM_AUTHORITY_INCOMPLETE_${role}`)
    }
  }

  return blockers
}

export function buildProviderPayload(input: DistributionTitlePackage, provider: DistributionProvider): ProviderPayload {
  const blockers = validateTitlePackage(input, provider)
  if (blockers.length > 0) throw new Error(`Distribution package blocked: ${blockers.join(',')}`)

  const formats = input.formats.filter((format) => PROVIDER_FORMATS[provider].includes(format))
  const artifactRoles = requiredAssetRoles(provider)
  const assetAuthority = artifactRoles.map((role) => {
    const artifact = input.assets.find((candidate) => candidate.role === role)
    return {
      role,
      sharePointDriveId: artifact?.sharePointDriveId as string,
      sharePointItemId: artifact?.sharePointItemId as string,
      sha256: artifact?.sha256 as string,
      version: artifact?.version as string,
    }
  })

  return {
    provider,
    idempotencyKey: buildIdempotencyKey(input, provider),
    externalEffect: 'NONE',
    submissionMode: 'SAFE_CONTRACT_PROOF',
    title: input.canonicalTitle,
    imprint: input.imprint,
    formats,
    identifiers: Object.fromEntries(formats.map((format) => [format, input.isbnByFormat[format]])),
    pricing: Object.fromEntries(formats.map((format) => [format, input.pricingByFormat[format]])),
    assetAuthority,
  }
}

export function normalizeProviderReadback(provider: DistributionProvider, raw: { httpStatus?: number; providerStatus?: string; errors?: string[] }) {
  const status = raw.providerStatus?.toUpperCase()
  if (raw.errors?.length) return { provider, normalizedStatus: 'ERROR_RECONCILIATION_REQUIRED' as const, externalAccepted: false }
  if (status === 'ACCEPTED' || status === 'VALIDATED' || status === 'DRAFT') {
    return { provider, normalizedStatus: status, externalAccepted: status === 'ACCEPTED' }
  }
  return { provider, normalizedStatus: 'READBACK_INCOMPLETE_REQUIRES_MANUAL_RECONCILIATION' as const, externalAccepted: false }
}

export function classifyProviderError(message: string) {
  const normalized = message.toUpperCase()
  if (normalized.includes('RIGHT') || normalized.includes('TERRITORY')) return 'RIGHTS_OR_TERRITORY_REQUIRES_FOUNDER_REVIEW'
  if (normalized.includes('ISBN')) return 'ISBN_METADATA_CORRECTION_REQUIRED'
  if (normalized.includes('ASSET') || normalized.includes('FILE')) return 'ASSET_AUTHORITY_CORRECTION_REQUIRED'
  if (normalized.includes('PRICE')) return 'PRICING_METADATA_CORRECTION_REQUIRED'
  return 'PROVIDER_ERROR_RECONCILIATION_REQUIRED'
}

export function runProviderContractProof(input: DistributionTitlePackage): ProofResult {
  const payloads = DISTRIBUTION_PROVIDERS.map((provider) => buildProviderPayload(input, provider))

  return {
    status: 'JMP_DIST_001_PROVIDER_CONTRACT_PASS_WITH_LIVE_CANARY_REQUIRED',
    canonicalBaseSha: JMP_DIST_001_CANONICAL_BASE_SHA,
    connectorsInventoried: [
      'milestone8DistributionSetupReadiness.js',
      'block07DistributionCommissioning.js',
      'distribution-data.ts',
      'tokens.ts distributor canon',
    ],
    connectorsImplemented: [...DISTRIBUTION_PROVIDERS],
    connectorsReused: ['distribution-data.ts provider canon', 'production asset SharePoint authority contract'],
    orch012ActionsExpected: ORCH_012_EXPECTED_ACTIONS,
    orch012ActionsMapped: ORCH012_ACTION_MAP.length,
    orch012ActionsImplementable: ORCH012_ACTION_MAP.length,
    implementationGaps: ['LIVE_CANARY_REQUIRED_FOR_PROVIDER_AUTHENTICATED_DRAFT_OR_SANDBOX_PROOF'],
    providerContracts: PROVIDER_CONTRACTS,
    payloads,
    liveCanaryRequired: true,
    liveCanaryProviders: [...DISTRIBUTION_PROVIDERS],
    realExternalSubmissions: 0,
    realPublicReleases: 0,
    secretsCommitted: 0,
  }
}

export function sampleDistributionTitlePackage(): DistributionTitlePackage {
  return {
    titleId: 'jmp-title-quanishia-stage0-safe-proof',
    workId: 'jmp-work-quanishia-stage0-safe-proof',
    canonicalTitle: 'Quanishia Governed Stage 0 Distribution Contract Proof',
    contributors: ['Quanishia'],
    imprint: 'J Merrill Publishing, Inc.',
    edition: 'First Edition',
    language: 'en',
    publicationDate: '2026-09-30',
    territories: ['WORLD'],
    formats: ['PAPERBACK', 'HARDCOVER', 'EPUB', 'AUDIOBOOK'],
    isbnByFormat: {
      PAPERBACK: '9781961475001',
      HARDCOVER: '9781961475002',
      EPUB: '9781961475003',
      AUDIOBOOK: '9781961475004',
    },
    pricingByFormat: {
      PAPERBACK: { currency: 'USD', amount: 19.99 },
      HARDCOVER: { currency: 'USD', amount: 29.99 },
      EPUB: { currency: 'USD', amount: 9.99 },
      AUDIOBOOK: { currency: 'USD', amount: 14.99 },
    },
    rightsCertifiedByFounder: true,
    assets: [
      artifact('INTERIOR', 'paperback-interior-v1'),
      artifact('COVER', 'cover-v1'),
      artifact('EPUB', 'epub-v1'),
      artifact('AUDIO_MASTER', 'audio-master-v1'),
      artifact('SUPPLEMENTAL_METADATA', 'metadata-v1'),
    ],
  }
}

function requiredAssetRoles(provider: DistributionProvider): DistributionArtifactRef['role'][] {
  if (provider === 'INGRAM_CONTENT') return ['INTERIOR', 'COVER', 'SUPPLEMENTAL_METADATA']
  if (provider === 'CORESOURCE') return ['EPUB', 'COVER', 'SUPPLEMENTAL_METADATA']
  return ['AUDIO_MASTER', 'COVER', 'SUPPLEMENTAL_METADATA']
}

function buildIdempotencyKey(input: DistributionTitlePackage, provider: DistributionProvider) {
  const providerArtifacts = input.assets
    .filter((asset) => requiredAssetRoles(provider).includes(asset.role))
    .map((asset) => `${asset.role}:${asset.sharePointDriveId}:${asset.sharePointItemId}:${asset.version}:${asset.sha256}`)
    .sort()
    .join('|')
  return [
    'jmp-dist-001',
    provider.toLowerCase(),
    input.titleId,
    input.workId,
    input.edition.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    stableHash(providerArtifacts),
  ].join(':')
}

function stableHash(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function artifact(role: DistributionArtifactRef['role'], seed: string): DistributionArtifactRef {
  return {
    role,
    sharePointDriveId: `drive-${seed}`,
    sharePointItemId: `item-${seed}`,
    sha256: stableHash(seed).repeat(8).slice(0, 64),
    version: '1.0.0',
    fileName: `${seed}.bin`,
  }
}
