import { readFileSync } from 'node:fs'

const engine = readFileSync('lib/server/author-package-notification-engine.ts', 'utf8')
const orchestrator = readFileSync('lib/server/publishing-orchestrator.ts', 'utf8')
const relay = readFileSync('azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js', 'utf8')
const relayTests = readFileSync('azure-functions/acs-email-relay/test/validation.test.js', 'utf8')

const checks = [
  {
    name: 'canonical outbound author-facing policy is centralized',
    pass: () =>
      engine.includes('AUTHOR_PUBLISHING_COMMUNICATION_POLICY') &&
      engine.includes("transactionalFromAddress: 'publishing@email.jmerrill.one'") &&
      engine.includes("canonicalReplyTo: 'publishing@jmerrill.one'") &&
      engine.includes("publishingArchiveCc: 'publishing@jmerrill.one'") &&
      engine.includes("monitoredReplyMailbox: 'publishing@jmerrill.one'"),
  },
  {
    name: 'notification engine blocks missing or noncanonical Reply-To before send',
    pass: () =>
      engine.includes('validateAuthorNotificationHeaders') &&
      engine.includes('AUTHOR_NOTIFICATION_BLOCKED - REPLY_TO_MISSING') &&
      engine.includes('AUTHOR_NOTIFICATION_BLOCKED - REPLY_TO_NOT_CANONICAL') &&
      engine.includes('AUTHOR_NOTIFICATION_BLOCKED - REPLY_TO_DOMAIN_NOT_RECEIVING_MAIL'),
  },
  {
    name: 'orchestrator passes canonical Reply-To through the shared notification contract',
    pass: () =>
      orchestrator.includes('CANONICAL_REPLY_TO') &&
      orchestrator.includes('replyTo: CANONICAL_REPLY_TO') &&
      orchestrator.includes('AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo'),
  },
  {
    name: 'ACS relay builds author-facing messages with monitored-mailbox Reply-To',
    pass: () =>
      relay.includes('buildApprovedAuthorResponseEmail') &&
      relay.includes('replyTo: [') &&
      relay.includes('address: INTERNAL_VISIBILITY_MAILBOX') &&
      relayTests.includes('approved author response sets Reply-To to publishing@jmerrill.one'),
  },
  {
    name: 'archive CC remains required for author-facing communication evidence',
    pass: () =>
      engine.includes('AUTHOR_NOTIFICATION_BLOCKED - PUBLISHING_ARCHIVE_CC_MISSING') &&
      orchestrator.includes('cc: [INTERNAL_VISIBILITY_MAILBOX]') &&
      relay.includes('cc: ['),
  },
]

const failures = checks.filter((check) => !check.pass())
for (const check of checks) {
  console.log(`${failures.includes(check) ? 'FAIL' : 'PASS'} ${check.name}`)
}
if (failures.length) process.exit(1)
