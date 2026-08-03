import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const ecr = jiti('../lib/server/jm1-enterprise-communication-renderer.ts')
const state = JSON.parse(readFileSync('docs/operations/commissioning/JM1-BOOTSTRAP-ECR-COMMISSIONING-STATE.json', 'utf8'))
const appServiceWorkflow = readFileSync('.github/workflows/azure-app-service-publishing.yml', 'utf8')
const recoveryWorkflow = readFileSync('.github/workflows/five-title-executive-recovery-dispatch.yml', 'utf8')
const dispatchService = readFileSync('lib/server/publishing-dispatch-service.ts', 'utf8')
const notificationEngine = readFileSync('lib/server/author-package-notification-engine.ts', 'utf8')
const brandRenderer = readFileSync('lib/server/author-communication-brand.ts', 'utf8')
const tokens = readFileSync('lib/server/jm1-enterprise-design-tokens.ts', 'utf8')

const brandKeys = [
  'publishing',
  'financial',
  'foundation',
  'productions',
  'corporate',
  'agapeInternationalCathedral',
]

test('PR 402 merge is represented on current origin/main', () => {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const originMain = execFileSync('git', ['rev-parse', 'origin/main'], { encoding: 'utf8' }).trim()
  const subject = execFileSync('git', ['show', '--no-patch', '--format=%s', 'origin/main'], { encoding: 'utf8' }).trim()
  const parents = execFileSync('git', ['show', '--no-patch', '--format=%P', 'origin/main'], { encoding: 'utf8' }).trim()
  assert.equal(head, originMain)
  assert.match(subject, /Merge pull request #402/)
  assert.match(parents, /9f082edaa35e4e3ae69152497034715943356078/)
})

test('commissioning state locks bootstrap and ECR as production mandatory', () => {
  assert.equal(state.bootstrap, 'PRODUCTION')
  assert.equal(state.enterpriseCommunicationRenderer, 'PRODUCTION')
  assert.equal(state.bootstrapMandatory, true)
  assert.equal(state.ecrMandatory, true)
  assert.equal(state.legacyStartupPaths, 'RETIRED')
  assert.equal(state.legacyRenderers, 0)
  assert.equal(state.workflowHtmlDuplication, 0)
  assert.equal(state.bootstrapBypasses, 0)
  assert.equal(state.authorCommunications, 0)
  assert.equal(state.runtimeMutations, 'ONLY_AUTHORIZED')
})

test('production workflows require bootstrap before deployment or protected dispatch', () => {
  for (const workflow of [appServiceWorkflow, recoveryWorkflow]) {
    assert.match(workflow, /npm run jm1-bootstrap --/)
    assert.match(workflow, /npm run jm1-bootstrap-guard/)
    assert.match(workflow, /npm run jm1-canon-consistency-guard/)
  }
  assert.match(appServiceWorkflow, /npm run author-communication-brand-guard/)
  assert.match(appServiceWorkflow, /npm run program006-dispatch-guard/)
  assert.match(recoveryWorkflow, /environment:\s*jmerrill-pub-production/)
})

test('all commissioned Publishing workflows use ECR-backed notification path', () => {
  assert.equal(state.publishingWorkflowsMigrated.length, 12)
  assert.match(dispatchService, /buildAuthorReviewNotificationCopy/)
  assert.match(notificationEngine, /renderAuthorCommunicationEmail/)
  assert.match(notificationEngine, /validateAuthorCommunicationEmail/)
  assert.match(brandRenderer, /renderJm1EnterpriseCommunication/)
  assert.doesNotMatch(dispatchService, /return\s+`<!doctype html>|return\s+`<html\b|function\s+renderHtml/i)
  assert.doesNotMatch(notificationEngine, /return\s+`<!doctype html>|return\s+`<html\b|function\s+renderHtml/i)
})

test('cross-brand ECR pilot renders overlay, signature, HTML, and text', () => {
  for (const brand of brandKeys) {
    const rendered = ecr.renderJm1EnterpriseCommunication({
      brand,
      executionAuthority: {
        authoritySource: 'JM1 Governed Bootstrap',
        renderAllowed: true,
        communicationAllowed: false,
      },
      templateName: 'JM1_CROSS_BRAND_BOOTSTRAP_ECR_PILOT',
      templateVersion: '1.0.0',
      subject: `Commissioning Pilot - ${brand}`,
      recipientName: 'Commissioning Reviewer',
      title: 'Commissioning Pilot',
      subtitle: brand,
      preheader: 'Bootstrap and ECR commissioning pilot.',
      reason: 'This read-only pilot validates the governed brand overlay and renderer.',
      summaryItems: ['Bootstrap loaded authority.', 'ECR rendered the governed message.'],
      attachments: ['No files are attached.'],
      reviewPrompt: 'No author or external response is requested.',
      actionLabel: 'Open JM1',
      actionUrl: 'https://jmerrill.one/',
      actionInstruction: 'No send is authorized from this pilot.',
      timelineItems: ['Commissioning evidence is recorded in repository docs.'],
      supportNote: 'Use the governed support channel for this brand.',
    })
    const overlay = ecr.JM1_COMMUNICATION_BRANDS[brand]
    assert.match(rendered.html, /<!doctype html>/i)
    assert.match(rendered.html, /<table role="presentation"/)
    assert.match(rendered.html, new RegExp(overlay.brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(rendered.text, new RegExp(overlay.legalEntityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(rendered.text, new RegExp(overlay.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.equal(rendered.metadata.qualityGate, 'PASS')
  }
})

test('communication canon rejects noncanonical mailbox paths and internal artifacts', () => {
  assert.equal(state.communicationCanon.sender, 'publishing@email.jmerrill.one')
  assert.equal(state.communicationCanon.replyTo, 'publishing@jmerrill.one')
  assert.equal(state.communicationCanon.archive, 'publishing@jmerrill.one')
  assert.equal(state.communicationCanon.portal, 'OPTIONAL')
  assert.equal(state.communicationCanon.internalArtifacts, 0)
  assert.match(notificationEngine, /gmailFallback|Gmail|publishing@email\.jmerrill\.one|publishing@jmerrill\.one/)
  const validation = ecr.validateJm1EnterpriseCommunication({
    brand: 'publishing',
    html: '<!doctype html><html><body><table><tr><td>J MERRILL PUBLISHING</td></tr></table><a href="https://jmerrill.pub">Open</a></body></html>',
    text: "Why you are receiving this\nWhat has been completed\nWhat's attached\nHow to respond\nWhat happens next\nSupport\ninternal instruction\nThe Publishing Team\nJ Merrill Publishing, Inc.\nA Division of J Merrill One\n614.965.6057 · publishing@jmerrill.one · jmerrill.pub\nHelping Authors Help Themselves.",
  })
  assert.equal(validation.ok, false)
  assert.match(validation.blocker, /AUTHOR_EMAIL_INTERNAL_ARTIFACT_EXPOSED/)
})

test('enterprise token source covers required design categories', () => {
  for (const category of ['typography', 'spacing', 'colors', 'buttons', 'icons', 'borders', 'cards', 'callouts', 'tables', 'accessibility']) {
    assert.match(tokens, new RegExp(`${category}: \\{`))
  }
})
