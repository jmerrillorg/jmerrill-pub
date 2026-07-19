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
    name: 'successful proofreading notification opens author gate only after ACS acceptance',
    ok:
      orchestrator.includes("actionType: 'PROOFREADING_NOTIFICATION_SENT'") &&
      orchestrator.includes('send-approved-author-response') &&
      orchestrator.includes('jm1pub_gatestatus: GATE_STATUS_AWAITING_AUTHOR_RESPONSE') &&
      orchestrator.includes('Provider message ID'),
  },
  {
    name: 'failed proofreading notification remains blocked without author clock',
    ok:
      orchestrator.includes("actionType: 'PROOFREADING_NOTIFICATION_BLOCKED'") &&
      orchestrator.includes('Proofreading notification remains pending') &&
      orchestrator.includes('A5 author-response gate must not be treated as live'),
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
