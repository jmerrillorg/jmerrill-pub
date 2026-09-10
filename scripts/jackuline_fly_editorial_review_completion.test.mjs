import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAuthorRecommendationEmail, finalRecommendation, JACKULINE } from './jackuline_fly_editorial_review_completion.mjs'

test('final package recommendations include primary and alternate package', () => {
  const review = finalRecommendation()
  assert.equal(review.primaryPackage, 'JMP-PKG-STARTER')
  assert.equal(review.alternatePackage, 'JMP-PKG-PRO')
  assert.equal(review.primaryPackagePrice, '$1,999')
  assert.equal(review.alternatePackagePrice, '$4,500')
  assert.match(review.primaryPackagePriceSource, /PACKAGE_CATALOG/)
  assert.notEqual(review.primaryPackage, review.alternatePackage)
})

test('author recommendation is human-facing and asks only missing attestations', () => {
  const email = buildAuthorRecommendationEmail(finalRecommendation())
  assert.match(email.subject, /Editorial Review Recommendation/)
  assert.match(email.body, /rights/i)
  assert.match(email.body, /AI tools/i)
  assert.match(email.body, /sensitive personal stories/i)
  assert.match(email.body, /You do not need to resend it/)
  assert.match(email.body, /Starter Publishing Package - \$1,999/)
  assert.match(email.body, /Professional Publishing Package - \$4,500/)
  assert.doesNotMatch(`${email.body}\n${email.htmlBody}`, /Dataverse|artifact ID|correlation|execution log|system recovery/i)
  assert.doesNotMatch(`${email.body}\n${email.htmlBody}`, /short enough|scorecard|\d+\/10/i)
  assert.doesNotMatch(email.body, /accepted for publication/i)
  assert.match(email.htmlBody, /^<!doctype html>/)
})

test('recommendation preserves pre-commercial boundaries', () => {
  const email = buildAuthorRecommendationEmail(finalRecommendation())
  assert.match(email.body, new RegExp(JACKULINE.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(email.body, /recommended package path/)
  assert.doesNotMatch(email.body, /contract has been created|payment link|ISBN|joined the family/i)
})
