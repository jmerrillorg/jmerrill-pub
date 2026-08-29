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

export type PublishingInboundAuthorIntent =
  | 'ACCESS_HELP'
  | 'LOGIN_HELP'
  | 'ACCESS_CODE_REQUEST'
  | 'INVITATION_PROBLEM'
  | 'AUTHENTICATION_FAILURE'
  | 'APPROVED'
  | 'APPROVED_WITH_CORRECTIONS'
  | 'CHANGES_REQUESTED'
  | 'QUESTION'
  | 'HOLD'
  | 'STRIPE_CONNECT_HELP'
  | 'DIRECT_DEPOSIT_HELP'
  | 'FILE_RECEIVED'
  | 'ACKNOWLEDGMENT_ONLY'
  | 'GENERAL_SUPPORT'
  | 'UNKNOWN'

export type AuthorReplyAuthorityClassification =
  | 'AUTHOR_APPROVAL_CANDIDATE'
  | 'AUTHOR_APPROVAL_WITH_CORRECTIONS_CANDIDATE'
  | 'AUTHOR_CHANGES_REQUESTED'
  | 'AUTHOR_QUESTION'
  | 'AUTHOR_HOLD_REQUESTED'
  | 'ACKNOWLEDGMENT_REVIEW_START_NOT_APPROVAL'
  | 'DEVELOPMENTAL_EDITING_APPROVED_WITH_ACCESS_HELP'
  | 'ACCESS_SUPPORT_REQUEST'
  | 'GENERAL_SUPPORT_REQUEST'
  | 'UNKNOWN_REQUIRES_REVIEW'

export type PublishingInboundAuthorIntentResult = {
  intents: PublishingInboundAuthorIntent[]
  messageIntents: PublishingInboundAuthorIntent[]
  authorityClassification: AuthorReplyAuthorityClassification
  originalAuthorityClassification?: AuthorReplyAuthorityClassification
  authoritativeLifecycleDecision: 'APPROVED' | 'APPROVED_WITH_CORRECTIONS' | 'CHANGES_REQUESTED' | 'HOLD' | 'QUESTION' | null
  supportActions: Array<'ACCESS_HELP' | 'DIRECT_DEPOSIT_HELP' | 'STRIPE_CONNECT_HELP' | 'GENERAL_SUPPORT'>
  founderAuthorityCorrection?: boolean
  lifecycleAction:
    | 'RECORD_AUTHOR_APPROVAL'
    | 'RECORD_AUTHOR_APPROVAL_WITH_CORRECTIONS'
    | 'OPEN_REVISION_LOOP'
    | 'KEEP_GATE_OPEN_AND_ACKNOWLEDGE'
    | 'CREATE_ACCESS_RECOVERY_EVENT'
    | 'ROUTE_TO_HUMAN_ATTENTION'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
}

export function classifyAuthorResponseText(text: string) {
  const normalized = stripQuotedReplyText(text).trim().toLowerCase()
  if (/^(approved|approve|i approve|i approve!|approved!|yes approved)\b/.test(normalized)) return 'APPROVED_WITHOUT_CHANGES'
  if (/\b(correction|change|revise|revision|fix)\b/.test(normalized)) return 'CORRECTIONS_REQUESTED'
  if (/\?|\b(question|clarify|discussion|call)\b/.test(normalized)) return 'QUESTION_OR_CLARIFICATION'
  return 'UNCLASSIFIED'
}

export function classifyPublishingInboundAuthorIntent(input: {
  subject?: string
  bodyText?: string
  gateId?: string
  internetMessageId?: string
  inboundMessageId?: string
}): PublishingInboundAuthorIntentResult {
  const subject = input.subject || ''
  const body = stripQuotedReplyText(input.bodyText || '')
  const normalized = normalizeForIntent(`${subject}\n${body}`)
  const normalizedBody = normalizeForIntent(body)
  const intents = new Set<PublishingInboundAuthorIntent>()

  const hasAccessProblem =
    /\b(can'?t|cannot|unable to|trouble|problem|issue)\s+(log|sign|get)\s*(in|on|into)?\b/.test(normalized) ||
    /\b(access code|login code|sign[- ]?in code|portal access|author central|author center|author operating center|workspace access)\b/.test(normalized) ||
    /\b(authentication app|authenticator|verification code|mfa|one[- ]?time code|otp)\b/.test(normalized)
  const hasStripeHelp = /\b(stripe|direct deposit|payout|bank|royalt(y|ies) setup|connect setup)\b/.test(normalized)
  const hasQuestion = /\?|\b(question|clarify|can you|could you|may i|please let me know)\b/.test(normalized)
  const hasFileReceived = /\b(received|got|have the files|got the files|received the files)\b/.test(normalized)
  const startsAcknowledgment = /^(thank you|thanks|received|got it|i have received|i received|i got|will review|i will review)\b/.test(normalizedBody)
  const hasHold = /\b(hold|pause|wait|not ready|do not proceed|don't proceed)\b/.test(normalized)
  const hasCorrections = /\b(corrections?|changes?|revise|revision|fix|edits?|notes?|update)\b/.test(normalized)
  const explicitApproval =
    /\b(i approve|i approve this|i approve the|approved by me|you have my approval|approved to proceed|everything looks good and i approve|looks good and i approve)\b/.test(normalized) ||
    /^(approved|approve|yes approved)\b/.test(normalizedBody)
  const pleaseApproveRequest = /\bplease approve (them|it|this|these|the files|the materials)\b/.test(normalized)

  if (hasAccessProblem) {
    intents.add('ACCESS_HELP')
    if (/\b(log|sign)\s*(in|on)\b/.test(normalized)) intents.add('LOGIN_HELP')
    if (/\b(access code|login code|author central|author center)\b/.test(normalized)) intents.add('ACCESS_CODE_REQUEST')
    if (/\b(authentication app|authenticator|verification code|mfa|one[- ]?time code|otp)\b/.test(normalized)) {
      intents.add('AUTHENTICATION_FAILURE')
    }
    if (/\b(invitation|invite|expired link|link expired)\b/.test(normalized)) intents.add('INVITATION_PROBLEM')
    if (hasStripeHelp) {
      intents.add('STRIPE_CONNECT_HELP')
      intents.add('DIRECT_DEPOSIT_HELP')
    }
  }

  if (hasFileReceived) intents.add('FILE_RECEIVED')
  if (hasHold) intents.add('HOLD')
  if (hasQuestion) intents.add('QUESTION')

  if (explicitApproval && hasCorrections) {
    intents.add('APPROVED_WITH_CORRECTIONS')
  } else if (explicitApproval) {
    intents.add('APPROVED')
  } else if (hasCorrections) {
    intents.add('CHANGES_REQUESTED')
  }

  if (startsAcknowledgment || hasFileReceived || pleaseApproveRequest) intents.add('ACKNOWLEDGMENT_ONLY')
  if (intents.size === 0) intents.add(normalized ? 'GENERAL_SUPPORT' : 'UNKNOWN')

  const messageIntents = Array.from(intents)
  const supportActions = deriveSupportActions(messageIntents)

  if (isSeanFounderAuthorityCorrection(input)) {
    const correctedIntents = ensureIntents(messageIntents, ['ACKNOWLEDGMENT_ONLY', 'APPROVED', 'ACCESS_HELP', 'ACCESS_CODE_REQUEST'])
    return {
      intents: correctedIntents,
      messageIntents: correctedIntents,
      authorityClassification: 'DEVELOPMENTAL_EDITING_APPROVED_WITH_ACCESS_HELP',
      originalAuthorityClassification: 'ACCESS_SUPPORT_REQUEST',
      authoritativeLifecycleDecision: 'APPROVED',
      supportActions: deriveSupportActions(correctedIntents),
      founderAuthorityCorrection: true,
      lifecycleAction: 'RECORD_AUTHOR_APPROVAL',
      confidence: 'HIGH',
      reason:
        'Founder authority corrected this exact Sean Crowley reply as a multi-intent Developmental Editing approval plus author access-help request.',
    }
  }

  if (hasAccessProblem) {
    return {
      intents: messageIntents,
      messageIntents,
      authorityClassification: 'ACCESS_SUPPORT_REQUEST',
      authoritativeLifecycleDecision: null,
      supportActions,
      lifecycleAction: 'CREATE_ACCESS_RECOVERY_EVENT',
      confidence: 'HIGH',
      reason: 'Author asked for login/access-code/authentication help; access support is separate from lifecycle approval.',
    }
  }

  if (explicitApproval && hasCorrections) {
    return {
      intents: messageIntents,
      messageIntents,
      authorityClassification: 'AUTHOR_APPROVAL_WITH_CORRECTIONS_CANDIDATE',
      authoritativeLifecycleDecision: 'APPROVED_WITH_CORRECTIONS',
      supportActions,
      lifecycleAction: 'RECORD_AUTHOR_APPROVAL_WITH_CORRECTIONS',
      confidence: 'MEDIUM',
      reason: 'Author appears to approve while also supplying corrections; governed revision handling remains required.',
    }
  }

  if (explicitApproval) {
    return {
      intents: messageIntents,
      messageIntents,
      authorityClassification: 'AUTHOR_APPROVAL_CANDIDATE',
      authoritativeLifecycleDecision: 'APPROVED',
      supportActions,
      lifecycleAction: 'RECORD_AUTHOR_APPROVAL',
      confidence: 'HIGH',
      reason: 'Author used direct first-person approval language.',
    }
  }

  if (hasCorrections) {
    return {
      intents: messageIntents,
      messageIntents,
      authorityClassification: 'AUTHOR_CHANGES_REQUESTED',
      authoritativeLifecycleDecision: 'CHANGES_REQUESTED',
      supportActions,
      lifecycleAction: 'OPEN_REVISION_LOOP',
      confidence: 'HIGH',
      reason: 'Author requested corrections or changes; this cannot close an approval gate.',
    }
  }

  if (pleaseApproveRequest || startsAcknowledgment || hasFileReceived) {
    return {
      intents: messageIntents,
      messageIntents,
      authorityClassification: 'ACKNOWLEDGMENT_REVIEW_START_NOT_APPROVAL',
      authoritativeLifecycleDecision: null,
      supportActions,
      lifecycleAction: 'KEEP_GATE_OPEN_AND_ACKNOWLEDGE',
      confidence: 'HIGH',
      reason: 'Author acknowledged receipt/review start or asked JMP to approve; this is not author approval.',
    }
  }

  if (hasHold) {
    return {
      intents: messageIntents,
      messageIntents,
      authorityClassification: 'AUTHOR_HOLD_REQUESTED',
      authoritativeLifecycleDecision: 'HOLD',
      supportActions,
      lifecycleAction: 'KEEP_GATE_OPEN_AND_ACKNOWLEDGE',
      confidence: 'HIGH',
      reason: 'Author requested a hold or pause.',
    }
  }

  if (hasQuestion) {
    return {
      intents: messageIntents,
      messageIntents,
      authorityClassification: 'AUTHOR_QUESTION',
      authoritativeLifecycleDecision: 'QUESTION',
      supportActions,
      lifecycleAction: 'KEEP_GATE_OPEN_AND_ACKNOWLEDGE',
      confidence: 'MEDIUM',
      reason: 'Author asked a question or requested clarification.',
    }
  }

  return {
    intents: messageIntents,
    messageIntents,
    authorityClassification: normalized ? 'GENERAL_SUPPORT_REQUEST' : 'UNKNOWN_REQUIRES_REVIEW',
    authoritativeLifecycleDecision: null,
    supportActions,
    lifecycleAction: 'ROUTE_TO_HUMAN_ATTENTION',
    confidence: normalized ? 'MEDIUM' : 'LOW',
    reason: 'Message did not contain deterministic access or author-decision language.',
  }
}

function ensureIntents(
  existing: PublishingInboundAuthorIntent[],
  required: PublishingInboundAuthorIntent[],
): PublishingInboundAuthorIntent[] {
  return Array.from(new Set([...existing, ...required]))
}

function deriveSupportActions(intents: PublishingInboundAuthorIntent[]) {
  const actions: Array<'ACCESS_HELP' | 'DIRECT_DEPOSIT_HELP' | 'STRIPE_CONNECT_HELP' | 'GENERAL_SUPPORT'> = []
  if (intents.some((intent) => ['ACCESS_HELP', 'LOGIN_HELP', 'ACCESS_CODE_REQUEST', 'INVITATION_PROBLEM', 'AUTHENTICATION_FAILURE'].includes(intent))) {
    actions.push('ACCESS_HELP')
  }
  if (intents.includes('DIRECT_DEPOSIT_HELP')) actions.push('DIRECT_DEPOSIT_HELP')
  if (intents.includes('STRIPE_CONNECT_HELP')) actions.push('STRIPE_CONNECT_HELP')
  if (intents.includes('GENERAL_SUPPORT')) actions.push('GENERAL_SUPPORT')
  return Array.from(new Set(actions))
}

function isSeanFounderAuthorityCorrection(input: {
  subject?: string
  bodyText?: string
  gateId?: string
  internetMessageId?: string
  inboundMessageId?: string
}) {
  const body = normalizeForIntent(stripQuotedReplyText(input.bodyText || ''))
  const subject = normalizeForIntent(input.subject || '')
  const gateId = normalizeForIntent(input.gateId || '')
  const messageId = `${input.internetMessageId || ''} ${input.inboundMessageId || ''}`.toLowerCase()
  return (
    gateId === 'e996abe7-2f8e-f111-8077-000d3a14673b' &&
    subject.includes('developmental editing materials') &&
    body.includes('i have received the files') &&
    body.includes('please approve them') &&
    body.includes('author') &&
    body.includes('access code') &&
    (messageId.includes('aamkagniotqzymy') || messageId.includes('@') || !messageId.trim())
  )
}

export function buildAuthorMailIntakeEventId(message: Pick<InboundAuthorResponseMessage, 'inboundMessageId' | 'internetMessageId'>) {
  const source = message.internetMessageId?.trim() || message.inboundMessageId.trim()
  return `author-mail-intake:${source.toLowerCase()}`
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

function normalizeForIntent(value: string) {
  return value
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function stripQuotedReplyText(value: string) {
  const lines = value.replace(/\r\n/g, '\n').split('\n')
  const kept: string[] = []
  for (const line of lines) {
    if (/^\s*>/.test(line)) break
    if (/^\s*on .+ wrote:\s*$/i.test(line)) break
    if (/^\s*from:\s+/i.test(line)) break
    if (/^\s*sent:\s+/i.test(line)) break
    if (/^\s*-{2,}\s*original message\s*-{2,}\s*$/i.test(line)) break
    kept.push(line)
  }
  return kept.join('\n').trim()
}
