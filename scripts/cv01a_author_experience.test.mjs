import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const surveyFile = readFileSync('lib/publishing/author-experience-survey.ts', 'utf8')
const routeFile = readFileSync('app/api/author-experience/route.ts', 'utf8')
const pageFile = readFileSync('app/experience/page.tsx', 'utf8')
const clientFile = readFileSync('app/experience/AuthorExperienceSurveyClient.tsx', 'utf8')
const footerFile = readFileSync('lib/tokens.ts', 'utf8')
const linkedPages = [
  readFileSync('app/publishing/page.tsx', 'utf8'),
  readFileSync('app/author-journey/page.tsx', 'utf8'),
  readFileSync('app/contact/page.tsx', 'utf8'),
  footerFile,
]

test('CV-01A survey uses the Publishing Customer Voice source identifier', () => {
  assert.match(surveyFile, /JMP-CV-01A-AUTHOR-EXPERIENCE/)
  assert.match(surveyFile, /J Merrill Publishing Author Experience/)
  assert.match(routeFile, /submitAuthorExperienceAnswers/)
})

test('CV-01A question set covers the required Publishing author experience areas', () => {
  for (const required of [
    'onboarding',
    'communication',
    'clarity',
    'editorial',
    'production',
    'heard',
    'overall',
    'recommend',
    'open_feedback',
  ]) {
    assert.match(surveyFile, new RegExp(`id: '${required}'`))
  }
})

test('CV-01A does not request unnecessary sensitive author information', () => {
  const combined = `${surveyFile}\n${pageFile}\n${clientFile}`
  for (const prohibited of [
    /author legal name/i,
    /date of birth/i,
    /social security/i,
    /\bssn\b/i,
    /bank account/i,
    /routing number/i,
    /payment card/i,
    /manuscript upload/i,
  ]) {
    assert.doesNotMatch(combined, prohibited)
  }
  assert.match(combined, /do not include payment details/i)
  assert.match(combined, /private manuscript content/i)
})

test('Share Your Experience is exposed from the public Publishing site', () => {
  assert.ok(linkedPages.every((file) => file.includes('Share Your Experience')))
  assert.ok(linkedPages.every((file) => file.includes('/experience')))
})

test('response storage remains in Customer Voice Dataverse tables', () => {
  const responseFile = readFileSync('lib/publishing/author-experience-response.ts', 'utf8')
  assert.match(responseFile, /msfp_surveyresponses/)
  assert.match(responseFile, /msfp_questionresponses/)
  assert.match(responseFile, /msfp_surveies/)
  assert.match(responseFile, /msfp_questions/)
})
