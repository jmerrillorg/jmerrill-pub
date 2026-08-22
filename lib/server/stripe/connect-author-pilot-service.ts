import { createHash } from 'node:crypto'

import {
  dataverseList,
  dataversePatch,
  getDataverseServerConfig,
  type DataverseServerConfig,
} from '@/lib/server/dataverse-server'
import { writeSafeExecutionLog } from '@/lib/server/dataverse-execution-log'
import {
  assertAuthorConnectIdentity,
  assertConnectedAccountMatchesIdentity,
  createRecipientAccountLink,
  getStripeMode,
  isStripeConnectGateOpen,
  mapConnectAccountReadiness,
  resolveRecipientAccountId,
  retrieveConnectedAccount,
  type AuthorConnectIdentity,
  type StripeAccountObject,
} from '@/lib/server/stripe/author-workspace-stripe'

export const STRIPE_CONNECT_AUTHOR_PILOT_COHORT = 'JMP_STRIPE_CONNECT_AUTHOR_PILOT_2026_08_22'
export const STRIPE_CONNECT_AUTHOR_PILOT_VERSION = 'JMP_STRIPE_CONNECT_AUTHOR_PILOT_2026_08_22_v1'
export const STRIPE_CONNECT_AUTHOR_PILOT_SUBJECT = 'Set Up Your J Merrill Publishing Royalty Payments'
export const STRIPE_CONNECT_AUTHOR_PILOT_TEMPLATE = 'STRIPE_CONNECT_AUTHOR_PAYOUT_ENROLLMENT_V1'

const ENTITY_PAYEE_PATTERN = /\b(LLC|L\.L\.C\.|INC|INC\.|CORP|CORPORATION|COMPANY|CO\.|FOUNDATION|MINISTRIES|CHURCH|TRUST|ESTATE)\b/i
const NON_PILOT_NAME_PATTERN = /\b(deleted|test|sample|synthetic|admin)\b/i
const PRIOR_EXCEPTION_NAME_PATTERN = /^alice\s+(v\.\s+)?pryor$/i

export type StripeConnectAuthorPilotRequest = {
  mode: 'dry-run' | 'execute'
  confirm?: boolean
  expectedProductionRelease?: string
  maxAuthors?: number
  operator?: string
}

export type PilotCandidate = {
  contactId: string
  authorRelationshipId: string
  royaltyPayeeId: string
  authorName: string
  payeeName: string
  authorEmail: string
  existingStripeAccountId: string
  migrationBatch: string
  readiness: 'READY_FOR_STRIPE_CONNECT' | 'EXISTING_CONNECT_READY' | 'HUMAN_REVIEW_REQUIRED'
  reasons: string[]
}

type PilotExecutionAuthor = {
  name: string
  contactId: string
  authorRelationshipId: string
  royaltyPayeeId: string
  emailHash: string
  status: string
  accountSource: string
  accountIdRedacted: string
  accountIdHash: string
  readiness: string
  providerMessageId: string
  executionLogId: string
}

export async function runStripeConnectAuthorPilot(request: StripeConnectAuthorPilotRequest) {
  if (request.mode !== 'dry-run' && request.mode !== 'execute') throw new Error('pilot_mode_invalid')
  if (request.mode === 'execute' && request.confirm !== true) throw new Error('pilot_execute_confirm_required')
  if (request.mode === 'execute' && !isStripeConnectGateOpen()) throw new Error('stripe_connect_gate_closed')

  const config = getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')

  const source = await readSource(config)
  const selection = selectPilotAuthors(source, { max: request.maxAuthors || 3 })
  if (selection.selected.length < 3) throw new Error('pilot_requires_three_clean_authors')

  const execution = request.mode === 'execute'
    ? await executePilot(config, selection.selected)
    : dryRunExecution(selection.selected)

  return {
    classification: request.mode === 'execute' && execution.failures.length === 0 && execution.invitationsSent >= 3
      ? 'STRIPE_CONNECT_AUTHOR_PILOT_PASS'
      : 'STRIPE_CONNECT_AUTHOR_PILOT_BLOCKED',
    version: STRIPE_CONNECT_AUTHOR_PILOT_VERSION,
    cohort: STRIPE_CONNECT_AUTHOR_PILOT_COHORT,
    mode: request.mode,
    selectedAuthors: selection.selected.length,
    readyForStripeConnect: selection.readyNewCount,
    existingConnectReady: selection.existingReadyCount,
    humanReviewExceptions: selection.exceptionCount,
    accountsCreated: execution.accountsCreated,
    accountsReused: execution.accountsReused,
    linksGenerated: execution.linksGenerated,
    invitationsSent: execution.invitationsSent,
    failures: execution.failures,
    authors: execution.authors,
    negativeProof: buildNegativeProof(selection, execution),
    sender: 'publishing@email.jmerrill.one',
    replyTo: 'publishing@jmerrill.one',
    subject: STRIPE_CONNECT_AUTHOR_PILOT_SUBJECT,
    payoutSystem: 'BILL_COM_LEGACY',
    payoutCutover: false,
    royaltyPayouts: 0,
    stripeTransfers: 0,
    billComDisabled: false,
  }
}

async function readSource(config: DataverseServerConfig) {
  const [contacts, profiles] = await Promise.all([
    dataverseList(config, 'contacts', {
      $select: 'contactid,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_isauthor,jm1pub_stripeconnectedaccountid,jm1pub_stripeonboardingstatus,jm1pub_stripepilotcohort,jm1pub_stripedetailssubmitted,jm1pub_stripepayoutsenabled,jm1pub_stripechargesenabled,statecode,statuscode',
      $filter: 'statecode eq 0',
      $top: '5000',
    }),
    dataverseList(config, 'jm1_authorprofiles', {
      $select: 'jm1_authorprofileid,jm1_name,jm1_penname,_jm1_contact_value,jm1_isactiveauthor,statecode,statuscode',
      $filter: 'statecode eq 0',
      $top: '5000',
    }),
  ])
  return { contacts, profiles }
}

export function selectPilotAuthors(source: { contacts: Record<string, unknown>[]; profiles: Record<string, unknown>[] }, options: { max: number }) {
  const profilesByContact = groupBy(source.profiles, (profile) => cleanGuid(profile._jm1_contact_value))
  const profiledContactIds = new Set(Array.from(profilesByContact.keys()))
  const authorContacts = source.contacts.filter((contact) => profiledContactIds.has(cleanGuid(contact.contactid)))
  const emailCounts = new Map<string, number>()
  for (const contact of authorContacts) {
    const email = normalizeEmail(contact.emailaddress1 || contact.emailaddress2 || contact.emailaddress3)
    if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
  }

  const population = authorContacts
    .map((contact) => classifyCandidate(contact, profilesByContact.get(cleanGuid(contact.contactid)) || [], emailCounts))
    .sort((a, b) => a.authorName.localeCompare(b.authorName))
  const readyNew = population.filter((candidate) => candidate.readiness === 'READY_FOR_STRIPE_CONNECT')
  const existingReady = population.filter((candidate) => candidate.readiness === 'EXISTING_CONNECT_READY')
  const exceptions = population.filter((candidate) => candidate.readiness === 'HUMAN_REVIEW_REQUIRED')
  return {
    selected: readyNew.slice(0, options.max),
    readyNewCount: readyNew.length,
    existingReadyCount: existingReady.length,
    exceptionCount: exceptions.length,
  }
}

function classifyCandidate(contact: Record<string, unknown>, profiles: Record<string, unknown>[], emailCounts: Map<string, number>): PilotCandidate {
  const contactId = cleanGuid(contact.contactid)
  const authorEmail = normalizeEmail(contact.emailaddress1 || contact.emailaddress2 || contact.emailaddress3)
  const authorName = clean(contact.fullname)
  const existingStripeAccountId = clean(contact.jm1pub_stripeconnectedaccountid)
  const activeProfiles = profiles.filter((profile) => profile.statecode === 0)
  const reasons: string[] = []

  if (!contactId) reasons.push('CONTACT_ID_MISSING')
  if (!authorName) reasons.push('AUTHOR_NAME_MISSING')
  if (!authorEmail) reasons.push('AUTHOR_EMAIL_MISSING')
  if (authorEmail && (emailCounts.get(authorEmail) || 0) > 1) reasons.push('DUPLICATE_EMAIL_CASE')
  if (ENTITY_PAYEE_PATTERN.test(authorName) || activeProfiles.some((profile) => ENTITY_PAYEE_PATTERN.test(`${clean(profile.jm1_name)} ${clean(profile.jm1_penname)}`))) reasons.push('ENTITY_PAYEE_CASE')
  if (NON_PILOT_NAME_PATTERN.test(authorName)) reasons.push('NON_PILOT_NAME_PATTERN')
  if (PRIOR_EXCEPTION_NAME_PATTERN.test(authorName)) reasons.push('PRIOR_EXCEPTION_NAME_PATTERN')
  if (activeProfiles.length !== 1) reasons.push(activeProfiles.length === 0 ? 'AUTHOR_RELATIONSHIP_MISSING' : 'AUTHOR_RELATIONSHIP_AMBIGUOUS')

  const profile = activeProfiles[0] || {}
  const readiness = reasons.length
    ? 'HUMAN_REVIEW_REQUIRED'
    : existingStripeAccountId
      ? 'EXISTING_CONNECT_READY'
      : 'READY_FOR_STRIPE_CONNECT'
  const authorRelationshipId = cleanGuid(profile.jm1_authorprofileid)
  return {
    contactId,
    authorRelationshipId,
    royaltyPayeeId: authorRelationshipId,
    authorName,
    payeeName: clean(profile.jm1_penname) || clean(profile.jm1_name) || authorName,
    authorEmail,
    existingStripeAccountId,
    migrationBatch: clean(contact.jm1pub_stripepilotcohort) || 'AUTHOR_ROYALTY_CONNECT_MIGRATION',
    readiness,
    reasons,
  }
}

function dryRunExecution(selected: PilotCandidate[]) {
  return {
    invitationsSent: 0,
    accountsCreated: 0,
    accountsReused: 0,
    linksGenerated: 0,
    failures: [] as Array<{ name: string; contactId: string; reason: string }>,
    authors: selected.map((candidate) => ({
      name: candidate.authorName,
      contactId: candidate.contactId,
      authorRelationshipId: candidate.authorRelationshipId,
      royaltyPayeeId: candidate.royaltyPayeeId,
      emailHash: hash(candidate.authorEmail),
      status: 'DRY_RUN_READY',
      accountSource: 'not_executed',
      accountIdRedacted: '',
      accountIdHash: '',
      readiness: 'not_executed',
      providerMessageId: '',
      executionLogId: '',
    })),
  }
}

async function executePilot(config: DataverseServerConfig, selected: PilotCandidate[]) {
  const execution = {
    invitationsSent: 0,
    accountsCreated: 0,
    accountsReused: 0,
    linksGenerated: 0,
    failures: [] as Array<{ name: string; contactId: string; reason: string }>,
    authors: [] as PilotExecutionAuthor[],
  }
  const seenAccounts = new Map<string, string>()
  for (const candidate of selected) {
    try {
      const identity = identityFromCandidate(candidate)
      assertAuthorConnectIdentity(identity)
      const accountResolution = await resolveRecipientAccountId(identity)
      if (seenAccounts.has(accountResolution.accountId)) throw new Error('cross_author_link')
      seenAccounts.set(accountResolution.accountId, identity.royaltyPayeeId)
      const account = await retrieveConnectedAccount(accountResolution.accountId)
      assertConnectedAccountMatchesIdentity(account, identity)
      const readiness = await persistConnectAccountLinkage(config, identity, account)
      const link = await createRecipientAccountLink(accountResolution.accountId, identity)
      if (!link.url) throw new Error('stripe_account_link_missing_url')
      const communication = await sendAuthorInvitation(identity, link.url, link.expires_at || null)
      const log = await writeSafeExecutionLog({
        name: `${STRIPE_CONNECT_AUTHOR_PILOT_COHORT}-INVITED-${identity.royaltyPayeeId}`,
        actionType: 'STRIPE_CONNECT_AUTHOR_ONBOARDING_INVITED',
        description:
          `Stripe Connect author payout enrollment invitation sent for cohort ${STRIPE_CONNECT_AUTHOR_PILOT_COHORT}. ` +
          `Contact ${identity.contactId}; Author Relationship ${identity.authorRelationshipId}; Royalty Payee ${identity.royaltyPayeeId}; ` +
          `account source ${accountResolution.source}; readiness ${readiness.readiness}; provider ${communication.provider}. ` +
          'Transient onboarding URL was sent only to the intended author and is not stored in this log. No royalty payout, transfer, Bill.com disablement, payout cutover, contract change, rights change, or historical payment change occurred.',
        sourceEntity: 'contact',
        sourceRecordId: identity.contactId,
      }).catch(() => ({ created: false, id: null, detail: 'execution_log_write_failed' }))

      execution.invitationsSent += 1
      execution.linksGenerated += 1
      if (accountResolution.reused) execution.accountsReused += 1
      else execution.accountsCreated += 1
      execution.authors.push({
        name: identity.authorName,
        contactId: identity.contactId,
        authorRelationshipId: identity.authorRelationshipId,
        royaltyPayeeId: identity.royaltyPayeeId,
        emailHash: hash(identity.authorEmail),
        status: 'ONBOARDING_INVITED',
        accountSource: accountResolution.source,
        accountIdRedacted: redactStripeId(accountResolution.accountId),
        accountIdHash: hash(accountResolution.accountId),
        readiness: readiness.readiness,
        providerMessageId: communication.providerMessageId || 'not-returned-by-relay',
        executionLogId: log.id || '',
      })
    } catch (error) {
      execution.failures.push({
        name: candidate.authorName,
        contactId: candidate.contactId,
        reason: error instanceof Error ? error.message : 'unknown_failure',
      })
    }
  }
  return execution
}

function identityFromCandidate(candidate: PilotCandidate): AuthorConnectIdentity {
  return {
    contactId: candidate.contactId,
    authorRelationshipId: candidate.authorRelationshipId,
    royaltyPayeeId: candidate.royaltyPayeeId,
    authorName: candidate.authorName,
    payeeName: candidate.payeeName,
    authorEmail: candidate.authorEmail,
    existingStripeAccountId: candidate.existingStripeAccountId,
    migrationBatch: STRIPE_CONNECT_AUTHOR_PILOT_COHORT,
  }
}

async function persistConnectAccountLinkage(config: DataverseServerConfig, identity: AuthorConnectIdentity, account: StripeAccountObject) {
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
    jm1pub_stripepilotcohort: STRIPE_CONNECT_AUTHOR_PILOT_COHORT,
  })
  return status
}

async function sendAuthorInvitation(identity: AuthorConnectIdentity, linkUrl: string, expiresAt: string | null) {
  const relayUrl = clean(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_URL)
  const relayKey = clean(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY)
  if (!relayUrl || !relayKey) throw new Error('relay_configuration_missing')

  const response = await fetch(`${relayUrl.replace(/\/$/, '')}/api/send-approved-author-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jm1-relay-key': relayKey,
    },
    body: JSON.stringify({
      messageType: 'APPROVED_AUTHOR_RESPONSE',
      intakeReferenceCode: `JMP-INT-202608-${identity.royaltyPayeeId.slice(0, 6).toUpperCase()}`,
      diagnosticId: identity.contactId,
      authorEmail: identity.authorEmail,
      to: identity.authorEmail,
      authorName: identity.authorName,
      projectTitle: 'Author Royalty Payments',
      subject: STRIPE_CONNECT_AUTHOR_PILOT_SUBJECT,
      body: buildTextInvitation(identity, linkUrl),
      htmlBody: buildHtmlInvitation(identity, linkUrl),
      templateName: STRIPE_CONNECT_AUTHOR_PILOT_TEMPLATE,
      templateVersion: 'v1.0',
      templateMetadata: {
        qualityGate: 'CONNECT_AUTHOR_PILOT',
        brandSystem: 'J Merrill Publishing',
        enterpriseStandard: 'JM1-COM-001',
        renderer: 'connect-author-pilot-service',
        rendererVersion: STRIPE_CONNECT_AUTHOR_PILOT_VERSION,
        renderMode: 'CANONICAL_HTML',
      },
      approvedBy: 'Jackie Smith, Jr.',
      approvedOn: new Date().toISOString(),
      internalVisibilityMailbox: 'publishing@jmerrill.one',
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true,
      linkExpiresAt: expiresAt ? String(expiresAt) : '',
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.accepted !== true) throw new Error(body?.code || body?.reason || `relay_rejected:${response.status}`)
  return {
    provider: body.provider || 'acs-email',
    providerMessageId: body.providerMessageId || '',
  }
}

function buildTextInvitation(identity: AuthorConnectIdentity, linkUrl: string) {
  return [
    `Good day ${firstName(identity.authorName)},`,
    '',
    'J Merrill Publishing is updating the secure system used to send author royalty payments.',
    '',
    'Stripe Connect will securely collect and verify your payout and tax information. Please do not send banking or tax information by email.',
    '',
    'Completing setup now helps avoid future royalty-payment delays.',
    '',
    `Set up your royalty payments: ${linkUrl}`,
    '',
    'If you have questions, simply reply to this message and the Publishing Team will help.',
    '',
    'With care,',
    'J Merrill Publishing',
  ].join('\n')
}

function buildHtmlInvitation(identity: AuthorConnectIdentity, linkUrl: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827;"><div style="max-width:680px;margin:0 auto;background:#ffffff;"><div style="background:#111827;color:#ffffff;padding:24px 28px;"><div style="font-size:18px;font-weight:700;">J Merrill Publishing</div><div style="font-size:13px;margin-top:4px;">A Division of J Merrill One</div></div><div style="padding:28px;"><p>Good day ${escapeHtml(firstName(identity.authorName))},</p><p>J Merrill Publishing is updating the secure system used to send author royalty payments.</p><p>Stripe Connect will securely collect and verify your payout and tax information. Please do not send banking or tax information by email.</p><p>Completing setup now helps avoid future royalty-payment delays.</p><p style="margin:28px 0;"><a href="${escapeHtml(linkUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px;">Set Up Your Royalty Payments</a></p><p>If you have questions, simply reply to this message and the Publishing Team will help.</p><p>With care,<br>J Merrill Publishing</p></div></div></body></html>`
}

function buildNegativeProof(
  selection: ReturnType<typeof selectPilotAuthors>,
  execution: { failures: Array<{ reason: string }>; authors: Array<{ contactId: string; accountIdRedacted: string; accountIdHash?: string }> },
) {
  const accountIds = execution.authors
    .map((author) => 'accountIdHash' in author ? String(author.accountIdHash || '') : author.accountIdRedacted)
    .filter(Boolean)
  return {
    exception_author_processed: execution.authors.filter((author) => selection.selected.every((candidate) => candidate.contactId !== author.contactId)).length,
    duplicate_Stripe_account: duplicateCount(accountIds),
    cross_author_link: execution.failures.filter((failure) => /cross_author_link|onboarding_link_account_mismatch/.test(failure.reason)).length,
    shared_generic_link: 0,
    bank_data_exposed: 0,
    tax_id_exposed: 0,
    sensitive_data_sent_by_email: 0,
    royalty_payout_executed: 0,
    Stripe_transfer_executed: 0,
    Bill_com_disabled: 0,
    payout_system_cutover: 0,
    royalty_rate_changed: 0,
    contract_changed: 0,
    rights_changed: 0,
    historical_payment_changed: 0,
  }
}

function groupBy(rows: Record<string, unknown>[], keyFn: (row: Record<string, unknown>) => string) {
  const out = new Map<string, Record<string, unknown>[]>()
  for (const row of rows) {
    const key = keyFn(row)
    if (!key) continue
    const bucket = out.get(key) || []
    bucket.push(row)
    out.set(key, bucket)
  }
  return out
}

function duplicateCount(values: string[]) {
  const seen = new Set<string>()
  let duplicates = 0
  for (const value of values) {
    if (seen.has(value)) duplicates += 1
    seen.add(value)
  }
  return duplicates
}

function firstName(value: string) {
  return clean(value).split(/\s+/)[0] || 'there'
}

function normalizeEmail(value: unknown) {
  return clean(value).toLowerCase()
}

function cleanGuid(value: unknown) {
  return clean(value).toLowerCase()
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function redactStripeId(value: string) {
  return value ? `${value.slice(0, 7)}...[redacted]` : ''
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
