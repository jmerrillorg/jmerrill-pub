export const COMMUNICATION_ACCEPTANCE_VERSION = '1.0.0'
export const PUBLISHING_EVIDENCE_MAILBOX = 'publishing@jmerrill.one'
export const COMMUNICATION_STATE = {
  CREATED: 'CREATED', RENDERED: 'RENDERED', SUBMITTED: 'SUBMITTED',
  PROVIDER_ACCEPTED: 'PROVIDER_ACCEPTED', MAILBOX_VERIFIED: 'MAILBOX_VERIFIED',
  FAILED: 'FAILED', DELIVERY_UNVERIFIED: 'DELIVERY_UNVERIFIED',
} as const

// Technical verification policy, not an author-response or delivery SLA.
export const MAILBOX_VERIFICATION_POLICY = {
  version: '1.0.0', windowMs: 30 * 60 * 1000,
  retryOffsetsMs: [0, 60_000, 120_000, 300_000, 600_000, 1_200_000, 1_800_000],
} as const

type Command = {
  jm1MessageId?: string; correlationId?: string; businessObjectId?: string;
  providerMessageId?: string; acceptedAt?: string; recipient?: string;
  subject?: string; rendererVersion?: string; templateVersion?: string;
  contentValid?: boolean; canonicalRender?: boolean; systemSender?: string;
  mailboxMessageId?: string; mailboxInternetMessageId?: string; mailboxVerifiedAt?: string;
  communicationState?: string;
}
type NativeMessage = {
  id?: string; internetMessageId?: string; subject?: string;
  from?: { emailAddress?: { address?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
  ccRecipients?: { emailAddress?: { address?: string } }[];
}
export function providerIdFromInternetMessageId(value: string): string | null {
  const match = /^<\d{12}\.([a-f0-9]{32})-[^<>\s]+@microsoft\.com>$/i.exec(value || '')
  return match?.[1]?.toLowerCase() || null
}
export function verifyPublishingMailboxEvidence(command: Command, message: NativeMessage, mailbox: string) {
  const address = (value?: string) => (value || '').trim().toLowerCase()
  const recipients = (command.recipient || '').split(',').map(address).filter(Boolean).sort()
  const actualRecipients = (message.toRecipients || []).map(item => address(item.emailAddress?.address)).sort()
  const providerId = (command.providerMessageId || '').replaceAll('-', '').toLowerCase()
  if (mailbox !== PUBLISHING_EVIDENCE_MAILBOX || !command.jm1MessageId || !command.correlationId
      || !command.businessObjectId || !command.acceptedAt || !message.id || !message.internetMessageId
      || !/^[a-f0-9]{32}$/.test(providerId)
      || providerIdFromInternetMessageId(message.internetMessageId) !== providerId
      || address(message.from?.emailAddress?.address) !== 'publishing@email.jmerrill.one'
      || recipients.length === 0 || JSON.stringify(recipients) !== JSON.stringify(actualRecipients)
      || message.subject !== command.subject
      || (!actualRecipients.includes(mailbox)
        && !(message.ccRecipients || []).some(item => address(item.emailAddress?.address) === mailbox))) {
    return { verified: false as const, reason: 'MAILBOX_IDENTITY_UNPROVEN' }
  }
  return { verified: true as const, evidence: { mailbox, mailboxMessageId: message.id,
    mailboxInternetMessageId: message.internetMessageId, providerMessageId: command.providerMessageId,
    communicationId: command.jm1MessageId, correlationId: command.correlationId,
    businessEventId: command.businessObjectId, recipient: command.recipient,
    rendererVersion: command.rendererVersion, templateVersion: command.templateVersion } }
}

export function communicationAcceptance(command: Command) {
  const providerAccepted = Boolean(command.providerMessageId && command.acceptedAt)
  const mailboxVerified = Boolean(command.mailboxMessageId && command.mailboxInternetMessageId && command.mailboxVerifiedAt
    && providerIdFromInternetMessageId(command.mailboxInternetMessageId)
      === (command.providerMessageId || '').replaceAll('-', '').toLowerCase())
  const complete = command.contentValid === true && command.canonicalRender === true
    && Boolean(command.rendererVersion && command.templateVersion)
    && providerAccepted && mailboxVerified
  const state = mailboxVerified ? COMMUNICATION_STATE.MAILBOX_VERIFIED
    : providerAccepted ? (command.communicationState === COMMUNICATION_STATE.DELIVERY_UNVERIFIED
      ? COMMUNICATION_STATE.DELIVERY_UNVERIFIED : COMMUNICATION_STATE.PROVIDER_ACCEPTED)
    : command.communicationState || COMMUNICATION_STATE.CREATED
  return { acceptanceVersion: COMMUNICATION_ACCEPTANCE_VERSION, communicationId: command.jm1MessageId,
    communicationState: state, communicationComplete: complete, providerAccepted,
    mailboxEvidenceVerified: mailboxVerified, recipientDeliveryProven: false,
    providerMessageId: command.providerMessageId, providerAcceptedAt: command.acceptedAt,
    mailboxMessageId: command.mailboxMessageId, mailboxInternetMessageId: command.mailboxInternetMessageId,
    mailboxVerifiedAt: command.mailboxVerifiedAt,
    observability: { acsAcceptance: providerAccepted ? 'PASS' : 'UNPROVEN',
      publishingMailboxCopy: mailboxVerified ? 'PASS' : 'UNPROVEN',
      recipientDelivery: 'NOT_PROVEN' } }
}
