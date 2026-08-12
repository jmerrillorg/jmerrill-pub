import { readFileSync } from 'node:fs'

const engine = readFileSync('lib/server/author-package-notification-engine.ts', 'utf8')
const orchestrator = readFileSync('lib/server/publishing-orchestrator.ts', 'utf8')

const requiredStages = [
  'DEVELOPMENTAL_EDITING_REVIEW',
  'LINE_EDITING_REVIEW',
  'COPYEDITING_REVIEW',
  'PROOFREADING_REVIEW',
  'INTERIOR_LAYOUT_REVIEW',
  'COVER_DESIGN_REVIEW',
  'PRODUCTION_PROOF_REVIEW',
  'EDITORIAL_REVIEW',
]

const checks = [
  {
    name: 'every author-review package type declares attachment policy',
    pass: () =>
      requiredStages.every((stage) => engine.includes(`${stage}: {`)) &&
      engine.includes("attachmentsRequired: ['proofreadManuscript', 'reviewInstructions']") &&
      engine.includes("attachmentsRequired: ['copyeditedManuscript', 'reviewCoverNote']") &&
      engine.includes("attachmentsRequired: ['editedManuscript', 'reviewInstructions']") &&
      engine.includes("attachmentsRequired: ['interiorProof', 'reviewInstructions']"),
  },
  {
    name: 'workspace link alone does not satisfy attachment policy',
    pass: () =>
      engine.includes('AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - REQUIRED_ATTACHMENT_MISSING') &&
      engine.includes('AUTHOR_PACKAGE_NOTIFICATION_BLOCKED - ATTACHMENT_MATERIALIZATION_FAILED') &&
      orchestrator.includes('Workspace link alone does not satisfy') &&
      orchestrator.includes('return notificationBlocked(config, input.gateId, input.correlationId, validation.blocker)'),
  },
  {
    name: 'canonical package identity drives notification idempotency',
    pass: () =>
      engine.includes('buildAuthorPackageNotificationIdempotencyKey') &&
      engine.includes('input.titleId') &&
      engine.includes('input.stageCode') &&
      engine.includes('input.gateId') &&
      engine.includes('input.packageId') &&
      engine.includes('input.packageVersion') &&
      engine.includes("input.packageChecksum || 'checksum-pending'") &&
      orchestrator.includes('buildAuthorPackageNotificationIdempotencyKey({'),
  },
  {
    name: 'corrected send is email-first and avoids clock-start language before certification',
    pass: () =>
      engine.includes('Corrected ${subjectStageLabel} Review Materials') &&
      !engine.includes('Corrected Proofreading Review Package') &&
      engine.includes('one clear email') &&
      engine.includes('You do not need to use the portal to complete this review') &&
      engine.includes('The publishing team will confirm the review period after we verify the corrected delivery is usable') &&
      engine.includes('RESPONSE_CLOCK_LANGUAGE_BEFORE_CERTIFICATION') &&
      !engine.includes('Your seven-calendar-day review period starts from this corrected email delivery') &&
      engine.includes('Reply directly to publishing@jmerrill.one with Approved, Approved with corrections, or I have questions'),
  },
  {
    name: 'canonical events exist for audit, correction, transaction completion, and autostart arming',
    pass: () =>
      [
        'AUTHOR_PACKAGE_NOTIFICATION_AUDITED',
        'AUTHOR_PACKAGE_NOTIFICATION_INCOMPLETE_DETECTED',
        'AUTHOR_PACKAGE_REQUIRED_ATTACHMENTS_VALIDATED',
        'AUTHOR_PACKAGE_CORRECTED_NOTIFICATION_SENT',
        'AUTHOR_PACKAGE_COMMUNICATION_EVIDENCE_RECORDED',
        'AUTHOR_PACKAGE_RESPONSE_CLOCK_CORRECTED',
        'AUTHOR_PACKAGE_NOTIFICATION_ENGINE_COMMISSIONED',
        'AUTHOR_PACKAGE_NOTIFICATION_TEMPLATE_UNIFIED',
        'AUTHOR_PACKAGE_NOTIFICATION_TRANSACTION_COMPLETED',
        'AUTHOR_NEXT_STAGE_AUTOSTART_ARMED',
      ].every((event) => engine.includes(event)),
  },
  {
    name: 'author package notification validates canonical From, Reply-To, and Publishing CC policy',
    pass: () =>
      engine.includes('AUTHOR_PUBLISHING_COMMUNICATION_POLICY') &&
      engine.includes('validateAuthorNotificationHeaders') &&
      engine.includes('AUTHOR_NOTIFICATION_BLOCKED - REPLY_TO_MISSING') &&
      engine.includes('AUTHOR_NOTIFICATION_BLOCKED - REPLY_TO_NOT_CANONICAL') &&
      engine.includes('AUTHOR_NOTIFICATION_BLOCKED - REPLY_TO_DOMAIN_NOT_RECEIVING_MAIL') &&
      engine.includes('AUTHOR_NOTIFICATION_BLOCKED - PUBLISHING_CC_MISSING') &&
      orchestrator.includes('replyTo: CANONICAL_REPLY_TO'),
  },
  {
    name: 'ACS sender supports real attachments instead of link-only notification',
    pass: () =>
      engine.includes('EmailClient') &&
      engine.includes('EmailAttachment') &&
      engine.includes('contentInBase64') &&
      engine.includes('isPhysicalEmailAttachmentRole') &&
      engine.includes('attachments: input.attachments') &&
      engine.includes('.filter((attachment) => isPhysicalEmailAttachmentRole(attachment.role))'),
  },
  {
    name: 'author package email fails closed if internal artifacts enter MIME inventory',
    pass: () =>
      engine.includes('authorFacingAttachmentBlocker') &&
      engine.includes('AUTHOR_PACKAGE_INTERNAL_ARTIFACT_EXPOSED') &&
      engine.includes("fileName.endsWith('.json')") &&
      engine.includes("fileName.endsWith('.md')") &&
      engine.includes('package[-_ ]?version'),
  },
  {
    name: 'author package notifications require shared branded HTML and plain text',
    pass: () =>
      engine.includes('renderAuthorCommunicationEmail') &&
      engine.includes('validateAuthorCommunicationEmail') &&
      engine.includes("templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1'") &&
      engine.includes('html: input.htmlBody') &&
      engine.includes('bodyValidation.blocker'),
  },
]

const failures = checks.filter((check) => !check.pass())
for (const check of checks) {
  console.log(`${failures.includes(check) ? 'FAIL' : 'PASS'} ${check.name}`)
}
if (failures.length) process.exit(1)
