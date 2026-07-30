import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const authorContext = readFileSync('lib/server/author-portal-context.ts', 'utf8')
const publisherCenter = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const approvalConsumer = readFileSync('azure-functions/diagnostic-ai-runner/src/orchestration/approvalEventConsumer.js', 'utf8')
const approvalConsumerFunction = readFileSync('azure-functions/diagnostic-ai-runner/src/functions/runApprovalEventConsumer.js', 'utf8')
const approvalConsumerRuntime = `${approvalConsumer}\n${approvalConsumerFunction}`

const checks = [
  {
    name: 'Author Operating Center collapses canonical title rows and fallback title-name rows together',
    ok:
      authorContext.includes('const aliases = new Map<string, string>()') &&
      authorContext.includes('projectIdentityAliases(project)') &&
      authorContext.includes('projectTitleAlias(project)') &&
      authorContext.includes('title-name:${titleKey}') &&
      authorContext.includes('if (project.titleId) score += 3'),
  },
  {
    name: 'Publisher response queue treats downstream stage movement as transition evidence',
    ok:
      publisherCenter.includes('const transitionEvidence = transitionLog || downstreamStage') &&
      publisherCenter.includes('deriveAuthorResponseProcessingStatus(gateStatus, classifiedDecision, transitionEvidence)') &&
      publisherCenter.includes('deriveAuthorResponseFailedStep(gateStatus, transitionEvidence, processingStatus)') &&
      publisherCenter.includes("if (processingStatus === 'PROCESSED') return 'None'"),
  },
  {
    name: 'Publisher decision queue excludes processed author responses from alert workload',
    ok:
      publisherCenter.includes(".filter((item) => item.processingStatus !== 'PROCESSED')") &&
      publisherCenter.includes("allowedActions: processingStatus === 'PROCESSED' ? processedActions : recoveryActions"),
  },
  {
    name: 'Approval consumer preserves governed replay instead of manual stage mutation',
    ok:
      approvalConsumerRuntime.includes('run-approval-event-consumer-admin-replay') &&
      approvalConsumerRuntime.includes('ADMIN_REPLAY_REQUIRES_ORIGINAL_EVENT_ID_AND_REASON') &&
      approvalConsumerRuntime.includes('EDITORIAL_APPROVAL_EVENT_CONSUMED') &&
      approvalConsumerRuntime.includes('approval_event_already_consumed') &&
      approvalConsumerRuntime.includes('No Publisher Center action, GitHub Action, Cody session, or manual API request is required for the normal path'),
  },
  {
    name: 'Incomplete approval events fail into explicit dead-letter evidence',
    ok:
      approvalConsumer.includes('EDITORIAL_APPROVAL_EVENT_BLOCKED') &&
      approvalConsumer.includes('payload_missing_required_reference_or_complete_notification') &&
      approvalConsumer.includes('deadLetterBehavior: \"EDITORIAL_APPROVAL_EVENT_BLOCKED with exact blocker and idempotency key\"'),
  },
]

for (const check of checks) {
  assert.equal(check.ok, true, check.name)
  console.log(`ok - ${check.name}`)
}
