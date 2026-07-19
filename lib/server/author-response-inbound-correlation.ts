import { AUTHOR_PUBLISHING_COMMUNICATION_POLICY } from './author-package-notification-engine'

export type InboundAuthorResponseMessage = {
  inboundMessageId: string
  internetMessageId?: string
  inReplyTo?: string
  references?: string[]
  subject: string
  from: string
  to: string[]
  receivedAt: string
  bodyText?: string
  attachments?: Array<{ id: string; name: string; contentType?: string }>
}

export type NotificationCorrelationRecord = {
  originalNotificationId: string
  threadId?: string
  titleId: string
  packageId: string
  gateId: string
  authorId: string
  subject: string
  authorEmail: string
}

export type InboundAuthorResponseCorrelation = {
  inboundMessageId: string
  originalNotificationId: string
  threadId?: string
  titleId: string
  packageId: string
  gateId: string
  authorId: string
  receivedAt: string
  classification: 'APPROVED_WITHOUT_CHANGES' | 'CORRECTIONS_REQUESTED' | 'QUESTION_OR_CLARIFICATION' | 'UNCLASSIFIED'
  processingState: 'READY_FOR_RESPONSE_PROCESSOR' | 'IGNORED_UNRELATED' | 'BLOCKED_UNMONITORED_MAILBOX'
}

export function classifyAuthorResponseText(text: string) {
  const normalized = text.trim().toLowerCase()
  if (/^(approved|approve|i approve|i approve!|approved!|yes approved)\b/.test(normalized)) return 'APPROVED_WITHOUT_CHANGES'
  if (/\b(correction|change|revise|revision|fix)\b/.test(normalized)) return 'CORRECTIONS_REQUESTED'
  if (/\?|\b(question|clarify|discussion|call)\b/.test(normalized)) return 'QUESTION_OR_CLARIFICATION'
  return 'UNCLASSIFIED'
}

export function correlateInboundAuthorResponse(
  message: InboundAuthorResponseMessage,
  notifications: NotificationCorrelationRecord[],
): InboundAuthorResponseCorrelation {
  const monitoredMailbox = AUTHOR_PUBLISHING_COMMUNICATION_POLICY.monitoredReplyMailbox
  const recipients = message.to.map((recipient) => recipient.trim().toLowerCase())
  if (!recipients.includes(monitoredMailbox)) {
    return {
      inboundMessageId: message.inboundMessageId,
      originalNotificationId: '',
      titleId: '',
      packageId: '',
      gateId: '',
      authorId: '',
      receivedAt: message.receivedAt,
      classification: 'UNCLASSIFIED',
      processingState: 'BLOCKED_UNMONITORED_MAILBOX',
    }
  }

  const normalizedSubject = normalizeSubject(message.subject)
  const matched =
    notifications.find((notification) => message.inReplyTo && notification.originalNotificationId === message.inReplyTo) ||
    notifications.find((notification) => message.references?.includes(notification.originalNotificationId)) ||
    notifications.find((notification) => normalizeSubject(notification.subject) === normalizedSubject) ||
    null

  if (!matched) {
    return {
      inboundMessageId: message.inboundMessageId,
      originalNotificationId: '',
      titleId: '',
      packageId: '',
      gateId: '',
      authorId: '',
      receivedAt: message.receivedAt,
      classification: 'UNCLASSIFIED',
      processingState: 'IGNORED_UNRELATED',
    }
  }

  return {
    inboundMessageId: message.inboundMessageId,
    originalNotificationId: matched.originalNotificationId,
    threadId: matched.threadId,
    titleId: matched.titleId,
    packageId: matched.packageId,
    gateId: matched.gateId,
    authorId: matched.authorId,
    receivedAt: message.receivedAt,
    classification: classifyAuthorResponseText(message.bodyText || ''),
    processingState: 'READY_FOR_RESPONSE_PROCESSOR',
  }
}

function normalizeSubject(subject: string) {
  return subject
    .trim()
    .replace(/^(re|fw|fwd):\s*/i, '')
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}
