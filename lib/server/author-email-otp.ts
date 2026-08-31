import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import { EmailClient, type EmailMessage } from '@azure/communication-email'

import {
  dataverseCreate,
  dataverseFirst,
  dataverseList,
  dataverseLookupId,
  dataversePatch,
  getDataverseServerConfig,
  stringValue,
  type DataverseRow,
  type DataverseServerConfig,
} from './dataverse-server'
import {
  PUBLISHING_EMAIL_CANON,
  buildGovernedPublishingEmail,
  validatePublishingOutboundEmail,
} from './publishing-email-canon'
export { AUTHOR_EMAIL_OTP_PROVIDER_ID } from '../author-durable-auth-shared'

export const AUTHOR_EMAIL_OTP_POLICY = 'JMP-AUTHOR-EMAIL-OTP-v1'

const CHALLENGE_ACTION_TYPE = 'AUTHOR_EMAIL_OTP_CHALLENGE'
const DEFAULT_OTP_TTL_SECONDS = 10 * 60
const DEFAULT_RESEND_COOLDOWN_SECONDS = 60
const DEFAULT_REQUEST_WINDOW_SECONDS = 15 * 60
const DEFAULT_REQUEST_LIMIT = 5
const DEFAULT_VERIFY_LIMIT = 8
const DEFAULT_MAX_ATTEMPTS = 5

export type AuthorOtpChallengeState = 'issued' | 'consumed' | 'expired' | 'failed' | 'rate_limited'

export type AuthorOtpChallengeRecord = {
  challengeId: string
  emailHash: string
  contactId: string
  contactEmail: string
  otpHash: string
  status: AuthorOtpChallengeState
  attempts: number
  issuedAt: string
  expiresAt: string
  resendAfter: string
  consumedAt?: string
  lastAttemptAt?: string
  failureReason?: string
}

export type AuthorOtpStoreRecord = AuthorOtpChallengeRecord & {
  rowId: string
  etag?: string
}

export type AuthorOtpChallengeStore = {
  create(record: AuthorOtpChallengeRecord): Promise<void>
  findActiveByChallenge(challengeId: string): Promise<AuthorOtpStoreRecord | null>
  listRecentByEmailHash(emailHash: string, sinceIso: string): Promise<AuthorOtpStoreRecord[]>
  update(record: AuthorOtpStoreRecord, patch: Partial<AuthorOtpChallengeRecord>): Promise<void>
}

export type AuthorOtpEmailSender = (input: {
  to: string
  authorName: string
  code: string
  expiresAt: string
  correlationId: string
}) => Promise<{ provider: string; providerMessageId: string }>

export type AuthorOtpDeps = {
  now?: () => Date
  store?: AuthorOtpChallengeStore
  sendEmail?: AuthorOtpEmailSender
  resolveContact?: (email: string) => Promise<ResolvedAuthorOtpContact | null>
}

export type ResolvedAuthorOtpContact = {
  contactId: string
  email: string
  name: string
}

export function normalizeAuthorEmail(value?: string | null) {
  return value?.trim().toLowerCase() || ''
}

export function normalizeAuthorOtp(value?: string | null) {
  return String(value || '').replace(/\D/g, '').slice(0, 6)
}

export function generateAuthorOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashAuthorOtp({
  challengeId,
  email,
  code,
}: {
  challengeId: string
  email: string
  code: string
}) {
  return createHmac('sha256', getAuthorOtpSecret())
    .update(`${challengeId}:${normalizeAuthorEmail(email)}:${normalizeAuthorOtp(code)}`)
    .digest('hex')
}

export async function requestAuthorEmailOtp(email: string, deps: AuthorOtpDeps = {}) {
  const normalizedEmail = normalizeAuthorEmail(email)
  const correlationId = `AOC-OTP-${randomUUID()}`
  const now = deps.now?.() || new Date()
  const generic = {
    accepted: true,
    challengeId: randomUUID(),
    expiresInSeconds: getOtpTtlSeconds(),
    resendAfterSeconds: getResendCooldownSeconds(),
    correlationId,
  }

  if (!normalizedEmail || !isPlausibleEmail(normalizedEmail)) return generic

  const store = deps.store || new DataverseAuthorOtpChallengeStore()
  const emailHash = hashIdentifier(normalizedEmail)
  const recent = await store.listRecentByEmailHash(
    emailHash,
    new Date(now.getTime() - getRequestWindowSeconds() * 1000).toISOString(),
  )
  const recentIssued = recent.filter((record) => record.status === 'issued')
  if (recentIssued.length >= getRequestLimit()) return generic
  if (recentIssued.some((record) => Date.parse(record.resendAfter) > now.getTime())) return generic

  const contact = await (deps.resolveContact || resolveReturningAuthorContactByEmail)(normalizedEmail)
  if (!contact) return generic

  const challengeId = randomUUID()
  const code = generateAuthorOtp()
  const expiresAt = new Date(now.getTime() + getOtpTtlSeconds() * 1000).toISOString()
  const resendAfter = new Date(now.getTime() + getResendCooldownSeconds() * 1000).toISOString()
  await store.create({
    challengeId,
    emailHash,
    contactId: contact.contactId,
    contactEmail: contact.email,
    otpHash: hashAuthorOtp({ challengeId, email: normalizedEmail, code }),
    status: 'issued',
    attempts: 0,
    issuedAt: now.toISOString(),
    expiresAt,
    resendAfter,
  })

  await (deps.sendEmail || sendAuthorOtpEmail)({
    to: contact.email,
    authorName: contact.name,
    code,
    expiresAt,
    correlationId,
  })

  return {
    ...generic,
    challengeId,
  }
}

export async function verifyAuthorEmailOtp(input: { email: string; challengeId: string; code: string }, deps: AuthorOtpDeps = {}) {
  const normalizedEmail = normalizeAuthorEmail(input.email)
  const normalizedCode = normalizeAuthorOtp(input.code)
  const challengeId = input.challengeId?.trim() || ''
  const now = deps.now?.() || new Date()

  if (!normalizedEmail || !challengeId || normalizedCode.length !== 6) return null

  const store = deps.store || new DataverseAuthorOtpChallengeStore()
  const record = await store.findActiveByChallenge(challengeId)
  if (!record || record.emailHash !== hashIdentifier(normalizedEmail) || record.status !== 'issued') return null

  if (Date.parse(record.expiresAt) <= now.getTime()) {
    await store.update(record, {
      status: 'expired',
      lastAttemptAt: now.toISOString(),
      failureReason: 'expired',
    })
    return null
  }

  if (record.attempts >= getMaxAttempts()) {
    await store.update(record, {
      status: 'failed',
      lastAttemptAt: now.toISOString(),
      failureReason: 'max_attempts',
    })
    return null
  }

  const expected = hashAuthorOtp({ challengeId, email: normalizedEmail, code: normalizedCode })
  if (!safeEqualHex(expected, record.otpHash)) {
    await store.update(record, {
      attempts: record.attempts + 1,
      lastAttemptAt: now.toISOString(),
      status: record.attempts + 1 >= getMaxAttempts() ? 'failed' : 'issued',
      failureReason: 'invalid_code',
    })
    return null
  }

  await store.update(record, {
    status: 'consumed',
    consumedAt: now.toISOString(),
    lastAttemptAt: now.toISOString(),
  })

  return {
    contactId: record.contactId,
    email: normalizedEmail,
  }
}

export async function authorizeAuthorEmailOtpCredentials(credentials?: Record<string, unknown>) {
  const result = await verifyAuthorEmailOtp({
    email: String(credentials?.email || ''),
    challengeId: String(credentials?.challengeId || ''),
    code: String(credentials?.code || ''),
  })
  if (!result) return null

  return {
    id: result.contactId,
    email: result.email,
    name: 'J Merrill Publishing Author',
    role: 'author',
    authorContactId: result.contactId,
  }
}

export class DataverseAuthorOtpChallengeStore implements AuthorOtpChallengeStore {
  constructor(private readonly config: DataverseServerConfig | null = getDataverseServerConfig()) {}

  async create(record: AuthorOtpChallengeRecord) {
    if (!this.config) throw new Error('dataverse_config_missing')
    await dataverseCreate(this.config, 'jm1_executionlogs', {
      jm1_name: otpLogName(record.challengeId),
      jm1_actiontype: CHALLENGE_ACTION_TYPE,
      jm1_actiondescription: serializeChallenge(record),
      jm1_executionstatus: 835500001,
      jm1_agentname: 'jmerrill.pub',
      jm1_agentmodel: AUTHOR_EMAIL_OTP_POLICY,
      jm1_startedon: record.issuedAt,
      jm1_completedon: record.issuedAt,
      jm1_sourceentity: 'contact',
      jm1_sourcerecordid: record.contactId,
    })
  }

  async findActiveByChallenge(challengeId: string) {
    if (!this.config) throw new Error('dataverse_config_missing')
    const row = await dataverseFirst(this.config, 'jm1_executionlogs', {
      $select: 'jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription,@odata.etag',
      $filter: `jm1_name eq '${escapeODataText(otpLogName(challengeId))}' and jm1_actiontype eq '${CHALLENGE_ACTION_TYPE}'`,
    })
    return row ? hydrateStoreRecord(row) : null
  }

  async listRecentByEmailHash(emailHash: string, sinceIso: string) {
    if (!this.config) throw new Error('dataverse_config_missing')
    const rows = await dataverseList(this.config, 'jm1_executionlogs', {
      $select: 'jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription,@odata.etag',
      $filter: `jm1_actiontype eq '${CHALLENGE_ACTION_TYPE}' and jm1_startedon ge ${sinceIso}`,
      $orderby: 'jm1_startedon desc',
      $top: '50',
    })
    return rows
      .map(hydrateStoreRecord)
      .filter((record): record is AuthorOtpStoreRecord => record !== null)
      .filter((record) => record.emailHash === emailHash)
  }

  async update(record: AuthorOtpStoreRecord, patch: Partial<AuthorOtpChallengeRecord>) {
    if (!this.config) throw new Error('dataverse_config_missing')
    const updated = { ...record, ...patch }
    await dataversePatch(
      this.config,
      'jm1_executionlogs',
      record.rowId,
      {
        jm1_actiondescription: serializeChallenge(updated),
        jm1_executionstatus: updated.status === 'consumed' ? 835500001 : updated.status === 'issued' ? 835500001 : 835500002,
        jm1_completedon: patch.consumedAt || patch.lastAttemptAt || new Date().toISOString(),
      },
      { ifMatch: record.etag || '*' },
    )
  }
}

export async function resolveReturningAuthorContactByEmail(email: string): Promise<ResolvedAuthorOtpContact | null> {
  const normalizedEmail = normalizeAuthorEmail(email)
  if (!normalizedEmail) return null
  const config = getDataverseServerConfig()
  if (!config) return null

  const escaped = escapeODataText(normalizedEmail)
  const contacts = await dataverseList(config, 'contacts', {
    $select: 'contactid,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_isauthor,statecode,statuscode',
    $filter:
      `statecode eq 0 and (emailaddress1 eq '${escaped}' or emailaddress2 eq '${escaped}' or emailaddress3 eq '${escaped}' or adx_identity_username eq '${escaped}')`,
    $top: '2',
  })
  if (contacts.length !== 1) return null

  const contact = contacts[0]
  const contactId = dataverseLookupId(contact, 'contactid')
  if (!contactId) return null

  const profiles = await dataverseList(config, 'jm1_authorprofiles', {
    $select: 'jm1_authorprofileid,_jm1_contact_value,statecode,statuscode',
    $filter: `_jm1_contact_value eq ${contactId} and statecode eq 0`,
    $top: '2',
  })
  if (profiles.length < 1) return null

  return {
    contactId,
    email:
      normalizeAuthorEmail(stringValue(contact.emailaddress1)) ||
      normalizeAuthorEmail(stringValue(contact.emailaddress2)) ||
      normalizeAuthorEmail(stringValue(contact.emailaddress3)) ||
      normalizedEmail,
    name: stringValue(contact.fullname) || 'Author',
  }
}

export async function sendAuthorOtpEmail(input: {
  to: string
  authorName: string
  code: string
  expiresAt: string
  correlationId: string
}) {
  const connectionString = process.env.ACS_EMAIL_CONNECTION_STRING || process.env.AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING || ''
  if (!connectionString) throw new Error('author_otp_email_connection_missing')

  const expiresMinutes = Math.max(1, Math.ceil((Date.parse(input.expiresAt) - Date.now()) / 60000))
  const text = [
    `Good day ${firstName(input.authorName)},`,
    '',
    'Use this one-time code to sign in to your J Merrill Publishing Author Operating Center:',
    '',
    input.code,
    '',
    `This code expires in ${expiresMinutes} minutes and can be used one time.`,
    '',
    'If you did not request this code, you can ignore this email.',
    '',
    'J Merrill Publishing',
  ].join('\n')
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827;"><div style="max-width:640px;margin:0 auto;background:#ffffff;"><div style="background:#111827;color:#ffffff;padding:24px 28px;"><div style="font-size:18px;font-weight:700;">J Merrill Publishing</div><div style="font-size:13px;margin-top:4px;">Author access</div></div><div style="padding:28px;"><p>Good day ${escapeHtml(firstName(input.authorName))},</p><p>Use this one-time code to sign in to your J Merrill Publishing Author Operating Center:</p><p style="font-size:28px;letter-spacing:4px;font-weight:700;margin:24px 0;">${escapeHtml(input.code)}</p><p>This code expires in ${expiresMinutes} minutes and can be used one time.</p><p>If you did not request this code, you can ignore this email.</p><p>J Merrill Publishing</p></div></div></body></html>`
  const draft = buildGovernedPublishingEmail({
    to: [input.to],
    subject: 'Your J Merrill Publishing author access code',
    text,
    correlationId: input.correlationId,
  })
  const validation = validatePublishingOutboundEmail(draft)
  if (!validation.ok) throw new Error(validation.blocker)

  const client = new EmailClient(connectionString)
  const message: EmailMessage = {
    senderAddress: PUBLISHING_EMAIL_CANON.outboundFrom,
    replyTo: [{ address: PUBLISHING_EMAIL_CANON.replyTo, displayName: 'J Merrill Publishing' }],
    content: {
      subject: draft.subject,
      plainText: draft.text,
      html,
    },
    recipients: {
      to: draft.to.map((address) => ({ address })),
      cc: (draft.cc || []).map((address) => ({ address })),
    },
  }
  const poller = await client.beginSend(message)
  const result = await poller.pollUntilDone()
  return {
    provider: 'acs-email',
    providerMessageId: result.id || 'not-returned-by-provider',
  }
}

function getAuthorOtpSecret() {
  const secret = process.env.AUTHOR_EMAIL_OTP_SECRET || process.env.AUTH_SECRET || process.env.AUTHOR_PORTAL_SESSION_SECRET || ''
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('author_otp_secret_missing')
  return secret || 'local-author-otp-secret'
}

function serializeChallenge(record: AuthorOtpChallengeRecord) {
  return JSON.stringify({
    policy: AUTHOR_EMAIL_OTP_POLICY,
    challengeId: record.challengeId,
    emailHash: record.emailHash,
    contactId: record.contactId,
    contactEmailHash: hashIdentifier(record.contactEmail),
    otpHash: record.otpHash,
    status: record.status,
    attempts: record.attempts,
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt,
    resendAfter: record.resendAfter,
    consumedAt: record.consumedAt,
    lastAttemptAt: record.lastAttemptAt,
    failureReason: record.failureReason,
  })
}

function hydrateStoreRecord(row: DataverseRow): AuthorOtpStoreRecord | null {
  try {
    const parsed = JSON.parse(stringValue(row.jm1_actiondescription)) as AuthorOtpChallengeRecord
    if (parsed.status !== 'issued' && parsed.status !== 'consumed' && parsed.status !== 'expired' && parsed.status !== 'failed' && parsed.status !== 'rate_limited') {
      return null
    }
    return {
      ...parsed,
      rowId: dataverseLookupId(row, 'jm1_executionlogid'),
      etag: stringValue(row['@odata.etag']),
    }
  } catch {
    return null
  }
}

function otpLogName(challengeId: string) {
  return `AUTHOR_EMAIL_OTP_${challengeId}`
}

function hashIdentifier(value: string) {
  return createHash('sha256').update(normalizeAuthorEmail(value)).digest('hex')
}

function getOtpTtlSeconds() {
  return readPositiveIntegerEnv('AUTHOR_EMAIL_OTP_TTL_SECONDS', DEFAULT_OTP_TTL_SECONDS)
}

function getResendCooldownSeconds() {
  return readPositiveIntegerEnv('AUTHOR_EMAIL_OTP_RESEND_COOLDOWN_SECONDS', DEFAULT_RESEND_COOLDOWN_SECONDS)
}

function getRequestWindowSeconds() {
  return readPositiveIntegerEnv('AUTHOR_EMAIL_OTP_REQUEST_WINDOW_SECONDS', DEFAULT_REQUEST_WINDOW_SECONDS)
}

function getRequestLimit() {
  return readPositiveIntegerEnv('AUTHOR_EMAIL_OTP_REQUEST_LIMIT', DEFAULT_REQUEST_LIMIT)
}

function getMaxAttempts() {
  return readPositiveIntegerEnv('AUTHOR_EMAIL_OTP_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS)
}
export function getAuthorOtpVerifyLimit() {
  return readPositiveIntegerEnv('AUTHOR_EMAIL_OTP_VERIFY_LIMIT', DEFAULT_VERIFY_LIMIT)
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function isPlausibleEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function safeEqualHex(actual: string, expected: string) {
  if (!/^[a-f0-9]{64}$/i.test(actual) || !/^[a-f0-9]{64}$/i.test(expected)) return false
  const actualBuffer = Buffer.from(actual, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

function escapeODataText(value: string) {
  return value.replace(/'/g, "''")
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || 'Author'
}
