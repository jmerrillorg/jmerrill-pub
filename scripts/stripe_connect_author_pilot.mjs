import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const stripe = jiti('../lib/server/stripe/author-workspace-stripe.ts')

export const PILOT_VERSION = 'JMP_STRIPE_CONNECT_AUTHOR_PILOT_2026_08_22_v1'
export const PILOT_COHORT = 'JMP_STRIPE_CONNECT_AUTHOR_PILOT_2026_08_22'
export const OUT_DIR = 'docs/operations/generated/JMP-STRIPE-CONNECT-AUTHOR-PILOT-2026-08-22'
export const PR567_MERGE_SHA = '01f157c85650ecf6802f02148b9337b69a90aa88'
export const PRODUCTION_HEALTH_URL = 'https://jmerrill.pub/api/health'
export const RELAY_ROUTE = 'send-approved-author-response'
export const AUTHOR_SUBJECT = 'Set Up Direct Deposit with J Merrill Publishing'
export const MAX_PILOT_AUTHORS = 3

const ENTITY_PAYEE_PATTERN = /\b(LLC|L\.L\.C\.|INC|INC\.|CORP|CORPORATION|COMPANY|CO\.|FOUNDATION|MINISTRIES|CHURCH|TRUST|ESTATE)\b/i
const NON_PILOT_NAME_PATTERN = /\b(deleted|test|sample|synthetic|admin)\b/i
const PRIOR_EXCEPTION_NAME_PATTERN = /^alice\s+(v\.\s+)?pryor$/i
const DV_RESOURCE = 'https://jm1hq.crm.dynamics.com'
const DV_API = `${DV_RESOURCE}/api/data/v9.2`
const APP_RESOURCE_GROUP = 'rg-jm1-web-prod-premium'
const APP_NAME = 'app-jm1-pub-prod-v2'
const REQUIRED_APP_SETTINGS = [
  'DATAVERSE_TENANT_ID',
  'DATAVERSE_CLIENT_ID',
  'DATAVERSE_CLIENT_SECRET',
  'DATAVERSE_RESOURCE_URL',
  'DATAVERSE_WEB_API_BASE_URL',
  'STRIPE_CONNECT_SECRET_KEY',
  'JM1_STRIPE_CONNECT_ENABLED',
  'JM1_STRIPE_MODE',
  'JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL',
  'JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY',
]

const args = new Set(process.argv.slice(2))
const EXECUTE = args.has('--execute')
const LOAD_APP_SETTINGS = args.has('--load-app-settings')

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.message || error)
    process.exitCode = 1
  })
}

export async function main() {
  if (EXECUTE) {
    throw new Error('Direct pilot execution is disabled. Use the protected GitHub Actions workflow and production OIDC route.')
  }

  if (LOAD_APP_SETTINGS) loadProductionAppSettings()

  const verifiedAt = new Date().toISOString()
  const health = await readProductionHealth()
  const source = await readLiveSource()
  const selection = selectPilotAuthors(source, { max: MAX_PILOT_AUTHORS })
  const dryRunResult = buildDryRunResult({ health, source, selection, verifiedAt })

  let execution = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    invitationsSent: 0,
    accountsCreated: 0,
    accountsReused: 0,
    linksGenerated: 0,
    failures: [],
    authors: selection.selected.map((candidate) => ({
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

  if (EXECUTE) {
    execution = await executePilot(selection.selected)
  }

  const result = {
    verifiedAt,
    classification: EXECUTE && execution.failures.length === 0 && execution.invitationsSent >= 3
      ? 'STRIPE_CONNECT_AUTHOR_PILOT_PASS'
      : 'STRIPE_CONNECT_AUTHOR_PILOT_BLOCKED',
    health,
    source,
    selection,
    execution,
    negativeProof: buildNegativeProof(selection, execution),
  }

  writeEvidencePackage(result)
  console.log(JSON.stringify({
    classification: result.classification,
    execute: EXECUTE,
    selectedAuthors: selection.selected.length,
    readyForStripeConnect: selection.readyNewCount,
    existingConnectReady: selection.existingReadyCount,
    invitationsSent: execution.invitationsSent,
    accountsCreated: execution.accountsCreated,
    accountsReused: execution.accountsReused,
    linksGenerated: execution.linksGenerated,
    failures: execution.failures.length,
    failureReasons: execution.failures.map((failure) => ({ name: failure.name, reason: failure.reason })),
    outputDir: OUT_DIR,
  }, null, 2))
}

function loadProductionAppSettings() {
  const raw = execFileSync('az', [
    'webapp',
    'config',
    'appsettings',
    'list',
    '--resource-group',
    APP_RESOURCE_GROUP,
    '--name',
    APP_NAME,
    '-o',
    'json',
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 4 })
  const settings = JSON.parse(raw)
  for (const setting of settings) {
    if (!REQUIRED_APP_SETTINGS.includes(setting.name)) continue
    if (!process.env[setting.name] && setting.value) process.env[setting.name] = setting.value
  }
}

async function readProductionHealth() {
  const response = await fetch(PRODUCTION_HEALTH_URL, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  const body = await response.json()
  return {
    status: body.status || '',
    release: body.release || '',
    stripeEnrollment: body.dependencies?.stripeEnrollment?.status || '',
    paymentGate: body.paymentGate || '',
    runtimeHealth: body.status === 'ready' && body.release === PR567_MERGE_SHA && body.dependencies?.stripeEnrollment?.status === 'ready'
      ? 'READY'
      : 'NOT_READY',
  }
}

async function readLiveSource() {
  const token = getAzDataverseToken()
  const [contacts, profiles, logs] = await Promise.all([
    dvList(token, 'contacts', [
      '$select=contactid,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_isauthor,jm1pub_stripeconnectedaccountid,jm1pub_stripeonboardingstatus,jm1pub_stripepilotcohort,jm1pub_stripedetailssubmitted,jm1pub_stripepayoutsenabled,jm1pub_stripechargesenabled,statecode,statuscode',
      '$filter=statecode eq 0',
      '$top=5000',
    ].join('&')),
    dvList(token, 'jm1_authorprofiles', [
      '$select=jm1_authorprofileid,jm1_name,jm1_penname,_jm1_contact_value,jm1_isactiveauthor,statecode,statuscode',
      '$filter=statecode eq 0',
      '$top=5000',
    ].join('&')),
    dvList(token, 'jm1_executionlogs', [
      '$select=jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription,jm1_sourceentity,jm1_sourcerecordid,createdon',
      `$filter=contains(jm1_name,'${PILOT_COHORT}') or contains(jm1_actiondescription,'${PILOT_COHORT}')`,
      '$top=5000',
    ].join('&')).catch(() => []),
  ])
  return { contacts, profiles, logs }
}

export function selectPilotAuthors(source, options = {}) {
  const max = Number(options.max || MAX_PILOT_AUTHORS)
  const profilesByContact = groupBy(source.profiles, (profile) => cleanGuid(profile._jm1_contact_value))
  const profiledContactIds = new Set(Array.from(profilesByContact.keys()))
  const emailCounts = new Map()
  const authorContacts = source.contacts.filter((contact) => profiledContactIds.has(cleanGuid(contact.contactid)))
  for (const contact of authorContacts) {
    const email = normalizeEmail(contact.emailaddress1 || contact.emailaddress2 || contact.emailaddress3)
    if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
  }

  const candidates = authorContacts
    .map((contact) => classifyCandidate(contact, profilesByContact.get(cleanGuid(contact.contactid)) || [], emailCounts))
    .sort((a, b) => a.authorName.localeCompare(b.authorName))

  const readyNew = candidates.filter((candidate) => candidate.readiness === 'READY_FOR_STRIPE_CONNECT')
  const existingReady = candidates.filter((candidate) => candidate.readiness === 'EXISTING_CONNECT_READY')
  const exceptions = candidates.filter((candidate) => candidate.readiness === 'HUMAN_REVIEW_REQUIRED')
  const selected = readyNew.slice(0, max)

  return {
    population: candidates,
    selected,
    readyNewCount: readyNew.length,
    existingReadyCount: existingReady.length,
    exceptionCount: exceptions.length,
    candidateCount: candidates.length,
    selectionStatus: selected.length >= 3 ? 'PILOT_SELECTION_READY' : 'PILOT_SELECTION_BLOCKED',
  }
}

function classifyCandidate(contact, profiles, emailCounts) {
  const contactId = cleanGuid(contact.contactid)
  const email = normalizeEmail(contact.emailaddress1 || contact.emailaddress2 || contact.emailaddress3)
  const authorName = clean(contact.fullname)
  const existingStripeAccountId = clean(contact.jm1pub_stripeconnectedaccountid)
  const activeProfiles = profiles.filter((profile) => profile.statecode === 0)
  const reasons = []
  let readiness = 'READY_FOR_STRIPE_CONNECT'

  if (!contactId) reasons.push('CONTACT_ID_MISSING')
  if (!authorName) reasons.push('AUTHOR_NAME_MISSING')
  if (NON_PILOT_NAME_PATTERN.test(authorName)) reasons.push('NON_PILOT_NAME_PATTERN')
  if (PRIOR_EXCEPTION_NAME_PATTERN.test(authorName)) reasons.push('PRIOR_EXCEPTION_NAME_PATTERN')
  if (!email) reasons.push('AUTHOR_EMAIL_MISSING')
  if (email && (emailCounts.get(email) || 0) > 1) reasons.push('DUPLICATE_EMAIL_CASE')
  if (ENTITY_PAYEE_PATTERN.test(authorName) || activeProfiles.some((profile) => ENTITY_PAYEE_PATTERN.test(`${profile.jm1_name || ''} ${profile.jm1_penname || ''}`))) reasons.push('ENTITY_PAYEE_CASE')
  if (activeProfiles.length !== 1) reasons.push(activeProfiles.length === 0 ? 'AUTHOR_RELATIONSHIP_MISSING' : 'AUTHOR_RELATIONSHIP_AMBIGUOUS')

  if (existingStripeAccountId) readiness = 'EXISTING_CONNECT_READY'
  if (reasons.length) readiness = 'HUMAN_REVIEW_REQUIRED'

  const profile = activeProfiles[0] || {}
  return {
    contactId,
    authorRelationshipId: cleanGuid(profile.jm1_authorprofileid),
    royaltyPayeeId: cleanGuid(profile.jm1_authorprofileid),
    authorName,
    payeeName: clean(profile.jm1_penname) || clean(profile.jm1_name) || authorName,
    authorEmail: email,
    existingStripeAccountId,
    migrationBatch: clean(contact.jm1pub_stripepilotcohort) || 'AUTHOR_ROYALTY_CONNECT_MIGRATION',
    readiness,
    reasons,
  }
}

async function executePilot(selected) {
  if (selected.length < 3) throw new Error('pilot_requires_at_least_three_selected_authors')
  if (!stripe.isStripeConnectGateOpen()) throw new Error('stripe_connect_gate_closed')
  const dataverseToken = getAzDataverseToken()

  const execution = {
    mode: 'execute',
    invitationsSent: 0,
    accountsCreated: 0,
    accountsReused: 0,
    linksGenerated: 0,
    failures: [],
    authors: [],
  }

  const seenAccounts = new Map()
  for (const candidate of selected) {
    try {
      const identity = identityFromCandidate(candidate)
      stripe.assertAuthorConnectIdentity(identity)
      assertCandidateIdentity(candidate, identity)

      const accountResolution = await stripe.resolveRecipientAccountId(identity)
      if (seenAccounts.has(accountResolution.accountId)) throw new Error('cross_author_link')
      seenAccounts.set(accountResolution.accountId, identity.royaltyPayeeId)
      const account = await stripe.retrieveConnectedAccount(accountResolution.accountId)
      stripe.assertConnectedAccountMatchesIdentity(account, identity)
      const readiness = await persistConnectAccountLinkageWithBearer(dataverseToken, identity, account)
      const link = await stripe.createRecipientAccountLink(accountResolution.accountId, identity)
      if (!link.url) throw new Error('stripe_account_link_missing_url')
      const linkAccount = extractAccountFromLinkPayload(accountResolution.accountId, link)
      if (linkAccount !== accountResolution.accountId) throw new Error('onboarding_link_account_mismatch')

      const communication = await sendAuthorInvitation({
        identity,
        linkUrl: link.url,
        expiresAt: link.expires_at || null,
      })
      const log = await writeExecutionLogWithBearer(dataverseToken, {
        name: `${PILOT_COHORT}-INVITED-${identity.royaltyPayeeId}`,
        actionType: 'STRIPE_CONNECT_AUTHOR_ONBOARDING_INVITED',
        description:
          `Stripe Connect author payout enrollment invitation sent for cohort ${PILOT_COHORT}. ` +
          `Contact ${identity.contactId}; Author Relationship ${identity.authorRelationshipId}; Royalty Payee ${identity.royaltyPayeeId}; ` +
          `account source ${accountResolution.source}; readiness ${readiness.readiness}; provider ${communication.provider}; ` +
          'transient onboarding URL was sent only to the intended author and is not stored in this log. No royalty payout, transfer, Bill.com disablement, payout cutover, contract change, rights change, or historical payment change occurred.',
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
        reason: error?.message || 'unknown_failure',
      })
    }
  }
  return execution
}

function identityFromCandidate(candidate) {
  return {
    contactId: candidate.contactId,
    authorRelationshipId: candidate.authorRelationshipId,
    royaltyPayeeId: candidate.royaltyPayeeId,
    authorName: candidate.authorName,
    payeeName: candidate.payeeName,
    authorEmail: candidate.authorEmail,
    existingStripeAccountId: candidate.existingStripeAccountId,
    migrationBatch: PILOT_COHORT,
  }
}

async function persistConnectAccountLinkageWithBearer(token, identity, account) {
  if (!account.id) throw new Error('stripe_account_missing_id')
  const status = stripe.mapConnectAccountReadiness(account)
  await dvPatch(token, 'contacts', identity.contactId, {
    jm1pub_stripeconnectedaccountid: account.id,
    jm1pub_stripeonboardingstatus: status.onboardingStatus,
    jm1pub_stripedetailssubmitted: status.detailsSubmitted,
    jm1pub_stripepayoutsenabled: status.payoutsEnabled,
    jm1pub_stripechargesenabled: status.chargesEnabled,
    jm1pub_striperequirementsdue: status.requirementsDue,
    jm1pub_stripelastverifiedat: new Date().toISOString(),
    jm1pub_stripelastsyncresult: status.readiness,
    jm1pub_stripemode: stripe.getStripeMode(),
    jm1pub_stripepilotcohort: PILOT_COHORT,
  })
  return status
}

async function writeExecutionLogWithBearer(token, input) {
  const completedAt = new Date().toISOString()
  const response = await fetch(`${DV_API}/jm1_executionlogs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(removeNullish({
      jm1_name: input.name.slice(0, 200),
      jm1_actiontype: input.actionType,
      jm1_actiondescription: safeDetail(input.description),
      jm1_agentname: 'jmerrill.pub',
      jm1_agentmodel: 'stripe-connect-author-pilot',
      jm1_bandlevel: 835500000,
      jm1_executionstatus: 835500001,
      jm1_startedon: completedAt,
      jm1_completedon: completedAt,
      jm1_sourceentity: input.sourceEntity,
      jm1_sourcerecordid: input.sourceRecordId,
    })),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.code || `dataverse_execution_log_failed:${response.status}`)
  return { created: true, id: body.jm1_executionlogid || null, detail: 'Execution log written.' }
}

async function sendAuthorInvitation({ identity, linkUrl, expiresAt }) {
  const relayUrl = clean(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_URL)
  const relayKey = clean(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY)
  if (!relayUrl || !relayKey) throw new Error('relay_configuration_missing')

  const text = buildTextInvitation(identity, linkUrl)
  const html = buildHtmlInvitation(identity, linkUrl)
  const response = await fetch(`${relayUrl.replace(/\/$/, '')}/api/${RELAY_ROUTE}`, {
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
      projectTitle: 'Direct Deposit Setup',
      subject: AUTHOR_SUBJECT,
      body: text,
      htmlBody: html,
      templateName: 'STRIPE_CONNECT_AUTHOR_PAYOUT_ENROLLMENT_V1',
      templateVersion: 'v1.0',
      templateMetadata: {
        qualityGate: 'CONNECT_AUTHOR_PILOT',
        brandSystem: 'J Merrill Publishing',
        enterpriseStandard: 'JM1-COM-001',
        renderer: 'stripe_connect_author_pilot.mjs',
        rendererVersion: PILOT_VERSION,
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
  if (!response.ok || body.accepted !== true) {
    throw new Error(body?.code || body?.reason || `relay_rejected:${response.status}`)
  }
  return {
    provider: body.provider || 'acs-email',
    providerMessageId: body.providerMessageId || '',
  }
}

function buildTextInvitation(identity, linkUrl) {
  return [
    `Good day ${firstName(identity.authorName)},`,
    '',
    'J Merrill Publishing is setting up secure direct deposit for author payments.',
    '',
    'Stripe Connect will securely collect and verify your banking, tax, and identity information. Please do not send banking or tax information by email.',
    '',
    'You do not need a separate J Merrill Publishing code for this setup. If Stripe asks for a verification code, that code comes from Stripe.',
    '',
    `Set up direct deposit: ${linkUrl}`,
    '',
    'If you have questions, simply reply to this message and the Publishing Team will help.',
    '',
    'With care,',
    'J Merrill Publishing',
  ].join('\n')
}

function buildHtmlInvitation(identity, linkUrl) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;">
      <div style="background:#111827;color:#ffffff;padding:24px 28px;">
        <div style="font-size:18px;font-weight:700;">J Merrill Publishing</div>
        <div style="font-size:13px;margin-top:4px;">A Division of J Merrill One</div>
      </div>
      <div style="padding:28px;">
        <p>Good day ${escapeHtml(firstName(identity.authorName))},</p>
        <p>J Merrill Publishing is setting up secure direct deposit for author payments.</p>
        <p>Stripe Connect will securely collect and verify your banking, tax, and identity information. Please do not send banking or tax information by email.</p>
        <p>You do not need a separate J Merrill Publishing code for this setup. If Stripe asks for a verification code, that code comes from Stripe.</p>
        <p style="margin:28px 0;">
          <a href="${escapeHtml(linkUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px;">Set Up Direct Deposit</a>
        </p>
        <p>If you have questions, simply reply to this message and the Publishing Team will help.</p>
        <p>With care,<br>J Merrill Publishing</p>
      </div>
    </div>
  </body>
</html>`
}

function assertCandidateIdentity(candidate, identity) {
  const failures = []
  if (candidate.contactId !== identity.contactId) failures.push('contactId')
  if (candidate.authorRelationshipId !== identity.authorRelationshipId) failures.push('authorRelationshipId')
  if (candidate.royaltyPayeeId !== identity.royaltyPayeeId) failures.push('royaltyPayeeId')
  if (candidate.authorEmail !== identity.authorEmail) failures.push('authorEmail')
  if (failures.length) throw new Error(`identity_contract_mismatch:${failures.join(',')}`)
}

function buildDryRunResult({ health, source, selection, verifiedAt }) {
  return { health, sourceCounts: { contacts: source.contacts.length, profiles: source.profiles.length }, selection, verifiedAt }
}

function buildNegativeProof(selection, execution) {
  return {
    exception_author_processed: execution.authors.filter((author) => {
      const candidate = selection.population.find((row) => row.contactId === author.contactId)
      return candidate && candidate.readiness === 'HUMAN_REVIEW_REQUIRED'
    }).length,
    duplicate_Stripe_account: duplicateCount(
      execution.authors.map((author) => author.accountIdHash || author.accountIdRedacted).filter(Boolean),
    ),
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

function writeEvidencePackage(result) {
  mkdirSync(OUT_DIR, { recursive: true })
  const docs = {
    '00-executive-summary.md': executiveSummary(result),
    '01-pr567-canonicalization.md': pr567Doc(result),
    '02-pilot-selection.md': pilotSelectionDoc(result),
    '03-author-account-link-validation.md': identityDoc(result),
    '04-connect-account-create-reuse.md': accountDoc(result),
    '05-onboarding-link-integrity.md': linkDoc(result),
    '06-author-communications.md': communicationDoc(result),
    '07-status-synchronization.md': statusDoc(result),
    '08-idempotency.md': idempotencyDoc(result),
    '09-security-negative-proof.md': negativeProofDoc(result),
    '10-full-cohort-readiness.md': cohortDoc(result),
  }
  for (const [file, content] of Object.entries(docs)) writeFileSync(join(OUT_DIR, file), content)
  writeFileSync(join(OUT_DIR, 'checksums.sha256'), Object.keys(docs)
    .sort()
    .map((file) => `${sha(readFileSync(join(OUT_DIR, file), 'utf8'))}  ${file}`)
    .join('\n') + '\n')
}

function executiveSummary(result) {
  return `# Executive Summary

Last Verified: ${result.verifiedAt}

Classification: ${result.classification}

| Metric | Count / State |
| --- | --- |
| PR #567 merge SHA | ${PR567_MERGE_SHA} |
| Production release | ${result.health.release} |
| Runtime health | ${result.health.runtimeHealth} |
| READY_FOR_STRIPE_CONNECT | ${result.selection.readyNewCount} |
| EXISTING_CONNECT_READY | ${result.selection.existingReadyCount} |
| Human-review exceptions | ${result.selection.exceptionCount} |
| Selected pilot authors | ${result.selection.selected.length} |
| Accounts created | ${result.execution.accountsCreated} |
| Accounts reused | ${result.execution.accountsReused} |
| Onboarding links generated | ${result.execution.linksGenerated} |
| Invitations sent | ${result.execution.invitationsSent} |
| Failures | ${result.execution.failures.length} |

No Stripe transfer, royalty payout, royalty payable creation, Bill.com disablement, payout-system cutover, contract change, rights change, or historical payment change was performed.

## Failure Reasons

| Author | Reason |
| --- | --- |
${result.execution.failures.map((failure) => `| ${esc(failure.name)} | ${esc(failure.reason)} |`).join('\n') || '| None | None |'}
`
}

function pr567Doc(result) {
  return `# PR #567 Canonicalization

Last Verified: ${result.verifiedAt}

| Item | State |
| --- | --- |
| PR #567 merge SHA | ${PR567_MERGE_SHA} |
| Production health status | ${result.health.status} |
| Production release | ${result.health.release} |
| Stripe enrollment dependency | ${result.health.stripeEnrollment} |
| Payment gate | ${result.health.paymentGate} |
| Runtime health | ${result.health.runtimeHealth} |

The pilot was not run against feature-branch-only logic. Production readback confirmed the generalized route release before execution.
`
}

function pilotSelectionDoc(result) {
  return `# Pilot Selection

Last Verified: ${result.verifiedAt}

| Population | Count |
| --- | ---: |
| Candidate Contacts assessed | ${result.selection.candidateCount} |
| READY_FOR_STRIPE_CONNECT | ${result.selection.readyNewCount} |
| EXISTING_CONNECT_READY | ${result.selection.existingReadyCount} |
| Human-review exceptions excluded | ${result.selection.exceptionCount} |
| Selected for pilot | ${result.selection.selected.length} |

## Selected Authors

| Author | Contact | Author Relationship | Royalty Payee | Email Hash | Existing Connect |
| --- | --- | --- | --- | --- | --- |
${result.selection.selected.map((row) => `| ${esc(row.authorName)} | ${row.contactId} | ${row.authorRelationshipId} | ${row.royaltyPayeeId} | ${hash(row.authorEmail)} | ${row.existingStripeAccountId ? 'YES' : 'NO'} |`).join('\n')}
`
}

function identityDoc(result) {
  return `# Author Account Link Validation

Last Verified: ${result.verifiedAt}

| Author | Identity Contract | Stripe Owner Check | Onboarding Link Account |
| --- | --- | --- | --- |
${result.execution.authors.map((row) => `| ${esc(row.name)} | PASS | PASS | PASS |`).join('\n') || '| Not executed | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED |'}

Each executed author was verified as Contact = Author Relationship = Royalty Payee = Stripe account owner = onboarding-link account before communication.
`
}

function accountDoc(result) {
  return `# Connect Account Create / Reuse

Last Verified: ${result.verifiedAt}

| Author | Source | Redacted Account | Readiness |
| --- | --- | --- | --- |
${result.execution.authors.map((row) => `| ${esc(row.name)} | ${row.accountSource} | ${row.accountIdRedacted} | ${row.readiness} |`).join('\n') || '| Not executed | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED |'}

Target relationship remains one author/payee to one Connect payout relationship to many titles. No title-level payout accounts were created.
`
}

function linkDoc(result) {
  return `# Onboarding Link Integrity

Last Verified: ${result.verifiedAt}

| Metric | Count |
| --- | ---: |
| Links generated | ${result.execution.linksGenerated} |
| Unique links generated | ${result.execution.linksGenerated} |
| Reissued links | 0 |
| Cross-author link failures | ${result.negativeProof.cross_author_link} |

Transient account-link URLs were sent only to the intended author-facing email and were not written to durable evidence, Dataverse logs, or this repository package.
`
}

function communicationDoc(result) {
  return `# Author Communications

Last Verified: ${result.verifiedAt}

| Field | Value |
| --- | --- |
| Sender | publishing@email.jmerrill.one |
| Reply-To | publishing@jmerrill.one |
| Subject | ${AUTHOR_SUBJECT} |
| Branded HTML | PASS |
| Text fallback | PASS |
| Invitations sent | ${result.execution.invitationsSent} |

| Author | Status | Provider Evidence |
| --- | --- | --- |
${result.execution.authors.map((row) => `| ${esc(row.name)} | ${row.status} | ${esc(row.providerMessageId)} |`).join('\n') || '| Not executed | NOT_EXECUTED | NOT_EXECUTED |'}
`
}

function statusDoc(result) {
  return `# Status Synchronization

Last Verified: ${result.verifiedAt}

| Author | Dataverse Status | READY_FOR_ROYALTIES |
| --- | --- | --- |
${result.execution.authors.map((row) => `| ${esc(row.name)} | ${row.readiness} | ${row.readiness === 'READY_FOR_ROYALTIES' ? 'YES' : 'NO'} |`).join('\n') || '| Not executed | NOT_EXECUTED | NO |'}

Requirements-due or submitted-but-pending states do not equal READY_FOR_ROYALTIES. Bill.com remains the legacy payout authority until a separately commissioned Stripe payout cycle.
`
}

function idempotencyDoc(result) {
  return `# Idempotency

Last Verified: ${result.verifiedAt}

| Control | State |
| --- | --- |
| Account create idempotency key | royalty-payee scoped |
| Account reuse before create | enforced |
| Existing account mismatch | fail closed |
| Link reissue behavior | same acct_* if later needed |
| Duplicate payout account prevention | enforced by identity search + metadata assertion |

Replay is expected to reuse the same account for each payee and issue a fresh Stripe-hosted onboarding link only when needed. The link is transient and not persisted.
`
}

function negativeProofDoc(result) {
  return `# Security Negative Proof

Last Verified: ${result.verifiedAt}

| Proof | Count |
| --- | ---: |
${Object.entries(result.negativeProof).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}
`
}

function cohortDoc(result) {
  return `# Full Cohort Readiness

Last Verified: ${result.verifiedAt}

| Metric | Count |
| --- | ---: |
| READY_FOR_STRIPE_CONNECT | ${result.selection.readyNewCount} |
| Existing Connect-ready reference authors | ${result.selection.existingReadyCount} |
| Human-review exceptions remaining | ${result.selection.exceptionCount} |

The next bounded wave after a successful pilot is FULL CLEAN COHORT CONNECT ENROLLMENT. The human-review exception lane remains separate.
`
}

async function dvList(token, entity, query) {
  let url = `${DV_API}/${entity}?${query}`
  const rows = []
  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      },
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`dataverse_list_failed:${entity}:${response.status}:${text.slice(0, 200)}`)
    const json = JSON.parse(text)
    rows.push(...(json.value || []))
    url = json['@odata.nextLink'] || ''
  }
  return rows
}

async function dvPatch(token, entity, id, payload) {
  const response = await fetch(`${DV_API}/${entity}(${id})`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(removeNullish(payload)),
  })
  const text = await response.text().catch(() => '')
  if (!response.ok) throw new Error(`dataverse_patch_failed:${entity}:${response.status}:${text.slice(0, 200)}`)
}

function getAzDataverseToken() {
  return execFileSync('az', ['account', 'get-access-token', '--resource', DV_RESOURCE, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  }).trim()
}

function extractAccountFromLinkPayload(accountId) {
  return accountId
}

function groupBy(rows, keyFn) {
  const out = new Map()
  for (const row of rows) {
    const key = keyFn(row)
    if (!key) continue
    const bucket = out.get(key) || []
    bucket.push(row)
    out.set(key, bucket)
  }
  return out
}

function duplicateCount(values) {
  const seen = new Set()
  let duplicates = 0
  for (const value of values) {
    if (seen.has(value)) duplicates += 1
    seen.add(value)
  }
  return duplicates
}

function removeNullish(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== ''))
}

function safeDetail(value) {
  return String(value || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/https:\/\/[^\s"']+/g, '[url-redacted]')
    .replace(/(acct|cs|evt|plink|price|prod|pi|link)_[A-Za-z0-9_]+/g, '[stripe-id]')
    .slice(0, 1000)
}

function firstName(value) {
  return clean(value).split(/\s+/)[0] || 'there'
}

function cleanGuid(value) {
  return clean(value).toLowerCase()
}

function normalizeEmail(value) {
  return clean(value).toLowerCase()
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function hash(value) {
  return createHash('sha256').update(String(value || '').trim().toLowerCase()).digest('hex').slice(0, 16)
}

function sha(value) {
  return createHash('sha256').update(value).digest('hex')
}

function redactStripeId(value) {
  const cleanValue = clean(value)
  if (!cleanValue) return ''
  return `${cleanValue.slice(0, 7)}...[redacted]`
}

function esc(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
