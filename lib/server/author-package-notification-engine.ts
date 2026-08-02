// Engine: Notification Engine
// Reusable? Y
// Stage-specific exception? N

import { EmailClient, type EmailAttachment, type EmailMessage } from '@azure/communication-email'
import { strFromU8, unzipSync } from 'fflate'
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
    replyTo: string
    bcc: string[]
  }
  correlationId: string
  idempotencyKey: string
  attachments: GovernedPackageAttachment[]
  packageChecksum?: string
  expectedTitle?: string
}

export type AuthorReviewNotificationCopy = {
  subject: string
  body: string
  htmlBody: string
  templateName: string
  templateVersion: string
  templateMetadata: RenderedAuthorCommunication['metadata']
}

export function responseClockLanguageBeforeCertificationBlocker(copy: {
  body?: string
  htmlBody?: string
  operationallyCertified?: boolean
}) {
  const rendered = `${copy.body || ''}\n${copy.htmlBody || ''}`
  if (copy.operationallyCertified === true) return ''
  if (/review period starts from this (corrected )?email delivery/i.test(rendered)) {
    return 'RESPONSE_CLOCK_LANGUAGE_BEFORE_CERTIFICATION'
  }
  if (/seven-calendar-day review period starts/i.test(rendered)) {
    return 'RESPONSE_CLOCK_LANGUAGE_BEFORE_CERTIFICATION'
  }
  return ''
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

export function isPhysicalEmailAttachmentRole(role: AttachmentRole) {
  return role !== 'authorResponseMechanism' && role !== 'packageManifest' && role !== 'authorCoverMessage'
}

export function authorFacingAttachmentBlocker(attachment: GovernedPackageAttachment) {
  if (!isPhysicalEmailAttachmentRole(attachment.role)) {
    return `AUTHOR_PACKAGE_INTERNAL_ARTIFACT_EXPOSED:${attachment.role}`
  }
  const fileName = attachment.fileName.toLowerCase()
  const contentType = attachment.contentType.toLowerCase()
  if (fileName.endsWith('.json') || contentType.includes('application/json')) {
    return `AUTHOR_PACKAGE_INTERNAL_ARTIFACT_EXPOSED:${attachment.role}:JSON`
  }
  if (fileName.endsWith('.md') || fileName.endsWith('.markdown') || contentType.includes('markdown')) {
    return `AUTHOR_PACKAGE_INTERNAL_ARTIFACT_EXPOSED:${attachment.role}:MARKDOWN`
  }
  if (/\b(manifest|ledger|evidence|execution|workflow|dataverse|checksum|response[-_ ]?mechanism|package[-_ ]?version)\b/i.test(attachment.fileName)) {
    return `AUTHOR_PACKAGE_INTERNAL_ARTIFACT_EXPOSED:${attachment.role}:INTERNAL_NAME`
  }
  return ''
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
  const exposedInternalArtifact = input.attachments.map(authorFacingAttachmentBlocker).find(Boolean)
  if (exposedInternalArtifact) {
    return blocked(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - ${exposedInternalArtifact}`)
  }
  const missingRole = policy.attachmentsRequired.find((role) => !attachmentsByRole.get(role))
  if (missingRole) {
    return blocked(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - REQUIRED_ATTACHMENT_MISSING - ${missingRole}`)
  }

  const physicalAttachmentRoles = policy.attachmentsRequired.filter(isPhysicalEmailAttachmentRole)
  const attachmentWithoutBytes = physicalAttachmentRoles.find((role) => {
    const attachment = attachmentsByRole.get(role)
    return !attachment?.contentBytesBase64
  })
  if (attachmentWithoutBytes) {
    return blocked(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - ATTACHMENT_MATERIALIZATION_FAILED - ${attachmentWithoutBytes}`)
  }

  for (const role of physicalAttachmentRoles) {
    const attachment = attachmentsByRole.get(role)
    if (!attachment) continue
    const binaryValidation = validateGovernedPackageAttachmentBinary(attachment, input.expectedTitle)
    if (!binaryValidation.ok) {
      return blocked(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - ${binaryValidation.blocker}`)
    }
  }

  const emailAttachments = input.attachments.filter((attachment) => isPhysicalEmailAttachmentRole(attachment.role))
  const totalBytes = emailAttachments.reduce((sum, attachment) => sum + (attachment.sizeBytes || estimateBase64Bytes(attachment.contentBytesBase64 || '')), 0)
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
  responseDeadline?: string
  primaryActionUrl: string
  packageInventory?: string[]
}): AuthorReviewNotificationCopy {
  const stageLabel = stageLabelFor(input.stageCode)
  const subjectStageLabel = subjectStageLabelFor(input.stageCode)
  const authorName = input.authorName?.trim() || 'Author'
  const responseDeadline = input.responseDeadline?.trim() || 'the seven-calendar-day response period stated in your package'
  const packageInventory = input.packageInventory?.length ? input.packageInventory : [
    'Current manuscript or proof',
    "Editor's notes when applicable",
    'Review instructions',
  ]
  if (input.corrected) {
    const rendered = renderAuthorCommunicationEmail({
      templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
      templateVersion: '1.0.0',
      subject: `Corrected ${subjectStageLabel} Review Materials — ${input.titleName}`,
      authorName,
      titleName: input.titleName,
      preheader: `Corrected ${stageLabel.toLowerCase()} materials for ${input.titleName}.`,
      why: `We are sending corrected ${stageLabel.toLowerCase()} materials for ${input.titleName} so you have the usable documents in one clear email.`,
      completed: [
        'The publishing team prepared the current author-facing files.',
        'The files you need for this review are attached to this email.',
        'Your Author Operating Center has also been updated if you would like to view your project history or download another copy.',
      ],
      meaning: 'Please review the attached files for the current publishing stage. You do not need to use the portal to complete this review.',
      authorAction: 'Reply directly to publishing@jmerrill.one with Approved, Approved with corrections, or I have questions. You may also include one consolidated correction list in your reply.',
      primaryActionLabel: 'View in Author Operating Center',
      primaryActionUrl: input.primaryActionUrl,
      packageInventory,
      deadline: `Please respond by ${responseDeadline}. The publishing team will confirm the review period after we verify the corrected delivery is usable.`,
      nextSteps: [
        'The publishing team will record your response.',
        'Approved corrections or approval will move to the next publishing step.',
        'If you have questions, reply directly to this message.',
      ],
    })
    const prematureClockLanguage = responseClockLanguageBeforeCertificationBlocker({
      body: rendered.text,
      htmlBody: rendered.html,
      operationallyCertified: false,
    })
    if (prematureClockLanguage) {
      throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - ${prematureClockLanguage}`)
    }
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
    subject: `${stageLabel} Materials - ${input.titleName}`,
    authorName,
    titleName: input.titleName,
    preheader: `Your ${stageLabel.toLowerCase()} materials are ready for review.`,
    why: `Your ${stageLabel.toLowerCase()} materials for ${input.titleName} are ready for your review.`,
    completed: [
      'The publishing team prepared the current author-facing files.',
      'The files you need for this review are attached to this email.',
      'Your Author Operating Center has also been updated if you would like to view your project history or download another copy.',
    ],
      meaning: 'Please review the attached files for the current publishing stage. You do not need to use the portal to complete this review.',
      authorAction: 'Reply directly to publishing@jmerrill.one with Approved, Approved with corrections, or I have questions. You may also include one consolidated correction list in your reply.',
      primaryActionLabel: 'View in Author Operating Center',
    primaryActionUrl: input.primaryActionUrl,
    packageInventory,
    deadline: `Please respond by ${responseDeadline}.`,
    nextSteps: [
      'The publishing team will record your response.',
      'If you approve, the project can move to the next publishing stage.',
      'If you request corrections, the publishing team will review them before any stage movement.',
    ],
  })
  const prematureClockLanguage = responseClockLanguageBeforeCertificationBlocker({
    body: rendered.text,
    htmlBody: rendered.html,
    operationallyCertified: false,
  })
  if (prematureClockLanguage) {
    throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - ${prematureClockLanguage}`)
  }
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

  const exposedInternalArtifact = input.attachments.map(authorFacingAttachmentBlocker).find(Boolean)
  if (exposedInternalArtifact) throw new Error(`AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - ${exposedInternalArtifact}`)

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
    attachments: input.attachments
      .filter((attachment) => isPhysicalEmailAttachmentRole(attachment.role))
      .map((attachment): EmailAttachment => ({
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

export function validateGovernedPackageAttachmentBinary(
  attachment: GovernedPackageAttachment,
  expectedTitle?: string,
): { ok: true } | { ok: false; blocker: string } {
  if (!attachment.contentBytesBase64) return { ok: false, blocker: `ATTACHMENT_MATERIALIZATION_FAILED:${attachment.role}` }
  let bytes: Buffer
  try {
    bytes = Buffer.from(attachment.contentBytesBase64, 'base64')
  } catch {
    return { ok: false, blocker: `ATTACHMENT_BINARY_INVALID:${attachment.role}:BASE64_DECODE_FAILED` }
  }
  const declaredSize = attachment.sizeBytes || bytes.byteLength
  if (bytes.byteLength === 0 || declaredSize === 0) return { ok: false, blocker: `ATTACHMENT_BINARY_INVALID:${attachment.role}:EMPTY` }
  if (declaredSize !== bytes.byteLength) return { ok: false, blocker: `ATTACHMENT_BINARY_INVALID:${attachment.role}:SIZE_MISMATCH` }
  const minimum = minimumPlausibleBytesFor(attachment)
  if (bytes.byteLength < minimum) return { ok: false, blocker: `ATTACHMENT_BINARY_INVALID:${attachment.role}:MINIMUM_SIZE` }
  const lowerName = attachment.fileName.toLowerCase()
  const lowerType = attachment.contentType.toLowerCase()
  if (lowerName.endsWith('.docx') || lowerType.includes('officedocument.wordprocessingml.document')) {
    return validateDocx(bytes, attachment.role, expectedTitle)
  }
  if (lowerName.endsWith('.pdf') || lowerType.includes('application/pdf')) {
    return validatePdf(bytes, attachment.role, expectedTitle)
  }
  if (lowerName.endsWith('.json') || lowerType.includes('application/json')) {
    return validateTextLike(bytes, attachment.role, /[{[]/, 'JSON_OR_SCHEMA')
  }
  if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerType.startsWith('text/')) {
    return validateTextLike(bytes, attachment.role, /\S/, 'TEXT')
  }
  return { ok: false, blocker: `ATTACHMENT_BINARY_INVALID:${attachment.role}:UNSUPPORTED_FILE_TYPE` }
}

function validateDocx(bytes: Buffer, role: AttachmentRole, expectedTitle?: string): { ok: true } | { ok: false; blocker: string } {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return { ok: false, blocker: `ATTACHMENT_FILE_SIGNATURE_INVALID:${role}:DOCX_ZIP_SIGNATURE` }
  const ascii = bytes.toString('latin1')
  for (const part of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml']) {
    if (!ascii.includes(part)) return { ok: false, blocker: `ATTACHMENT_OPEN_TEST_FAILED:${role}:OOXML_PART_MISSING:${part}` }
  }
  if (looksLikeErrorPayload(bytes)) return { ok: false, blocker: `ATTACHMENT_BINARY_INVALID:${role}:ERROR_PAYLOAD` }
  const documentText = extractDocxDocumentText(bytes)
  if (!documentText) return { ok: false, blocker: `ATTACHMENT_OPEN_TEST_FAILED:${role}:DOCX_TEXT_EXTRACTION_FAILED` }
  if (expectedTitle && !normalizedContains(documentText, expectedTitle)) {
    return { ok: false, blocker: `ATTACHMENT_EXPECTED_CONTENT_MISSING:${role}:TITLE` }
  }
  return { ok: true }
}

function extractDocxDocumentText(bytes: Buffer) {
  try {
    const entries = unzipSync(new Uint8Array(bytes))
    const document = entries['word/document.xml']
    if (!document) return ''
    return strFromU8(document)
      .replace(/<w:tab\/>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return ''
  }
}

function validatePdf(bytes: Buffer, role: AttachmentRole, expectedTitle?: string): { ok: true } | { ok: false; blocker: string } {
  if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) return { ok: false, blocker: `ATTACHMENT_FILE_SIGNATURE_INVALID:${role}:PDF_SIGNATURE` }
  const text = bytes.toString('latin1')
  if (!/%%EOF/.test(text)) return { ok: false, blocker: `ATTACHMENT_OPEN_TEST_FAILED:${role}:PDF_EOF_MISSING` }
  if (looksLikeErrorPayload(bytes)) return { ok: false, blocker: `ATTACHMENT_BINARY_INVALID:${role}:ERROR_PAYLOAD` }
  if (extractPdfPageCount(text) < 1) {
    return { ok: false, blocker: `ATTACHMENT_OPEN_TEST_FAILED:${role}:PDF_PAGE_COUNT` }
  }
  return { ok: true }
}

function extractPdfPageCount(text: string) {
  const matches = Array.from(text.matchAll(/\/Count\s+(\d+)/g))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value))
  if (matches.length > 0) return Math.max(...matches)
  return (text.match(/\/Type\s*\/Page\b/g) || []).length
}

function validateTextLike(bytes: Buffer, role: AttachmentRole, pattern: RegExp, label: string): { ok: true } | { ok: false; blocker: string } {
  const text = bytes.toString('utf8').trim()
  if (!text || !pattern.test(text)) return { ok: false, blocker: `ATTACHMENT_OPEN_TEST_FAILED:${role}:${label}` }
  if (/<html\b|<!doctype html>|\"error\"\\s*:|AccessDenied|Unauthorized/i.test(text)) {
    return { ok: false, blocker: `ATTACHMENT_BINARY_INVALID:${role}:ERROR_PAYLOAD` }
  }
  return { ok: true }
}

function minimumPlausibleBytesFor(attachment: GovernedPackageAttachment) {
  if (attachment.role === 'editedManuscript') return 10_000
  if (attachment.role === 'interiorProof' || attachment.role === 'productionProof') return 100_000
  if (attachment.role === 'editorialMemo') return 2_000
  return 300
}

function looksLikeErrorPayload(bytes: Buffer) {
  const sample = bytes.subarray(0, Math.min(bytes.byteLength, 2048)).toString('utf8')
  return /<html\b|<!doctype html>|\"error\"\\s*:|AccessDenied|Unauthorized|not found/i.test(sample)
}

function normalizedContains(haystack: string, needle: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return normalize(haystack).includes(normalize(needle))
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

function subjectStageLabelFor(stageCode: AuthorReviewPackageType) {
  return stageLabelFor(stageCode).replace(/\s+Review$/i, '')
}
