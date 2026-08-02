import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const service = readFileSync(new URL('../lib/server/publishing-dispatch-service.ts', import.meta.url), 'utf8')
const fiveTitleWorker = readFileSync(new URL('../lib/server/five-title-executive-recovery-dispatch.ts', import.meta.url), 'utf8')
const orchestrator = readFileSync(new URL('../lib/server/publishing-orchestrator.ts', import.meta.url), 'utf8')
const route = readFileSync(new URL('../app/api/publishing/dispatch/author-package/route.ts', import.meta.url), 'utf8')

test('PROGRAM-006 exposes one canonical PublishingDispatchService operation', () => {
  assert.match(service, /export const PublishingDispatchService/)
  assert.match(service, /export async function dispatchAuthorPackage/)
  assert.match(service, /PackageID, TitleID, StageID, and RecipientContactID/)
  assert.match(service, /'DRY_RUN' \| 'PRODUCTION' \| 'EXECUTIVE_RECOVERY'/)
  assert.match(service, /service: 'PublishingDispatchService'/)
  assert.match(service, /operation: 'dispatchAuthorPackage'/)
})

test('dispatch service owns validation, natural idempotency, and transaction evidence', () => {
  for (const token of [
    'currentPackage',
    'recipient',
    'manifest',
    'qa',
    'duplicateSend',
    'currentGate',
    'currentPackageVersion',
    'Title',
    'Stage',
    'Package Version',
    'Recipient',
    'PUBLISHING_DISPATCH_TRANSACTION_STARTED',
    'PUBLISHING_DISPATCH_AUTHOR_PACKAGE_DELIVERED',
    'PUBLISHING_DISPATCH_SURFACES_REFRESHED',
  ]) {
    assert.match(service, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('dispatch service reuses governed branding and package notification controls', () => {
  assert.match(service, /validateAuthorPackageNotification/)
  assert.match(service, /buildAuthorReviewNotificationCopy/)
  assert.match(service, /buildAuthorPackageNotificationIdempotencyKey/)
  assert.match(service, /AUTHOR_PUBLISHING_COMMUNICATION_POLICY/)
  assert.match(service, /publishing@email\.jmerrill\.one|transactionalFromAddress/)
  assert.match(service, /publishing@jmerrill\.one|canonicalReplyTo/)
})

test('legacy callers delegate dispatch to the canonical service', () => {
  assert.match(fiveTitleWorker, /import \{ dispatchAuthorPackage \} from '\.\/publishing-dispatch-service'/)
  assert.match(fiveTitleWorker, /dispatchAuthorPackage\(\{/)
  assert.doesNotMatch(fiveTitleWorker, /function buildCoverMessage/)
  assert.doesNotMatch(fiveTitleWorker, /function sendRelay/)
  assert.match(orchestrator, /import \{ dispatchAuthorPackage \} from '\.\/publishing-dispatch-service'/)
  assert.match(orchestrator, /dispatchAuthorPackage\(\{/)
})

test('canonical dispatch endpoint is OIDC protected and mode constrained', () => {
  assert.match(route, /verifyGitHubActionsOidcToken/)
  assert.match(route, /Bearer /)
  assert.match(route, /DRY_RUN/)
  assert.match(route, /PRODUCTION/)
  assert.match(route, /EXECUTIVE_RECOVERY/)
  assert.doesNotMatch(route, /cookie|session|x-jm1-relay-key/i)
})
