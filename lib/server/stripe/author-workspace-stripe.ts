import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  dataverseFirst,
  dataverseList,
  dataverseLookupId,
  dataversePatch,
  getDataverseServerConfig,
  stringValue,
  type DataverseServerConfig,
} from '../dataverse-server'

const STRIPE_API_BASE = 'https://api.stripe.com'

export const COMMISSIONING_REFERENCE = 'JMP-INT-202607-0W5PTQ'
export const COMMISSIONING_TITLE = 'The Intentional Leader'
export const COMMISSIONING_PACKAGE_CODE = 'JMP-PKG-PREMIER'
export const COMMISSIONING_PACKAGE_NAME = 'Premier Publishing Package'
export const COMMISSIONING_STANDARD_AMOUNT_CENTS = 750000
export const COMMISSIONING_AMOUNT_CENTS = 100

export type AuthorConnectIdentityInput = {
  contactId?: string
  authorRelationshipId?: string
  royaltyPayeeId?: string
  authorEmail?: string
  migrationBatch?: string
}

export type AuthorConnectIdentity = {
  contactId: string
  authorRelationshipId: string
  royaltyPayeeId: string
  authorName: string
  payeeName: string
  authorEmail: string
  existingStripeAccountId: string
  migrationBatch: string
}

export type StripeAccountObject = {
  id?: string
  object?: string
  email?: string
  livemode?: boolean
  business_profile?: {
    name?: string | null
  }
  details_submitted?: boolean
  payouts_enabled?: boolean
  charges_enabled?: boolean
  requirements?: {
    currently_due?: string[]
    eventually_due?: string[]
    past_due?: string[]
    disabled_reason?: string | null
  }
  metadata?: Record<string, string>
}

export type StripeResponse = StripeAccountObject & {
  url?: string
  expires_at?: string
  data?: StripeAccountObject[]
  has_more?: boolean
  payment_status?: string
}

export type ConnectEnrollmentContext = {
  v: 1
  purpose: 'stripe_connect_direct_deposit_setup'
  contactId: string
  authorRelationshipId: string
  royaltyPayeeId: string
  stripeAccountId: string
  issuedAt: number
  expiresAt: number
}

export type ConnectHumanStatus =
  | 'NOT_STARTED'
  | 'SETUP_IN_PROGRESS'
  | 'MORE_INFORMATION_NEEDED'
  | 'UNDER_REVIEW'
  | 'SETUP_COMPLETE'
  | 'SUPPORT_REQUIRED'

export type ConnectedAccountMatchEvidence =
  | 'stored_dataverse_account_id'
  | 'metadata_contact_id'
  | 'metadata_author_relationship_id'
  | 'metadata_royalty_payee_id'
  | 'exact_email'

export type ConnectedAccountCandidate = {
  account: StripeAccountObject
  evidence: ConnectedAccountMatchEvidence[]
}

export const PUB_STRIPE_CONNECT_AUTHOR_IDENTITY_V1 = Object.freeze({
  name: 'PUB_STRIPE_CONNECT_AUTHOR_IDENTITY_V1',
  invariant: 'one_royalty_payee_one_canonical_stripe_connect_account',
  matchingPrecedence: [
    'stored_dataverse_account_id',
    'metadata_contact_id',
    'metadata_author_relationship_id',
    'metadata_royalty_payee_id',
    'governed_reconciliation_required_for_exact_email',
  ],
  allowedOperations: [
    'reuse_canonical_connect_account',
    'refresh_account_link',
    'update_readiness_status',
    'reconcile_historical_duplicate',
  ],
  prohibitedOperations: [
    'second_account_when_canonical_exists',
    'create_while_duplicate_review_pending',
    'shared_onboarding_link',
    'cross_author_link',
    'title_as_payee_without_authority',
  ],
} as const)

const PROHIBITED_ENROLLMENT_CAPABILITY_KEYS = [
  'capabilities[card_payments][requested]',
  'capabilities[transfers][requested]',
] as const

const MONEY_MOVEMENT_STRIPE_PATHS = [
  '/v1/charges',
  '/v1/payment_intents',
  '/v1/payouts',
  '/v1/refunds',
  '/v1/transfers',
] as const

export function isStripeConnectGateOpen() {
  return String(process.env.JM1_STRIPE_CONNECT_ENABLED || '').toLowerCase() === 'true'
}

export function isStripeCommissioningPaymentGateOpen() {
  return String(process.env.JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED || '').toLowerCase() === 'true'
}

export function getStripeMode() {
  return String(process.env.JM1_STRIPE_MODE || 'live').toLowerCase() === 'test' ? 'test' : 'live'
}

export function assertCommissioningReference(reference: string) {
  if (reference !== COMMISSIONING_REFERENCE) {
    throw new Error('commissioning_reference_not_authorized')
  }
}

export async function resolveGovernedAuthorConnectIdentity(
  input: AuthorConnectIdentityInput,
  config: DataverseServerConfig | null = getDataverseServerConfig(),
): Promise<AuthorConnectIdentity> {
  if (!config) throw new Error('dataverse_config_missing')
  const contactId = cleanGuid(input.contactId)
  if (!contactId) throw new Error('author_identity_contact_required')

  const contact = await dataverseFirst(config, 'contacts', {
    $select:
      'contactid,firstname,lastname,fullname,emailaddress1,emailaddress2,jm1pub_isauthor,jm1pub_stripeconnectedaccountid,jm1pub_stripeonboardingstatus,jm1pub_stripepilotcohort,jm1pub_stripedetailssubmitted,jm1pub_stripepayoutsenabled,jm1pub_stripechargesenabled,statecode,statuscode',
    $filter: `contactid eq ${contactId} and statecode eq 0`,
  })
  if (!contact) throw new Error('author_identity_contact_not_found')

  const profiles = await dataverseList(config, 'jm1_authorprofiles', {
    $select: 'jm1_authorprofileid,jm1_name,jm1_penname,_jm1_contact_value,jm1_isactiveauthor,statecode,statuscode',
    $filter: `_jm1_contact_value eq ${contactId} and statecode eq 0`,
  })
  if (profiles.length !== 1) throw new Error(profiles.length === 0 ? 'author_relationship_missing' : 'author_relationship_ambiguous')

  const profile = profiles[0]
  const authorRelationshipId = stringValue(profile.jm1_authorprofileid)
  const royaltyPayeeId = authorRelationshipId
  if (input.authorRelationshipId && cleanGuid(input.authorRelationshipId) !== authorRelationshipId) {
    throw new Error('author_relationship_mismatch')
  }
  if (input.royaltyPayeeId && cleanGuid(input.royaltyPayeeId) !== royaltyPayeeId) {
    throw new Error('royalty_payee_mismatch')
  }

  const contactEmail = normalizeEmail(stringValue(contact.emailaddress1) || stringValue(contact.emailaddress2))
  const requestedEmail = normalizeEmail(input.authorEmail)
  if (requestedEmail && contactEmail && requestedEmail !== contactEmail) {
    throw new Error('author_email_mismatch')
  }
  if (!contactEmail && !requestedEmail) throw new Error('author_email_missing')

  const authorName =
    stringValue(contact.fullname) ||
    [stringValue(contact.firstname), stringValue(contact.lastname)].filter(Boolean).join(' ') ||
    stringValue(profile.jm1_penname) ||
    stringValue(profile.jm1_name)
  const payeeName = stringValue(profile.jm1_penname) || stringValue(profile.jm1_name) || authorName
  if (!authorName || !payeeName) throw new Error('author_payee_name_missing')

  return {
    contactId,
    authorRelationshipId,
    royaltyPayeeId,
    authorName,
    payeeName,
    authorEmail: contactEmail || requestedEmail,
    existingStripeAccountId: stringValue(contact.jm1pub_stripeconnectedaccountid),
    migrationBatch: stringValue(contact.jm1pub_stripepilotcohort) || clean(input.migrationBatch) || 'AUTHOR_ROYALTY_CONNECT_MIGRATION',
  }
}

export function buildRecipientAccountParams(identity: AuthorConnectIdentity) {
  assertAuthorConnectIdentity(identity)
  const params = new URLSearchParams({
    type: 'standard',
    email: identity.authorEmail,
    'metadata[jm1_division]': 'publishing',
    'metadata[jm1_contact_id]': identity.contactId,
    'metadata[jm1_author_relationship_id]': identity.authorRelationshipId,
    'metadata[jm1_royalty_payee_id]': identity.royaltyPayeeId,
    'metadata[jm1_migration_batch]': identity.migrationBatch,
    'metadata[jm1_source]': 'Author Payout Enrollment',
    'metadata[jm1_payment_authorized]': 'false',
  })

  assertEnrollmentAccountParams(params)
  return params
}

export function assertAuthorConnectIdentity(identity: AuthorConnectIdentity) {
  if (!cleanGuid(identity.contactId)) throw new Error('author_identity_contact_required')
  if (!cleanGuid(identity.authorRelationshipId)) throw new Error('author_relationship_required')
  if (!cleanGuid(identity.royaltyPayeeId)) throw new Error('royalty_payee_required')
  if (!normalizeEmail(identity.authorEmail)) throw new Error('author_email_required')
  if (!clean(identity.payeeName)) throw new Error('payee_name_required')
}

export function assertEnrollmentAccountParams(params: URLSearchParams) {
  const prohibited = PROHIBITED_ENROLLMENT_CAPABILITY_KEYS.filter((key) => params.has(key))
  if (prohibited.length > 0) {
    throw new Error(`stripe_enrollment_prohibited_capability:${prohibited.join(',')}`)
  }
  const titleMetadata = ['metadata[jm1_reference]', 'metadata[jm1_title]'].filter((key) => params.has(key))
  if (titleMetadata.length > 0) {
    throw new Error(`stripe_enrollment_title_metadata_blocked:${titleMetadata.join(',')}`)
  }
}

export async function resolveRecipientAccountId(identity: AuthorConnectIdentity) {
  assertAuthorConnectIdentity(identity)
  if (identity.existingStripeAccountId) {
    const account = await retrieveConnectedAccount(identity.existingStripeAccountId)
    assertConnectedAccountMatchesIdentity(account, identity)
    return { accountId: identity.existingStripeAccountId, reused: true, source: 'dataverse_existing' as const }
  }

  const candidates = await findConnectedAccountCandidates(identity)
  const authoritativeCandidates = candidates.filter((candidate) => hasAuthoritativeConnectedAccountEvidence(candidate))
  if (authoritativeCandidates.length > 1) {
    throw new Error('CONNECT_DUPLICATE_REVIEW')
  }
  const existing = authoritativeCandidates[0]
  if (existing?.account.id) {
    assertConnectedAccountMatchesIdentity(existing.account, identity)
    return { accountId: existing.account.id, reused: true, source: 'stripe_identity_search' as const }
  }
  if (candidates.length > 0) {
    throw new Error('CONNECT_RECONCILIATION_REQUIRED')
  }

  const account = await createRecipientAccount(identity)
  if (!account.id) throw new Error('stripe_account_missing_id')
  assertConnectedAccountMatchesIdentity(account, identity)
  return { accountId: account.id, reused: false, source: 'created' as const }
}

export async function createRecipientAccount(identity: AuthorConnectIdentity) {
  return stripeForm('/v1/accounts', buildRecipientAccountParams(identity), {
    idempotencyKey: `jm1-author-payout-enrollment-account-${identity.royaltyPayeeId}-v1`,
    keyType: 'connect',
  })
}

export async function retrieveConnectedAccount(accountId: string) {
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) throw new Error('stripe_account_id_invalid')
  return stripeJson(`/v1/accounts/${encodeURIComponent(accountId)}`, { keyType: 'connect' })
}

export async function searchConnectedAccountByIdentity(identity: AuthorConnectIdentity) {
  const candidates = await findConnectedAccountCandidates(identity)
  const authoritativeCandidates = candidates.filter((candidate) => hasAuthoritativeConnectedAccountEvidence(candidate))
  if (authoritativeCandidates.length > 1) throw new Error('CONNECT_DUPLICATE_REVIEW')
  if (authoritativeCandidates[0]?.account) return authoritativeCandidates[0].account
  if (candidates.length > 0) throw new Error('CONNECT_RECONCILIATION_REQUIRED')
  return null
}

export async function findConnectedAccountCandidates(
  identity: AuthorConnectIdentity,
  providedAccounts?: StripeAccountObject[],
) {
  assertAuthorConnectIdentity(identity)
  const accounts = providedAccounts || await listConnectedAccountsForReconciliation()
  return accounts
    .map((account) => ({
      account,
      evidence: getConnectedAccountMatchEvidence(account, identity),
    }))
    .filter((candidate) => candidate.account.id && candidate.evidence.length > 0)
}

export async function listConnectedAccountsForReconciliation(maxPages = 20) {
  const accounts: StripeAccountObject[] = []
  let startingAfter = ''

  for (let page = 0; page < maxPages; page += 1) {
    const query = new URLSearchParams({ limit: '100' })
    if (startingAfter) query.set('starting_after', startingAfter)
    const result = await stripeJson(`/v1/accounts?${query.toString()}`, { keyType: 'connect' })
    const data = Array.isArray(result.data) ? result.data : []
    accounts.push(...data)
    if (!result.has_more) break
    const lastAccountId = data[data.length - 1]?.id
    if (!lastAccountId) break
    startingAfter = lastAccountId
  }

  return accounts
}

export function getConnectedAccountMatchEvidence(account: StripeAccountObject, identity: AuthorConnectIdentity) {
  const metadata = account.metadata || {}
  const evidence: ConnectedAccountMatchEvidence[] = []
  if (identity.existingStripeAccountId && account.id === identity.existingStripeAccountId) {
    evidence.push('stored_dataverse_account_id')
  }
  if (metadata.jm1_contact_id === identity.contactId) evidence.push('metadata_contact_id')
  if (metadata.jm1_author_relationship_id === identity.authorRelationshipId) evidence.push('metadata_author_relationship_id')
  if (metadata.jm1_royalty_payee_id === identity.royaltyPayeeId) evidence.push('metadata_royalty_payee_id')
  if (normalizeEmail(account.email) && normalizeEmail(account.email) === normalizeEmail(identity.authorEmail)) {
    evidence.push('exact_email')
  }
  return evidence
}

export function classifyConnectedAccountForAuthorEstate(account: StripeAccountObject, identities: AuthorConnectIdentity[] = []) {
  if (isTitleNamedPayeeAccount(account)) return 'NONCANONICAL_RETIREMENT_CANDIDATE'
  const candidates = identities
    .map((identity) => ({ identity, evidence: getConnectedAccountMatchEvidence(account, identity) }))
    .filter((candidate) => candidate.evidence.length > 0)
  if (candidates.length === 0) return account.livemode === false ? 'TEST' : 'CONNECT_ACCOUNT_WITHOUT_DATAVERSE_LINK'
  if (candidates.length > 1) return 'CONNECT_DUPLICATE_REVIEW'
  assertConnectedAccountMatchesIdentity(account, candidates[0].identity)
  const readiness = mapConnectAccountReadiness(account).readiness
  if (readiness === 'READY_FOR_ROYALTIES') return 'CONNECT_CANONICAL_READY'
  if (account.details_submitted) return 'CONNECT_ACTION_REQUIRED'
  return 'CONNECT_EXISTS_ONBOARDING_INCOMPLETE'
}

export function hasAuthoritativeConnectedAccountEvidence(candidate: ConnectedAccountCandidate) {
  return candidate.evidence.some((item) => item === 'stored_dataverse_account_id' || item.startsWith('metadata_'))
}

export function detectStripeConnectDrift(identities: AuthorConnectIdentity[], accounts: StripeAccountObject[]) {
  const findings: string[] = []
  const accountIds = new Set(accounts.map((account) => account.id).filter(Boolean))
  const accountById = new Map(accounts.filter((account) => account.id).map((account) => [account.id, account]))

  for (const identity of identities) {
    const candidates = accounts
      .map((account) => ({ account, evidence: getConnectedAccountMatchEvidence(account, identity) }))
      .filter((candidate) => candidate.evidence.length > 0)
    if (!identity.existingStripeAccountId && candidates.length === 0) findings.push('AUTHOR_WITHOUT_CONNECT_STATE')
    if (candidates.length > 1) findings.push('MULTIPLE_CONNECT_ACCOUNTS_FOR_PAYEE')
    if (identity.existingStripeAccountId && !accountIds.has(identity.existingStripeAccountId)) {
      findings.push('DATAVERSE_CONNECT_ID_NOT_FOUND_IN_STRIPE')
    }
    const stored = identity.existingStripeAccountId ? accountById.get(identity.existingStripeAccountId) : null
    if (stored) {
      try {
        assertConnectedAccountMatchesIdentity(stored, identity)
      } catch {
        findings.push('CONNECTED_ACCOUNT_IDENTITY_MISMATCH')
      }
      if (mapConnectAccountReadiness(stored).readiness === 'READY_FOR_ROYALTIES' && !stored.details_submitted) {
        findings.push('PAYOUT_READY_BUT_DATAVERSE_STALE')
      }
    }
  }

  if (accounts.some(isTitleNamedPayeeAccount)) findings.push('TITLE_NAME_USED_AS_PAYEE_ACCOUNT')
  if (accounts.some((account) => !hasDataverseIdentityMetadata(account))) findings.push('CONNECT_ACCOUNT_WITHOUT_DATAVERSE_LINK')
  return [...new Set(findings)].sort()
}

export function isTitleNamedPayeeAccount(account: StripeAccountObject) {
  const names = [
    account.business_profile?.name,
    account.metadata?.jm1_title,
    account.metadata?.jm1_reference,
    account.metadata?.jm1_payee_name,
  ].map((value) => normalizeComparable(value))
  return names.some((value) => value === normalizeComparable(COMMISSIONING_TITLE))
}

function hasDataverseIdentityMetadata(account: StripeAccountObject) {
  const metadata = account.metadata || {}
  return Boolean(metadata.jm1_contact_id || metadata.jm1_author_relationship_id || metadata.jm1_royalty_payee_id)
}

export async function createRecipientAccountLink(accountId: string, identity: AuthorConnectIdentity) {
  assertAuthorConnectIdentity(identity)
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) throw new Error('stripe_account_id_invalid')
  const token = createConnectEnrollmentToken(identity, accountId)
  const baseUrl = getPublicSiteUrl()
  const encodedToken = encodeURIComponent(token)
  return stripeForm('/v1/account_links', new URLSearchParams({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${baseUrl}/api/author/stripe/connect/refresh?token=${encodedToken}`,
    return_url: `${baseUrl}/author/financial-setup?connect=return&token=${encodedToken}`,
    'collection_options[fields]': 'eventually_due',
  }), {
    idempotencyKey: `jm1-connect-account-link-${identity.royaltyPayeeId}-${Date.now()}`,
    keyType: 'connect',
  })
}

export function createConnectEnrollmentToken(identity: AuthorConnectIdentity, accountId: string, now = Date.now()) {
  assertAuthorConnectIdentity(identity)
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) throw new Error('stripe_account_id_invalid')
  const context: ConnectEnrollmentContext = {
    v: 1,
    purpose: 'stripe_connect_direct_deposit_setup',
    contactId: identity.contactId,
    authorRelationshipId: identity.authorRelationshipId,
    royaltyPayeeId: identity.royaltyPayeeId,
    stripeAccountId: accountId,
    issuedAt: now,
    expiresAt: now + 1000 * 60 * 60 * 24 * 30,
  }
  const payload = base64url(JSON.stringify(context))
  return `${payload}.${signConnectEnrollmentPayload(payload)}`
}

export function verifyConnectEnrollmentToken(token: string, now = Date.now()): ConnectEnrollmentContext {
  const [payload, signature, extra] = String(token || '').split('.')
  if (!payload || !signature || extra) throw new Error('connect_enrollment_context_invalid')
  const expected = signConnectEnrollmentPayload(payload)
  if (!safeEqual(signature, expected)) throw new Error('connect_enrollment_context_invalid')

  let context: ConnectEnrollmentContext
  try {
    context = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    throw new Error('connect_enrollment_context_invalid')
  }

  if (context.v !== 1 || context.purpose !== 'stripe_connect_direct_deposit_setup') {
    throw new Error('connect_enrollment_context_invalid')
  }
  if (!cleanGuid(context.contactId) || !cleanGuid(context.authorRelationshipId) || !cleanGuid(context.royaltyPayeeId)) {
    throw new Error('connect_enrollment_context_invalid')
  }
  if (!/^acct_[A-Za-z0-9]+$/.test(context.stripeAccountId)) throw new Error('connect_enrollment_context_invalid')
  if (!Number.isFinite(context.expiresAt) || context.expiresAt < now) throw new Error('connect_enrollment_context_expired')
  return context
}

export async function readConnectEnrollmentStatusFromToken(
  token: string,
  config: DataverseServerConfig | null = getDataverseServerConfig(),
) {
  if (!config) throw new Error('dataverse_config_missing')
  const context = verifyConnectEnrollmentToken(token)
  const identity = await resolveGovernedAuthorConnectIdentity({
    contactId: context.contactId,
    authorRelationshipId: context.authorRelationshipId,
    royaltyPayeeId: context.royaltyPayeeId,
  }, config)
  if (identity.existingStripeAccountId && identity.existingStripeAccountId !== context.stripeAccountId) {
    throw new Error('connect_enrollment_account_mismatch')
  }
  const account = await retrieveConnectedAccount(context.stripeAccountId)
  assertConnectedAccountMatchesIdentity(account, identity)
  const readiness = await persistConnectAccountLinkage(config, identity, account)
  return {
    identity,
    account,
    readiness,
    humanStatus: mapConnectHumanStatus(account),
    context,
  }
}

export async function createFreshConnectAccountLinkFromToken(
  token: string,
  config: DataverseServerConfig | null = getDataverseServerConfig(),
) {
  const status = await readConnectEnrollmentStatusFromToken(token, config)
  const link = await createRecipientAccountLink(status.context.stripeAccountId, {
    ...status.identity,
    existingStripeAccountId: status.context.stripeAccountId,
  })
  if (!link.url) throw new Error('stripe_account_link_missing_url')
  return { ...status, link }
}

export function assertConnectedAccountMatchesIdentity(account: StripeAccountObject, identity: AuthorConnectIdentity) {
  if (!account?.id) throw new Error('stripe_account_missing_id')
  const metadata = account.metadata || {}
  const mismatches = [
    ['jm1_contact_id', identity.contactId],
    ['jm1_author_relationship_id', identity.authorRelationshipId],
    ['jm1_royalty_payee_id', identity.royaltyPayeeId],
  ].filter(([key, expected]) => metadata[key] && metadata[key] !== expected)
  if (mismatches.length) throw new Error(`stripe_connect_identity_mismatch:${mismatches.map(([key]) => key).join(',')}`)
  if (account.email && normalizeEmail(account.email) !== normalizeEmail(identity.authorEmail)) {
    throw new Error('stripe_connect_email_mismatch')
  }
}

export async function persistConnectAccountLinkage(
  config: DataverseServerConfig,
  identity: AuthorConnectIdentity,
  account: StripeAccountObject,
) {
  if (!account.id) throw new Error('stripe_account_missing_id')
  const status = mapConnectAccountReadiness(account)
  await dataversePatch(config, 'contacts', identity.contactId, {
    jm1pub_stripeconnectedaccountid: account.id,
    jm1pub_stripeonboardingstatus: status.onboardingStatus,
    jm1pub_stripedetailssubmitted: status.detailsSubmitted,
    jm1pub_stripepayoutsenabled: status.payoutsEnabled,
    jm1pub_stripechargesenabled: status.chargesEnabled,
    jm1pub_striperequirementsdue: status.requirementsDue,
    jm1pub_stripelastverifiedat: new Date().toISOString(),
    jm1pub_stripelastsyncresult: status.readiness,
    jm1pub_stripemode: getStripeMode(),
  })
  return status
}

export async function syncConnectAccountStatusByAccountId(
  accountId: string,
  account: StripeAccountObject,
  config: DataverseServerConfig | null = getDataverseServerConfig(),
) {
  if (!config) throw new Error('dataverse_config_missing')
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) throw new Error('stripe_account_id_invalid')
  const contacts = await dataverseList(config, 'contacts', {
    $select: 'contactid,fullname,emailaddress1,jm1pub_stripeconnectedaccountid,statecode,statuscode',
    $filter: `jm1pub_stripeconnectedaccountid eq '${accountId}' and statecode eq 0`,
  })
  if (contacts.length !== 1) throw new Error(contacts.length === 0 ? 'stripe_connect_contact_link_missing' : 'stripe_connect_contact_link_ambiguous')
  const contactId = dataverseLookupId(contacts[0], 'contactid')
  const identity: AuthorConnectIdentity = {
    contactId,
    authorRelationshipId: account.metadata?.jm1_author_relationship_id || contactId,
    royaltyPayeeId: account.metadata?.jm1_royalty_payee_id || contactId,
    authorName: stringValue(contacts[0].fullname) || contactId,
    payeeName: stringValue(contacts[0].fullname) || contactId,
    authorEmail: normalizeEmail(stringValue(contacts[0].emailaddress1)) || normalizeEmail(account.email),
    existingStripeAccountId: accountId,
    migrationBatch: account.metadata?.jm1_migration_batch || 'AUTHOR_ROYALTY_CONNECT_MIGRATION',
  }
  return persistConnectAccountLinkage(config, identity, { ...account, id: accountId })
}

export function mapConnectAccountReadiness(account: StripeAccountObject) {
  const requirements = [
    ...(account.requirements?.currently_due || []),
    ...(account.requirements?.past_due || []),
  ].filter(Boolean)
  const detailsSubmitted = Boolean(account.details_submitted)
  const payoutsEnabled = Boolean(account.payouts_enabled)
  const chargesEnabled = Boolean(account.charges_enabled)
  const readiness = detailsSubmitted && payoutsEnabled && requirements.length === 0
    ? 'READY_FOR_ROYALTIES'
    : detailsSubmitted
      ? 'ONBOARDING_SUBMITTED_REQUIREMENTS_PENDING'
      : 'ONBOARDING_STARTED_OR_PENDING'
  return {
    detailsSubmitted,
    payoutsEnabled,
    chargesEnabled,
    requirementsDue: requirements.join('; '),
    readiness,
    onboardingStatus: readiness,
  }
}

export function mapConnectHumanStatus(account: StripeAccountObject): ConnectHumanStatus {
  const current = account.requirements?.currently_due || []
  const pastDue = account.requirements?.past_due || []
  const disabledReason = account.requirements?.disabled_reason || ''
  const dueCount = current.length + pastDue.length
  if (account.details_submitted && account.payouts_enabled && dueCount === 0) return 'SETUP_COMPLETE'
  if (pastDue.length > 0 || disabledReason) return 'MORE_INFORMATION_NEEDED'
  if (account.details_submitted && dueCount > 0) return 'MORE_INFORMATION_NEEDED'
  if (account.details_submitted && dueCount === 0) return 'UNDER_REVIEW'
  if (dueCount > 0) return 'SETUP_IN_PROGRESS'
  return 'NOT_STARTED'
}

export function mapAuthorConnectEnrollmentState(account: StripeAccountObject | null, options: {
  duplicateReview?: boolean
  identityReview?: boolean
  invitationSent?: boolean
} = {}) {
  if (options.duplicateReview) return 'DUPLICATE_REVIEW'
  if (options.identityReview || !account?.id) return 'IDENTITY_REVIEW'
  const requirements = [
    ...(account.requirements?.currently_due || []),
    ...(account.requirements?.past_due || []),
  ].filter(Boolean)
  if (account.details_submitted && account.payouts_enabled && requirements.length === 0) return 'PAYOUT_READY'
  if (account.details_submitted && requirements.length === 0 && !account.payouts_enabled) return 'UNDER_REVIEW'
  if (requirements.length > 0) return 'ACTION_REQUIRED'
  if (options.invitationSent) return 'ONBOARDING_INVITED'
  return 'ONBOARDING_INCOMPLETE'
}

export async function createCommissioningCheckoutSession() {
  assertCommissioningPaymentGateOpen()

  return stripeForm('/v1/checkout/sessions', new URLSearchParams({
    mode: 'payment',
    client_reference_id: COMMISSIONING_REFERENCE,
    success_url: 'https://jmerrill.pub/author/portal?payment=success',
    cancel_url: 'https://jmerrill.pub/author/portal?payment=cancelled',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(COMMISSIONING_AMOUNT_CENTS),
    'line_items[0][price_data][product_data][name]': `${COMMISSIONING_PACKAGE_NAME} - commissioning payment`,
    'line_items[0][price_data][product_data][metadata][jm1_standard_amount_cents]': String(COMMISSIONING_STANDARD_AMOUNT_CENTS),
    'payment_intent_data[metadata][jm1_reference]': COMMISSIONING_REFERENCE,
    'payment_intent_data[metadata][jm1_title]': COMMISSIONING_TITLE,
    'payment_intent_data[metadata][jm1_package_code]': COMMISSIONING_PACKAGE_CODE,
    'payment_intent_data[metadata][jm1_commissioning_override]': 'true',
    'metadata[jm1_reference]': COMMISSIONING_REFERENCE,
    'metadata[jm1_title]': COMMISSIONING_TITLE,
    'metadata[jm1_package_code]': COMMISSIONING_PACKAGE_CODE,
    'metadata[jm1_standard_amount_cents]': String(COMMISSIONING_STANDARD_AMOUNT_CENTS),
    'metadata[jm1_commissioning_amount_cents]': String(COMMISSIONING_AMOUNT_CENTS),
    'metadata[jm1_commissioning_override]': 'true',
  }), {
    idempotencyKey: `jm1-commissioning-checkout-${COMMISSIONING_REFERENCE}`,
    keyType: 'checkout',
  })
}

export function assertCommissioningPaymentGateOpen() {
  if (!isStripeCommissioningPaymentGateOpen()) {
    throw new Error('commissioning_payment_gate_closed')
  }
}

async function stripeForm(path: string, body: URLSearchParams, options: { idempotencyKey?: string; keyType: StripeKeyType }) {
  if (options.keyType === 'connect') assertEnrollmentStripePath(path)

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: 'POST',
    headers: stripeHeaders({ contentType: 'application/x-www-form-urlencoded', ...options }),
    body,
  })

  return handleStripeResponse(response)
}

async function stripeJson(path: string, options: { keyType: StripeKeyType }) {
  if (options.keyType === 'connect') assertEnrollmentStripePath(path)
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: 'GET',
    headers: stripeHeaders({ contentType: 'application/json', ...options }),
  })
  return handleStripeResponse(response)
}

function assertEnrollmentStripePath(path: string) {
  if (MONEY_MOVEMENT_STRIPE_PATHS.some((blockedPath) => path === blockedPath || path.startsWith(`${blockedPath}/`))) {
    throw new Error(`stripe_enrollment_money_movement_path_blocked:${path}`)
  }
}

type StripeKeyType = 'connect' | 'checkout'

function getStripeSecret(keyType: StripeKeyType) {
  const primary = keyType === 'connect'
    ? process.env.STRIPE_CONNECT_SECRET_KEY
    : process.env.STRIPE_CHECKOUT_SECRET_KEY
  const fallback = process.env.STRIPE_SECRET_KEY || process.env.JM1_STRIPE_SECRET_KEY
  const secret = primary || fallback || ''
  if (!secret) throw new Error(`stripe_${keyType}_secret_missing`)
  return secret
}

function getConnectEnrollmentSecret() {
  const secret =
    process.env.AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET ||
    process.env.AUTHOR_PORTAL_ACCESS_CODE_PEPPER ||
    process.env.AUTHOR_PORTAL_MASTER_ACCESS_CODE ||
    ''
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('connect_enrollment_secret_missing')
  return secret || 'local-connect-enrollment-secret'
}

function signConnectEnrollmentPayload(payload: string) {
  return createHmac('sha256', getConnectEnrollmentSecret()).update(payload).digest('base64url')
}

function safeEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

function base64url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function getPublicSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.JM1_PUBLIC_SITE_URL || 'https://jmerrill.pub')
    .trim()
    .replace(/\/+$/, '')
}

function stripeHeaders(options: { contentType: string; apiVersion?: string; idempotencyKey?: string; keyType: StripeKeyType }) {
  const secret = getStripeSecret(options.keyType)

  return {
    Authorization: `Bearer ${secret}`,
    'Content-Type': options.contentType,
    ...(options.apiVersion ? { 'Stripe-Version': options.apiVersion } : {}),
    ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
  }
}

async function handleStripeResponse(response: Response): Promise<StripeResponse> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw Object.assign(new Error(body?.error?.code || `stripe_request_failed:${response.status}`), {
      status: response.status,
      code: body?.error?.code || null,
      type: body?.error?.type || null,
    })
  }
  return body
}

function cleanGuid(value?: string) {
  return clean(value).toLowerCase()
}

function clean(value?: string) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(value?: string) {
  return clean(value).toLowerCase()
}

function normalizeComparable(value?: string | null) {
  return clean(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
