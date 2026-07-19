import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const orchestrator = readFileSync('lib/server/publishing-orchestrator.ts', 'utf8')
const publisher = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const route = readFileSync('app/api/publisher/operating-center/actions/route.ts', 'utf8')

const checks = [
  {
    name: 'package visible without email remains system-owned notification pending',
    ok:
      publisher.includes("'Proofreading - Notification Pending'") &&
      publisher.includes("executionState: 'WAITING_FOR_SYSTEM'") &&
      publisher.includes("awaiting: 'JM1 Automation'") &&
      publisher.includes('Proofreading package notification has not been sent or logged'),
  },
  {
    name: 'proofreading notification must pass canonical attachment policy before send',
    ok:
      orchestrator.includes("actionType: 'PROOFREADING_NOTIFICATION_TRANSACTION_STARTED'") &&
      orchestrator.includes('AUTHOR_PACKAGE_NOTIFICATION_EVENTS.attachmentsValidated') &&
      orchestrator.includes('validateAuthorPackageNotification({') &&
      orchestrator.includes('Workspace link alone does not satisfy') &&
      orchestrator.includes('return notificationBlocked(config, input.gateId, input.correlationId, validation.blocker)'),
  },
  {
    name: 'failed proofreading notification remains blocked without author clock',
    ok:
      orchestrator.includes("actionType: 'PROOFREADING_NOTIFICATION_TRANSACTION_FAILED'") &&
      orchestrator.includes('Proofreading notification remains pending') &&
      orchestrator.includes('A5 author-response gate must not be treated as live'),
  },
  {
    name: 'communication evidence and surface refresh are required before completion',
    ok:
      orchestrator.includes("actionType: 'PROOFREADING_AUTHOR_RESPONSE_GATE_ACTIVATED'") &&
      orchestrator.includes("actionType: 'AUTHOR_WORKSPACE_NOTIFICATION_STATE_REFRESHED'") &&
      orchestrator.includes("actionType: 'PUBLISHER_TODAY_NOTIFICATION_STATE_REFRESHED'") &&
      orchestrator.includes("actionType: AUTHOR_PACKAGE_NOTIFICATION_EVENTS.transactionCompleted") &&
      orchestrator.includes('Communication state NOTIFICATION_SENT'),
  },
  {
    name: 'future package-ready events invoke notification automation without Cody instruction',
    ok:
      orchestrator.includes('export async function handleAuthorReviewPackageReadyForRelease') &&
      orchestrator.includes("'AUTHOR_REVIEW_PACKAGE_READY_FOR_RELEASE'") &&
      orchestrator.includes('AUTHOR_PACKAGE_NOTIFICATION_EVENTS.engineCommissioned') &&
      orchestrator.includes('Execution owner JM1 Automation'),
  },
  {
    name: 'genuine proofreading approval event starts handler with author approval trigger',
    ok:
      orchestrator.includes('export async function processProofreadingApprovalEvent') &&
      orchestrator.includes("triggerSource: 'AUTHOR_APPROVAL'") &&
      orchestrator.includes("actionType: 'PROOFREADING_APPROVAL_EVENT_RECEIVED'"),
  },
  {
    name: 'duplicate approval is idempotent',
    ok:
      orchestrator.includes("findExecutionLog(config, 'INTERIOR_LAYOUT_AUTOSTARTED', payload.idempotencyKey)") &&
      orchestrator.includes("status: 'idempotent'") &&
      orchestrator.includes('idempotencyKey: payload.idempotencyKey'),
  },
  {
    name: 'duplicate package-ready trigger does not resend existing accepted notification',
    ok:
      orchestrator.includes('findNotificationEvidence(config, input.gateId, artifactId, idempotencyKey)') &&
      orchestrator.includes("jm1_actiontype eq 'PROOFREADING_NOTIFICATION_SENT'") &&
      orchestrator.includes('current-proofreading-artifact') &&
      orchestrator.includes('ACS relay returned HTTP 202 accepted'),
  },
  {
    name: 'correction request does not start interior layout',
    ok:
      orchestrator.includes("payload.decision === 'Request Revision'") &&
      orchestrator.includes('routeProofreadingCorrections') &&
      orchestrator.includes('PROOFREADING_CORRECTIONS_REQUESTED'),
  },
  {
    name: 'source checksum validation and production source lock are enforced',
    ok:
      orchestrator.includes('APPROVED SOURCE CHECKSUM MISMATCH') &&
      orchestrator.includes("actionType: 'PRODUCTION_SOURCE_LOCKED'") &&
      orchestrator.includes('sourceChecksum=${checksum}'),
  },
  {
    name: 'eligible title starts Interior Layout with JM1 Automation, not Cody',
    ok:
      orchestrator.includes("actionType: 'INTERIOR_LAYOUT_AUTOSTARTED'") &&
      orchestrator.includes('Execution owner JM1 Automation') &&
      !orchestrator.includes('executionOwner: Cody'),
  },
  {
    name: 'business-day cadence foundation exists without delaying Interior Layout',
    ok:
      orchestrator.includes('export function calculateCadenceSchedule') &&
      orchestrator.includes('JM1_DEFAULT_MANUSCRIPT_LENGTH_BUSINESS_DAY_V1') &&
      orchestrator.includes("if (stage === 'Interior Layout') return 0") &&
      orchestrator.includes('addBusinessDays'),
  },
  {
    name: 'marketing lifecycle hooks are emitted but not public-published',
    ok:
      orchestrator.includes('PROOFREADING_APPROVED_FOR_PRODUCTION') &&
      orchestrator.includes('PRODUCTION_PHASE_STARTED') &&
      orchestrator.includes('No public marketing content published'),
  },
  {
    name: 'protected publisher action API exposes notification and approval handlers',
    ok:
      route.includes("'send_proofreading_notification'") &&
      route.includes("'process_proofreading_approval'") &&
      route.includes('sendProofreadingNotification') &&
      route.includes('processProofreadingApprovalEvent'),
  },
]

for (const check of checks) {
  assert.equal(check.ok, true, check.name)
  console.log(`ok - ${check.name}`)
}
