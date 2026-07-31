// Engine: Identity & Access Engine
// Reusable? Y
// Stage-specific exception? N
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { GENERATED_AUTHOR_PORTAL_ACCESS } from './author-portal-access.generated'

export type AuthorPortalAccessGrant = {
  code: string
  accessCodeHash?: string
  accessCodeVersion?: 'activation-code-v1' | 'activation-code-v2'
  status?: string
  purpose?: 'initial_activation' | 'recovery'
  intakeReference?: string
  projectIds?: string[]
  title?: string
  titleSlug?: string
  contactId?: string
  contactEmail?: string
  opportunityId?: string
  expiresAt?: string
  consumedAt?: string
  revokedAt?: string
  externalUserIdentifier?: string
  scope?: 'project' | 'relationship'
}

export type AuthorPortalSession = {
  v: 1
  intakeReference?: string
  title?: string
  titleSlug?: string
  contactId?: string
  contactEmail?: string
  externalUserIdentifier?: string
  opportunityId?: string
  scope: 'project' | 'relationship'
  issuedAt: string
}

export type AuthorPortalActivationTransaction = {
  v: 1
  contactId: string
  purpose: 'initial_activation' | 'recovery'
  intakeReference?: string
  title?: string
  titleSlug?: string
  opportunityId?: string
  scope: 'relationship'
  issuedAt: string
  expiresAt: string
}

export type AuthorPortalActivationResolution = {
  grant: AuthorPortalAccessGrant
  purpose: 'initial_activation' | 'recovery'
  contactId: string
  codeStatus: 'valid'
}

const SESSION_VERSION = 1
const DEFAULT_REFERENCE = 'JMP-INT-202607-0W5PTQ'
const DEFAULT_TITLE = 'The Intentional Leader'
const COOKIE_NAME = 'jm1_author_portal_session'
const ACTIVATION_TRANSACTION_COOKIE_NAME = 'jm1_author_activation_tx'
const ACTIVATION_TRANSACTION_MAX_AGE_SECONDS = 15 * 60
const LOCAL_TEST_PORTAL_CODE = 'JMP-PORTAL-ADMIN-2026'
const ACTIVATION_CODE_V1 = 'activation-code-v1'
const ACTIVATION_CODE_V2 = 'activation-code-v2'
const FORMER_PORTAL_SESSION_FALLBACK = 'jm1-author-portal-session'
const MIN_PORTAL_SESSION_SECRET_BYTES = 32
const PLACEHOLDER_PORTAL_SESSION_SECRETS = new Set([
  'changeme',
  'change-me',
  'replace-me',
  'placeholder',
  'secret',
  'password',
  'author-portal-session-secret',
  'your-secret-here',
  'todo',
])

let warnedMissingDevelopmentSecret = false

export class AuthorPortalSessionConfigurationError extends Error {
  constructor(message = 'Author portal session configuration is unavailable.') {
    super(message)
    this.name = 'AuthorPortalSessionConfigurationError'
  }
}

export function getAuthorPortalCookieName() {
  return COOKIE_NAME
}

export function getAuthorPortalActivationTransactionCookieName() {
  return ACTIVATION_TRANSACTION_COOKIE_NAME
}

export function getAuthorPortalActivationTransactionMaxAgeSeconds() {
  return ACTIVATION_TRANSACTION_MAX_AGE_SECONDS
}

export function parseAuthorPortalAccessRegistry(raw: string | undefined) {
  if (!raw?.trim()) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((entry) => normalizeGrant(entry))
      .filter((entry): entry is AuthorPortalAccessGrant => Boolean(entry))
  } catch {
    return []
  }
}

export function getAuthorPortalAccessGrants(): AuthorPortalAccessGrant[] {
  const registry = parseAuthorPortalAccessRegistry(getAuthorPortalAccessRegistryJson())
  if (registry.length) return registry

  if (process.env.NODE_ENV === 'production') return []

  const legacyCode = getOnboardingAccessCode() || getMasterAccessCode()
  if (!legacyCode) {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          code: 'JMP-AUTHOR-2026',
          intakeReference: DEFAULT_REFERENCE,
          title: DEFAULT_TITLE,
          scope: 'project',
        },
      ] satisfies AuthorPortalAccessGrant[]
    }
    return []
  }

  return [
    {
      code: legacyCode,
      intakeReference:
        process.env.AUTHOR_PORTAL_DEFAULT_REFERENCE?.trim() ||
        process.env.PROGRAM003_COMMISSIONING_REFERENCE?.trim() ||
        DEFAULT_REFERENCE,
      title:
        process.env.AUTHOR_PORTAL_DEFAULT_TITLE?.trim() ||
        process.env.PROGRAM003_COMMISSIONING_TITLE?.trim() ||
        DEFAULT_TITLE,
      titleSlug: process.env.AUTHOR_PORTAL_DEFAULT_TITLE_SLUG?.trim() || process.env.PROGRAM003_COMMISSIONING_SLUG?.trim(),
      scope: 'project',
    },
  ] satisfies AuthorPortalAccessGrant[]
}

export function getAuthorPortalAccessDiagnostics() {
  const grants = getAuthorPortalAccessGrants()
  const registrySource = resolveAuthorPortalAccessRegistrySource()
  const activeGrantCount = grants.filter(
    (entry) => isGrantActive(entry) && !isExpired(entry.expiresAt),
  ).length

  return {
    registrySource,
    grantCount: grants.length,
    activeGrantCount,
    masterCodeConfigured: Boolean(getMasterAccessCode()),
    onboardingCodeConfigured: Boolean(getOnboardingAccessCode()),
    pepperConfigured: Boolean(getAccessCodePepper()),
    sessionSecretConfigured: Boolean(getSessionSecret()),
  }
}

export function resolveAuthorPortalAccessGrant({
  code,
  requestedReference,
}: {
  code: string
  requestedReference?: string
}) {
  const grants = getAuthorPortalAccessGrants()
  const matches = grants.filter(
    (entry) => isGrantActive(entry) && !isExpired(entry.expiresAt) && grantMatchesCode(entry, code),
  )
  if (matches.length === 0) {
    if (!isMasterPortalAccessCode(code)) return null

    const normalizedReference = normalizeText(requestedReference)
    if (normalizedReference) {
      const scopedGrant = grants.find(
        (entry) =>
          isGrantActive(entry) &&
          !isExpired(entry.expiresAt) &&
          (normalizeText(entry.intakeReference) === normalizedReference ||
            entry.projectIds?.some((projectId) => normalizeText(projectId) === normalizedReference)),
      )
      if (scopedGrant) {
        return {
          ...scopedGrant,
          intakeReference: requestedReference,
        }
      }
    }

    return buildMasterPortalFallbackGrant(requestedReference)
  }

  const normalizedReference = normalizeText(requestedReference)
  if (normalizedReference) {
    const exact = matches.find(
      (entry) =>
        normalizeText(entry.intakeReference) === normalizedReference ||
        entry.projectIds?.some((projectId) => normalizeText(projectId) === normalizedReference),
    )
    if (exact) {
      return {
        ...exact,
        intakeReference: requestedReference,
      }
    }

    if (matches.length === 1) {
      return {
        ...matches[0],
        intakeReference: requestedReference,
      }
    }
  }

  return matches[0]
}

export function resolveAuthorPortalActivationCode({
  code,
  requestedReference,
  purpose,
}: {
  code: string
  requestedReference?: string
  purpose?: 'initial_activation' | 'recovery'
}): AuthorPortalActivationResolution | null {
  const grant = resolveAuthorPortalAccessGrant({ code, requestedReference })
  if (!grant) return null
  if (!grant.contactId) return null
  if (grant.consumedAt || grant.revokedAt) return null

  const grantPurpose = normalizeActivationPurpose(grant.purpose)
  const requestedPurpose = normalizeActivationPurpose(purpose)
  if (requestedPurpose && grantPurpose !== requestedPurpose) return null

  return {
    grant,
    purpose: grantPurpose,
    contactId: grant.contactId,
    codeStatus: 'valid',
  }
}

export function activationCodeRequiresMicrosoftIdentity(grant: AuthorPortalAccessGrant) {
  return Boolean(grant.contactId) && !grant.externalUserIdentifier
}

export function createAuthorPortalActivationTransaction(resolution: AuthorPortalActivationResolution) {
  const issuedAt = new Date()
  const payload: AuthorPortalActivationTransaction = {
    v: SESSION_VERSION,
    contactId: resolution.contactId,
    purpose: resolution.purpose,
    intakeReference: resolution.grant.intakeReference,
    title: resolution.grant.title,
    titleSlug: resolution.grant.titleSlug,
    opportunityId: resolution.grant.opportunityId,
    scope: 'relationship',
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + ACTIVATION_TRANSACTION_MAX_AGE_SECONDS * 1000).toISOString(),
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = signPortalPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function createAuthorPortalSession(grant: AuthorPortalAccessGrant) {
  const payload: AuthorPortalSession = {
    v: SESSION_VERSION,
    intakeReference: grant.intakeReference,
    title: grant.title,
    titleSlug: grant.titleSlug,
    contactId: grant.contactId,
    contactEmail: grant.contactEmail,
    externalUserIdentifier: normalizeExternalUserIdentifier(grant.externalUserIdentifier),
    opportunityId: grant.opportunityId,
    scope: grant.scope || 'project',
    issuedAt: new Date().toISOString(),
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = signPortalPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function readAuthorPortalSession(value: string | undefined) {
  if (!value) return null

  const [encodedPayload, signature] = value.split('.')
  if (!encodedPayload || !signature) return null

  let expected: string
  try {
    expected = signPortalPayload(encodedPayload)
  } catch (error) {
    if (error instanceof AuthorPortalSessionConfigurationError) {
      return null
    }
    throw error
  }
  if (!constantTimeEqual(signature, expected)) return null

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AuthorPortalSession
    if (parsed?.v !== SESSION_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function readAuthorPortalActivationTransaction(value: string | undefined) {
  if (!value) return null

  const [encodedPayload, signature] = value.split('.')
  if (!encodedPayload || !signature) return null

  let expected: string
  try {
    expected = signPortalPayload(encodedPayload)
  } catch (error) {
    if (error instanceof AuthorPortalSessionConfigurationError) {
      return null
    }
    throw error
  }
  if (!constantTimeEqual(signature, expected)) return null

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AuthorPortalActivationTransaction
    if (parsed?.v !== SESSION_VERSION) return null
    if (!parsed.contactId || parsed.scope !== 'relationship') return null
    if (parsed.purpose !== 'initial_activation' && parsed.purpose !== 'recovery') return null
    if (isExpired(parsed.expiresAt)) return null
    return parsed
  } catch {
    return null
  }
}

export function buildPortalTaskState({
  relationshipProfileComplete,
  relationshipStripeComplete,
  relationshipTaxComplete,
  relationshipPayoutComplete,
  contractSatisfied,
  currentProjectState,
}: {
  relationshipProfileComplete: boolean
  relationshipStripeComplete: boolean
  relationshipTaxComplete: boolean
  relationshipPayoutComplete: boolean
  contractSatisfied: boolean
  currentProjectState:
    | 'pre_contract_setup'
    | 'awaiting_governed_action'
    | 'editorial_review'
    | 'developmental_editing'
    | 'line_editing'
    | 'copyediting'
    | 'proofreading'
    | 'editorial_in_progress'
    | 'production_in_progress'
    | 'distribution_release_pending'
    | 'published_legacy'
    | 'archived'
}) {
  const relationshipReadyForSetupSuppression =
    relationshipProfileComplete &&
    (relationshipStripeComplete || relationshipTaxComplete || relationshipPayoutComplete || contractSatisfied)

  const authorProfileRequired =
    currentProjectState === 'pre_contract_setup' && !relationshipProfileComplete

  const paymentRoyaltyRequired =
    currentProjectState === 'pre_contract_setup' &&
    !relationshipReadyForSetupSuppression &&
    (!relationshipStripeComplete || !relationshipTaxComplete || !relationshipPayoutComplete)

  return {
    authorProfileRequired,
    paymentRoyaltyRequired,
  }
}

function normalizeGrant(entry: unknown): AuthorPortalAccessGrant | null {
  if (!entry || typeof entry !== 'object') return null

  const record = entry as Record<string, unknown>
  const code = optionalString(record.code) || optionalString(record.accessCode) || ''
  const accessCodeHash = optionalString(record.accessCodeHash)
  if (!code && !accessCodeHash) return null

  const scope =
    record.scope === 'relationship' || record.scope === 'project'
      ? record.scope
      : optionalString(record.contactId) && readStringArray(record.projectIds).length > 1
        ? 'relationship'
        : 'project'

  const projectIds = readStringArray(record.projectIds)
  const intakeReference =
    optionalString(record.intakeReference) ||
    optionalString(record.projectId) ||
    projectIds[0]

  return {
    code,
    accessCodeHash,
    accessCodeVersion:
      record.accessCodeVersion === ACTIVATION_CODE_V1 || record.accessCodeVersion === ACTIVATION_CODE_V2
        ? record.accessCodeVersion
        : undefined,
    status: optionalString(record.status),
    purpose: normalizeActivationPurpose(optionalString(record.purpose) || optionalString(record.codePurpose)),
    intakeReference,
    projectIds,
    title: optionalString(record.title) || optionalString(record.titleName),
    titleSlug: optionalString(record.titleSlug),
    contactId: optionalString(record.contactId),
    contactEmail: optionalString(record.contactEmail),
    opportunityId: optionalString(record.opportunityId),
    expiresAt: optionalIsoDate(record.expiresAt) || optionalIsoDate(record.expiresOn),
    consumedAt: optionalIsoDate(record.consumedAt) || optionalIsoDate(record.usedAt),
    revokedAt: optionalIsoDate(record.revokedAt),
    externalUserIdentifier: normalizeExternalUserIdentifier(
      optionalString(record.externalUserIdentifier) || optionalString(record.externalIdObjectId),
    ),
    scope,
  }
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function optionalIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const normalized = value.trim()
  return Number.isNaN(Date.parse(normalized)) ? undefined : normalized
}

function normalizeText(value?: string) {
  return value?.trim().toLowerCase() || ''
}

function normalizeExternalUserIdentifier(value?: string) {
  return value?.trim().toLowerCase() || undefined
}

function normalizeActivationPurpose(value?: string) {
  const normalized = normalizeText(value).replace(/-/g, '_')
  if (normalized === 'recovery' || normalized === 'access_recovery') return 'recovery'
  return 'initial_activation'
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((entry) => optionalString(entry)).filter((entry): entry is string => Boolean(entry))
}

function isExpired(value?: string) {
  if (!value) return false
  const expiresAt = Date.parse(value)
  if (Number.isNaN(expiresAt)) return false
  return expiresAt <= Date.now()
}

function isGrantActive(grant: AuthorPortalAccessGrant) {
  const status = normalizeText(grant.status)
  return !status || status === 'active' || status === 'enabled' || status === 'issued'
}

function signPortalPayload(payload: string) {
  return createHmac('sha256', getPortalSessionSecret()).update(payload).digest('base64url')
}

function grantMatchesCode(grant: AuthorPortalAccessGrant, code: string) {
  const candidateForms = buildActivationCodeForms(code)
  if (candidateForms.length === 0) return false

  if (
    grant.code &&
    buildActivationCodeForms(grant.code).some((storedForm) =>
      candidateForms.some((candidateForm) => constantTimeEqual(candidateForm, storedForm)),
    )
  ) {
    return true
  }

  if (grant.accessCodeHash) {
    const allowedForms = resolveGrantHashForms(grant, candidateForms)
    return allowedForms.some((candidateForm) => constantTimeEqual(hashPortalCode(candidateForm), grant.accessCodeHash!))
  }

  return false
}

function hashPortalCode(code: string) {
  return createHash('sha256')
    .update(`${getAccessCodePepper()}${code}`)
    .digest('hex')
}

function isMasterPortalAccessCode(code: string) {
  const candidateForms = buildActivationCodeForms(code)
  if (candidateForms.length === 0) return false
  if (process.env.NODE_ENV === 'production') return false

  return [
    getMasterAccessCode(),
    getOnboardingAccessCode(),
    process.env.NODE_ENV === 'development' ? LOCAL_TEST_PORTAL_CODE : '',
  ]
    .flatMap((storedCode) => buildActivationCodeForms(storedCode))
    .some((storedForm) => candidateForms.some((candidateForm) => constantTimeEqual(candidateForm, storedForm)))
}

function buildMasterPortalFallbackGrant(requestedReference?: string): AuthorPortalAccessGrant {
  return {
    code: getMasterAccessCode() || getOnboardingAccessCode() || '',
    intakeReference:
      requestedReference ||
      process.env.AUTHOR_PORTAL_DEFAULT_REFERENCE?.trim() ||
      process.env.PROGRAM003_COMMISSIONING_REFERENCE?.trim() ||
      DEFAULT_REFERENCE,
    title:
      process.env.AUTHOR_PORTAL_DEFAULT_TITLE?.trim() ||
      process.env.PROGRAM003_COMMISSIONING_TITLE?.trim() ||
      DEFAULT_TITLE,
    titleSlug:
      process.env.AUTHOR_PORTAL_DEFAULT_TITLE_SLUG?.trim() ||
      process.env.PROGRAM003_COMMISSIONING_SLUG?.trim(),
    scope: 'project',
  }
}

function getPortalSessionSecret() {
  const secret = getSessionSecret()
  if (secret) {
    assertStrongPortalSessionSecret(secret)
    return secret
  }

  if (process.env.NODE_ENV === 'development' && !warnedMissingDevelopmentSecret) {
    warnedMissingDevelopmentSecret = true
    console.warn('AUTHOR_PORTAL_SESSION_SECRET is required for author portal session signing.')
  }

  throw new AuthorPortalSessionConfigurationError()
}

function assertStrongPortalSessionSecret(secret: string) {
  const normalized = secret.trim()
  const normalizedLower = normalized.toLowerCase()
  if (
    !normalized ||
    normalized === FORMER_PORTAL_SESSION_FALLBACK ||
    PLACEHOLDER_PORTAL_SESSION_SECRETS.has(normalizedLower) ||
    Buffer.byteLength(normalized, 'utf8') < MIN_PORTAL_SESSION_SECRET_BYTES ||
    countUniqueCharacters(normalized) < 12
  ) {
    throw new AuthorPortalSessionConfigurationError()
  }
}

function countUniqueCharacters(value: string) {
  return new Set(value).size
}

function getAuthorPortalAccessRegistryJson() {
  return (
    process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON ||
    GENERATED_AUTHOR_PORTAL_ACCESS.accessRegistryJson ||
    process.env.AUTHOR_PORTAL_ACCESS_RECORDS_JSON ||
    GENERATED_AUTHOR_PORTAL_ACCESS.accessRecordsJson
  )
}

function resolveAuthorPortalAccessRegistrySource() {
  if (process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON) return 'env_registry'
  if (GENERATED_AUTHOR_PORTAL_ACCESS.accessRegistryJson) return 'generated_registry'
  if (process.env.AUTHOR_PORTAL_ACCESS_RECORDS_JSON) return 'env_records'
  if (GENERATED_AUTHOR_PORTAL_ACCESS.accessRecordsJson) return 'generated_records'
  return 'none'
}

function getOnboardingAccessCode() {
  return process.env.AUTHOR_ONBOARDING_ACCESS_CODE?.trim() || GENERATED_AUTHOR_PORTAL_ACCESS.onboardingAccessCode || ''
}

function getMasterAccessCode() {
  return process.env.AUTHOR_PORTAL_MASTER_ACCESS_CODE?.trim() || GENERATED_AUTHOR_PORTAL_ACCESS.masterAccessCode || ''
}

function getAccessCodePepper() {
  return process.env.AUTHOR_PORTAL_ACCESS_CODE_PEPPER?.trim() || GENERATED_AUTHOR_PORTAL_ACCESS.accessCodePepper || ''
}

function getSessionSecret() {
  return process.env.AUTHOR_PORTAL_SESSION_SECRET?.trim() || GENERATED_AUTHOR_PORTAL_ACCESS.sessionSecret || ''
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function buildActivationCodeForms(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return []

  if (!/^[A-Za-z0-9\s-]+$/.test(trimmed)) return []

  const canonical = trimmed
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '')
  if (!canonical) return []

  return Array.from(new Set([formatLegacyActivationCode(canonical), canonical]))
}

function formatLegacyActivationCode(canonical: string) {
  const prefixed = canonical.match(/^([A-Z]{3})([A-Z0-9]{4,})$/)
  if (prefixed) {
    const [, prefix, remainder] = prefixed
    const tail = remainder.match(/.{1,4}/g)?.join('-') || remainder
    return `${prefix}-${tail}`
  }

  return canonical.match(/.{1,4}/g)?.join('-') || canonical
}

function resolveGrantHashForms(grant: AuthorPortalAccessGrant, candidateForms: string[]) {
  const preferredVersion = grant.accessCodeVersion
  if (preferredVersion === ACTIVATION_CODE_V2) {
    return candidateForms.filter((form) => !form.includes('-'))
  }

  if (preferredVersion === ACTIVATION_CODE_V1) {
    return candidateForms.filter((form) => form.includes('-'))
  }

  return candidateForms
}
