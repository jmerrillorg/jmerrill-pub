import { EmailClient, type EmailAttachment, type EmailMessage } from '@azure/communication-email'

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
    attachmentsRequired: ['editedManuscript', 'editorialMemo', 'reviewInstructions'],
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
    attachmentsRequired: ['interiorProof', 'reviewInstructions'],
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
    cc: string[]
  }
  correlationId: string
  idempotencyKey: string
  attachments: GovernedPackageAttachment[]
  packageChecksum?: string
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

export function buildAuthorReviewNotificationCopy(input: {
  stageCode: AuthorReviewPackageType
  titleName: string
  corrected?: boolean
}) {
  if (input.corrected) {
    return {
      subject: `Corrected Proofreading Review Package - ${input.titleName}`,
      body: [
        'Good day, Jackie,',
        '',
        `The previous proofreading notice for ${input.titleName} did not include the package attachments.`,
        '',
        'This corrected message includes the governed proofread manuscript and proofreading review cover note. The same package remains available in the Author Operating Center.',
        '',
        'Please review the proofread manuscript and reply to the publishing team with your approval or requested corrections.',
        '',
        'Warmly,',
        '',
        'J Merrill Publishing',
      ].join('\n'),
    }
  }

  const stageLabel = stageLabelFor(input.stageCode)
  return {
    subject: `${stageLabel} Package - ${input.titleName}`,
    body: [
      'Good day, Jackie,',
      '',
      `Your ${stageLabel.toLowerCase()} package for ${input.titleName} is ready for review. The required package files are attached and are also available in the Author Operating Center.`,
      '',
      'Please review the package and reply to the publishing team with your approval or requested corrections.',
      '',
      'Warmly,',
      '',
      'J Merrill Publishing',
    ].join('\n'),
  }
}

export async function sendAuthorPackageNotificationViaAcs(input: {
  connectionString: string
  from: string
  to: string
  cc: string[]
  subject: string
  textBody: string
  attachments: GovernedPackageAttachment[]
}) {
  const client = new EmailClient(input.connectionString)
  const message: EmailMessage = {
    senderAddress: input.from,
    content: {
      subject: input.subject,
      plainText: input.textBody,
    },
    recipients: {
      to: [{ address: input.to }],
      cc: input.cc.map((address) => ({ address })),
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
