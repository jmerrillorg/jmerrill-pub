import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const ecr = readFileSync('lib/server/jm1-enterprise-communication-renderer.ts', 'utf8')
const tokens = readFileSync('lib/server/jm1-enterprise-design-tokens.ts', 'utf8')
const author = readFileSync('lib/server/author-communication-brand.ts', 'utf8')

test('JM1 Enterprise Communication Renderer exposes governed tokens and components', () => {
  assert.match(ecr, /name: 'JM1 Enterprise Communication Standard v1\.0'/)
  assert.match(ecr, /rendererName: 'JM1 Enterprise Communication Renderer'/)
  for (const component of [
    'Brand Header',
    'Hero',
    'Greeting',
    'Purpose',
    'Summary',
    'Attachments',
    'Action Required',
    'Timeline',
    'Support',
    'Signature',
    'Footer',
  ]) {
    assert.match(ecr, new RegExp(component))
  }
})

test('enterprise design tokens and brand overlays are centralized', () => {
  for (const token of ['enterpriseNavy', 'enterpriseGold', 'neutralBackground', 'surfaceWhite', 'textPrimary', 'textSecondary', 'border', 'primaryCta', 'focusState', 'error', 'success', 'spacing', 'buttons', 'icons', 'borders', 'cards', 'callouts', 'tables', 'accessibility']) {
    assert.match(tokens, new RegExp(token))
  }
  for (const overlay of ['corporate', 'publishing', 'financial', 'foundation', 'productions', 'agapeInternationalCathedral']) {
    assert.match(tokens, new RegExp(`${overlay}: \\{`))
  }
})

test('Publishing author communication renders through ECR with restrained brand header', () => {
  assert.match(author, /renderJm1EnterpriseCommunication/)
  assert.match(author, /messageTitleFor\(normalized\)/)
  assert.match(author, /subtitle: normalized\.titleName/)
  assert.match(author, /signatureForBrand\('publishing'\)/)
  assert.ok(ecr.includes('${escapeHtml(input.title)}'))
  assert.equal(ecr.includes('${brand.brandName}</h1>'), false)
  assert.match(ecr, /BRAND_NAME_RENDERED_AS_MESSAGE_H1/)
  assert.match(ecr, /INVENTED_CLOSING_PRESENT/)
  assert.match(ecr, /ECR_EXECUTION_AUTHORITY_MISSING/)
  assert.match(ecr, /BRAND_SIGNATURE_CONFIGURATION_MISSING/)
  assert.match(ecr, /RESPONSE_CLOCK_LANGUAGE_UNAUTHORIZED/)
  assert.match(ecr, /AUTHOR_EMAIL_INTERNAL_ARTIFACT_EXPOSED/)
  assert.match(tokens, /614\.965\.6057/)
  assert.ok(ecr.includes('· ${brand.email} ·'))
})

test('ECR rejects brand names as message H1 and invented closings', () => {
  assert.ok(ecr.includes('BRAND_NAME_RENDERED_AS_MESSAGE_H1'))
  assert.ok(ecr.includes('INVENTED_CLOSING_PRESENT'))
  assert.ok(ecr.includes('Warmly'))
  assert.ok(ecr.includes('J Merrill Publishing'))
})
