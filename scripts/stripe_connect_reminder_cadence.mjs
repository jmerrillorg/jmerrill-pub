export const STRIPE_CONNECT_REMINDER_POLICY_ID = 'JMP-STRIPE-CONNECT-REMINDER-CADENCE-v1'
export const STRIPE_CONNECT_REMINDER_POLICY_VERSION = '1.0'
export const AUTOMATED_REMINDER_COUNT_MAX = 3

export const REMINDER_STAGES = Object.freeze([
  { eventType: 'INITIAL_INVITATION', cadenceDay: 0, label: 'DAY_0', action: 'INITIAL_INVITATION' },
  { eventType: 'REMINDER_1', cadenceDay: 3, label: 'DAY_3', action: 'FIRST_REMINDER' },
  { eventType: 'REMINDER_2', cadenceDay: 7, label: 'DAY_7', action: 'SECOND_REMINDER' },
  { eventType: 'FINAL_REMINDER', cadenceDay: 14, label: 'DAY_14', action: 'FINAL_AUTOMATED_REMINDER' },
])

export const REMINDER_ELIGIBLE_STATES = Object.freeze([
  'NOT_STARTED',
  'SETUP_LINK_READY',
  'SETUP_IN_PROGRESS',
  'MORE_INFORMATION_NEEDED',
])

export const REMINDER_STOP_STATES = Object.freeze([
  'SETUP_COMPLETE',
  'UNDER_REVIEW',
  'IDENTITY_REVIEW',
  'DUPLICATE_REVIEW',
  'EXTERNAL_BLOCK',
])

const PROHIBITED_COPY_PATTERNS = [
  /\brequirements\.currently_due\b/i,
  /\bpayouts_enabled\b/i,
  /\bcapabilities\b/i,
  /\baccount object\b/i,
  /\bactivation token\b/i,
  /\bruntime\b/i,
  /\bartifact\b/i,
  /\bsystem attention\b/i,
  /\broyalty amount\b/i,
  /\broyalty calculation\b/i,
  /\broyalty payment date\b/i,
  /\bpayment timing\b/i,
  /\bpayment schedule\b/i,
  /\bpromise of payment\b/i,
  /\bpayout\b/i,
  /\btransfer\b/i,
  /\bcharge\b/i,
  /\binvoice\b/i,
  /\bpaymentintent\b/i,
]

export function classifyConnectReminderEligibility(row, reminderHistory = [], nowInput = new Date()) {
  const now = asDate(nowInput)
  const state = clean(row.state)
  const initialAt = firstDate(row.initialValidInvitationAt, row.initialInvitationAt, row.priorInvitationAt)
  const supportState = clean(row.supportState)
  const accountExists = Boolean(row.accountExists)
  const suppression = Boolean(row.suppressed || row.doNotRemind || row.optedOutOfSetupReminders)

  if (suppression) return blocked(row, 'SUPPRESSION_ACTIVE')
  if (REMINDER_STOP_STATES.includes(state)) return blocked(row, state)
  if (supportState === 'ACTIVE_SUPPORT') return blocked(row, 'ACTIVE_SUPPORT_THREAD', 'SUPPORT_HOLD')
  if (!REMINDER_ELIGIBLE_STATES.includes(state)) return blocked(row, state || 'UNKNOWN_STRIPE_STATE')
  if (!accountExists) return blocked(row, 'ACCOUNT_NOT_READY_FOR_FRESH_LINK')
  if (!initialAt) return blocked(row, 'INITIAL_VALID_INVITATION_NOT_PROVEN', 'NO_REMINDER')

  const normalizedHistory = normalizeReminderHistory(reminderHistory)
  if (normalizedHistory.validStages.has('FINAL_REMINDER')) {
    return blocked(row, 'FINAL_REMINDER_ALREADY_SENT', 'AUTOMATION_COMPLETE')
  }

  const nextStage = nextAutomatedReminderStage(normalizedHistory.validStages)
  if (!nextStage) return blocked(row, 'AUTOMATION_COMPLETE', 'AUTOMATION_COMPLETE')

  const eligibleAt = addDays(initialAt, nextStage.cadenceDay)
  if (sameDayStageSent(normalizedHistory.events, nextStage.eventType, now)) {
    return blocked(row, 'SAME_DAY_DUPLICATE_GUARD', 'NO_REMINDER', nextStage, eligibleAt)
  }
  if (now < eligibleAt) return blocked(row, 'NOT_DUE', 'NO_REMINDER', nextStage, eligibleAt)

  return {
    author: row.authorName || row.author || '',
    contactId: row.contactId || '',
    stripeAccountId: row.stripeAccountId || row.dataverseAccountId || '',
    state,
    disposition: `${nextStage.label}_ELIGIBLE`,
    reminderStage: nextStage.eventType,
    cadenceDay: nextStage.cadenceDay,
    eligibleAt: eligibleAt.toISOString(),
    initialValidInvitationAt: initialAt.toISOString(),
    currentStripeStateAtEvaluation: state,
    accountLinkRequired: true,
    send: true,
    reason: normalizedHistory.partial
      ? 'REMINDER_HISTORY_PARTIAL; sending only the next single governed reminder stage.'
      : 'CADENCE_ELAPSED_AND_AUTHOR_ACTION_STILL_NEEDED',
  }
}

export function nextAutomatedReminderStage(validStages) {
  if (!validStages.has('REMINDER_1')) return REMINDER_STAGES[1]
  if (!validStages.has('REMINDER_2')) return REMINDER_STAGES[2]
  if (!validStages.has('FINAL_REMINDER')) return REMINDER_STAGES[3]
  return null
}

export function renderStripeConnectReminderEmail({ authorName, stage, state, linkUrl }) {
  const first = firstName(authorName)
  const cta = stage === 'INITIAL_INVITATION' ? 'Set Up Direct Deposit' : 'Continue Direct Deposit Setup'
  const subject = stage === 'INITIAL_INVITATION'
    ? 'Set Up Direct Deposit with J Merrill Publishing'
    : 'Complete Your Direct Deposit Setup'
  const stateLine = state === 'MORE_INFORMATION_NEEDED'
    ? 'Stripe still needs a little more information from you before direct deposit setup is complete.'
    : state === 'SETUP_IN_PROGRESS'
      ? 'Your direct deposit setup with J Merrill Publishing is still in progress.'
      : 'Your direct deposit setup with J Merrill Publishing is still waiting for you.'
  const purpose = stage === 'REMINDER_2'
    ? 'Finishing this now means your payment destination is ready when J Merrill Publishing later has an authorized payment to send.'
    : stage === 'FINAL_REMINDER'
      ? 'This is our final automatic reminder about completing your direct deposit setup.'
      : 'We use Stripe to securely collect the banking and tax information needed for future direct deposits.'
  const stopLine = stage === 'FINAL_REMINDER'
    ? 'After this message, automated setup reminders stop. If something is preventing you from completing setup, reply and we will help.'
    : 'If you are having trouble, reply to this email and we will help.'

  const text = [
    `Good day, ${first},`,
    '',
    stateLine,
    '',
    purpose,
    '',
    `Continue here: ${linkUrl}`,
    '',
    'No separate J Merrill Publishing activation code is required. If Stripe asks you to verify your email address or phone number, that verification comes directly from Stripe.',
    '',
    stopLine,
    '',
    'The Publishing Team',
    'J Merrill Publishing, Inc.',
  ].join('\n')

  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827;"><div style="max-width:680px;margin:0 auto;background:#ffffff;"><div style="background:#111827;color:#ffffff;padding:24px 28px;"><div style="font-size:18px;font-weight:700;">J Merrill Publishing</div><div style="font-size:13px;margin-top:4px;">A Division of J Merrill One</div></div><div style="padding:28px;"><p>Good day, ${escapeHtml(first)},</p><p>${escapeHtml(stateLine)}</p><p>${escapeHtml(purpose)}</p><p style="margin:28px 0;"><a href="${escapeHtml(linkUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px;">${escapeHtml(cta)}</a></p><p>No separate J Merrill Publishing activation code is required. If Stripe asks you to verify your email address or phone number, that verification comes directly from Stripe.</p><p>${escapeHtml(stopLine)}</p><p>The Publishing Team<br>J Merrill Publishing, Inc.</p></div></div></body></html>`

  const validation = validateStripeConnectReminderMessage({
    from: 'publishing@email.jmerrill.one',
    replyTo: 'publishing@jmerrill.one',
    cc: 'publishing@jmerrill.one',
    subject,
    text,
    html,
  })
  return { subject, text, html, cta, validation }
}

export function validateStripeConnectReminderMessage(message) {
  const violations = []
  const from = normalizeEmail(message.from)
  const replyTo = normalizeEmail(message.replyTo)
  const cc = normalizeEmail(message.cc)
  const body = `${message.subject || ''}\n${message.text || ''}\n${message.html || ''}`
  if (from !== 'publishing@email.jmerrill.one') violations.push('WRONG_SENDER')
  if (replyTo !== 'publishing@jmerrill.one') violations.push('WRONG_REPLY_TO')
  if (cc !== 'publishing@jmerrill.one') violations.push('MISSING_ARCHIVE_CC')
  if (!String(message.html || '').trim().startsWith('<!doctype html>')) violations.push('HTML_REQUIRED')
  if (!/Good day,\s+\S+/i.test(body)) violations.push('NATURAL_GREETING_REQUIRED')
  if (!/reply to this email|reply and we will help/i.test(body)) violations.push('SUPPORT_PATH_REQUIRED')
  if (!/why|securely collect|ready when/i.test(body)) violations.push('WHY_FIRST_CONTEXT_REQUIRED')
  for (const pattern of PROHIBITED_COPY_PATTERNS) {
    if (pattern.test(body)) violations.push(`PROHIBITED_LANGUAGE:${pattern.source}`)
  }
  return {
    decision: violations.length ? 'DENY' : 'ALLOW',
    policyId: STRIPE_CONNECT_REMINDER_POLICY_ID,
    humanFirstPolicy: 'JM1-HUMAN-FIRST-WHY-FIRST-v1',
    violations,
  }
}

export function buildReminderEvent({ row, decision, communication = {}, generatedAt = new Date().toISOString() }) {
  if (!decision?.send) throw new Error('reminder_event_requires_send_decision')
  return {
    authorId: row.authorRelationshipId || '',
    contactId: row.contactId || '',
    stripeAccountId: row.stripeAccountId || row.dataverseAccountId || '',
    eventType: decision.reminderStage,
    eligibleAt: decision.eligibleAt,
    generatedAt,
    sentAt: communication.sentAt || '',
    deliveryStatus: communication.deliveryStatus || 'PREPARED',
    communicationId: communication.communicationId || '',
    accountLinkGenerated: Boolean(communication.accountLinkGenerated),
    currentStripeStateAtSend: decision.currentStripeStateAtEvaluation,
    policyVersion: STRIPE_CONNECT_REMINDER_POLICY_VERSION,
  }
}

export function normalizeReminderHistory(history) {
  const events = Array.isArray(history) ? history : []
  const validStages = new Set()
  let partial = false
  for (const event of events) {
    const type = clean(event.eventType || event.jm1_actiontype)
    const status = clean(event.deliveryStatus || event.status || 'SENT')
    if (['INITIAL_INVITATION', 'STRIPE_CONNECT_AUTHOR_ONBOARDING_INVITED'].includes(type) && /SENT|DELIVERED|INVITED/i.test(status)) {
      validStages.add('INITIAL_INVITATION')
    } else if (['REMINDER_1', 'STRIPE_CONNECT_REMINDER_1_SENT'].includes(type) && /SENT|DELIVERED/i.test(status)) {
      validStages.add('REMINDER_1')
    } else if (['REMINDER_2', 'STRIPE_CONNECT_REMINDER_2_SENT'].includes(type) && /SENT|DELIVERED/i.test(status)) {
      validStages.add('REMINDER_2')
    } else if (['FINAL_REMINDER', 'STRIPE_CONNECT_FINAL_REMINDER_SENT'].includes(type) && /SENT|DELIVERED/i.test(status)) {
      validStages.add('FINAL_REMINDER')
    } else if (/STRIPE_CONNECT|Direct Deposit|ONBOARDING/i.test(`${type} ${event.jm1_actiondescription || ''}`)) {
      partial = true
    }
  }
  return { events, validStages, partial }
}

function blocked(row, reason, disposition = 'NO_REMINDER', stage = null, eligibleAt = null) {
  return {
    author: row.authorName || row.author || '',
    contactId: row.contactId || '',
    state: clean(row.state),
    disposition,
    reminderStage: stage?.eventType || '',
    cadenceDay: stage?.cadenceDay ?? null,
    eligibleAt: eligibleAt?.toISOString?.() || '',
    send: false,
    reason,
  }
}

function firstDate(...values) {
  for (const value of values) {
    const date = asDate(value)
    if (date) return date
  }
  return null
}

function asDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function sameDayStageSent(events, stage, now) {
  const day = now.toISOString().slice(0, 10)
  return events.some((event) => {
    const type = clean(event.eventType || event.jm1_actiontype)
    const sentAt = firstDate(event.sentAt, event.createdon, event.generatedAt)
    if (!sentAt) return false
    return type === stage && sentAt.toISOString().slice(0, 10) === day
  })
}

function firstName(value) {
  return clean(value).split(/\s+/)[0] || 'there'
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(value) {
  return clean(value).toLowerCase()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
