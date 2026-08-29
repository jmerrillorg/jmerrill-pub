import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAuthorRecommendationEmail, finalRecommendation, JACKULINE } from './jackuline_fly_editorial_review_completion.mjs'

test('final package recommendations include primary and alternate package', () => {
  const review = finalRecommendation()
  assert.equal(review.primaryPackage, 'JMP-PKG-STARTER')
  assert.equal(review.alternatePackage, 'JMP-PKG-PRO')
  assert.notEqual(review.primaryPackage, review.alternatePackage)
})

test('author recommendation is human-facing and asks only missing attestations', () => {
  const email = buildAuthorRecommendationEmail(finalRecommendation())
  assert.match(email.subject, /Editorial Review Recommendation/)
  assert.match(email.body, /rights/i)
  assert.match(email.body, /AI tools/i)
  assert.match(email.body, /sensitive personal stories/i)
  assert.doesNotMatch(`${email.body}\n${email.htmlBody}`, /Dataverse|artifact ID|correlation|execution log|system recovery/i)
  assert.doesNotMatch(email.body, /accepted for publication/i)
  assert.match(email.htmlBody, /^<!doctype html>/)
})

test('recommendation preserves pre-commercial boundaries', () => {
  const email = buildAuthorRecommendationEmail(finalRecommendation())
  assert.match(email.body, new RegExp(JACKULINE.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(email.body, /recommended package path/)
  assert.doesNotMatch(email.body, /contract has been created|payment link|ISBN|joined the family/i)
})
