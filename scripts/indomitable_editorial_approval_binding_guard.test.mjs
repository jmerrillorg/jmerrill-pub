import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const bindingScript = readFileSync('scripts/indomitable_editorial_approval_binding.mjs', 'utf8')
const exhaustionScript = readFileSync('scripts/jmp_full_day_execution_exhaustion.mjs', 'utf8')

test('Indomitable approval binding uses governed Outlook evidence and exact artifact authority', () => {
  assert.match(bindingScript, /publishing@jmerrill\.one|Microsoft 365 \/ Outlook author reply/)
  assert.match(bindingScript, /APPROVAL_RECEIVED_ON = '2026-08-20T16:17:16Z'/)
  assert.match(bindingScript, /SOURCE_ARTIFACT_ID = 'c373402b-01a0-f111-b8db-7c1e525801f6'/)
  assert.match(bindingScript, /SOURCE_SHA256 = '08cedd4d4db470887ea75e792359c6b4fa807f54bf09f2b50be0144f5e7f7181'/)
  assert.match(bindingScript, /jm1pub_nextstageauthorized: true/)
})

test('Indomitable approval binding makes Developmental Editing executable without sending author communications', () => {
  assert.match(bindingScript, /jm1pub_stagestatus: STAGE_STATUS\.IN_PROGRESS/)
  assert.match(bindingScript, /jm1pub_blockerreason: null/)
  assert.match(bindingScript, /No author communication sent/)
  assert.doesNotMatch(bindingScript, /sendMail|messages\/send|publishing@email\.jmerrill\.one/)
})

test('full-day evidence records the post-execution Indomitable state and send boundary', () => {
  assert.match(exhaustionScript, /DEVELOPMENTAL_EDITING_EXECUTED \/ PACKAGE_READY_INTERNAL/)
  assert.match(exhaustionScript, /AUTHOR_REVIEW_AFTER_STAGE_COMPLETION_AND_CADENCE/)
  assert.match(exhaustionScript, /INDOMITABLE_DEVELOPMENTAL_AUTHOR_GATE_ID = '0cf8a1d7-04a0-f111-b8dc-00224820105b'/)
  assert.match(exhaustionScript, /External sends \| 0/)
  assert.match(exhaustionScript, /no Developmental author-review package was sent before QA\/cadence authorization/)
})
