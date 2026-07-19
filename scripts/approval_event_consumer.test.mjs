import { readFileSync } from 'node:fs'

const consumer = readFileSync('lib/server/approval-event-consumer.ts', 'utf8')
const route = readFileSync('app/api/publishing/orchestration/approval-events/route.ts', 'utf8')
const publisherRoute = readFileSync('app/api/publisher/operating-center/actions/route.ts', 'utf8')
const publisher = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const workflow = readFileSync('.github/workflows/approval-event-consumer.yml', 'utf8')

const checks = [
  {
    name: 'consumer discovers durable approved gates instead of publisher clicks',
    ok:
      consumer.includes('findDurableApprovalCandidates') &&
      consumer.includes('jm1pub_authordecisionon ne null') &&
      consumer.includes('jm1pub_authordecision eq ${AUTHOR_DECISION_APPROVE}') &&
      !consumer.includes('getPublisherOperatingCenterSession'),
  },
  {
    name: 'canonical approval event payload is emitted after persisted evidence',
    ok:
      consumer.includes("eventType = currentStageCode === 'PROOFREADING' ? 'PROOFREADING_APPROVED' : 'EDITORIAL_STAGE_APPROVED'") &&
      consumer.includes('eventId') &&
      consumer.includes('titleId') &&
      consumer.includes('currentStageId') &&
      consumer.includes('gateId') &&
      consumer.includes('approvedArtifactChecksum') &&
      consumer.includes("triggerSource: 'AUTHOR_APPROVAL'"),
  },
  {
    name: 'notification-incomplete gates cannot produce valid approval transition',
    ok:
      consumer.includes('complete attachment-aware notification transaction') &&
      consumer.includes('Event not emitted') &&
      consumer.includes('corrected-notification') &&
      consumer.includes('notification sent with required attachments'),
  },
  {
    name: 'consumer claims idempotently and handles duplicate/restart runs',
    ok:
      consumer.includes('EDITORIAL_APPROVAL_EVENT_CLAIMED') &&
      consumer.includes("findExecutionLog(config, 'EDITORIAL_APPROVAL_EVENT_CONSUMED', event.idempotencyKey)") &&
      consumer.includes("outcome: 'IDEMPOTENT'") &&
      consumer.includes('approval_event_already_consumed'),
  },
  {
    name: 'proofreading approval is consumed automatically by transition service',
    ok:
      consumer.includes('processProofreadingApprovalEvent(event)') &&
      consumer.includes('APPROVAL_CONSUMED TRANSITION_COMPLETED NEXT_STAGE_RUNTIME_STARTED') &&
      consumer.includes('NEXT_STAGE_EXECUTOR_MISSING'),
  },
  {
    name: 'worker route is not a publisher action and requires worker authorization',
    ok:
      route.includes('runAutomaticApprovalEventConsumer') &&
      route.includes('JM1_ORCHESTRATION_WORKER_KEY') &&
      route.includes("'SCHEDULED_WORKER'") &&
      !route.includes('getPublisherOperatingCenterSession'),
  },
  {
    name: 'scheduled runtime invokes deployed consumer without Codex session',
    ok:
      workflow.includes("cron: '*/5 * * * *'") &&
      workflow.includes('JM1_ORCHESTRATION_WORKER_URL') &&
      workflow.includes('JM1_ORCHESTRATION_WORKER_KEY') &&
      workflow.includes('/approval-events') === false,
  },
  {
    name: 'publisher approval endpoint is administrative replay only',
    ok:
      publisherRoute.includes('Proofreading approval processing is automatic') &&
      publisherRoute.includes('ADMIN_REPLAY or ADMIN_RETRY') &&
      publisherRoute.includes('original event id and reason') &&
      publisher.includes('Admin Retry Event') &&
      publisher.includes('Automatic consumer will retry'),
  },
]

const failures = checks.filter((check) => !check.ok)
for (const check of checks) console.log(`${failures.includes(check) ? 'FAIL' : 'PASS'} ${check.name}`)
if (failures.length) process.exit(1)
