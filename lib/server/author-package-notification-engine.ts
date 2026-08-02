// Engine: Notification Engine
// Reusable? Y
// Stage-specific exception? N

import { EmailClient, type EmailAttachment, type EmailMessage } from '@azure/communication-email'
import {
  renderAuthorCommunicationEmail,
  validateAuthorCommunicationEmail,
  type RenderedAuthorCommunication,
} from './author-communication-brand'

export const AUTHOR_PACKAGE_NOTIFICATION_EVENTS = {
  audited: 'AUTHOR_PACKAGE_NOTIFICATION_AUDITED',
  incompleteDetected: 'AUTHOR_PACKAGE_NOTIFICATION_INCOMPLETE_DETECTED',
  attachmentsValidated: 'AUTHOR_PACKAGE_REQUIRED_ATTACHMENTS_VALIDATED',
  correctedSent: 'AUTHOR_PACKAGE_CORRECTED_NOTIFICATION_SENT',
  communicationEvidenceRecorded: 'AUTHOR_PACKAGE_COMMUNICATION_EVIDENCE_RECORDED',
  responseClockCorrected: 'AUTHOR_PACKAGE_RESPONSE_CLOCK_CORRECTED',
  engineCommissioned: 'AUTHOR_PACKAGE_NOTIFICATION_ENGINE_COMMISSIONED',
  templateUnified: 'AUTHOR_PACKAGE_NOTIFICATION_TEMPLATE_UNIFIED',
  transactionCompleted: 'AUTHOR_PACKAGE_NOTIFICATION_TRANSACTION_COMPLETED',
  nextStageAutostartArmed: 'AUTHOR_NEXT_STAGE_AUTOSTART_ARMED',
} as const

export const AUTHOR_PUBLISHING_COMMUNICATION_POLICY = {
  transactionalFromAddress: 'publishing@email.jmerrill.one',
  transactionalFromName: 'J Merrill Publishing',
  canonicalReplyTo: 'publishing@jmerrill.one',
  publishingArchiveCopy: 'publishing@jmerrill.one',
  monitoredReplyMailbox: 'publishing@jmerrill.one',
} as const

export type AuthorReviewPackageType =
  | 'DEVELOPMENTAL_EDITING_REVIEW'
  | 'LINE_EDITING_REVIEW'
  | 'COPYEDITING_REVIEW'
  | 'PROOFREADING_REVIEW'
  | 'INTERIOR_LAYOUT_REVIEW'
  | 'COVER_DESIGN_REVIEW'
  | 'PRODUCTION_PROOF_REVIEW'
  | 'EDITORIAL_REVIEW'

export type AttachmentRole =
  | 'editedManuscript'
  | 'editorialMemo'
  | 'reviewInstructions'
  | 'lineEditedManuscript'
  | 'copyeditedManuscript'
  | 'proofreadManuscript'
  | 'reviewCoverNote'
  | 'interiorProof'
  | 'coverProof'
  | 'productionProof'
  | 'authorResponseMechanism'
  | 'packageManifest'
  | 'authorCoverMessage'

export type AttachmentPolicy = {
  workspaceRequired: boolean
  emailRequired: boolean
  attachmentsRequired: AttachmentRole[]
  secureLinkAllowedWhenOverBytes?: number
}

export const AUTHOR_PACKAGE_NOTIFICATION_POLICIES: Record<AuthorReviewPackageType, AttachmentPolicy> = {
  DEVELOPMENTAL_EDITING_REVIEW: {
    workspaceRequired: true,
    emailRequired: true,
    attachmentsRequired: [
      'editedManuscript',
      'editorialMemo',
      'reviewInstructions',
      'authorResponseMechanism',
      'packageManifest',
      'authorCoverMessage',
    ],
  },
  LINE_EDITING_REVIEW: {
    workspaceRequired: true,
    emailRequired: true,
    attachmentsRequired: ['lineEditedManuscript', 'reviewCoverNote'],
  },
  COPYEDITING_REVIEW: {
    workspaceRequired: true,
    emailRequired: true,
    attachmentsRequired: ['copyeditedManuscript', 'reviewCoverNote'],
  },
  PROOFREADING_REVIEW: {
    workspaceRequired: true,
    emailRequired: true,
    attachmentsRequired: ['proofreadManuscript', 'reviewCoverNote'],
  },
  INTERIOR_LAYOUT_REVIEW: {
    workspaceRequired: true,
    emailRequired: true,
    attachmentsRequired: [
      'interiorProof',
      'reviewInstructions',
      'authorResponseMechanism',
      'packageManifest',
      'authorCoverMessage',
    ],
    secureLinkAllowedWhenOverBytes: 10 * 1024 * 1024,
  },
  COVER_DESIGN_REVIEW: {
    workspaceRequired: true,
    emailRequired: true,
    attachmentsRequired: ['coverProof', 'reviewInstructions'],
    secureLinkAllowedWhenOverBytes: 10 * 1024 * 1024,
  },
  PRODUCTION_PROOF_REVIEW: {
    workspaceRequired: true,
    emailRequired: true,
    attachmentsRequired: ['productionProof', 'reviewInstructions'],
    secureLinkAllowedWhenOverBytes: 10 * 1024 * 1024,
  },
  EDITORIAL_REVIEW: {
    workspaceRequired: true,
    emailRequired: true,
    attachmentsRequired: ['editorialMemo', 'reviewInstructions'],
  },
}

export type GovernedPackageAttachment = {
  role: AttachmentRole
  artifactId: string
  fileName: string
  contentType: string
  contentBytesBase64?: string
  sizeBytes?: number
  sha256?: string
}

export type AuthorPackageNotificationInput = {
  titleId: string
  authorId: string
  stageCode: AuthorReviewPackageType
  gateId: string
  packageId: string
  packageVersion: string
  packageArtifactIds: string[]
  requiredAttachmentArtifactIds: string[]
  workspaceAccessLocation: string
  notificationTemplateId: string
  cadenceReleaseAt?: string
  recipientPolicy: {
    from: string
    to: string
    replyTo: string
    bcc: string[]
  }
  correlationId: string
  idempotencyKey: string
  attachments: GovernedPackageAttachment[]
  packageChecksum?: string
}

export type AuthorReviewNotificationCopy = {
  subject: string
  body: string
  htmlBody: string
  templateName: string
  templateVersion: string
  templateMetadata: RenderedAuthorCommunication['metadata']
}

export type PackageNotificationValidationResult = {
  ok: boolean
  blocker?: string
  packageValidationResult: 'valid' | 'blocked'
  attachmentValidationResult: 'valid' | 'blocked'
  authorAccessResult: 'valid' | 'blocked'
}

export type AuthorPackageNotificationOutput = {
  packageValidationResult: PackageNotificationValidationResult['packageValidationResult']
  attachmentValidationResult: PackageNotificationValidationResult['attachmentValidationResult']
  authorAccessResult: PackageNotificationValidationResult['authorAccessResult']
  messageId: string
  threadId: string
  sentAt: string
  providerStatus: string
  communicationEvidenceId?: string
  gateActivationResult: 'opened' | 'unchanged'
  workspaceRefreshResult: 'refreshed' | 'unchanged'
  publisherRefreshResult: 'refreshed' | 'unchanged'
}

export function getAuthorPackageNotificationPolicy(stageCode: AuthorReviewPackageType) {
  return AUTHOR_PACKAGE_NOTIFICATION_POLICIES[stageCode]
}

export function buildAuthorPackageNotificationIdempotencyKey(input: {
  titleId: string
  stageCode: AuthorReviewPackageType
  gateId: string
  packageId: string
  packageVersion: string
  packageChecksum?: string
}) {
  return [
    'author-package-notification',
    input.titleId,
    input.stageCode,
    input.gateId,
    input.packageId,
    input.packageVersion,
    input.packageChecksum || 'checksum-pending',
  ].join(':')
}

export function validateAuthorPackageNotification(input: AuthorPackageNotificationInput): PackageNotificationValidationResult {
  const policy = getAuthorPackageNotificationPolicy(input.stageCode)
  if (!input.packageId || input.packageArtifactIds.length === 0) {
    return blocked('AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - PACKAGE_REFERENCE_MISSING')
  }
  if (policy.workspaceRequired && !input.workspaceAccessLocation) {
    return blocked('AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - PACKAGE_ACCESS_INVALID')
  }
  if (policy.emailRequired && !input.recipientPolicy.to) {
    return blocked('AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - AUTHOR_EMAIL_MISSING')
  }
  const headerValidation = validateAuthorNotificationHeaders(input.recipientPolicy)
  if (!headerValidation.ok) return blocked(headerValidation.blocker)

  const attachmentsByRole = new Map(input.attachments.map((attachment) => [attachment.role, attachment]))
  const missingRole = policy.attachmentsRequired.find((role) => !attachmentsByRole.get(role))
  if (missingRole) {
    return blocked(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - REQUIRED_ATTACHMENT_MISSING - ${missingRole}`)
  }

  const attachmentWithoutBytes = policy.attachmentsRequired.find((role) => {
    const attachment = attachmentsByRole.get(role)
    return !attachment?.contentBytesBase64
  })
  if (attachmentWithoutBytes) {
    return blocked(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - ATTACHMENT_MATERIALIZATION_FAILED - ${attachmentWithoutBytes}`)
  }

  const totalBytes = input.attachments.reduce((sum, attachment) => sum + (attachment.sizeBytes || estimateBase64Bytes(attachment.contentBytesBase64 || '')), 0)
  const maxBytes = policy.secureLinkAllowedWhenOverBytes || 20 * 1024 * 1024
  if (totalBytes > maxBytes && !policy.secureLinkAllowedWhenOverBytes) {
    return blocked('AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - ATTACHMENT_SIZE_LIMIT')
  }

  return {
    ok: true,
    packageValidationResult: 'valid',
    attachmentValidationResult: 'valid',
    authorAccessResult: 'valid',
  }
}

export function validateAuthorNotificationHeaders(input: {
  from: string
  to: string
  replyTo?: string
  bcc: string[]
}): { ok: true } | { ok: false; blocker: string } {
  const from = input.from.trim().toLowerCase()
  const replyTo = (input.replyTo || '').trim().toLowerCase()
  const bcc = input.bcc.map((address) => address.trim().toLowerCase())

  if (from !== AUTHOR_PUBLISHING_COMMUNICATION_POLICY.transactionalFromAddress) {
    return { ok: false, blocker: 'AUTHOR_NOTIFICATION_BLOCKED - SENDER_NOT_APPROVED' }
  }
  if (!replyTo) {
    return { ok: false, blocker: 'AUTHOR_NOTIFICATION_BLOCKED - REPLY_TO_MISSING' }
  }
  if (replyTo !== AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo) {
    return { ok: false, blocker: 'AUTHOR_NOTIFICATION_BLOCKED - REPLY_TO_NOT_CANONICAL' }
  }
  if (replyTo.endsWith('@email.jmerrill.one')) {
    return { ok: false, blocker: 'AUTHOR_NOTIFICATION_BLOCKED - REPLY_TO_DOMAIN_NOT_RECEIVING_MAIL' }
  }
  if (!bcc.includes(AUTHOR_PUBLISHING_COMMUNICATION_POLICY.publishingArchiveCopy)) {
    return { ok: false, blocker: 'AUTHOR_NOTIFICATION_BLOCKED - PUBLISHING_ARCHIVE_BCC_MISSING' }
  }
  return { ok: true }
}

export function buildAuthorReviewNotificationCopy(input: {
  stageCode: AuthorReviewPackageType
  titleName: string
  authorName?: string
  corrected?: boolean
}): AuthorReviewNotificationCopy {
  const stageLabel = stageLabelFor(input.stageCode)
  const authorName = input.authorName?.trim() || 'Author'
  if (input.corrected) {
    const rendered = renderAuthorCommunicationEmail({
      templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
      templateVersion: '1.0.0',
      subject: `Corrected Proofreading Review Package - ${input.titleName}`,
      authorName,
      titleName: input.titleName,
      preheader: `Corrected ${stageLabel.toLowerCase()} package for ${input.titleName}.`,
      why: `The previous ${stageLabel.toLowerCase()} notice for ${input.titleName} did not include the required package attachments.`,
      completed: [
        'The package was audited against the governed attachment policy.',
        'The corrected package includes the required review materials.',
        'The same package remains available in the Author Operating Center.',
      ],
      meaning: 'Your review period starts from the corrected package notification, not from the incomplete notice.',
      authorAction: 'Please review the attached package and reply to the publishing team with your approval or requested corrections.',
      primaryActionLabel: 'Review Package and Reply',
      packageInventory: [
        'Current author-review manuscript or proof',
        'Stage-specific editorial or production summary',
        'Review instructions',
        'Package manifest or package summary',
      ],
      responseChoices: [
        'Approve as presented',
        'Approve with corrections',
        'Questions or clarification requested',
      ],
      deadline: 'Please use the response window stated in the Author Operating Center or package instructions.',
      nextSteps: [
        'The publishing team will record your response.',
        'Approved corrections or approval will move through the governed next-stage process.',
        'If you have questions, reply directly to this message.',
      ],
    })
    return {
      subject: rendered.subject,
      body: rendered.text,
      htmlBody: rendered.html,
      templateName: rendered.metadata.templateName,
      templateVersion: rendered.metadata.templateVersion,
      templateMetadata: rendered.metadata,
    }
  }

  const rendered = renderAuthorCommunicationEmail({
    templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
    templateVersion: '1.0.0',
    subject: `${stageLabel} Package - ${input.titleName}`,
    authorName,
    titleName: input.titleName,
    preheader: `Your ${stageLabel.toLowerCase()} package is ready for review.`,
    why: `Your ${stageLabel.toLowerCase()} package for ${input.titleName} is ready for your review.`,
    completed: [
      'The publishing team completed the current internal package step.',
      'The required review package files are attached to this message.',
      'The package is also available in the Author Operating Center.',
    ],
    meaning: 'This is the point where your review helps us confirm the next governed step for your book.',
    authorAction: 'Please review the package and reply to the publishing team with your approval or requested corrections.',
    primaryActionLabel: 'Review Package and Reply',
    packageInventory: [
      'Current author-review manuscript or proof',
      'Stage-specific editorial or production summary',
      'Review instructions',
      'Package manifest or package summary',
    ],
    responseChoices: [
      'Approve as presented',
      'Approve with corrections',
      'Questions or clarification requested',
    ],
    deadline: 'Please use the response window stated in the Author Operating Center or package instructions.',
    nextSteps: [
      'The publishing team will record your response.',
      'If you approve, the project can move to the next governed stage.',
      'If you request corrections, the publishing team will review them before any stage movement.',
    ],
  })
  return {
    subject: rendered.subject,
    body: rendered.text,
    htmlBody: rendered.html,
    templateName: rendered.metadata.templateName,
    templateVersion: rendered.metadata.templateVersion,
    templateMetadata: rendered.metadata,
  }
}

export async function sendAuthorPackageNotificationViaAcs(input: {
  connectionString: string
  from: string
  to: string
  replyTo: string
  bcc: string[]
  subject: string
  textBody: string
  htmlBody: string
  attachments: GovernedPackageAttachment[]
}) {
  const headerValidation = validateAuthorNotificationHeaders({
    from: input.from,
    to: input.to,
    replyTo: input.replyTo,
    bcc: input.bcc,
  })
  if (!headerValidation.ok) throw new Error(headerValidation.blocker)
  const bodyValidation = validateAuthorCommunicationEmail({
    html: input.htmlBody,
    text: input.textBody,
    templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
    templateVersion: '1.0.0',
  })
  if (!bodyValidation.ok) throw new Error(bodyValidation.blocker)

  const client = new EmailClient(input.connectionString)
  const message: EmailMessage = {
    senderAddress: input.from,
    replyTo: [{ address: input.replyTo, displayName: AUTHOR_PUBLISHING_COMMUNICATION_POLICY.transactionalFromName }],
    content: {
      subject: input.subject,
      plainText: input.textBody,
      html: input.htmlBody,
    },
    recipients: {
      to: [{ address: input.to }],
      bcc: input.bcc.map((address) => ({ address })),
    },
    attachments: input.attachments.map((attachment): EmailAttachment => ({
      name: attachment.fileName,
      contentType: attachment.contentType,
      contentInBase64: attachment.contentBytesBase64 || '',
    })),
  }

  const poller = await client.beginSend(message)
  const result = await poller.pollUntilDone()
  return {
    messageId: result.id || 'not-returned-by-provider',
    providerStatus: result.status || 'accepted',
    sentAt: new Date().toISOString(),
  }
}

function blocked(blocker: string): PackageNotificationValidationResult {
  return {
    ok: false,
    blocker,
    packageValidationResult: blocker.includes('PACKAGE') ? 'blocked' : 'valid',
    attachmentValidationResult: blocker.includes('ATTACHMENT') ? 'blocked' : 'valid',
    authorAccessResult: blocker.includes('ACCESS') || blocker.includes('EMAIL') ? 'blocked' : 'valid',
  }
}

function estimateBase64Bytes(value: string) {
  if (!value) return 0
  return Math.floor((value.length * 3) / 4)
}

function stageLabelFor(stageCode: AuthorReviewPackageType) {
  switch (stageCode) {
    case 'DEVELOPMENTAL_EDITING_REVIEW':
      return 'Developmental Editing Review'
    case 'LINE_EDITING_REVIEW':
      return 'Line Editing Review'
    case 'COPYEDITING_REVIEW':
      return 'Copyediting Review'
    case 'PROOFREADING_REVIEW':
      return 'Proofreading Review'
    case 'INTERIOR_LAYOUT_REVIEW':
      return 'Interior Layout Review'
    case 'COVER_DESIGN_REVIEW':
      return 'Cover Design Review'
    case 'PRODUCTION_PROOF_REVIEW':
      return 'Production Proof Review'
    case 'EDITORIAL_REVIEW':
      return 'Editorial Review'
  }
}
