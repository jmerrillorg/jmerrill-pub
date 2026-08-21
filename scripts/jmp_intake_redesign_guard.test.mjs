import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const joinForm = readFileSync(new URL('../app/join/JoinForm.tsx', import.meta.url), 'utf8')
const joinPage = readFileSync(new URL('../app/join/page.tsx', import.meta.url), 'utf8')
const route = readFileSync(new URL('../app/api/publishing/intake/route.ts', import.meta.url), 'utf8')
const schema = readFileSync(new URL('../lib/publishing/intake/schema.ts', import.meta.url), 'utf8')
const manuscriptUpload = readFileSync(new URL('../lib/publishing/intake/manuscriptUpload.ts', import.meta.url), 'utf8')
const continuation = readFileSync(new URL('../lib/publishing/intake/continuation.ts', import.meta.url), 'utf8')
const binding = readFileSync(new URL('../lib/server/publishing-intake-manuscript-binding.ts', import.meta.url), 'utf8')
const continuationRoute = readFileSync(new URL('../app/api/publishing/intake/continue/[token]/route.ts', import.meta.url), 'utf8')
const emailBindingRoute = readFileSync(new URL('../app/api/publisher/operating-center/email-manuscript-bind/route.ts', import.meta.url), 'utf8')
const acknowledgment = readFileSync(new URL('../lib/publishing/intake/authorAcknowledgment.ts', import.meta.url), 'utf8')
const publisher = readFileSync(new URL('../lib/server/publisher-operating-center.ts', import.meta.url), 'utf8')
const publisherClient = readFileSync(new URL('../app/publisher/_components/PublisherOperatingCenterClient.tsx', import.meta.url), 'utf8')
const healthRoute = readFileSync(new URL('../app/api/health/route.ts', import.meta.url), 'utf8')

test('JMP /join keeps founder-approved manuscript formats', () => {
  for (const extension of ['.docx', '.doc', '.pages', '.rtf', '.pdf']) {
    assert.match(joinForm, new RegExp(extension.replace('.', '\\.')))
    assert.match(manuscriptUpload, new RegExp(extension.replace('.', '\\.')))
  }

  assert.match(manuscriptUpload, /pages: 'normalization_required'/)
})

test('JMP /join supports manuscript now or later without full workspace activation', () => {
  assert.match(joinForm, /manuscriptSubmissionChoice/)
  assert.match(schema, /'now' \| 'later'/)
  assert.match(schema, /MANUSCRIPT_PENDING/)
  assert.match(route, /manuscriptSubmissionChoice === 'now'/)
  assert.match(route, /acceptedIntake\.manuscriptReceived === true \|\| Boolean\(acceptedIntake\.manuscriptUrl\)/)
  assert.match(route, /createIntakeContinuationToken/)
  assert.match(continuationRoute, /verifyIntakeContinuationToken/)
})

test('JMP /join separates required service consent from optional marketing consent', () => {
  assert.match(joinForm, /serviceCommunicationConsent/)
  assert.match(joinForm, /marketingConsent/)
  assert.match(schema, /serviceCommunicationConsent: true/)
  assert.match(schema, /marketingConsent: boolean/)
})

test('JMP /join protects canonical production origins from config drift', () => {
  assert.match(route, /https:\/\/jmerrill\.pub/)
  assert.match(route, /https:\/\/www\.jmerrill\.pub/)
  assert.match(route, /new Set\(\[...defaults, ...\(configured \|\| \[\]\)\]\)/)
  assert.match(joinPage, /dynamic = 'force-dynamic'/)
})

test('JMP /join captures address, referral, and rights canon', () => {
  for (const field of [
    'streetAddress',
    'billingSameAsMailing',
    'returningAuthor',
    'referrerName',
    'rightsAttestation',
    'aiDisclosure',
    'accessibilityNotes',
  ]) {
    assert.match(joinForm, new RegExp(field))
    assert.match(schema, new RegExp(field))
  }
})

test('JMP /join keeps high-contrast text on the dark public intake surface', () => {
  const publicJoin = `${joinPage}\n${joinForm}`
  assert.doesNotMatch(publicJoin, /text-white\/(?:3|4|5|6|7)\d/)
  assert.doesNotMatch(publicJoin, /placeholder:text-white\//)
  assert.doesNotMatch(publicJoin, /bg-white\/\[0\.0/)
  assert.match(joinForm, /text-slate-100/)
  assert.match(joinForm, /placeholder:text-slate-300/)
  assert.match(joinForm, /bg-\[#0F1C2E\]/)
})

test('JMP intake persists durable author acknowledgment state and exposes queue attention', () => {
  assert.match(route, /markPublishingIntakeAcknowledgmentPending/)
  assert.match(route, /markPublishingIntakeAcknowledgmentFailed/)
  assert.match(route, /markPublishingIntakeAcknowledgmentSent/)
  assert.match(acknowledgment, /providerMessageId/)
  assert.match(publisher, /AUTHOR_ACK_PENDING/)
  assert.match(publisher, /AUTHOR_ACK_SENT/)
  assert.match(publisher, /AUTHOR_ACK_FAILED/)
  assert.match(publisher, /systemAttentionFlag/)
  assert.match(publisherClient, /item\.acknowledgmentState !== 'AUTHOR_ACK_SENT'/)
  assert.match(publisherClient, /item\.systemAttentionFlag/)
})

test('JMP health checks relay handler reachability, not just relay config presence', () => {
  assert.match(healthRoute, /relayHostHealth/)
  assert.match(healthRoute, /send-author-acknowledgment/)
  assert.match(healthRoute, /response\.status === 401/)
  assert.match(healthRoute, /relay_handler_reachable_unauthorized_probe/)
})

test('JMP intake supports governed email manuscript binding', () => {
  assert.match(emailBindingRoute, /getPublisherOperatingCenterSession/)
  assert.match(emailBindingRoute, /bindEmailManuscriptToIntake/)
  assert.match(binding, /publishing@jmerrill\.one/)
  assert.match(binding, /messageId/)
  assert.match(binding, /attachmentId/)
  assert.match(binding, /EMAIL_MANUSCRIPT_BOUND/)
  assert.match(binding, /source: 'EMAIL'/)
})

test('JMP continuation tokens are signed and intake-bound', () => {
  assert.match(continuation, /createHmac/)
  assert.match(continuation, /intakeId/)
  assert.match(continuation, /reference/)
  assert.match(continuation, /exp/)
  assert.match(continuation, /timingSafeEqual/)
})
