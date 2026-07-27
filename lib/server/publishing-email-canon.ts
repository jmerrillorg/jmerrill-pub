export const JM1_ENTERPRISE_COMMUNICATION_CANON = {
  publishing: {
    outboundFrom: 'publishing@email.jmerrill.one',
    replyTo: 'publishing@jmerrill.one',
    archiveCopy: 'publishing@jmerrill.one',
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

export function validatePublishingOutboundEmail(input: PublishingOutboundEmailDraft): PublishingEmailValidation {
  const from = normalizeAddress(input.from)
  const to = normalizeList(input.to)
  const replyTo = normalizeAddress(input.replyTo || '')
  const cc = normalizeList(input.cc)
  const bcc = normalizeList(input.bcc)
  const archive = PUBLISHING_EMAIL_CANON.archiveCopy

  if (from !== PUBLISHING_EMAIL_CANON.outboundFrom) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - FROM_NOT_CANONICAL' }
  if (!replyTo) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - REPLY_TO_MISSING' }
  if (replyTo !== PUBLISHING_EMAIL_CANON.replyTo) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - REPLY_TO_NOT_CANONICAL' }
  if (to.length !== 1) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - AUTHOR_RECIPIENT_COUNT_INVALID' }
  if (to.includes(archive)) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - ARCHIVE_NOT_AUTHOR_RECIPIENT' }
  if (!cc.includes(archive) && !bcc.includes(archive)) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - ARCHIVE_COPY_MISSING' }
  if (!input.correlationId.trim()) return { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - CORRELATION_ID_MISSING' }
  return { ok: true }
}

export function buildGovernedPublishingEmail(input: Omit<PublishingOutboundEmailDraft, 'from' | 'replyTo' | 'cc'> & { cc?: string[] }) {
  const cc = Array.from(new Set([...normalizeList(input.cc), PUBLISHING_EMAIL_CANON.archiveCopy]))
  const draft: PublishingOutboundEmailDraft = {
    ...input,
    from: PUBLISHING_EMAIL_CANON.outboundFrom,
    replyTo: PUBLISHING_EMAIL_CANON.replyTo,
    cc,
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
