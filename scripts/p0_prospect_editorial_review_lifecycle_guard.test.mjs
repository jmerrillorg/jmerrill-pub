import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { existsSync, readFileSync, symlinkSync, unlinkSync } from 'node:fs'
import test, { after } from 'node:test'

const shims = [
  ['../lib/server/author-communication-brand', 'author-communication-brand.ts'],
  ['../lib/server/jm1-enterprise-communication-renderer', 'jm1-enterprise-communication-renderer.ts'],
  ['../lib/server/jm1-enterprise-design-tokens', 'jm1-enterprise-design-tokens.ts'],
  ['../lib/server/author-facing-terminology', 'author-facing-terminology.ts'],
  ['../lib/server/working-title-policy', 'working-title-policy.ts'],
  ['../lib/commercial/catalog', 'catalog.ts'],
]
const created = []
for (const [shimPath, target] of shims) {
  const shim = new URL(shimPath, import.meta.url)
  if (!existsSync(shim)) {
    symlinkSync(target, shim)
    created.push(shim)
  }
}
after(() => {
  for (const shim of created) unlinkSync(shim)
})

const lifecycle = await import('../lib/server/publishing-lifecycle-context.ts')
const prospect = await import('../lib/server/prospect-editorial-review-policy.ts')
const notification = await import('../lib/server/author-package-notification-engine.ts')

test('prospect lifecycle is not inferred from contact, title, opportunity, workspace, diagnostic, or gate existence', () => {
  assert.equal(
    lifecycle.derivePublishingLifecycleContext({
      hasContact: true,
      hasTitle: true,
      hasOpportunity: true,
      hasAuthorWorkspace: true,
      hasDiagnostic: true,
      hasEditorialGate: true,
      opportunityStage: 'Open',
    }),
    'PROSPECT_INQUIRY',
  )
  assert.equal(
    lifecycle.derivePublishingLifecycleContext({
      agreementExecuted: true,
      paymentStatus: 'PAYMENT_CONFIRMED',
      onboardingStatus: 'ONBOARDING_COMPLETE',
    }),
    'ACTIVE_CONTRACTED_AUTHOR',
  )
})

test('prospect editorial review resolves to package selection and forbids active-author approval semantics', () => {
  const policy = lifecycle.resolveCommunicationPolicy({
    lifecycleContext: 'PROSPECT_INQUIRY',
    decisionType: 'PROSPECT_PACKAGE_SELECTION',
    businessStage: 'Stage 0 Editorial Review',
    artifactType: 'EDITORIAL_REVIEW',
  })
  assert.equal(policy.communicationClass, 'PROSPECT_EDITORIAL_REVIEW_RECOMMENDATION')
  assert.equal(policy.waitingState, 'PROSPECT_PACKAGE_SELECTION')
  assert.equal(policy.responseConsumer, 'PACKAGE_SELECTION_CONSUMER')
  assert.equal(policy.activeAuthorApprovalLanguageAllowed, false)
  assert.throws(
    () => lifecycle.resolveCommunicationPolicy({
      lifecycleContext: 'PROSPECT_INQUIRY',
      decisionType: 'EDITORIAL_STAGE_APPROVAL',
    }),
    /PROSPECT_REQUIRES_PACKAGE_SELECTION_DECISION/,
  )
})

test('active contracted author editorial stage keeps stage approval policy', () => {
  const policy = lifecycle.resolveCommunicationPolicy({
    lifecycleContext: 'ACTIVE_CONTRACTED_AUTHOR',
    decisionType: 'EDITORIAL_STAGE_APPROVAL',
    businessStage: 'Developmental Editing',
  })
  assert.equal(policy.communicationClass, 'ACTIVE_AUTHOR_DEVELOPMENTAL_REVIEW')
  assert.equal(policy.waitingState, 'AWAITING_AUTHOR_RESPONSE')
  assert.equal(policy.responseConsumer, 'AUTHOR_REVIEW_RESPONSE_CONSUMER')
  assert.equal(policy.activeAuthorApprovalLanguageAllowed, true)
})

test('package recommendation uses current catalog and Starter has no backup', () => {
  const starter = prospect.resolveProspectPackageRecommendation({ recommendedPackage: 'Starter' })
  assert.equal(starter.primary.tier, 'Starter')
  assert.equal(starter.primary.price, 1999)
  assert.equal(starter.backup, null)

  const premier = prospect.resolveProspectPackageRecommendation({ recommendedPackage: 'Premier' })
  assert.equal(premier.primary.tier, 'Premier')
  assert.equal(premier.primary.price, 7500)
  assert.equal(premier.backup?.tier, 'Professional')
  assert.notEqual(premier.backup?.sku, premier.primary.sku)
})

test('prospect recommendation email is package-selection focused and validates Untitled title suggestions', () => {
  const recommendation = prospect.resolveProspectPackageRecommendation({ recommendedPackage: 'Professional' })
  const rendered = prospect.renderProspectEditorialReviewCommunication({
    authorName: 'Atta Boateng',
    titleName: 'Untitled',
    reviewSummary: 'Your manuscript has a clear testimony arc and needs structure decisions before commercial onboarding.',
    primaryRecommendation: recommendation.primary,
    backupRecommendation: recommendation.backup,
    recommendedImprint: 'J Merrill Publishing',
    titleSuggestions: ['Grace in the Turning', 'A Willing Road', 'The Shape of My Yes'],
    primaryActionUrl: 'https://jmerrill.pub/author/portal?action=choose-publishing-path&diagnosticId=stage0-diagnostic-atta',
  })
  assert.match(rendered.text, /Choose My Publishing Path/)
  assert.match(rendered.text, /Primary recommendation: Professional/)
  assert.match(rendered.text, /Backup recommendation: Starter/)
  assert.doesNotMatch(rendered.text, /approve this editorial stage|approved with corrections|current publishing stage|move to the next publishing stage/i)
})

test('attachment certification blocks single-line PDF overflow artifacts', () => {
  const longSingleLinePdf = Buffer.from([
    '%PDF-1.7',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj',
    '4 0 obj << /Length 1600 >> stream',
    `BT /F1 11 Tf 72 720 Td (${('Atta Editorial Review Summary ').repeat(120)}) Tj ET`,
    'endstream endobj',
    '%%EOF',
  ].join('\n'))
  const result = notification.validateGovernedPackageAttachmentBinary(
    {
      role: 'editorialMemo',
      artifactId: 'artifact-broken',
      fileName: 'Atta-Editorial-Review.pdf',
      contentType: 'application/pdf',
      contentBytesBase64: longSingleLinePdf.toString('base64'),
      sizeBytes: longSingleLinePdf.byteLength,
    },
    'Atta',
  )
  assert.equal(result.ok, false)
  assert.match(result.blocker, /PDF_TEXT_FLOW_INVALID:SINGLE_LINE_OVERFLOW/)
})

test('canonical dispatch service blocks prospect Editorial Review active-author send path', () => {
  const service = readFileSync(new URL('../lib/server/publishing-dispatch-service.ts', import.meta.url), 'utf8')
  assert.match(service, /PROSPECT_EDITORIAL_REVIEW_REQUIRES_PROSPECT_PACKAGE_SELECTION_PATH/)
  assert.match(service, /derivePublishingLifecycleContext/)
  assert.match(service, /stageCode === 'EDITORIAL_REVIEW' && readback\.lifecycleContext === 'PROSPECT_INQUIRY'/)
})
