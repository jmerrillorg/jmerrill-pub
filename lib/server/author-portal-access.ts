import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { GENERATED_AUTHOR_PORTAL_ACCESS } from './author-portal-access.generated'

export type AuthorPortalAccessGrant = {
  code: string
  accessCodeHash?: string
  status?: string
  intakeReference?: string
  projectIds?: string[]
  title?: string
  titleSlug?: string
  contactId?: string
  contactEmail?: string
  opportunityId?: string
  expiresAt?: string
  scope?: 'project' | 'relationship'
}

export type AuthorPortalSession = {
  v: 1
  intakeReference?: string
  title?: string
  titleSlug?: string
  contactId?: string
  contactEmail?: string
  opportunityId?: string
  scope: 'project' | 'relationship'
  issuedAt: string
}

const SESSION_VERSION = 1
const DEFAULT_REFERENCE = 'JMP-INT-202607-0W5PTQ'
const DEFAULT_TITLE = 'The Intentional Leader'
const COOKIE_NAME = 'jm1_author_portal_session'
const LOCAL_TEST_PORTAL_CODE = 'JMP-PORTAL-ADMIN-2026'

export function getAuthorPortalCookieName() {
  return COOKIE_NAME
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

export function createAuthorPortalSession(grant: AuthorPortalAccessGrant) {
  const payload: AuthorPortalSession = {
    v: SESSION_VERSION,
    intakeReference: grant.intakeReference,
    title: grant.title,
    titleSlug: grant.titleSlug,
    contactId: grant.contactId,
    contactEmail: grant.contactEmail,
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

  const expected = signPortalPayload(encodedPayload)
  if (!constantTimeEqual(signature, expected)) return null

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AuthorPortalSession
    if (parsed?.v !== SESSION_VERSION) return null
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
    status: optionalString(record.status),
    intakeReference,
    projectIds,
    title: optionalString(record.title) || optionalString(record.titleName),
    titleSlug: optionalString(record.titleSlug),
    contactId: optionalString(record.contactId),
    contactEmail: optionalString(record.contactEmail),
    opportunityId: optionalString(record.opportunityId),
    expiresAt: optionalIsoDate(record.expiresAt) || optionalIsoDate(record.expiresOn),
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
  return !status || status === 'active' || status === 'enabled'
}

function signPortalPayload(payload: string) {
  return createHmac('sha256', getPortalSessionSecret()).update(payload).digest('base64url')
}

function grantMatchesCode(grant: AuthorPortalAccessGrant, code: string) {
  const trimmedCode = code.trim()
  if (!trimmedCode) return false

  if (grant.code && constantTimeEqual(trimmedCode, grant.code)) {
    return true
  }

  if (grant.accessCodeHash) {
    return constantTimeEqual(hashPortalCode(trimmedCode), grant.accessCodeHash)
  }

  return false
}

function hashPortalCode(code: string) {
  return createHash('sha256')
    .update(`${getAccessCodePepper()}${code}`)
    .digest('hex')
}

function isMasterPortalAccessCode(code: string) {
  const trimmedCode = code.trim()
  if (!trimmedCode) return false

  return (
    constantTimeEqual(trimmedCode, getMasterAccessCode()) ||
    constantTimeEqual(trimmedCode, getOnboardingAccessCode()) ||
    (process.env.NODE_ENV === 'development' && constantTimeEqual(trimmedCode, LOCAL_TEST_PORTAL_CODE))
  )
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
  return (
    getSessionSecret() ||
    getAccessCodePepper() ||
    getOnboardingAccessCode() ||
    getMasterAccessCode() ||
    'jm1-author-portal-session'
  )
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
