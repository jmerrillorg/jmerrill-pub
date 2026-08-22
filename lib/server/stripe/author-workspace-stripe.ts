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
    country: 'US',
    email: identity.authorEmail,
    business_type: 'individual',
    'business_profile[name]': identity.payeeName,
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

  const existing = await searchConnectedAccountByIdentity(identity)
  if (existing?.id) {
    assertConnectedAccountMatchesIdentity(existing, identity)
    return { accountId: existing.id, reused: true, source: 'stripe_identity_search' as const }
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
  const query = `metadata['jm1_royalty_payee_id']:'${stripeSearchEscape(identity.royaltyPayeeId)}'`
  const result = await stripeJson(`/v1/accounts/search?query=${encodeURIComponent(query)}&limit=2`, {
    keyType: 'connect',
  })
  const matches = Array.isArray(result.data) ? result.data : []
  if (matches.length > 1) throw new Error('stripe_connect_account_ambiguous')
  return matches[0] || null
}

export async function createRecipientAccountLink(accountId: string, identity: AuthorConnectIdentity) {
  assertAuthorConnectIdentity(identity)
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) throw new Error('stripe_account_id_invalid')
  return stripeForm('/v1/account_links', new URLSearchParams({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `https://jmerrill.pub/author/financial-setup?contact=${encodeURIComponent(identity.contactId)}`,
    return_url: 'https://jmerrill.pub/author/portal?stripe=returned',
    'collection_options[fields]': 'eventually_due',
  }), {
    idempotencyKey: `jm1-connect-account-link-${identity.royaltyPayeeId}-${Date.now()}`,
    keyType: 'connect',
  })
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

function stripeSearchEscape(value: string) {
  return value.replace(/'/g, "\\'")
}
