import { AUTHOR_PUBLISHING_COMMUNICATION_POLICY } from './author-package-notification-engine'

export type AuthorReplyBounceInput = {
  bounceMessageId: string
  subject: string
  receivedAt: string
  diagnosticText: string
  originalRecipient?: string
  originalReplyText?: string
  originalReplySentAt?: string
  originalNotificationId?: string
  gateId?: string
}

export type AuthorReplyBounceResult = {
  eventType: 'AUTHOR_REPLY_ROUTING_FAILED'
  failureCode: 'INVALID_REPLY_TO_DOMAIN' | 'UNKNOWN_DELIVERY_FAILURE'
  classification: 'AUTHOR_REPLY_ROUTING_FAILED - INVALID_REPLY_TO_DOMAIN' | 'AUTHOR_REPLY_ROUTING_FAILED - UNKNOWN'
  responseClockTreatment: 'PROTECTED'
  authorNonresponsive: false
  recovered: boolean
  nextAction:
    | 'INGEST_RECOVERED_RESPONSE'
    | 'AUTHOR_REPLY_RESEND_REQUIRED'
  publisherTodayException: string
}

export function classifyAuthorReplyBounce(input: AuthorReplyBounceInput): AuthorReplyBounceResult {
  const text = `${input.subject} ${input.diagnosticText} ${input.originalRecipient || ''}`.toLowerCase()
  const invalidReplyToDomain =
    text.includes('email.jmerrill.one') ||
    text.includes('domain') && (text.includes('not found') || text.includes('did not resolve') || text.includes('unrouteable'))
  const recovered = Boolean(input.originalReplyText?.trim())

  if (invalidReplyToDomain) {
    return {
      eventType: 'AUTHOR_REPLY_ROUTING_FAILED',
      failureCode: 'INVALID_REPLY_TO_DOMAIN',
      classification: 'AUTHOR_REPLY_ROUTING_FAILED - INVALID_REPLY_TO_DOMAIN',
      responseClockTreatment: 'PROTECTED',
      authorNonresponsive: false,
      recovered,
      nextAction: recovered ? 'INGEST_RECOVERED_RESPONSE' : 'AUTHOR_REPLY_RESEND_REQUIRED',
      publisherTodayException: recovered
        ? 'Author reply recovered from nondelivery artifact; process recovered response once.'
        : `Author attempted response but Reply-To routed outside ${AUTHOR_PUBLISHING_COMMUNICATION_POLICY.monitoredReplyMailbox}; request resend without resending package.`,
    }
  }

  return {
    eventType: 'AUTHOR_REPLY_ROUTING_FAILED',
    failureCode: 'UNKNOWN_DELIVERY_FAILURE',
    classification: 'AUTHOR_REPLY_ROUTING_FAILED - UNKNOWN',
    responseClockTreatment: 'PROTECTED',
    authorNonresponsive: false,
    recovered,
    nextAction: recovered ? 'INGEST_RECOVERED_RESPONSE' : 'AUTHOR_REPLY_RESEND_REQUIRED',
    publisherTodayException: 'Author reply delivery failure requires publisher review; author must not be marked nonresponsive.',
  }
}
