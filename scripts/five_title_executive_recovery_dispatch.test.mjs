import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflow = readFileSync(new URL('../.github/workflows/five-title-executive-recovery-dispatch.yml', import.meta.url), 'utf8')
const route = readFileSync(new URL('../app/api/publishing/executive-recovery/dispatch/route.ts', import.meta.url), 'utf8')
const dispatch = readFileSync(new URL('../lib/server/five-title-executive-recovery-dispatch.ts', import.meta.url), 'utf8')
const oidc = readFileSync(new URL('../lib/server/github-actions-oidc.ts', import.meta.url), 'utf8')
const relay = readFileSync(new URL('../azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js', import.meta.url), 'utf8')
const workspace = readFileSync(new URL('../app/author/_components/AuthorPortalWorkspace.tsx', import.meta.url), 'utf8')

test('five-title allowlist is exact and owner-assigned', () => {
  for (const intakeCode of [
    'JMP-INT-202607-LQPHEK',
    'JMP-INT-202607-DL2T20',
    'JMP-INT-202606-UFYG6O',
    'JMP-INT-202607-6R2MPZ',
    'JMP-INT-202607-0W5PTQ',
  ]) {
    assert.match(dispatch, new RegExp(intakeCode))
  }
  assert.doesNotMatch(dispatch, /owner:\s*'SYSTEM'|owner:\s*'AUTOMATION'|owner:\s*'UNKNOWN'|owner:\s*'NULL'/)
})

test('GitHub OIDC claims require protected production environment subject', () => {
  assert.match(oidc, /https:\/\/token\.actions\.githubusercontent\.com/)
  assert.match(oidc, /jm1-pub-executive-recovery-dispatch/)
  assert.match(oidc, /repo:jmerrillorg\/jmerrill-pub:environment:jmerrill-pub-production/)
  assert.match(oidc, /OIDC_SUBJECT_INVALID/)
  assert.match(oidc, /OIDC_AUDIENCE_INVALID/)
})

test('workflow uses OIDC and protected environment without repository secrets', () => {
  assert.match(workflow, /id-token:\s*write/)
  assert.match(workflow, /environment:\s*jmerrill-pub-production/)
  assert.match(workflow, /jm1-pub-executive-recovery-dispatch/)
  assert.doesNotMatch(workflow, /secrets\./)
})

test('route requires GitHub OIDC bearer token', () => {
  assert.match(route, /verifyGitHubActionsOidcToken/)
  assert.match(route, /Bearer /)
  assert.doesNotMatch(route, /cookie|session|x-jm1-relay-key/i)
})

test('executive recovery dispatch cannot send attachmentless or unbranded author-review packages', () => {
  assert.match(dispatch, /buildAuthorReviewNotificationCopy/)
  assert.match(dispatch, /validateAuthorPackageNotification/)
  assert.match(dispatch, /materializeRequiredAttachments/)
  assert.match(dispatch, /REQUIRED_PACKAGE_ATTACHMENT_NOT_READY/)
  assert.match(dispatch, /ATTACHMENT_CHECKSUM_MISMATCH/)
  assert.match(dispatch, /attachments: input.attachments.map/)
  assert.doesNotMatch(dispatch, /function buildCoverMessage/)
  assert.doesNotMatch(dispatch, /<html><body><p>Good day,/)
})

test('ACS relay preserves attachments for approved author-review package notifications', () => {
  assert.match(relay, /AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1/)
  assert.match(relay, /AUTHOR_REVIEW_ATTACHMENTS_MISSING/)
  assert.match(relay, /AUTHOR_REVIEW_PACKAGE_HTML_REQUIRED/)
  assert.match(relay, /attachments: Array\.isArray\(payload\.attachments\)/)
  assert.match(relay, /contentInBase64: attachment\.contentInBase64/)
})

test('author portal workspace failure is bounded and routes directly to author provider', () => {
  assert.match(workspace, /WORKSPACE_CONTEXT_TIMEOUT_MS/)
  assert.match(workspace, /controller\.abort/)
  assert.match(workspace, /We could not open your Author Operating Center\./)
  assert.match(workspace, /\/api\/auth\/signin\/jm1-author-operating-center\?callbackUrl=%2Fauthor%2Fportal/)
})
