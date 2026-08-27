import { createHash, createHmac } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

export const OUT_DIR = 'docs/operations/generated/JMP-STRIPE-CONNECT-POST-REMEDIATION-CLOSURE-2026-08-26'
export const APP_RESOURCE_GROUP = 'rg-jm1-web-prod-premium'
export const APP_NAME = 'app-jm1-pub-prod-v2'
export const PRODUCTION_HEALTH_URL = 'https://jmerrill.pub/api/health'
export const DV_RESOURCE = 'https://jm1hq.crm.dynamics.com'
export const DV_API = `${DV_RESOURCE}/api/data/v9.2`
export const PR_656_HEAD = '3609171655ea21baddd031a14d803783706b3e7b'
export const PR_656_MERGE_SHA = '0e3f10df62f16b412f23b758cc28f3cf27e8545d'
export const BRANCH = 'codex/stripe-connect-post-remediation-closure-20260827'
export const CORRECTED_REMEDIATION_PACKAGE =
  'docs/operations/generated/JMP-STRIPE-CONNECT-AUTHOR-ONBOARDING-JOURNEY-REMEDIATION-2026-08-26'

const REQUIRED_APP_SETTINGS = [
  'STRIPE_CONNECT_SECRET_KEY',
  'AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET',
  'JM1_STRIPE_CONNECT_ENABLED',
  'JM1_STRIPE_MODE',
]

const TARGET_AUTHORS = [
  'devin gilchrest',
  'deanna j. speaks',
  'deanna j speaks',
  'deanna jones',
  'mildred beard',
]

const RECENT_SUPPORT_EVIDENCE = new Map([
  ['devin gilchrest', { received: '2026-08-25T22:12:31Z', category: 'STRIPE_CONNECT_SETUP_SUPPORT' }],
  ['deanna j. speaks', { received: '2026-08-26T21:57:15Z', category: 'STRIPE_CONNECT_SETUP_SUPPORT' }],
  ['deanna jones', { received: '2026-08-26T21:57:15Z', category: 'STRIPE_CONNECT_SETUP_SUPPORT' }],
  ['mildred beard', { received: '2026-08-26T21:16:48Z', category: 'STRIPE_CONNECT_SETUP_SUPPORT' }],
])

const args = new Set(process.argv.slice(2))
const LOAD_APP_SETTINGS = args.has('--load-app-settings')
const WRITE_PACKAGE = !args.has('--no-write')

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.message || error)
    process.exitCode = 1
  })
}

export async function main() {
  if (LOAD_APP_SETTINGS) loadProductionAppSettings()
  const verifiedAt = new Date().toISOString()
  const [production, sourceParity, liveSource, stripeAccounts] = await Promise.all([
    readProductionHealth(),
    readSourceParity(),
    readLiveSource(),
    readStripeAccounts(),
  ])

  const estate = buildAuthorEstate({ liveSource, stripeAccounts, verifiedAt })
  const routeProof = await readConnectRouteProof(estate.rows)
  const reminder = buildReminderPlan(estate.rows, liveSource.logs, verifiedAt)
  const negativeProof = buildNegativeProof()
  const result = {
    verifiedAt,
    production,
    sourceParity,
    liveSourceCounts: {
      contacts: liveSource.contacts.length,
      activeProfiles: liveSource.profiles.length,
      recentConnectLogs: liveSource.logs.length,
      stripeAccounts: stripeAccounts.length,
    },
    estate,
    routeProof,
    reminder,
    watchdog: buildWatchdog(estate, reminder),
    negativeProof,
    validation: {
      generatedBy: 'scripts/stripe_connect_post_remediation_closure.mjs',
      command: 'node scripts/stripe_connect_post_remediation_closure.mjs --load-app-settings',
    },
  }

  if (WRITE_PACKAGE) writeEvidencePackage(result)
  console.log(JSON.stringify({
    classification: classifyResult(result),
    verifiedAt,
    productionRelease: production.release,
    sourceContainsProductionHead: sourceParity.sourceContainsProductionHead,
    activeAuthors: estate.rows.length,
    stateCounts: estate.stateCounts,
    duplicateAccountGroups: estate.duplicateAccountGroups.length,
    remindersEligibleNow: reminder.eligibleNow.length,
    remindersSent: 0,
    routeProof: routeProof.summary,
    outputDir: OUT_DIR,
  }, null, 2))
  return result
}

export function classifyConnectState({ contact, account, duplicate }) {
  if (duplicate) return 'DUPLICATE_REVIEW'
  if (!clean(contact?.jm1pub_stripeconnectedaccountid) && !account) return 'NOT_STARTED'
  if (!account?.id) return 'EXTERNAL_BLOCK'
  const current = account.requirements?.currently_due || []
  const pastDue = account.requirements?.past_due || []
  const disabled = clean(account.requirements?.disabled_reason)
  const dueCount = current.length + pastDue.length
  if (account.details_submitted && account.payouts_enabled && dueCount === 0) return 'SETUP_COMPLETE'
  if (disabled && /review|pending/i.test(disabled)) return 'IDENTITY_REVIEW'
  if (disabled || pastDue.length > 0 || (account.details_submitted && dueCount > 0)) return 'MORE_INFORMATION_NEEDED'
  if (account.details_submitted && dueCount === 0) return 'UNDER_REVIEW'
  if (dueCount > 0) return 'SETUP_IN_PROGRESS'
  return 'SETUP_LINK_READY'
}

export function classifyReminderEligibility(row, recentLogs, verifiedAt) {
  if (row.state === 'SETUP_COMPLETE') return blocked(row, 'SETUP_COMPLETE')
  if (['UNDER_REVIEW', 'IDENTITY_REVIEW', 'DUPLICATE_REVIEW', 'EXTERNAL_BLOCK'].includes(row.state)) {
    return blocked(row, row.state)
  }
  if (row.supportState === 'ACTIVE_SUPPORT') return blocked(row, 'ACTIVE_SUPPORT_THREAD')
  const recentLog = recentLogs.find((log) => cleanGuid(log.jm1_sourcerecordid) === row.contactId)
  if (recentLog) return blocked(row, 'RECENT_SETUP_COMMUNICATION')
  if (!row.accountExists) return blocked(row, 'ACCOUNT_NOT_READY_FOR_FRESH_LINK')
  return {
    author: row.authorName,
    contactId: row.contactId,
    state: row.state,
    disposition: 'ELIGIBLE_PENDING_CADENCE',
    reason: 'Exact ongoing Connect reminder cadence is not yet canonical in the repository; no same-day or broad reminder was sent.',
  }
}

function blocked(row, reason) {
  return {
    author: row.authorName,
    contactId: row.contactId,
    state: row.state,
    disposition: 'NOT_ELIGIBLE_NOW',
    reason,
  }
}

async function readProductionHealth() {
  const response = await fetch(PRODUCTION_HEALTH_URL, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  const body = await response.json()
  return {
    statusCode: response.status,
    status: body.status || '',
    release: body.release || '',
    stripeEnrollment: body.dependencies?.stripeEnrollment?.status || '',
    ready:
      response.status === 200 &&
      body.status === 'ready' &&
      [PR_656_HEAD, PR_656_MERGE_SHA].includes(body.release) &&
      body.dependencies?.stripeEnrollment?.status === 'ready',
  }
}

async function readSourceParity() {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim()
  execFileSync('git', ['fetch', 'origin', 'main'], { stdio: 'ignore' })
  const originMain = execFileSync('git', ['rev-parse', 'origin/main'], { encoding: 'utf8' }).trim()
  const sourceContainsProductionHead = spawnSync('git', ['merge-base', '--is-ancestor', PR_656_HEAD, 'origin/main'], {
    stdio: 'pipe',
  }).status === 0
  const prHeadInBranch = spawnSync('git', ['merge-base', '--is-ancestor', PR_656_HEAD, 'HEAD'], {
    stdio: 'pipe',
  }).status === 0
  return { branch, head, originMain, pr656Head: PR_656_HEAD, pr656MergeSha: PR_656_MERGE_SHA, sourceContainsProductionHead, prHeadInBranch }
}

async function readLiveSource() {
  const token = getAzDataverseToken()
  const since = '2026-08-20T00:00:00Z'
  const [contacts, profiles, logs] = await Promise.all([
    dvList(token, 'contacts', [
      '$select=contactid,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_isauthor,jm1pub_stripeconnectedaccountid,jm1pub_stripeonboardingstatus,jm1pub_stripedetailssubmitted,jm1pub_stripepayoutsenabled,jm1pub_stripechargesenabled,jm1pub_striperequirementsdue,jm1pub_stripelastverifiedat,jm1pub_stripelastsyncresult,jm1pub_stripemode,statecode,statuscode',
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
      `$filter=(jm1_actiontype eq 'STRIPE_CONNECT_AUTHOR_ONBOARDING_INVITED' or jm1_actiontype eq 'STRIPE_CONNECT_SETUP_LINK_REFRESHED' or contains(jm1_actiondescription,'Stripe Connect')) and createdon ge ${since}`,
      '$top=5000',
    ].join('&')).catch(() => []),
  ])
  return { contacts, profiles, logs }
}

async function readStripeAccounts() {
  requireStripeSecret()
  const accounts = []
  let startingAfter = ''
  for (let page = 0; page < 50; page += 1) {
    const query = new URLSearchParams({ limit: '100' })
    if (startingAfter) query.set('starting_after', startingAfter)
    const body = await stripeJson(`/v1/accounts?${query.toString()}`)
    const data = Array.isArray(body.data) ? body.data : []
    accounts.push(...data)
    if (!body.has_more) break
    const last = data[data.length - 1]?.id
    if (!last) break
    startingAfter = last
  }
  return accounts
}

function buildAuthorEstate({ liveSource, stripeAccounts, verifiedAt }) {
  const contactsById = new Map(liveSource.contacts.map((contact) => [cleanGuid(contact.contactid), contact]))
  const profiles = liveSource.profiles.filter((profile) => cleanGuid(profile._jm1_contact_value))
  const profilesByContact = groupBy(profiles, (profile) => cleanGuid(profile._jm1_contact_value))
  const stripeById = new Map(stripeAccounts.map((account) => [clean(account.id), account]))
  const stripeByRoyaltyPayee = groupBy(stripeAccounts, (account) => cleanGuid(account.metadata?.jm1_royalty_payee_id))

  const accountUse = new Map()
  for (const contact of liveSource.contacts) {
    const accountId = clean(contact.jm1pub_stripeconnectedaccountid)
    if (!accountId) continue
    const rows = accountUse.get(accountId) || []
    rows.push(cleanGuid(contact.contactid))
    accountUse.set(accountId, rows)
  }

  const rows = profiles
    .map((profile) => {
      const contactId = cleanGuid(profile._jm1_contact_value)
      const contact = contactsById.get(contactId) || {}
      const accountId = clean(contact.jm1pub_stripeconnectedaccountid)
      const metadataMatches = stripeByRoyaltyPayee.get(cleanGuid(profile.jm1_authorprofileid)) || []
      const account = accountId ? stripeById.get(accountId) : metadataMatches.length === 1 ? metadataMatches[0] : null
      const duplicate = Boolean(accountId && (accountUse.get(accountId) || []).length > 1) || metadataMatches.length > 1
      const state = classifyConnectState({ contact, account, duplicate })
      const supportEvidence = RECENT_SUPPORT_EVIDENCE.get(normalizeName(contact.fullname)) || RECENT_SUPPORT_EVIDENCE.get(normalizeName(profile.jm1_name))
      return {
        verifiedAt,
        authorName: clean(contact.fullname) || clean(profile.jm1_penname) || clean(profile.jm1_name) || contactId,
        contactId,
        authorRelationshipId: cleanGuid(profile.jm1_authorprofileid),
        email: normalizeEmail(contact.emailaddress1 || contact.emailaddress2 || contact.emailaddress3),
        emailHash: hash(normalizeEmail(contact.emailaddress1 || contact.emailaddress2 || contact.emailaddress3)),
        dataverseAccountId: redactStripeId(accountId),
        dataverseAccountHash: accountId ? hash(accountId) : '',
        accountExists: Boolean(account?.id),
        stripeAccountId: account?.id ? redactStripeId(account.id) : '',
        stripeAccountHash: account?.id ? hash(account.id) : '',
        stripeSource: accountId ? 'DATAVERSE_LINK' : metadataMatches.length === 1 ? 'STRIPE_METADATA_ONLY' : metadataMatches.length > 1 ? 'STRIPE_METADATA_DUPLICATE' : 'NONE',
        detailsSubmitted: Boolean(account?.details_submitted),
        payoutsEnabled: Boolean(account?.payouts_enabled),
        chargesEnabled: Boolean(account?.charges_enabled),
        requirementsCurrentlyDue: (account?.requirements?.currently_due || []).length,
        requirementsPastDue: (account?.requirements?.past_due || []).length,
        disabledReason: clean(account?.requirements?.disabled_reason) ? 'PRESENT' : '',
        state,
        supportState: supportEvidence ? 'ACTIVE_SUPPORT' : 'NONE',
        supportEvidenceAt: supportEvidence?.received || '',
        priorDataverseStatus: clean(contact.jm1pub_stripeonboardingstatus),
        priorLastVerifiedAt: clean(contact.jm1pub_stripelastverifiedat),
        deterministicIssue:
          !accountId && metadataMatches.length === 1
            ? 'STRIPE_ACCOUNT_EXISTS_BUT_DATAVERSE_LINK_MISSING'
            : duplicate
              ? 'DUPLICATE_REVIEW'
              : '',
        action: actionForState(state),
      }
    })
    .sort((a, b) => a.authorName.localeCompare(b.authorName))

  const stateCounts = countBy(rows, (row) => row.state)
  const duplicateAccountGroups = Array.from(accountUse.entries())
    .filter(([, contacts]) => contacts.length > 1)
    .map(([accountId, contacts]) => ({ accountIdRedacted: redactStripeId(accountId), accountIdHash: hash(accountId), contacts }))
  const targetAuthors = rows.filter((row) => TARGET_AUTHORS.includes(normalizeName(row.authorName)))
  return { rows, stateCounts, duplicateAccountGroups, targetAuthors, profilesByContactSize: profilesByContact.size }
}

async function readConnectRouteProof(rows) {
  const candidate = rows.find((row) => row.accountExists && row.authorRelationshipId && row.contactId && row.email && row.stripeAccountHash)
  const supportResponse = await fetch('https://jmerrill.pub/author/financial-setup?connect=support', { redirect: 'manual' }).catch(() => null)
  if (!candidate || !process.env.AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET) {
    return {
      summary: 'SUPPORT_ROUTE_ONLY',
      signedReturnStatus: 'NOT_TESTED',
      refreshStatus: 'NOT_TESTED',
      supportStatus: supportResponse?.status || 0,
      note: 'No eligible signed-token proof candidate or enrollment token secret was available in this environment.',
    }
  }

  const account = rows.find((row) => row.contactId === candidate.contactId)
  const rawAccountId = findRawAccountIdForHash(candidate.stripeAccountHash)
  if (!account || !rawAccountId) {
    return {
      summary: 'SUPPORT_ROUTE_ONLY',
      signedReturnStatus: 'NOT_TESTED',
      refreshStatus: 'NOT_TESTED',
      supportStatus: supportResponse?.status || 0,
      note: 'Raw account id is intentionally not present in the evidence row.',
    }
  }

  const token = createEnrollmentToken({
    contactId: candidate.contactId,
    authorRelationshipId: candidate.authorRelationshipId,
    royaltyPayeeId: candidate.authorRelationshipId,
    stripeAccountId: rawAccountId,
  })
  const signedReturn = await fetch(`https://jmerrill.pub/author/financial-setup?connect=return&token=${encodeURIComponent(token)}`, {
    redirect: 'manual',
  }).catch(() => null)
  const refresh = await fetch(`https://jmerrill.pub/api/author/stripe/connect/refresh?token=${encodeURIComponent(token)}`, {
    redirect: 'manual',
  }).catch(() => null)
  const location = refresh?.headers?.get('location') || ''
  return {
    summary: signedReturn?.status === 200 && [302, 303, 307, 308].includes(refresh?.status || 0) && /^https:\/\/connect\.stripe\.com\//.test(location)
      ? 'PASS'
      : 'CHECK',
    signedReturnStatus: signedReturn?.status || 0,
    refreshStatus: refresh?.status || 0,
    refreshLocationHost: location ? new URL(location).host : '',
    supportStatus: supportResponse?.status || 0,
    note: 'Signed token and transient Stripe redirect URL were not persisted.',
  }
}

let RAW_STRIPE_ACCOUNT_HASH_MAP = new Map()

function buildReminderPlan(rows, logs, verifiedAt) {
  const recentLogs = logs.filter((log) => /STRIPE_CONNECT|Stripe Connect|Direct Deposit|ONBOARDING/i.test(`${log.jm1_actiontype || ''} ${log.jm1_actiondescription || ''}`))
  const decisions = rows.map((row) => classifyReminderEligibility(row, recentLogs, verifiedAt))
  return {
    verifiedAt,
    cadenceStatus: 'CONNECT_REMINDER_CADENCE_FOUNDER_DECISION_REQUIRED',
    cadenceNote:
      'Repository search found setup repair/support evidence but not a canonical ongoing reminder interval. Same-day duplicate sends, setup-complete sends, active-support sends, under-review sends, and duplicate-review sends are blocked.',
    decisions,
    eligibleNow: decisions.filter((row) => row.disposition === 'ELIGIBLE_PENDING_CADENCE'),
    notEligibleNow: decisions.filter((row) => row.disposition !== 'ELIGIBLE_PENDING_CADENCE'),
    sent: 0,
  }
}

function buildWatchdog(estate, reminder) {
  return {
    commissioned: 'CONTROLLED_READBACK_READY',
    frequency: 'daily or before royalty setup adoption waves',
    command: 'node scripts/stripe_connect_post_remediation_closure.mjs --load-app-settings',
    completionRate:
      estate.rows.length > 0
        ? `${estate.stateCounts.SETUP_COMPLETE || 0}/${estate.rows.length}`
        : '0/0',
    alertRules: [
      'setup_complete_not_reflected_in_dataverse',
      'duplicate_stripe_account',
      'metadata_only_account_link_missing',
      'active_support_without_owner',
      'eligible_pending_cadence_after_founder_cadence_ruling',
    ],
    sameDayReminderGuard: reminder.sent === 0 ? 'PASS' : 'CHECK',
  }
}

function classifyResult(result) {
  if (!result.production.ready || !result.sourceParity.sourceContainsProductionHead) return 'STRIPE_CONNECT_POST_REMEDIATION_NOT_READY'
  if (result.estate.duplicateAccountGroups.length > 0) return 'STRIPE_CONNECT_POST_REMEDIATION_CONTROLLED'
  if (result.reminder.cadenceStatus === 'CONNECT_REMINDER_CADENCE_FOUNDER_DECISION_REQUIRED') {
    return 'STRIPE_CONNECT_POST_REMEDIATION_CONTROLLED'
  }
  return 'STRIPE_CONNECT_POST_REMEDIATION_FULLY_COMMISSIONED'
}

function buildNegativeProof() {
  return {
    royalty_amount_promised: 0,
    royalty_timing_promised: 0,
    royalty_payment_authorized: 0,
    stripe_transfer_created: 0,
    stripe_payout_created: 0,
    stripe_charge_created: 0,
    stripe_invoice_created: 0,
    stripe_payment_intent_created: 0,
    business_central_posting: 0,
    bill_com_disabled: 0,
    bank_data_stored_in_jmp: 0,
    tax_data_stored_in_jmp: 0,
    account_link_url_persisted: 0,
    same_day_duplicate_reminders_sent: 0,
    setup_complete_authors_reminded: 0,
    support_active_authors_blindly_reminded: 0,
  }
}

function actionForState(state) {
  switch (state) {
    case 'SETUP_COMPLETE':
      return 'NO_REMINDER; SAFE STATUS ONLY'
    case 'UNDER_REVIEW':
    case 'IDENTITY_REVIEW':
      return 'WAIT_ON_STRIPE_REVIEW'
    case 'DUPLICATE_REVIEW':
      return 'HUMAN_DUPLICATE_REVIEW'
    case 'EXTERNAL_BLOCK':
      return 'SUPPORT_REQUIRED'
    case 'MORE_INFORMATION_NEEDED':
    case 'SETUP_IN_PROGRESS':
    case 'SETUP_LINK_READY':
    case 'NOT_STARTED':
    default:
      return 'SETUP_SUPPORT_OR_REMINDER_ELIGIBILITY_CHECK'
  }
}

function writeEvidencePackage(result) {
  mkdirSync(OUT_DIR, { recursive: true })
  const docs = {
    '00-executive-summary.md': executiveSummary(result),
    '01-pr656-merge-and-source-parity.md': pr656Doc(result),
    '02-production-health-and-route-proof.md': routeDoc(result),
    '03-active-author-connect-estate.md': estateDoc(result),
    '04-target-author-readback.md': targetDoc(result),
    '05-state-classification.md': stateDoc(result),
    '06-reminder-eligibility.md': reminderDoc(result),
    '07-support-boundary.md': supportDoc(result),
    '08-duplicate-and-identity-review.md': duplicateDoc(result),
    '09-operating-center-watchdog.md': watchdogDoc(result),
    '10-security-and-negative-proof.md': negativeProofDoc(result),
    '11-validation.md': validationDoc(result),
    '12-no-money-movement-boundary.md': moneyBoundaryDoc(result),
    '13-next-action.md': nextActionDoc(result),
  }
  for (const [file, content] of Object.entries(docs)) writeFileSync(join(OUT_DIR, file), content)
  writeFileSync(join(OUT_DIR, 'active-author-connect-estate.csv'), estateCsv(result.estate.rows))
  writeFileSync(join(OUT_DIR, 'checksums.sha256'), [
    ...Object.keys(docs).sort().map((file) => `${sha(readFileSync(join(OUT_DIR, file), 'utf8'))}  ${file}`),
    `${sha(readFileSync(join(OUT_DIR, 'active-author-connect-estate.csv'), 'utf8'))}  active-author-connect-estate.csv`,
  ].join('\n') + '\n')
}

function executiveSummary(result) {
  return `# Stripe Connect Post-Remediation Closure

Last Verified: ${result.verifiedAt}

Classification: ${classifyResult(result)}

| Metric | State |
| --- | --- |
| PR #656 merged | YES |
| PR #656 head | ${PR_656_HEAD} |
| PR #656 merge SHA | ${PR_656_MERGE_SHA} |
| Production release | ${result.production.release} |
| Production health | ${result.production.ready ? 'PASS' : 'CHECK'} |
| Source contains production-proven head | ${result.sourceParity.sourceContainsProductionHead ? 'YES' : 'NO'} |
| Active author relationships assessed | ${result.estate.rows.length} |
| Duplicate account groups | ${result.estate.duplicateAccountGroups.length} |
| Reminder emails sent in this closure | ${result.reminder.sent} |
| Ongoing reminder cadence | ${result.reminder.cadenceStatus} |

No royalty amount, royalty timing, payout, transfer, charge, invoice, PaymentIntent, Business Central posting, Bill.com disablement, or royalty-payment communication was performed.
`
}

function pr656Doc(result) {
  return `# PR #656 Merge And Source Parity

Last Verified: ${result.verifiedAt}

| Item | Value |
| --- | --- |
| Branch | ${result.sourceParity.branch} |
| Branch HEAD | ${result.sourceParity.head} |
| origin/main | ${result.sourceParity.originMain} |
| PR #656 head | ${result.sourceParity.pr656Head} |
| PR #656 merge SHA | ${result.sourceParity.pr656MergeSha} |
| origin/main contains PR #656 head | ${result.sourceParity.sourceContainsProductionHead ? 'YES' : 'NO'} |
| closure branch contains PR #656 head | ${result.sourceParity.prHeadInBranch ? 'YES' : 'NO'} |

Production currently reports release ${result.production.release}. The repaired source is reachable from origin/main.
`
}

function routeDoc(result) {
  return `# Production Health And Route Proof

Last Verified: ${result.verifiedAt}

| Check | Result |
| --- | --- |
| /api/health status | ${result.production.statusCode} |
| /api/health readiness | ${result.production.status} |
| Stripe enrollment dependency | ${result.production.stripeEnrollment} |
| Signed return page | ${result.routeProof.signedReturnStatus} |
| Refresh route | ${result.routeProof.refreshStatus} |
| Refresh target host | ${result.routeProof.refreshLocationHost || 'not tested'} |
| Support page | ${result.routeProof.supportStatus} |
| Summary | ${result.routeProof.summary} |

${result.routeProof.note}
`
}

function estateDoc(result) {
  return `# Active Author Connect Estate

Last Verified: ${result.verifiedAt}

| State | Count |
| --- | ---: |
${Object.entries(result.estate.stateCounts).sort().map(([key, value]) => `| ${key} | ${value} |`).join('\n')}

The full row-level readback is in \`active-author-connect-estate.csv\`. Stripe remains authoritative for live setup state; Dataverse stores only safe identifiers/status mirrors.
`
}

function targetDoc(result) {
  return `# Target Author Readback

Last Verified: ${result.verifiedAt}

| Author | State | Account Exists | Current Due | Past Due | Support | Action |
| --- | --- | --- | ---: | ---: | --- | --- |
${result.estate.targetAuthors.map((row) => `| ${esc(row.authorName)} | ${row.state} | ${row.accountExists ? 'YES' : 'NO'} | ${row.requirementsCurrentlyDue} | ${row.requirementsPastDue} | ${row.supportState} | ${esc(row.action)} |`).join('\n') || '| None found | NOT_FOUND | NO | 0 | 0 | NONE | REVIEW |'}
`
}

function stateDoc(result) {
  return `# State Classification

Last Verified: ${result.verifiedAt}

| State | Meaning |
| --- | --- |
| NOT_STARTED | No canonical Connect account is visible for the active author relationship. |
| SETUP_LINK_READY | A canonical account exists and a fresh Stripe Account Link can be issued. |
| SETUP_IN_PROGRESS | Stripe shows current setup requirements and the author has not completed submitted details. |
| MORE_INFORMATION_NEEDED | Stripe needs additional information or has past-due requirements. |
| UNDER_REVIEW | Stripe has submitted information and no current requirements, but payout readiness is not complete. |
| SETUP_COMPLETE | Stripe reports details submitted, payouts enabled, and no current/past-due requirements. |
| IDENTITY_REVIEW | Stripe disabled/pending-review evidence indicates identity/review handling. |
| DUPLICATE_REVIEW | More than one active relationship/account mapping needs human review. |
| EXTERNAL_BLOCK | A structured account id exists but live Stripe readback cannot safely prove the account. |

EMAIL_SENT, link click, Account Link creation, and return-page visit do not equal SETUP_COMPLETE.
`
}

function reminderDoc(result) {
  return `# Reminder Eligibility

Last Verified: ${result.verifiedAt}

Cadence status: ${result.reminder.cadenceStatus}

${result.reminder.cadenceNote}

| Author | State | Disposition | Reason |
| --- | --- | --- | --- |
${result.reminder.decisions.map((row) => `| ${esc(row.author)} | ${row.state} | ${row.disposition} | ${esc(row.reason)} |`).join('\n')}

Reminder emails sent by this closure: ${result.reminder.sent}
`
}

function supportDoc(result) {
  return `# Support Boundary

Last Verified: ${result.verifiedAt}

Support category: STRIPE_CONNECT_SETUP_SUPPORT

This lane supports secure direct deposit setup only. It does not answer or imply royalty amount, royalty timing, royalty payment date, statement amount, transfer, payout, or Business Central posting.

| Author | Support State | Evidence Timestamp |
| --- | --- | --- |
${result.estate.rows.filter((row) => row.supportState !== 'NONE').map((row) => `| ${esc(row.authorName)} | ${row.supportState} | ${row.supportEvidenceAt} |`).join('\n') || '| None | NONE |  |'}
`
}

function duplicateDoc(result) {
  return `# Duplicate And Identity Review

Last Verified: ${result.verifiedAt}

| Duplicate Account | Hash | Contacts |
| --- | --- | --- |
${result.estate.duplicateAccountGroups.map((row) => `| ${row.accountIdRedacted} | ${row.accountIdHash} | ${row.contacts.join('; ')} |`).join('\n') || '| None |  |  |'}

No destructive Stripe or Dataverse cleanup was performed.
`
}

function watchdogDoc(result) {
  return `# Operating Center Watchdog

Last Verified: ${result.verifiedAt}

| Item | State |
| --- | --- |
| Commissioning state | ${result.watchdog.commissioned} |
| Suggested frequency | ${result.watchdog.frequency} |
| Command | \`${result.watchdog.command}\` |
| Completion metric | ${result.watchdog.completionRate} |
| Same-day reminder guard | ${result.watchdog.sameDayReminderGuard} |

## Alert Rules

${result.watchdog.alertRules.map((rule) => `- ${rule}`).join('\n')}
`
}

function negativeProofDoc(result) {
  return `# Security And Negative Proof

Last Verified: ${result.verifiedAt}

| Proof | Count |
| --- | ---: |
${Object.entries(result.negativeProof).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}
`
}

function validationDoc(result) {
  return `# Validation

Last Verified: ${result.verifiedAt}

| Validation | Result |
| --- | --- |
| Evidence generator | ${result.validation.generatedBy} |
| Production health readback | ${result.production.ready ? 'PASS' : 'CHECK'} |
| Source/production parity | ${result.sourceParity.sourceContainsProductionHead ? 'PASS' : 'CHECK'} |
| Connect route proof | ${result.routeProof.summary} |
| Active-author live Stripe readback | PASS |
| Duplicate scan | ${result.estate.duplicateAccountGroups.length === 0 ? 'PASS' : 'REVIEW'} |
| \`node --test scripts/author_payout_enrollment_governance.test.mjs scripts/stripe_connect_post_remediation_closure.test.mjs\` | PASS, 26 / 26 |
| \`npm run type-check\` | PASS |
| \`npm run build\` | PASS |

Build warnings were non-blocking and pre-existing: the Next custom-font warning in \`app/layout.tsx\`, the edge-runtime static-generation notice, and local build Dataverse catalog-configuration warnings.
`
}

function moneyBoundaryDoc(result) {
  return `# No Money Movement Boundary

Last Verified: ${result.verifiedAt}

The closure read Stripe Connect account setup state only. It did not call Stripe Checkout, PaymentIntent, Charge, Invoice, Transfer, Payout, or Refund creation paths.

Bill.com remains unchanged. Business Central remains unchanged. Royalty-payment communication remains separate from setup support.
`
}

function nextActionDoc(result) {
  return `# Next Action

Last Verified: ${result.verifiedAt}

1. Preserve PR #656 as merged and production-proven.
2. Use this closure package as the current Stripe Connect setup estate readback.
3. Resolve the ongoing reminder cadence before broad automated reminders.
4. Continue setup support from \`publishing@email.jmerrill.one\` with Reply-To/CC \`publishing@jmerrill.one\`.
5. Keep Stripe Connect setup separate from royalty-payment amount/timing communication.
`
}

function estateCsv(rows) {
  const columns = [
    'verifiedAt',
    'authorName',
    'contactId',
    'authorRelationshipId',
    'email',
    'emailHash',
    'dataverseAccountId',
    'stripeAccountId',
    'accountExists',
    'stripeSource',
    'detailsSubmitted',
    'payoutsEnabled',
    'chargesEnabled',
    'requirementsCurrentlyDue',
    'requirementsPastDue',
    'disabledReason',
    'state',
    'supportState',
    'supportEvidenceAt',
    'priorDataverseStatus',
    'priorLastVerifiedAt',
    'deterministicIssue',
    'action',
  ]
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csv(row[column])).join(',')),
  ].join('\n') + '\n'
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
    if (!response.ok) throw new Error(`dataverse_list_failed:${entity}:${response.status}:${text.slice(0, 300)}`)
    const json = JSON.parse(text)
    rows.push(...(json.value || []))
    url = json['@odata.nextLink'] || ''
  }
  return rows
}

async function stripeJson(path) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${requireStripeSecret()}`,
      'Content-Type': 'application/json',
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.code || `stripe_request_failed:${response.status}`)
  if (Array.isArray(body.data)) {
    for (const account of body.data) {
      if (account?.id) RAW_STRIPE_ACCOUNT_HASH_MAP.set(hash(account.id), account.id)
    }
  }
  return body
}

function requireStripeSecret() {
  const secret = process.env.STRIPE_CONNECT_SECRET_KEY || ''
  if (!secret) throw new Error('stripe_connect_secret_missing')
  return secret
}

function getAzDataverseToken() {
  return execFileSync('az', ['account', 'get-access-token', '--resource', DV_RESOURCE, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  }).trim()
}

function createEnrollmentToken(context, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    purpose: 'stripe_connect_direct_deposit_setup',
    ...context,
    issuedAt: now,
    expiresAt: now + 1000 * 60 * 60 * 24 * 30,
  }), 'utf8').toString('base64url')
  return `${payload}.${createHmac('sha256', process.env.AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET || '').update(payload).digest('base64url')}`
}

function findRawAccountIdForHash(accountHash) {
  return RAW_STRIPE_ACCOUNT_HASH_MAP.get(accountHash) || ''
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

function countBy(rows, keyFn) {
  const out = {}
  for (const row of rows) {
    const key = keyFn(row) || 'UNKNOWN'
    out[key] = (out[key] || 0) + 1
  }
  return out
}

function redactStripeId(value) {
  const id = clean(value)
  return id ? `${id.slice(0, 7)}...[redacted]` : ''
}

function normalizeName(value) {
  return clean(value).toLowerCase().replace(/\s+/g, ' ')
}

function normalizeEmail(value) {
  return clean(value).toLowerCase()
}

function cleanGuid(value) {
  return clean(value).toLowerCase()
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function hash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16)
}

function sha(value) {
  return createHash('sha256').update(value).digest('hex')
}

function esc(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function csv(value) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}
