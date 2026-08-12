export const JM1_ENTERPRISE_COMMUNICATION_CANON = {
  publishing: {
    outboundFrom: 'publishing@email.jmerrill.one',
    replyTo: 'publishing@jmerrill.one',
    archiveCopy: 'publishing@jmerrill.one',
    requiredAuthorCc: 'publishing@jmerrill.one',
  },
  financial: {
    replyToRequired: true,
    archiveCopyRequired: true,
  },
  foundation: {
    replyToRequired: true,
    archiveCopyRequired: true,
  },
} as const

export const PUBLISHING_EMAIL_CANON = JM1_ENTERPRISE_COMMUNICATION_CANON.publishing

const ACCOUNT_LINK_PATTERN = /https:\/\/connect\.stripe\.com\/setup\/s\/[^\s)>"]+/gi
const SECRET_OR_TOKEN_PATTERN = /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+\b|\bwhsec_[A-Za-z0-9]+\b/gi

export type PublishingOutboundEmailDraft = {
  from: string
  to: string[]
  replyTo?: string | null
  cc?: string[]
  bcc?: string[]
  subject: string
  text: string
  correlationId: string
}

export type PublishingEmailValidation = { ok: true } | { ok: false; blocker: string }

function normalizeAddress(value = '') {
  return value.trim().toLowerCase()
}

function normalizeList(value: string[] | undefined) {
  return (value || []).map(normalizeAddress).filter(Boolean)
}

function uniqueNormalized(value: string[] | undefined) {
  return Array.from(new Set(normalizeList(value)))
}

export function ensurePublishingAuthorEmailCc(input: { to?: string[]; cc?: string[] }) {
  const to = uniqueNormalized(input.to)
  const cc = uniqueNormalized(input.cc)
  const requiredCc = normalizeAddress(PUBLISHING_EMAIL_CANON.requiredAuthorCc)
  const withoutRequired = cc.filter((recipient) => recipient !== requiredCc)
  return to.includes(requiredCc) ? withoutRequired : [...withoutRequired, requiredCc]
}

export function validatePublishingOutboundEmail(input: PublishingOutboundEmailDraft): PublishingEmailValidation {
  const from = normalizeAddress(input.from)
  const to = normalizeList(input.to)
  const replyTo = normalizeAddress(input.replyTo || '')
  const cc = normalizeList(input.cc)
  const bcc = normalizeList(input.bcc)
  const requiredCc = normalizeAddress(PUBLISHING_EMAIL_CANON.requiredAuthorCc)
  const requiredCopyIsPrimaryRecipient = to.includes(requiredCc)

  if (from !== PUBLISHING_EMAIL_CANON.outboundFrom) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - FROM_NOT_CANONICAL' }
  if (!replyTo) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - REPLY_TO_MISSING' }
  if (replyTo !== PUBLISHING_EMAIL_CANON.replyTo) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - REPLY_TO_NOT_CANONICAL' }
  if (to.length !== 1) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - AUTHOR_RECIPIENT_COUNT_INVALID' }
  if (!requiredCopyIsPrimaryRecipient && !cc.includes(requiredCc)) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - PUBLISHING_CC_MISSING' }
  if (cc.filter((recipient) => recipient === requiredCc).length > 1) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - DUPLICATE_PUBLISHING_CC' }
  if (bcc.includes(requiredCc)) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - PUBLISHING_COPY_MUST_BE_CC' }
  if (!input.correlationId.trim()) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - CORRELATION_ID_MISSING' }
  return { ok: true }
}

export function buildGovernedPublishingEmail(input: Omit<PublishingOutboundEmailDraft, 'from' | 'replyTo' | 'bcc'> & { bcc?: string[] }) {
  const to = normalizeList(input.to)
  const requiredCc = normalizeAddress(PUBLISHING_EMAIL_CANON.requiredAuthorCc)
  const bcc = normalizeList(input.bcc).filter((recipient) => recipient !== requiredCc)
  const draft: PublishingOutboundEmailDraft = {
    ...input,
    to,
    cc: ensurePublishingAuthorEmailCc({ to, cc: input.cc }),
    from: PUBLISHING_EMAIL_CANON.outboundFrom,
    replyTo: PUBLISHING_EMAIL_CANON.replyTo,
    bcc,
  }
  const validation = validatePublishingOutboundEmail(draft)
  if (!validation.ok) throw new Error(validation.blocker)
  return draft
}

export function redactTransientPublishingEmailArchive(value: string) {
  return value.replace(ACCOUNT_LINK_PATTERN, '[TRANSIENT ACCOUNT LINK REDACTED]').replace(SECRET_OR_TOKEN_PATTERN, '[SECRET REDACTED]')
}

export function buildRedactedPublishingArchiveCopy(input: PublishingOutboundEmailDraft) {
  const validation = validatePublishingOutboundEmail(input)
  if (!validation.ok) throw new Error(validation.blocker)
  return {
    to: PUBLISHING_EMAIL_CANON.archiveCopy,
    from: input.from,
    replyTo: input.replyTo || PUBLISHING_EMAIL_CANON.replyTo,
    subject: `[ARCHIVE COPY] ${input.subject}`,
    text: [
      `Correlation ID: ${input.correlationId}`,
      `Author recipient: ${input.to.join(', ')}`,
      `From: ${input.from}`,
      `Reply-To: ${input.replyTo || PUBLISHING_EMAIL_CANON.replyTo}`,
      '',
      redactTransientPublishingEmailArchive(input.text),
    ].join('\n'),
  }
}
