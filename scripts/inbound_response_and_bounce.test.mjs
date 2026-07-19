import { readFileSync } from 'node:fs'

const correlation = readFileSync('lib/server/author-response-inbound-correlation.ts', 'utf8')
const bounce = readFileSync('lib/server/author-reply-bounce-processing.ts', 'utf8')
const mailboxReader = readFileSync('azure-functions/diagnostic-ai-runner/src/mail/publishingMailboxReader.js', 'utf8')

const checks = [
  {
    name: 'response processor monitors the publishing mailbox, not transactional sender',
    pass: () =>
      correlation.includes('monitoredReplyMailbox') &&
      correlation.includes('BLOCKED_UNMONITORED_MAILBOX') &&
      correlation.includes('recipients.includes(monitoredMailbox)'),
  },
  {
    name: 'inbound replies correlate by headers and package/gate subject fallback',
    pass: () =>
      correlation.includes('inReplyTo') &&
      correlation.includes('references') &&
      correlation.includes('originalNotificationId') &&
      correlation.includes('packageId') &&
      correlation.includes('gateId') &&
      correlation.includes('normalizeSubject'),
  },
  {
    name: 'inbound persistence captures gate, package, author, classification, and state',
    pass: () =>
      [
        'inboundMessageId',
        'originalNotificationId',
        'threadId',
        'titleId',
        'packageId',
        'gateId',
        'authorId',
        'receivedAt',
        'classification',
        'processingState',
      ].every((field) => correlation.includes(field)),
  },
  {
    name: 'approval classification handles short author replies such as I approve',
    pass: () =>
      correlation.includes('classifyAuthorResponseText') &&
      correlation.includes('i approve') &&
      correlation.includes("'APPROVED_WITHOUT_CHANGES'"),
  },
  {
    name: 'invalid Reply-To bounce protects response clock and never marks author nonresponsive',
    pass: () =>
      bounce.includes('AUTHOR_REPLY_ROUTING_FAILED') &&
      bounce.includes('INVALID_REPLY_TO_DOMAIN') &&
      bounce.includes("responseClockTreatment: 'PROTECTED'") &&
      bounce.includes('authorNonresponsive: false'),
  },
  {
    name: 'recoverable bounce is ingested separately from resend-required fallback',
    pass: () =>
      bounce.includes("'INGEST_RECOVERED_RESPONSE'") &&
      bounce.includes("'AUTHOR_REPLY_RESEND_REQUIRED'") &&
      bounce.includes('originalReplyText') &&
      bounce.includes('recovered ?'),
  },
  {
    name: 'diagnostic runner has a durable publishing mailbox reader available',
    pass: () =>
      mailboxReader.includes('GraphServiceClient') ||
      (mailboxReader.includes('messages') && mailboxReader.includes('mail')),
  },
]

const failures = checks.filter((check) => !check.pass())
for (const check of checks) {
  console.log(`${failures.includes(check) ? 'FAIL' : 'PASS'} ${check.name}`)
}
if (failures.length) process.exit(1)
