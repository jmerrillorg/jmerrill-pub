import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'
import createJiti from 'jiti'

const require = createRequire(import.meta.url)
const jiti = createJiti(import.meta.url)
const brand = jiti('../lib/server/author-communication-brand.ts')

test('Whole onboarding uses the authenticated portal session and governed identifiers', () => {
  const route = fs.readFileSync('app/api/author/onboarding/route.ts', 'utf8')
  const form = fs.readFileSync('app/author/_components/AuthorSetupForm.tsx', 'utf8')

  assert.match(route, /requireAuthorAccess.*author-portal-context/)
  assert.match(route, /WHOLE_ONBOARDING_CONTINUITY\.titleId/)
  assert.match(route, /WHOLE_ONBOARDING_CONTINUITY\.engagementId/)
  assert.match(route, /WHOLE_ONBOARDING_CONTINUITY\.lifecycleId/)
  assert.doesNotMatch(form, /x-author-access-code/)
})

test('Whole onboarding Dataverse fallback is deterministic and contact-bound', () => {
  const fallback = fs.readFileSync('lib/server/author-onboarding-dataverse.ts', 'utf8')

  assert.match(fallback, /deterministicGuid\(buildSubmissionIdentity\(payload\)\)/)
  assert.match(fallback, /'If-None-Match': '\*'/)
  assert.match(fallback, /jm1pub_LinkedContact@odata\.bind/)
  assert.match(fallback, /jm1pub_rawpayload/)
})

test('AUTHOR_ONBOARDING_V1 is active and renders through the canonical author renderer', () => {
  const policy = brand.AUTHOR_FACING_COMMUNICATION_RENDER_MATRIX.find((row) => row.templateName === 'AUTHOR_ONBOARDING_V1')
  assert.equal(policy?.state, 'ACTIVE_GOVERNED')

  const rendered = brand.renderAuthorOnboardingInvitation({
    authorName: 'Jackuline',
    titleName: 'Whole',
    onboardingUrl: 'https://jmerrill.pub/author/onboarding',
  })
  assert.equal(rendered.metadata.templateName, 'AUTHOR_ONBOARDING_V1')
  assert.equal(rendered.metadata.templateVersion, '1.0.0')
  assert.match(rendered.html, /Begin Author Onboarding/)
  assert.match(rendered.text, /https:\/\/jmerrill\.pub\/author\/onboarding/)
})

test('enterprise relay governs and renders the onboarding invitation server-side', () => {
  const relay = require('../azure-functions/acs-email-relay/src/templates/renderer.js')
  const rendered = relay.renderTemplate({
    templateId: 'PUBLISHING.AUTHOR_ONBOARDING_V1',
    templateVersion: '1.0.0',
    data: {
      authorFirstName: 'Jackuline',
      projectTitle: 'Whole',
      onboardingUrl: 'https://jmerrill.pub/author/onboarding',
    },
  })
  assert.equal(rendered.ok, true)
  assert.equal(rendered.value.metadata.templateId, 'PUBLISHING.AUTHOR_ONBOARDING_V1')
  assert.match(rendered.value.plainText, /one-time code/)
})

test('enterprise relay rejects a non-governed onboarding URL', () => {
  const relay = require('../azure-functions/acs-email-relay/src/templates/renderer.js')
  const rendered = relay.renderTemplate({
    templateId: 'PUBLISHING.AUTHOR_ONBOARDING_V1',
    templateVersion: '1.0.0',
    data: {
      authorFirstName: 'Jackuline',
      projectTitle: 'Whole',
      onboardingUrl: 'https://example.com/author/onboarding',
    },
  })
  assert.equal(rendered.ok, false)
  assert.equal(rendered.reason, 'TEMPLATE_DATA_ONBOARDINGURL_INVALID')
})
