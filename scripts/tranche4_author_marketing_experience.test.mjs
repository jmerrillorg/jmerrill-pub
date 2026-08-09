import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCloseout,
  buildSingleOperatorSurface,
  createMarketingOpportunity,
  deliverDecisionRequest,
  evaluateConsent,
  executionEvents,
  microsoftDispositions,
  newsletterSignup,
  prepareDecisionRequest,
  prepareJourney,
  projectAuthorStatus,
  runInternalValidation,
  validateAuthorFacingArtifact,
} from './tranche4_author_marketing_experience.mjs'

test('Tranche 4 validates 45 synthetic author and marketing scenarios', () => {
  const validation = runInternalValidation()
  assert.equal(validation.result, 'PASS')
  assert.equal(validation.passed, 45)
  assert.equal(validation.total, 45)
})

test('Tranche 4 author-facing status projection hides internal state', () => {
  const projected = projectAuthorStatus('DEVELOPMENTAL_EDITING')
  assert.equal(projected.authorStatus, 'Editorial Review')
  assert.equal(projected.internalStateExposed, false)
})

test('Tranche 4 author decision runtime preserves response-clock gates', () => {
  const prepared = prepareDecisionRequest({ decision: 'Cover approval', artifactRef: 'SP-COVER', preparedDate: '2026-08-08' })
  assert.equal(prepared.result, 'PREPARED')
  assert.equal(prepared.responseClockStarted, false)
  assert.equal(deliverDecisionRequest({}).responseClockStarted, false)
  assert.equal(deliverDecisionRequest({ deliveryEvidenceRef: 'EMAIL-EVIDENCE' }).responseClockStarted, true)
})

test('Tranche 4 consent and newsletter gates fail closed', () => {
  assert.equal(evaluateConsent({ unsubscribe: true }).result, 'SUPPRESSED')
  assert.equal(newsletterSignup({ email: 'reader@example.test', consent: false }).result, 'BLOCKED')
  assert.equal(newsletterSignup({ email: 'reader@example.test', consent: true }).duplicateContactCreated, false)
})

test('Tranche 4 marketing opportunities do not auto-activate campaigns', () => {
  const opportunity = createMarketingOpportunity({ trigger: 'RELEASE_CONFIRMED_LIVE', target: 'ALL THREE', action: 'Launch', consentOk: true })
  assert.equal(opportunity.result, 'CREATED')
  assert.equal(opportunity.activationAuthorized, false)
})

test('Tranche 4 blocks real author journey recipients', () => {
  assert.equal(prepareJourney({ consentOk: true, realAuthorRecipient: true }).result, 'BLOCKED')
  assert.equal(prepareJourney({ consentOk: true }).activated, false)
})

test('Tranche 4 leakage guard blocks internal author-facing content', () => {
  assert.equal(validateAuthorFacingArtifact({ subject: 'Review', body: 'Dataverse GUID debug QA note' }).result, 'BLOCKED')
  assert.equal(validateAuthorFacingArtifact({ subject: 'Status update', body: 'Publishing will complete the next step.' }).result, 'BLOCKED')
  assert.equal(validateAuthorFacingArtifact({ subject: 'Status update', body: 'The Publishing Team will complete the next step.' }).result, 'PASS')
  assert.equal(validateAuthorFacingArtifact({ subject: 'Review ready', body: 'Please review the attached publishing materials.' }).result, 'PASS')
})

test('Tranche 4 single operator surface shows author and marketing decisions', () => {
  const surface = buildSingleOperatorSurface([
    { label: 'Cover approval', queue: 'AuthorDecision' },
    { label: 'Held journey', queue: 'MarketingException' },
  ])
  assert.equal(surface.result, 'EXTENDED / ACTIVE')
  assert.equal(surface.rows.every((row) => row.needsJackie), true)
})

test('Tranche 4 closeout preserves zero real activation and frozen boundaries', () => {
  const closeout = buildCloseout()
  assert.equal(closeout.realAuthorAutomatedSends, 0)
  assert.equal(closeout.realTitleMarketingActivations, 0)
  assert.equal(closeout.realAuthorResponseClocksStarted, 0)
  assert.equal(closeout.liveAuthorsUsed, 0)
  assert.equal(closeout.liveTitlesUsed, 0)
  assert.equal(closeout.pr431TitlesUsed, 0)
  assert.equal(closeout.businessCentralLivePosting, 0)
  assert.equal(closeout.royaltyProcessing, 0)
  assert.equal(closeout.clientTitleAutomation, 'FROZEN')
  assert.equal(closeout.tranche5, 'NOT STARTED')
  assert.equal(closeout.internalValidation, '45 / 45 PASS')
})

test('Tranche 4 Microsoft-first and execution-log gates have no UNKNOWN dispositions', () => {
  assert.equal(microsoftDispositions.some(([, disposition]) => disposition === 'UNKNOWN'), false)
  assert.equal(executionEvents.includes('AUTHOR_STATUS_PROJECTED'), true)
  assert.equal(executionEvents.includes('MARKETING_OPPORTUNITY_CREATED'), true)
  assert.equal(executionEvents.includes('NEWSLETTER_SIGNUP_RECORDED'), true)
})
