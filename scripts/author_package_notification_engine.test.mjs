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
      engine.includes("attachmentsRequired: ['proofreadManuscript', 'reviewCoverNote']") &&
      engine.includes("attachmentsRequired: ['copyeditedManuscript', 'reviewCoverNote']") &&
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
    name: 'corrected send references incomplete original and starts effective response clock',
    pass: () =>
      engine.includes('Corrected Proofreading Review Package') &&
      engine.includes('previous proofreading notice') &&
      engine.includes('did not include the package attachments') &&
      engine.includes('The same package remains available in the Author Operating Center'),
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
    name: 'ACS sender supports real attachments instead of link-only notification',
    pass: () =>
      engine.includes('EmailClient') &&
      engine.includes('EmailAttachment') &&
      engine.includes('contentInBase64') &&
      engine.includes('attachments: input.attachments.map'),
  },
]

const failures = checks.filter((check) => !check.pass())
for (const check of checks) {
  console.log(`${failures.includes(check) ? 'FAIL' : 'PASS'} ${check.name}`)
}
if (failures.length) process.exit(1)
