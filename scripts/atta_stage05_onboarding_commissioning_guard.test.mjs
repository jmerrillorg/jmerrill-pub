import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const stage05 = fs.readFileSync('lib/server/publishing/stage05-onboarding-readiness.ts', 'utf8')
const agreementRuntime = fs.readFileSync('lib/server/publishing/agreement-execution-reconciliation.ts', 'utf8')
const onboardingPage = fs.readFileSync('app/author/onboarding/page.tsx', 'utf8')
const evidence = fs.readFileSync(
  'docs/operations/generated/JMP-ATTA-STAGE05-ONBOARDING-COMMISSIONING-2026-08-21/14-final-certification.md',
  'utf8',
)

test('Stage 05 keeps the canonical onboarding item labels used by Joined the Family runtime', () => {
  for (const label of [
    'author profile confirmation',
    'production preferences',
    'metadata/positioning confirmation',
    'royalty/payment setup confirmation',
    'workspace access confirmation',
  ]) {
    assert.match(stage05, new RegExp(label.replace(/[/-]/g, '\\$&')))
  }
  assert.match(agreementRuntime, /stage05OnboardingRequirementLabels/)
})

test('royalty payout setup is not an editorial production blocker', () => {
  assert.match(stage05, /REQUIRED_BEFORE_FIRST_ROYALTY_PAYMENT/)
  assert.match(stage05, /Royalty payout setup is required before the first royalty payment, not before editorial production/)
  assert.match(stage05, /blocksEditorialProduction:\s*false/)
  assert.match(evidence, /\| royalty_setup_blocks_editorial \| 0 \|/)
})

test('missing author access grant blocks workspace-based editorial readiness without rolling back Joined the Family', () => {
  assert.match(stage05, /workspaceAccessSatisfied/)
  assert.match(stage05, /authorAccessGrantFound/)
  assert.match(stage05, /REQUIRED_BEFORE_EDITORIAL_PRODUCTION/)
  assert.match(stage05, /The active workspace state must be paired with a confirmed author access entitlement/)
  assert.match(evidence, /\| workspace_failure_rolls_back_joined_family \| 0 \|/)
})

test('commercial production authorization does not clear final delivery after the first payment', () => {
  assert.match(stage05, /finalDeliveryPaymentReady:\s*input\.paymentObligationComplete/)
  assert.match(agreementRuntime, /Final delivery payment gate remains closed/)
  assert.match(evidence, /\| final_delivery_gate_cleared_early \| 0 \|/)
  assert.match(evidence, /\| paid_in_full_set_early \| 0 \|/)
})

test('Starter editorial path excludes Developmental Editing unless separately approved', () => {
  assert.match(stage05, /'Editorial Review', 'Line Editing', 'Copy Editing', 'Proofreading'/)
  assert.match(stage05, /developmentalIncluded:\s*input\.developmentalAddOnApproved/)
  assert.match(stage05, /nextStageAfterEditorialReview:\s*input\.developmentalAddOnApproved \? 'Developmental Editing' : 'Line Editing'/)
  assert.match(evidence, /\| Starter_scope_expanded_without_authority \| 0 \|/)
})

test('active-author onboarding page no longer uses pre-agreement language', () => {
  assert.doesNotMatch(onboardingPage, /prepare your publishing agreement/)
  assert.match(onboardingPage, /active publishing project/)
  assert.match(onboardingPage, /not before editorial work/)
})

test('missing manuscript certification blocks editorial readiness separately from commercial authorization', () => {
  assert.match(stage05, /manuscriptGate = input\.manuscriptReceived && input\.manuscriptSourceCertified/)
  assert.match(stage05, /commercialGate =/)
  assert.match(stage05, /editorialProductionReady:/)
})

test('author review delivery certification remains its own gate', () => {
  assert.match(stage05, /authorReviewDeliveryCertified/)
  assert.match(stage05, /input\.authorReviewDeliveryCertified/)
})
