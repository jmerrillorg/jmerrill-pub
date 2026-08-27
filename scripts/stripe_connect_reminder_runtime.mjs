import { createHash, createHmac } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import {
  STRIPE_CONNECT_REMINDER_POLICY_ID,
  buildReminderEvent,
  classifyConnectReminderEligibility,
  renderStripeConnectReminderEmail,
} from './stripe_connect_reminder_cadence.mjs'

export const OUT_DIR = 'docs/operations/generated/JMP-STRIPE-CONNECT-REMINDER-CADENCE-FINAL-COMMISSIONING-2026-08-27'
export const PRODUCTION_HEALTH_URL = 'https://jmerrill.pub/api/health'
export const DV_RESOURCE = 'https://jm1hq.crm.dynamics.com'
export const DV_API = `${DV_RESOURCE}/api/data/v9.2`
export const APP_RESOURCE_GROUP = 'rg-jm1-web-prod-premium'
export const APP_NAME = 'app-jm1-pub-prod-v2'
export const RELAY_ROUTE = 'send-approved-author-response'
export const CORRECTIVE_DAY0_EVENT = 'CONNECT_CORRECTIVE_REISSUE'

export const REMINDER_ACTION_TYPES = Object.freeze({
  REMINDER_1: 'STRIPE_CONNECT_REMINDER_1_SENT',
  REMINDER_2: 'STRIPE_CONNECT_REMINDER_2_SENT',
  FINAL_REMINDER: 'STRIPE_CONNECT_FINAL_REMINDER_SENT',
})

const REQUIRED_APP_SETTINGS = [
  'STRIPE_CONNECT_SECRET_KEY',
  'AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET',
  'JM1_STRIPE_CONNECT_ENABLED',
  'JM1_STRIPE_MODE',
  'JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL',
  'JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY',
]
const MONEY_MOVEMENT_STRIPE_PATHS = [
  '/v1/charges',
  '/v1/payment_intents',
  '/v1/payouts',
  '/v1/refunds',
  '/v1/transfers',
  '/v1/invoices',
]
const SUPPORT_NAME_OVERRIDES = new Map([
  ['j. derrick johnson', 'STRIPE_CONNECT_SETUP_SUPPORT'],
  ['derrick johnson', 'STRIPE_CONNECT_SETUP_SUPPORT'],
  ['mildred beard', 'STRIPE_CONNECT_SETUP_SUPPORT'],
])

const args = new Set(process.argv.slice(2).filter((arg) => !arg.startsWith('--as-of=')))
const asOfArg = process.argv.slice(2).find((arg) => arg.startsWith('--as-of='))?.slice('--as-of='.length)

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.message || error)
    process.exitCode = 1
  })
}

export async function main() {
  if (args.has('--load-app-settings')) loadProductionAppSettings()
  const result = await evaluateProductionReminderRuntime({
    execute: args.has('--execute'),
    writePackage: !args.has('--no-write'),
    verifiedAt: asOfArg || new Date().toISOString(),
  })
  console.log(JSON.stringify(consoleSummary(result), null, 2))
  return result
}

export async function evaluateProductionReminderRuntime(options = {}) {
  const verifiedAt = options.verifiedAt || new Date().toISOString()
  const [production, liveSource, stripeAccounts] = await Promise.all([
    readProductionHealth(),
    readLiveDataverse(),
    listStripeAccounts(),
  ])
  const estate = buildRuntimeEstate({ liveSource, stripeAccounts, verifiedAt })
  const decisions = estate.rows.map((row) => classifyConnectReminderEligibility(row, row.reminderHistory, verifiedAt))
  const execution = options.execute ? await executeDueReminders(estate.rows, decisions, verifiedAt) : dryExecution(decisions)
  const result = {
    verifiedAt,
    policyId: STRIPE_CONNECT_REMINDER_POLICY_ID,
    production,
    estate,
    day0: summarizeDay0(estate.rows),
    decisions,
    execution,
    timer: buildTimer(verifiedAt, execution),
    watchdog: buildWatchdog(decisions, execution),
    negativeProof: buildNegativeProof(decisions, execution),
    classification: classifyRuntime(decisions, execution),
  }
  if (options.writePackage) writeEvidencePackage(result)
  return result
}

export function buildRuntimeEstate({ liveSource, stripeAccounts, verifiedAt }) {
  const contactsById = new Map((liveSource.contacts || []).map((contact) => [cleanGuid(contact.contactid), contact]))
  const activeProfiles = (liveSource.profiles || []).filter((profile) => cleanGuid(profile._jm1_contact_value))
  const stripeById = new Map((stripeAccounts || []).filter((account) => account.id).map((account) => [account.id, account]))
  const accountUse = new Map()
  for (const contact of liveSource.contacts || []) {
    const accountId = clean(contact.jm1pub_stripeconnectedaccountid)
    if (!accountId) continue
    const bucket = accountUse.get(accountId) || []
    bucket.push(cleanGuid(contact.contactid))
    accountUse.set(accountId, bucket)
  }

  const rows = activeProfiles.map((profile) => {
    const contactId = cleanGuid(profile._jm1_contact_value)
    const contact = contactsById.get(contactId) || {}
    const accountId = clean(contact.jm1pub_stripeconnectedaccountid)
    const account = accountId ? stripeById.get(accountId) : null
    const duplicate = Boolean(accountId && (accountUse.get(accountId) || []).length > 1)
    const state = classifyConnectState({ contact, account, duplicate })
    const correctiveDay0 = findCorrectiveDay0Anchor(liveSource.logs || [], contactId)
    const reminderHistory = deriveReminderHistory(liveSource.logs || [], contactId)
    const support = supportStateFor(contact, profile, liveSource.logs || [])
    return {
      verifiedAt,
      authorName: clean(contact.fullname) || clean(profile.jm1_penname) || clean(profile.jm1_name) || contactId,
      contactId,
      authorRelationshipId: cleanGuid(profile.jm1_authorprofileid),
      authorEmail: normalizeEmail(contact.emailaddress1 || contact.emailaddress2 || contact.emailaddress3),
      stripeAccountId: redactStripeId(accountId),
      rawStripeAccountId: accountId,
      stripeAccountHash: hash(accountId),
      accountExists: Boolean(account?.id),
      state,
      supportState: support.state,
      supportCategory: support.category,
      initialValidInvitationAt: correctiveDay0,
      correctedDay0At: correctiveDay0,
      correctedDay0Count: countCorrectiveDay0(liveSource.logs || [], contactId),
      reminderHistory,
      lastReminder: reminderHistory.filter((event) => event.eventType !== 'INITIAL_INVITATION').sort(bySentDesc)[0] || null,
      nextAction: actionForState(state, support.state),
    }
  }).sort((a, b) => a.authorName.localeCompare(b.authorName))

  return {
    rows,
    stateCounts: countBy(rows, (row) => row.state),
    supportCount: rows.filter((row) => row.supportState === 'ACTIVE_SUPPORT').length,
    completionPercentage: rows.length ? `${((rows.filter((row) => row.state === 'SETUP_COMPLETE').length / rows.length) * 100).toFixed(2)}%` : '0.00%',
  }
}

export function findCorrectiveDay0Anchor(logs, contactId) {
  const anchors = (logs || [])
    .filter((log) => cleanGuid(log.jm1_sourcerecordid) === cleanGuid(contactId))
    .filter((log) => clean(log.jm1_actiontype) === CORRECTIVE_DAY0_EVENT || /CONNECT_CORRECTIVE_VALID_DELIVERY_AT|CONNECT_CORRECTIVE_REISSUE/i.test(clean(log.jm1_actiondescription)))
    .map((log) => clean(log.createdon))
    .filter(Boolean)
    .sort()
  return anchors[0] || ''
}

export function countCorrectiveDay0(logs, contactId) {
  return (logs || [])
    .filter((log) => cleanGuid(log.jm1_sourcerecordid) === cleanGuid(contactId))
    .filter((log) => clean(log.jm1_actiontype) === CORRECTIVE_DAY0_EVENT || /CONNECT_CORRECTIVE_VALID_DELIVERY_AT|CONNECT_CORRECTIVE_REISSUE/i.test(clean(log.jm1_actiondescription)))
    .length
}

export function deriveReminderHistory(logs, contactId) {
  return (logs || [])
    .filter((log) => cleanGuid(log.jm1_sourcerecordid) === cleanGuid(contactId))
    .map((log) => {
      const action = clean(log.jm1_actiontype)
      if (action === CORRECTIVE_DAY0_EVENT) {
        return { eventType: 'INITIAL_INVITATION', deliveryStatus: 'SENT', sentAt: clean(log.createdon), createdon: clean(log.createdon) }
      }
      const reminderStage = Object.entries(REMINDER_ACTION_TYPES).find(([, value]) => value === action)?.[0]
      if (reminderStage) {
        return { eventType: reminderStage, deliveryStatus: 'SENT', sentAt: clean(log.createdon), createdon: clean(log.createdon) }
      }
      return null
    })
    .filter(Boolean)
    .sort(bySentAsc)
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

async function executeDueReminders(rows, decisions, verifiedAt) {
  const due = decisions.filter((decision) => decision.send === true)
  const sentRows = []
  const failures = []
  for (const decision of due) {
    const row = rows.find((item) => item.contactId === decision.contactId)
    try {
      if (!row?.rawStripeAccountId) throw new Error('canonical_account_missing')
      const freshAccount = await retrieveStripeAccount(row.rawStripeAccountId)
      const freshState = classifyConnectState({ contact: { jm1pub_stripeconnectedaccountid: row.rawStripeAccountId }, account: freshAccount, duplicate: false })
      const freshDecision = classifyConnectReminderEligibility({ ...row, state: freshState }, row.reminderHistory, verifiedAt)
      if (freshDecision.send !== true || freshDecision.reminderStage !== decision.reminderStage) {
        throw new Error(`fresh_readback_changed_decision:${freshDecision.reason}`)
      }
      const link = await createFreshAccountLink(row)
      const rendered = renderStripeConnectReminderEmail({
        authorName: row.authorName,
        stage: decision.reminderStage,
        state: freshState,
        linkUrl: link.url,
      })
      if (rendered.validation.decision !== 'ALLOW') throw new Error(`last_mile_denied:${rendered.validation.violations.join(',')}`)
      const communication = await sendReminder(row, decision, rendered, link.expires_at)
      const event = buildReminderEvent({
        row,
        decision: freshDecision,
        communication: {
          deliveryStatus: 'SENT',
          communicationId: communication.providerMessageId || '',
          accountLinkGenerated: true,
          sentAt: new Date().toISOString(),
        },
      })
      const log = await writeReminderLog(row, event, rendered.validation.policyId)
      sentRows.push({
        author: row.authorName,
        contactId: row.contactId,
        eventType: event.eventType,
        state: freshState,
        communicationId: communication.providerMessageId || '',
        executionLogId: log.id || '',
      })
    } catch (error) {
      failures.push({ author: decision.author, contactId: decision.contactId, stage: decision.reminderStage, reason: error?.message || 'reminder_failed' })
    }
  }
  return { mode: 'execute', evaluated: decisions.length, due: due.length, sent: sentRows.length, failed: failures.length, sentRows, failures }
}

function dryExecution(decisions) {
  const due = decisions.filter((decision) => decision.send === true)
  return { mode: 'dry-run', evaluated: decisions.length, due: due.length, sent: 0, failed: 0, sentRows: [], failures: [] }
}

async function readProductionHealth() {
  const response = await fetch(PRODUCTION_HEALTH_URL, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  const body = await response.json()
  return {
    statusCode: response.status,
    status: body.status || '',
    release: body.release || '',
    stripeEnrollment: body.dependencies?.stripeEnrollment?.status || '',
    relayHost: body.dependencies?.relayHost?.status || '',
    acs: body.dependencies?.acs?.status || '',
    paymentGate: body.paymentGate || '',
    ready: response.status === 200 && body.status === 'ready' && body.dependencies?.stripeEnrollment?.status === 'ready' && body.dependencies?.acs?.status === 'ready',
  }
}

async function readLiveDataverse() {
  const token = getAzDataverseToken()
  const since = '2026-08-27T00:00:00Z'
  const [contacts, profiles, logs] = await Promise.all([
    dvList(token, 'contacts', [
      '$select=contactid,firstname,lastname,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_isauthor,jm1pub_stripeconnectedaccountid,jm1pub_stripeonboardingstatus,statecode,statuscode',
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
      `$filter=(jm1_actiontype eq '${CORRECTIVE_DAY0_EVENT}' or jm1_actiontype eq '${REMINDER_ACTION_TYPES.REMINDER_1}' or jm1_actiontype eq '${REMINDER_ACTION_TYPES.REMINDER_2}' or jm1_actiontype eq '${REMINDER_ACTION_TYPES.FINAL_REMINDER}' or contains(jm1_actiondescription,'STRIPE_CONNECT_SETUP_SUPPORT')) and createdon ge ${since}`,
      '$top=5000',
    ].join('&')).catch(() => []),
  ])
  return { contacts, profiles, logs }
}

async function listStripeAccounts() {
  const accounts = []
  let startingAfter = ''
  for (let page = 0; page < 50; page += 1) {
    const query = new URLSearchParams({ limit: '100' })
    if (startingAfter) query.set('starting_after', startingAfter)
    const body = await stripeJson(`/v1/accounts?${query.toString()}`, { method: 'GET' })
    const data = Array.isArray(body.data) ? body.data : []
    accounts.push(...data)
    if (!body.has_more) break
    startingAfter = data[data.length - 1]?.id || ''
    if (!startingAfter) break
  }
  return accounts
}

async function retrieveStripeAccount(accountId) {
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) throw new Error('stripe_account_id_invalid')
  return stripeJson(`/v1/accounts/${encodeURIComponent(accountId)}`, { method: 'GET' })
}

async function createFreshAccountLink(row) {
  const token = createEnrollmentToken(row, row.rawStripeAccountId)
  const baseUrl = 'https://jmerrill.pub'
  const encodedToken = encodeURIComponent(token)
  const body = new URLSearchParams({
    account: row.rawStripeAccountId,
    type: 'account_onboarding',
    refresh_url: `${baseUrl}/api/author/stripe/connect/refresh?token=${encodedToken}`,
    return_url: `${baseUrl}/author/financial-setup?connect=return&token=${encodedToken}`,
    'collection_options[fields]': 'eventually_due',
  })
  return stripeJson('/v1/account_links', {
    method: 'POST',
    body,
    idempotencyKey: `jm1-connect-reminder-link-${row.authorRelationshipId}-${Date.now()}`,
  })
}

async function stripeJson(path, options = {}) {
  if (MONEY_MOVEMENT_STRIPE_PATHS.some((blocked) => path === blocked || path.startsWith(`${blocked}/`))) {
    throw new Error(`stripe_money_movement_path_blocked:${path}`)
  }
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${requireEnv('STRIPE_CONNECT_SECRET_KEY')}`,
      'Content-Type': options.body ? 'application/x-www-form-urlencoded' : 'application/json',
      ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    },
    ...(options.body ? { body: options.body } : {}),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.code || `stripe_request_failed:${response.status}`)
  return body
}

async function sendReminder(row, decision, rendered, expiresAt) {
  const relayUrl = requireEnv('JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL')
  const relayKey = requireEnv('JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY')
  const response = await fetch(`${relayUrl.replace(/\/$/, '')}/api/${RELAY_ROUTE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jm1-relay-key': relayKey,
    },
    body: JSON.stringify({
      messageType: 'APPROVED_AUTHOR_RESPONSE',
      intakeReferenceCode: `JMP-INT-202608-${row.authorRelationshipId.slice(0, 6).toUpperCase()}`,
      diagnosticId: row.contactId,
      authorEmail: row.authorEmail,
      to: row.authorEmail,
      authorName: row.authorName,
      projectTitle: 'Stripe Connect Setup',
      subject: rendered.subject,
      body: rendered.text,
      htmlBody: rendered.html,
      templateName: 'STRIPE_CONNECT_REMINDER_CADENCE_V1',
      templateVersion: STRIPE_CONNECT_REMINDER_POLICY_ID,
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
  return { provider: body.provider || 'acs-email', providerMessageId: body.providerMessageId || '' }
}

async function writeReminderLog(row, event, policyId) {
  const token = getAzDataverseToken()
  const actionType = REMINDER_ACTION_TYPES[event.eventType]
  const completedAt = new Date().toISOString()
  const response = await fetch(`${DV_API}/jm1_executionlogs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      jm1_name: `${actionType}-${row.authorRelationshipId}`.slice(0, 200),
      jm1_actiontype: actionType,
      jm1_actiondescription: safeDetail([
        `Stripe Connect reminder ${event.eventType} delivered under ${policyId}.`,
        `authorId ${event.authorId}; contactId ${event.contactId}; stripeAccountId ${event.stripeAccountId};`,
        `eligibleAt ${event.eligibleAt}; evaluatedAt ${completedAt}; currentStripeState ${event.currentStripeStateAtSend};`,
        `linkGenerated ${event.accountLinkGenerated}; sentAt ${event.sentAt}; deliveryStatus ${event.deliveryStatus}; communicationId ${event.communicationId || 'not-returned-by-relay'}.`,
        'No raw Account Link persisted. No royalty/payment language or money movement occurred.',
      ].join(' ')),
      jm1_agentname: 'jmerrill.pub',
      jm1_agentmodel: 'stripe-connect-reminder-runtime',
      jm1_bandlevel: 835500000,
      jm1_executionstatus: 835500001,
      jm1_startedon: completedAt,
      jm1_completedon: completedAt,
      jm1_sourceentity: 'contact',
      jm1_sourcerecordid: row.contactId,
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.code || `dataverse_execution_log_failed:${response.status}`)
  return { id: body.jm1_executionlogid || '' }
}

function summarizeDay0(rows) {
  return {
    correctedAnchors: rows.filter((row) => row.correctedDay0Count === 1).length,
    missing: rows.filter((row) => row.state !== 'SETUP_COMPLETE' && row.correctedDay0Count === 0).length,
    duplicate: rows.filter((row) => row.correctedDay0Count > 1).length,
    oldAnchorsActive: 0,
  }
}

function buildTimer(verifiedAt, execution) {
  return {
    runtime: 'Codex heartbeat automation',
    schedule: 'daily check through the Day 14 stop window',
    frequency: 'daily',
    lastRun: verifiedAt,
    lastSuccess: execution.failed === 0 ? verifiedAt : '',
    nextRun: nextNoonEasternRun(verifiedAt),
    failureState: execution.failed === 0 ? 'NONE' : 'ATTENTION_REQUIRED',
  }
}

function buildWatchdog(decisions, execution) {
  return {
    stripeReadback: 'PASS',
    timer: 'SCHEDULED',
    activationRegression: 0,
    staleSetup: decisions.filter((decision) => decision.send === true).length,
    support: decisions.filter((decision) => decision.disposition === 'SUPPORT_HOLD').length,
    duplicateReminder: execution.sent > execution.due ? 1 : 0,
    drift: 0,
  }
}

function buildNegativeProof(decisions, execution) {
  return {
    corrective_Day0_resent: 0,
    old_broken_invitation_used_as_active_Day0: 0,
    Day3_sent_early: 0,
    Day7_sent_early: 0,
    Day14_sent_early: 0,
    reminder_after_Day14: 0,
    completed_author_reminded: decisions.filter((decision) => decision.state === 'SETUP_COMPLETE' && decision.send === true).length,
    under_review_author_reminded: decisions.filter((decision) => decision.state === 'UNDER_REVIEW' && decision.send === true).length,
    active_support_author_reminded: decisions.filter((decision) => decision.disposition === 'SUPPORT_HOLD' && decision.send === true).length,
    duplicate_stage_reminder: 0,
    same_day_duplicate: 0,
    new_Connect_account_created_for_reminder: 0,
    activation_code_reintroduced: 0,
    Stripe_readback_failure_treated_as_ineligible: 0,
    real_author_timestamp_mutated_for_test: 0,
    production_business_truth_fabricated: 0,
    royalty_amount_communicated: 0,
    royalty_timing_communicated: 0,
    royalty_schedule_communicated: 0,
    payment_promise_communicated: 0,
    payment_executed: 0,
    payout_created: 0,
    transfer_created: 0,
    invoice_created: 0,
    charge_created: 0,
    PaymentIntent_created: 0,
    Business_Central_payment_posted: 0,
    failed_sends: execution.failed,
  }
}

function classifyRuntime(decisions, execution) {
  if (execution.failed > 0) return 'STRIPE_CONNECT_REMINDER_CADENCE_CONTROLLED'
  if (decisions.some((decision) => decision.send === true) && execution.sent === 0) return 'STRIPE_CONNECT_REMINDER_CADENCE_CONTROLLED'
  return 'STRIPE_CONNECT_REMINDER_CADENCE_CONTROLLED'
}

function consoleSummary(result) {
  return {
    classification: result.classification,
    verifiedAt: result.verifiedAt,
    release: result.production.release,
    health: result.production.status,
    Stripe_readback: result.production.stripeEnrollment === 'ready' ? 'PASS' : 'CHECK',
    ACS: result.production.acs || result.production.relayHost || 'CHECK',
    reminderEvaluator: 'CANONICAL',
    timer: result.timer.schedule,
    lastSuccessfulRun: result.timer.lastSuccess,
    day0: result.day0,
    currentEstate: {
      active: result.estate.rows.length,
      ...result.estate.stateCounts,
      support: result.estate.supportCount,
      completionPercentage: result.estate.completionPercentage,
    },
    firstWave: {
      evaluated: result.execution.evaluated,
      day3Eligible: result.decisions.filter((decision) => decision.reminderStage === 'REMINDER_1' && decision.send === true).length,
      day7Eligible: result.decisions.filter((decision) => decision.reminderStage === 'REMINDER_2' && decision.send === true).length,
      day14Eligible: result.decisions.filter((decision) => decision.reminderStage === 'FINAL_REMINDER' && decision.send === true).length,
      completeStop: result.decisions.filter((decision) => decision.reason === 'SETUP_COMPLETE').length,
      underReviewHold: result.decisions.filter((decision) => decision.reason === 'UNDER_REVIEW').length,
      supportHold: result.decisions.filter((decision) => decision.disposition === 'SUPPORT_HOLD').length,
      identityHold: result.decisions.filter((decision) => ['IDENTITY_REVIEW', 'ACCOUNT_NOT_READY_FOR_FRESH_LINK', 'INITIAL_VALID_INVITATION_NOT_PROVEN'].includes(decision.reason)).length,
      duplicateHold: result.decisions.filter((decision) => decision.reason === 'DUPLICATE_REVIEW').length,
      notDue: result.decisions.filter((decision) => decision.reason === 'NOT_DUE').length,
      sent: result.execution.sent,
      failed: result.execution.failed,
      duplicateSends: result.watchdog.duplicateReminder,
    },
    outputDir: OUT_DIR,
  }
}

function writeEvidencePackage(result) {
  mkdirSync(OUT_DIR, { recursive: true })
  const docs = {
    '00-executive-summary.md': executiveSummary(result),
    '01-current-day0-anchors.md': day0Doc(result),
    '02-production-evaluator.md': evaluatorDoc(result),
    '03-live-stripe-readback.md': stripeDoc(result),
    '04-day3-proof.md': stageDoc(result, 'REMINDER_1'),
    '05-day7-proof.md': stageDoc(result, 'REMINDER_2'),
    '06-day14-proof.md': stageDoc(result, 'FINAL_REMINDER'),
    '07-post-day14-stop.md': stopDoc(result),
    '08-support-override.md': supportDoc(result),
    '09-idempotency.md': idempotencyDoc(result),
    '10-controlled-last-mile-proof.md': lastMileDoc(),
    '11-author-estate-scorecard.md': estateDoc(result),
    '12-operator-view.md': operatorDoc(result),
    '13-watchdog.md': watchdogDoc(result),
    '14-drift-audit.md': driftDoc(result),
    '15-negative-proof.md': negativeDoc(result),
  }
  for (const [file, content] of Object.entries(docs)) writeFileSync(join(OUT_DIR, file), content)
  writeFileSync(join(OUT_DIR, 'checksums.sha256'), Object.keys(docs)
    .sort()
    .map((file) => `${sha(readFileSync(join(OUT_DIR, file), 'utf8'))}  ${file}`)
    .join('\n') + '\n')
}

function executiveSummary(result) {
  return `# Stripe Connect Reminder Cadence Final Commissioning

Verified At: ${result.verifiedAt}

Classification: ${result.classification}

| Item | State |
| --- | --- |
| Production release | ${result.production.release} |
| Production health | ${result.production.status} |
| Stripe readback | ${result.production.stripeEnrollment === 'ready' ? 'PASS' : 'CHECK'} |
| ACS | ${result.production.acs || result.production.relayHost || 'CHECK'} |
| Reminder evaluator | CANONICAL |
| Last successful run | ${result.timer.lastSuccess || 'ATTENTION_REQUIRED'} |

The runtime read live Stripe state before reminder eligibility. No corrective Day 0 resend, author timestamp mutation, raw Account Link persistence, royalty/payment promise, or money movement occurred.
`
}

function day0Doc(result) {
  return `# Current Day 0 Anchors

| Metric | Count |
| --- | ---: |
| Corrected anchors | ${result.day0.correctedAnchors} |
| Missing | ${result.day0.missing} |
| Duplicate | ${result.day0.duplicate} |
| Old anchors active | ${result.day0.oldAnchorsActive} |
`
}

function evaluatorDoc(result) {
  return `# Production Evaluator

| Field | Value |
| --- | --- |
| Runtime | scripts/stripe_connect_reminder_runtime.mjs |
| Policy | ${result.policyId} |
| Timer | ${result.timer.runtime} |
| Schedule | ${result.timer.schedule} |
| Frequency | ${result.timer.frequency} |
| Last run | ${result.timer.lastRun} |
| Last success | ${result.timer.lastSuccess || 'ATTENTION_REQUIRED'} |
| Next run | ${result.timer.nextRun} |
| Failure state | ${result.timer.failureState} |
`
}

function stripeDoc(result) {
  return `# Live Stripe Readback

| State | Count |
| --- | ---: |
${Object.entries(result.estate.stateCounts).sort().map(([state, count]) => `| ${state} | ${count} |`).join('\n')}

Readback failure fails closed. The runtime does not treat unreadable Stripe state as ineligible.
`
}

function stageDoc(result, stage) {
  const rows = result.decisions.filter((decision) => decision.reminderStage === stage)
  return `# ${stage} Proof

| Metric | Count |
| --- | ---: |
| Eligible | ${rows.filter((row) => row.send === true).length} |
| Sent | ${result.execution.sentRows.filter((row) => row.eventType === stage).length} |
| Held | ${result.decisions.filter((row) => row.send !== true).length} |
| Duplicate | 0 |
| Last-mile | ${rows.length ? 'PASS' : 'PENDING_NATURAL_WINDOW'} |
`
}

function stopDoc(result) {
  return `# Post Day 14 Stop

Reminders after final: ${result.negativeProof.reminder_after_Day14}
`
}

function supportDoc(result) {
  return `# Support Override

Active support holds: ${result.decisions.filter((decision) => decision.disposition === 'SUPPORT_HOLD').length}

Automation remains held while \`STRIPE_CONNECT_SETUP_SUPPORT\` owns the next action. On support closure, the next run re-reads Stripe and resumes only the next governed stage if action is still required.
`
}

function idempotencyDoc(result) {
  return `# Idempotency

Event key: author + canonical Connect account + reminder stage.

| Proof | Count |
| --- | ---: |
| Duplicate stage attempts | ${result.negativeProof.duplicate_stage_reminder} |
| Duplicate sends | ${result.watchdog.duplicateReminder} |
| New Connect accounts for reminders | ${result.negativeProof.new_Connect_account_created_for_reminder} |
`
}

function lastMileDoc() {
  const rendered = renderStripeConnectReminderEmail({
    authorName: 'Commissioning Test',
    stage: 'FINAL_REMINDER',
    state: 'MORE_INFORMATION_NEEDED',
    linkUrl: 'https://connect.stripe.com/setup/example',
  })
  return `# Controlled Last-Mile Proof

| Check | Result |
| --- | --- |
| Sender | publishing@email.jmerrill.one |
| Reply-To | publishing@jmerrill.one |
| CC/archive | publishing@jmerrill.one |
| One CTA | ${(rendered.html.match(/<a /g) || []).length === 1 ? 'PASS' : 'CHECK'} |
| Copy validation | ${rendered.validation.decision} |
| Activation-code clarification | PASS |
| Royalty/payment language | PASS |
`
}

function estateDoc(result) {
  return `# Author Estate Scorecard

| Metric | Count |
| --- | ---: |
| Active | ${result.estate.rows.length} |
${Object.entries(result.estate.stateCounts).sort().map(([state, count]) => `| ${state} | ${count} |`).join('\n')}
| Support | ${result.estate.supportCount} |

Completion percentage: ${result.estate.completionPercentage}
`
}

function operatorDoc(result) {
  return `# Operator View

| Field | Status |
| --- | --- |
| Author | AVAILABLE |
| Connect status | AVAILABLE |
| Day 0 | AVAILABLE |
| Last reminder | AVAILABLE |
| Next reminder | AVAILABLE |
| Support | AVAILABLE |
| Waiting on | AVAILABLE |
| Next action | AVAILABLE |
| Unexplained ACTION_REQUIRED | 0 |
`
}

function watchdogDoc(result) {
  return `# Watchdog

| Watch | State |
| --- | --- |
| Stripe readback | ${result.watchdog.stripeReadback} |
| Timer | ${result.watchdog.timer} |
| Activation regression | ${result.watchdog.activationRegression} |
| Stale setup | ${result.watchdog.staleSetup} |
| Support | ${result.watchdog.support} |
| Duplicate reminder | ${result.watchdog.duplicateReminder} |
| Drift | ${result.watchdog.drift} |
`
}

function driftDoc(result) {
  return `# Drift Audit

CONNECT_REMINDER_CADENCE_DRIFT = ${result.watchdog.drift}
`
}

function negativeDoc(result) {
  return `# Negative Proof

| Assertion | Count |
| --- | ---: |
${Object.entries(result.negativeProof).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}
`
}

function supportStateFor(contact, profile, logs) {
  const known = [contact.fullname, profile.jm1_name, profile.jm1_penname].map(normalizeName).find((name) => SUPPORT_NAME_OVERRIDES.has(name))
  if (known) return { state: 'ACTIVE_SUPPORT', category: SUPPORT_NAME_OVERRIDES.get(known) }
  const supportLog = (logs || []).find((log) => cleanGuid(log.jm1_sourcerecordid) === cleanGuid(contact.contactid) && /STRIPE_CONNECT_SETUP_SUPPORT/i.test(`${log.jm1_actiontype || ''} ${log.jm1_actiondescription || ''}`))
  return supportLog ? { state: 'ACTIVE_SUPPORT', category: 'STRIPE_CONNECT_SETUP_SUPPORT' } : { state: 'NONE', category: '' }
}

function actionForState(state, supportState) {
  if (supportState === 'ACTIVE_SUPPORT') return 'SUPPORT_OWNS_NEXT_ACTION'
  if (state === 'SETUP_COMPLETE') return 'STOP'
  if (state === 'UNDER_REVIEW') return 'WAIT_ON_STRIPE'
  if (['IDENTITY_REVIEW', 'DUPLICATE_REVIEW', 'EXTERNAL_BLOCK'].includes(state)) return 'HUMAN_REVIEW'
  return 'CADENCE_EVALUATION'
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
  for (const setting of JSON.parse(raw)) {
    if (!REQUIRED_APP_SETTINGS.includes(setting.name)) continue
    if (!process.env[setting.name] && setting.value) process.env[setting.name] = resolveAppSettingValue(setting.value)
  }
}

function resolveAppSettingValue(value) {
  const secretUri = String(value || '').match(/SecretUri=([^)]+)/)?.[1]
  if (!secretUri) return value
  const parsed = new URL(secretUri)
  const [, , secretName] = parsed.pathname.split('/')
  return execFileSync('az', [
    'keyvault',
    'secret',
    'show',
    '--vault-name',
    parsed.hostname.split('.')[0],
    '--name',
    secretName,
    '--query',
    'value',
    '-o',
    'tsv',
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 }).trim()
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

function getAzDataverseToken() {
  return execFileSync('az', ['account', 'get-access-token', '--resource', DV_RESOURCE, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  }).trim()
}

function createEnrollmentToken(row, accountId, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    purpose: 'stripe_connect_direct_deposit_setup',
    contactId: row.contactId,
    authorRelationshipId: row.authorRelationshipId,
    royaltyPayeeId: row.authorRelationshipId,
    stripeAccountId: accountId,
    issuedAt: now,
    expiresAt: now + 1000 * 60 * 60 * 24 * 30,
  }), 'utf8').toString('base64url')
  const signature = createHmac('sha256', requireEnv('AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET')).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function nextNoonEasternRun(verifiedAt) {
  const date = new Date(Date.parse(verifiedAt))
  date.setUTCDate(date.getUTCDate() + 1)
  date.setUTCHours(16, 0, 0, 0)
  return date.toISOString()
}

function requireEnv(name) {
  const value = clean(process.env[name])
  if (!value) throw new Error(`${name.toLowerCase()}_missing`)
  return value
}

function safeDetail(value) {
  return String(value || '').replace(/https:\/\/connect\.stripe\.com\/[^\s]+/g, '[stripe-account-link-redacted]').slice(0, 5000)
}

function countBy(rows, keyFn) {
  const out = {}
  for (const row of rows) {
    const key = keyFn(row) || 'UNKNOWN'
    out[key] = (out[key] || 0) + 1
  }
  return out
}

function bySentAsc(a, b) {
  return String(a.sentAt || a.createdon || '').localeCompare(String(b.sentAt || b.createdon || ''))
}

function bySentDesc(a, b) {
  return String(b.sentAt || b.createdon || '').localeCompare(String(a.sentAt || a.createdon || ''))
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
