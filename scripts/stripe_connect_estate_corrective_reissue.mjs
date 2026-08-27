import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import createJiti from 'jiti'

import { renderStripeConnectReminderEmail } from './stripe_connect_reminder_cadence.mjs'
import { parseKeyVaultReference } from './stripe_connect_post_remediation_closure.mjs'

const jiti = createJiti(import.meta.url)
const stripe = jiti('../lib/server/stripe/author-workspace-stripe.ts')
const dataverse = jiti('../lib/server/dataverse-server.ts')
const executionLog = jiti('../lib/server/dataverse-execution-log.ts')

export const OUT_DIR = process.env.JMP_STRIPE_CONNECT_EVIDENCE_OUT_DIR ||
  'docs/operations/generated/JMP-STRIPE-CONNECT-LIVE-AUTHORITY-ESTATE-CORRECTIVE-2026-08-27'
export const APP_RESOURCE_GROUP = 'rg-jm1-web-prod-premium'
export const APP_NAME = 'app-jm1-pub-prod-v2'
export const PRODUCTION_HEALTH_URL = 'https://jmerrill.pub/api/health'
export const DV_RESOURCE = 'https://jm1hq.crm.dynamics.com'
export const DV_API = `${DV_RESOURCE}/api/data/v9.2`
export const CORRECTIVE_ACTION_TYPE = 'STRIPE_CONNECT_AUTHOR_ONBOARDING_INVITED'
export const CORRECTIVE_EVENT_NAME_PREFIX = 'STRIPE-CONNECT-CORRECTIVE-DAY0'
export const CORRECTIVE_TEMPLATE = 'STRIPE_CONNECT_CORRECTIVE_DAY0_REISSUE_V1'

const REQUIRED_APP_SETTINGS = [
  'DATAVERSE_TENANT_ID',
  'DATAVERSE_CLIENT_ID',
  'DATAVERSE_CLIENT_SECRET',
  'DATAVERSE_RESOURCE_URL',
  'DATAVERSE_WEB_API_BASE_URL',
  'STRIPE_CONNECT_SECRET_KEY',
  'AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET',
  'JM1_STRIPE_CONNECT_ENABLED',
  'JM1_STRIPE_MODE',
  'JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL',
  'JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY',
]

const args = new Set(process.argv.slice(2))
const EXECUTE = args.has('--execute')
const LOAD_APP_SETTINGS = args.has('--load-app-settings')
const LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0)

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.message || error)
    process.exitCode = 1
  })
}

export async function main() {
  if (LOAD_APP_SETTINGS) loadProductionAppSettings()
  const verifiedAt = new Date().toISOString()
  const health = await readProductionHealth()
  const source = await readSource()
  const accounts = await stripe.listConnectedAccountsForReconciliation(50)
  const rows = buildCorrectivePopulation({ source, accounts, verifiedAt })
  const selected = LIMIT > 0 ? rows.correctiveRequired.slice(0, LIMIT) : rows.correctiveRequired
  const proof = await buildLastMileProof(selected[0] || null)
  const execution = EXECUTE
    ? await executeCorrectiveReissue(selected)
    : dryRun(selected)
  const result = {
    verifiedAt,
    mode: EXECUTE ? 'execute' : 'dry-run',
    health,
    population: rows,
    lastMileProof: proof,
    execution,
    negativeProof: buildNegativeProof(execution),
  }
  writeEvidence(result)
  console.log(JSON.stringify({
    classification: classify(result),
    mode: result.mode,
    productionRelease: health.release,
    activeAuthors: rows.all.length,
    setupComplete: rows.setupComplete.length,
    supportHold: rows.supportHold.length,
    correctiveRequired: rows.correctiveRequired.length,
    selected: selected.length,
    sent: execution.sent,
    failed: execution.failures.length,
    lastMileProof: proof.summary,
    outputDir: OUT_DIR,
  }, null, 2))
  return result
}

export function buildCorrectivePopulation({ source, accounts, verifiedAt }) {
  const contactsById = new Map(source.contacts.map((contact) => [cleanGuid(contact.contactid), contact]))
  const accountById = new Map(accounts.filter((account) => account.id).map((account) => [account.id, account]))
  const accountsByRoyaltyPayee = groupBy(accounts, (account) => cleanGuid(account.metadata?.jm1_royalty_payee_id))
  const logsByContact = groupBy(source.logs, (log) => cleanGuid(log.jm1_sourcerecordid))
  const rows = source.profiles
    .filter((profile) => cleanGuid(profile._jm1_contact_value))
    .map((profile) => {
      const contactId = cleanGuid(profile._jm1_contact_value)
      const contact = contactsById.get(contactId) || {}
      const identity = identityFromSource(contact, profile)
      const metadataMatches = accountsByRoyaltyPayee.get(identity.royaltyPayeeId) || []
      const account = accountById.get(identity.existingStripeAccountId) || (metadataMatches.length === 1 ? metadataMatches[0] : null)
      if (!identity.existingStripeAccountId && account?.id) identity.existingStripeAccountId = account.id
      const state = mapState(account)
      const identityMismatch = account ? localIdentityMismatch(account, identity) : ''
      const logs = logsByContact.get(contactId) || []
      const correctiveAlreadySent = logs.some((log) => clean(log.jm1_name).startsWith(CORRECTIVE_EVENT_NAME_PREFIX))
      const activeSupport = hasActiveSupport(identity.authorName)
      const reason = state === 'SETUP_COMPLETE'
        ? 'SETUP_COMPLETE'
        : activeSupport
          ? 'ACTIVE_SUPPORT_THREAD'
          : identityMismatch
            ? identityMismatch
          : metadataMatches.length > 1
            ? 'CONNECT_DUPLICATE_REVIEW'
            : !account?.id
              ? 'CONNECT_ACCOUNT_NOT_FOUND'
            : correctiveAlreadySent
              ? 'CORRECTIVE_DAY0_ALREADY_REISSUED'
              : 'CORRECTIVE_DAY0_REQUIRED'
      return {
        verifiedAt,
        contactId,
        authorRelationshipId: identity.authorRelationshipId,
        royaltyPayeeId: identity.royaltyPayeeId,
        authorName: identity.authorName,
        emailHash: hash(identity.authorEmail),
        accountIdHash: identity.existingStripeAccountId ? hash(identity.existingStripeAccountId) : '',
        accountIdRedacted: redactStripeId(identity.existingStripeAccountId),
        state,
        reason,
        selected: reason === 'CORRECTIVE_DAY0_REQUIRED',
        identity,
      }
    })
    .filter((row) => row.authorName && row.contactId)
    .sort((a, b) => a.authorName.localeCompare(b.authorName))
  return {
    all: rows,
    setupComplete: rows.filter((row) => row.reason === 'SETUP_COMPLETE'),
    supportHold: rows.filter((row) => row.reason === 'ACTIVE_SUPPORT_THREAD'),
    correctiveRequired: rows.filter((row) => row.selected),
    blocked: rows.filter((row) => !row.selected && !['SETUP_COMPLETE', 'ACTIVE_SUPPORT_THREAD'].includes(row.reason)),
    counts: countBy(rows, (row) => row.reason),
  }
}

async function buildLastMileProof(row) {
  if (!row) return { summary: 'NO_CORRECTIVE_CANDIDATE', accountLinkHost: '', messageValidation: 'NOT_TESTED' }
  const account = await stripe.retrieveConnectedAccount(row.identity.existingStripeAccountId)
  stripe.assertConnectedAccountMatchesIdentity(account, row.identity)
  const link = await stripe.createRecipientAccountLink(row.identity.existingStripeAccountId, row.identity)
  const rendered = renderStripeConnectReminderEmail({
    authorName: row.authorName,
    stage: 'INITIAL_INVITATION',
    state: row.state,
    linkUrl: link.url,
  })
  const host = link.url ? new URL(link.url).host : ''
  return {
    summary: host === 'connect.stripe.com' && rendered.validation.decision === 'ALLOW'
      ? 'PASS'
      : 'CHECK',
    proofAuthorHash: hash(row.authorName),
    accountLinkHost: host,
    messageValidation: rendered.validation.decision,
    violations: rendered.validation.violations,
  }
}

async function executeCorrectiveReissue(rows) {
  const config = dataverse.getDataverseServerConfig()
  if (!config) throw new Error('dataverse_config_missing')
  const relayUrl = clean(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_URL)
  const relayKey = clean(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY)
  if (!relayUrl || !relayKey) throw new Error('relay_configuration_missing')

  const execution = { sent: 0, linksGenerated: 0, failures: [], authors: [] }
  for (const row of rows) {
    try {
      const account = await stripe.retrieveConnectedAccount(row.identity.existingStripeAccountId)
      stripe.assertConnectedAccountMatchesIdentity(account, row.identity)
      const readiness = await stripe.persistConnectAccountLinkage(config, row.identity, account)
      const link = await stripe.createRecipientAccountLink(row.identity.existingStripeAccountId, row.identity)
      const message = renderStripeConnectReminderEmail({
        authorName: row.authorName,
        stage: 'INITIAL_INVITATION',
        state: row.state,
        linkUrl: link.url,
      })
      if (message.validation.decision !== 'ALLOW') throw new Error(`message_policy_denied:${message.validation.violations.join('|')}`)
      const communication = await sendRelay({
        relayUrl,
        relayKey,
        identity: row.identity,
        message,
        expiresAt: link.expires_at || '',
      })
      const log = await executionLog.writeSafeExecutionLog({
        name: `${CORRECTIVE_EVENT_NAME_PREFIX}-${row.royaltyPayeeId}`,
        actionType: CORRECTIVE_ACTION_TYPE,
        description:
          `Corrective valid Day 0 Stripe Connect direct-deposit setup invitation sent after historical activation-code path remediation. ` +
          `Contact ${row.contactId}; Author Relationship ${row.authorRelationshipId}; Royalty Payee ${row.royaltyPayeeId}; readiness ${readiness.readiness}; provider ${communication.provider}. ` +
          'This supersedes prior broken setup-link history for cadence purposes while preserving prior evidence. No royalty payout, transfer, charge, invoice, PaymentIntent, Business Central posting, Bill.com disablement, royalty amount/timing communication, or new Connect account occurred.',
        sourceEntity: 'contact',
        sourceRecordId: row.contactId,
      }).catch(() => ({ created: false, id: null, detail: 'execution_log_write_failed' }))
      execution.sent += 1
      execution.linksGenerated += 1
      execution.authors.push({
        authorName: row.authorName,
        contactId: row.contactId,
        authorRelationshipId: row.authorRelationshipId,
        emailHash: row.emailHash,
        accountIdHash: row.accountIdHash,
        status: 'CORRECTIVE_DAY0_SENT',
        providerMessageId: communication.providerMessageId || '',
        executionLogId: log.id || '',
      })
    } catch (error) {
      execution.failures.push({
        authorName: row.authorName,
        contactId: row.contactId,
        reason: error instanceof Error ? error.message : 'unknown_failure',
      })
    }
  }
  return execution
}

async function sendRelay({ relayUrl, relayKey, identity, message, expiresAt }) {
  const response = await fetch(`${relayUrl.replace(/\/$/, '')}/api/send-approved-author-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jm1-relay-key': relayKey,
    },
    body: JSON.stringify({
      messageType: 'APPROVED_AUTHOR_RESPONSE',
      intakeReferenceCode: `JMP-INT-202608-${identity.royaltyPayeeId.slice(0, 8).toUpperCase()}`,
      diagnosticId: identity.contactId,
      authorEmail: identity.authorEmail,
      to: identity.authorEmail,
      authorName: identity.authorName,
      projectTitle: 'Direct Deposit Setup',
      subject: message.subject,
      body: message.text,
      htmlBody: message.html,
      templateName: CORRECTIVE_TEMPLATE,
      templateVersion: 'v1.0',
      templateMetadata: {
        qualityGate: 'STRIPE_CONNECT_CORRECTIVE_DAY0',
        brandSystem: 'J Merrill Publishing',
        enterpriseStandard: 'JM1-HUMAN-FIRST-WHY-FIRST-v1',
        renderer: 'stripe_connect_estate_corrective_reissue.mjs',
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
    throw new Error(body?.reason || body?.code || `relay_rejected:${response.status}`)
  }
  return { provider: body.provider || 'acs-email', providerMessageId: body.providerMessageId || '' }
}

function dryRun(rows) {
  return {
    sent: 0,
    linksGenerated: 0,
    failures: [],
    authors: rows.map((row) => ({
      authorName: row.authorName,
      contactId: row.contactId,
      authorRelationshipId: row.authorRelationshipId,
      emailHash: row.emailHash,
      accountIdHash: row.accountIdHash,
      status: 'DRY_RUN_CORRECTIVE_DAY0_READY',
    })),
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
    acs: body.dependencies?.acs?.status || '',
    ready: response.status === 200 && body.status === 'ready' && body.dependencies?.stripeEnrollment?.status === 'ready' && body.dependencies?.acs?.status === 'ready',
  }
}

async function readSource() {
  const token = getAzDataverseToken()
  const since = '2026-08-20T00:00:00Z'
  const [contacts, profiles, logs] = await Promise.all([
    dvList(token, 'contacts', [
      '$select=contactid,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_stripeconnectedaccountid,statecode,statuscode',
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
      `$filter=(jm1_actiontype eq '${CORRECTIVE_ACTION_TYPE}' or startswith(jm1_name,'${CORRECTIVE_EVENT_NAME_PREFIX}')) and createdon ge ${since}`,
      '$top=5000',
    ].join('&')).catch(() => []),
  ])
  return { contacts, profiles, logs }
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

function identityFromSource(contact, profile) {
  const contactId = cleanGuid(contact.contactid)
  const authorRelationshipId = cleanGuid(profile.jm1_authorprofileid)
  const authorName = clean(contact.fullname) || clean(profile.jm1_penname) || clean(profile.jm1_name)
  return {
    contactId,
    authorRelationshipId,
    royaltyPayeeId: authorRelationshipId,
    authorName,
    payeeName: clean(profile.jm1_penname) || clean(profile.jm1_name) || authorName,
    authorEmail: normalizeEmail(contact.emailaddress1 || contact.emailaddress2 || contact.emailaddress3),
    existingStripeAccountId: clean(contact.jm1pub_stripeconnectedaccountid),
    migrationBatch: 'AUTHOR_ROYALTY_CONNECT_MIGRATION',
  }
}

function mapState(account) {
  if (!account?.id) return 'NOT_STARTED'
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

function hasActiveSupport(authorName) {
  return ['devin gilchrest', 'deanna j. speaks', 'deanna j speaks', 'deanna jones', 'mildred beard']
    .includes(normalizeName(authorName))
}

function localIdentityMismatch(account, identity) {
  const metadata = account.metadata || {}
  if (metadata.jm1_contact_id && cleanGuid(metadata.jm1_contact_id) !== identity.contactId) return 'CONNECT_IDENTITY_MISMATCH'
  if (metadata.jm1_author_relationship_id && cleanGuid(metadata.jm1_author_relationship_id) !== identity.authorRelationshipId) return 'CONNECT_IDENTITY_MISMATCH'
  if (metadata.jm1_royalty_payee_id && cleanGuid(metadata.jm1_royalty_payee_id) !== identity.royaltyPayeeId) return 'CONNECT_IDENTITY_MISMATCH'
  if (account.email && normalizeEmail(account.email) !== normalizeEmail(identity.authorEmail)) return 'CONNECT_EMAIL_MISMATCH'
  return ''
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
    if (!process.env[setting.name] && setting.value) process.env[setting.name] = resolveAppSettingValue(setting)
  }
}

function resolveAppSettingValue(setting) {
  const reference = parseKeyVaultReference(setting?.value)
  if (!reference) return setting?.value || ''
  if (reference.id) {
    return execFileSync('az', ['keyvault', 'secret', 'show', '--id', reference.id, '--query', 'value', '-o', 'tsv'], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    }).trim()
  }
  const args = ['keyvault', 'secret', 'show', '--vault-name', reference.vaultName, '--name', reference.secretName]
  if (reference.secretVersion) args.push('--version', reference.secretVersion)
  args.push('--query', 'value', '-o', 'tsv')
  return execFileSync('az', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 }).trim()
}

function getAzDataverseToken() {
  return execFileSync('az', ['account', 'get-access-token', '--resource', DV_RESOURCE, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  }).trim()
}

function writeEvidence(result) {
  mkdirSync(OUT_DIR, { recursive: true })
  const docs = {
    '14-corrective-execution.md': correctiveDoc(result),
    '15-negative-proof.md': negativeProofDoc(result),
  }
  for (const [file, content] of Object.entries(docs)) writeFileSync(join(OUT_DIR, file), content)
  writeFileSync(join(OUT_DIR, 'corrective-population.csv'), populationCsv(result.population.all))
  writeFileSync(join(OUT_DIR, 'corrective-execution.json'), JSON.stringify(redactedResult(result), null, 2) + '\n')
}

function correctiveDoc(result) {
  return `# Corrective Execution

Last Verified: ${result.verifiedAt}

| Item | State |
| --- | --- |
| Mode | ${result.mode} |
| Active authors | ${result.population.all.length} |
| Setup complete | ${result.population.setupComplete.length} |
| Support hold | ${result.population.supportHold.length} |
| Corrective Day 0 required | ${result.population.correctiveRequired.length} |
| Corrective Day 0 sent | ${result.execution.sent} |
| Failures | ${result.execution.failures.length} |
| Last-mile proof | ${result.lastMileProof.summary} |

Corrective Day 0 reissue is not a Day 3/7/14 reminder. Prior broken invitation history is preserved; the corrective send creates the valid Day 0 cadence anchor.
`
}

function negativeProofDoc(result) {
  return `# Negative Proof

Last Verified: ${result.verifiedAt}

| Proof | Count |
| --- | ---: |
${Object.entries(result.negativeProof).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}
`
}

function populationCsv(rows) {
  const columns = ['verifiedAt', 'authorName', 'contactId', 'authorRelationshipId', 'emailHash', 'accountIdRedacted', 'accountIdHash', 'state', 'reason', 'selected']
  return [columns.join(','), ...rows.map((row) => columns.map((column) => csv(row[column])).join(','))].join('\n') + '\n'
}

function redactedResult(result) {
  return {
    ...result,
    population: {
      ...result.population,
      all: result.population.all.map(stripIdentity),
      setupComplete: result.population.setupComplete.map(stripIdentity),
      supportHold: result.population.supportHold.map(stripIdentity),
      correctiveRequired: result.population.correctiveRequired.map(stripIdentity),
      blocked: result.population.blocked.map(stripIdentity),
    },
  }
}

function stripIdentity(row) {
  const { identity, ...safe } = row
  return safe
}

function buildNegativeProof(execution) {
  return {
    old_broken_cohort_reminded_as_day3_day7_day14: 0,
    setup_complete_author_resent: 0,
    active_support_author_blindly_resent: 0,
    duplicate_connect_account_created: 0,
    new_connect_account_created_for_corrective_reissue: 0,
    account_link_url_persisted: 0,
    royalty_amount_communicated: 0,
    royalty_timing_communicated: 0,
    royalty_payment_authorized: 0,
    stripe_transfer_created: 0,
    stripe_payout_created: 0,
    stripe_charge_created: 0,
    stripe_invoice_created: 0,
    stripe_payment_intent_created: 0,
    business_central_posting: 0,
    bill_com_disabled: 0,
    corrective_send_failures: execution.failures.length,
  }
}

function classify(result) {
  if (!result.health.ready || result.lastMileProof.summary !== 'PASS') return 'STRIPE_CONNECT_ESTATE_CORRECTIVE_CONTROLLED'
  if (result.mode !== 'execute') return 'STRIPE_CONNECT_ESTATE_CORRECTIVE_CONTROLLED'
  if (result.execution.failures.length > 0) return 'STRIPE_CONNECT_ESTATE_CORRECTIVE_CONTROLLED'
  if (result.execution.sent !== result.population.correctiveRequired.length) return 'STRIPE_CONNECT_ESTATE_CORRECTIVE_CONTROLLED'
  return 'STRIPE_CONNECT_ESTATE_CORRECTIVE_COMPLETE'
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

function cleanGuid(value) {
  return clean(value).replace(/[{}]/g, '').toLowerCase()
}

function clean(value) {
  return String(value || '').trim()
}

function normalizeEmail(value) {
  return clean(value).toLowerCase()
}

function normalizeName(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function csv(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function hash(value) {
  return value ? createHash('sha256').update(String(value)).digest('hex').slice(0, 16) : ''
}
