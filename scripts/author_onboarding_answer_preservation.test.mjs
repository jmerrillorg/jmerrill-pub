import test from 'node:test'
import assert from 'node:assert/strict'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)
const { buildSubmissionIdentity, buildSubmissionPayload } = await jiti.import('../lib/server/author-onboarding-dataverse.ts')
const authority = { contactId: '106a78d0-fb9a-f111-b8dc-6045bdd69738', titleId: 'daf8180f-85a3-f111-b8de-000d3a14673b', engagementId: 'engagement-1' }

test('exact answer replay is idempotent regardless of property order', () => {
  assert.equal(buildSubmissionIdentity({ governedAuthority: authority, rawFormData: { email: 'author@example.com', notes: 'First answer' } }),
    buildSubmissionIdentity({ governedAuthority: authority, rawFormData: { notes: 'First answer', email: 'author@example.com' } }))
})

test('newer distinct answers do not overwrite or discard previous valid answers', () => {
  assert.notEqual(buildSubmissionIdentity({ governedAuthority: authority, rawFormData: { notes: 'First answer' } }),
    buildSubmissionIdentity({ governedAuthority: authority, rawFormData: { notes: 'Revised answer' } }))
})

test('changing author or title cannot replay another author submission', () => {
  const input = { governedAuthority: authority, rawFormData: { notes: 'Same answer' } }
  assert.notEqual(buildSubmissionIdentity(input), buildSubmissionIdentity({ ...input, governedAuthority: { ...authority, titleId: 'another-title' } }))
  assert.notEqual(buildSubmissionIdentity(input), buildSubmissionIdentity({ ...input, governedAuthority: { ...authority, contactId: 'another-author' } }))
})

test('an incomplete attempt preserves answers without claiming onboarding completion', () => {
  const input = { governedAuthority: authority, rawFormData: { notes: 'Partial answers' } }
  const receipt = buildSubmissionPayload(input, '2026-09-27T01:00:00Z', true)
  assert.equal(receipt.jm1pub_formtype, 'author-onboarding-attempt')
  assert.equal('jm1pub_onboardingcompletedat' in receipt, false)
  assert.deepEqual(JSON.parse(receipt.jm1pub_rawpayload).rawFormData, input.rawFormData)
})
