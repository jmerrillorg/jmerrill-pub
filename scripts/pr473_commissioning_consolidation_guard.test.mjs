import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const standard = readFileSync('docs/operations/commissioning/JMP-FULL-JOURNEY-COMMISSIONING-STANDARD-v1.0.md', 'utf8')
const contract = readFileSync(
  'docs/operations/commissioning/JMP-Til-Death-Do-Us-Part-Full-Journey-Commissioning-Contract-v1.0.md',
  'utf8',
)
const summary = readFileSync(
  'docs/operations/generated/JMP-PR473-LIVE-COMMISSIONING-CONSOLIDATION-2026-08-11/00-executive-summary.md',
  'utf8',
)
const inquiryProof = readFileSync(
  'docs/operations/generated/JMP-PR473-LIVE-COMMISSIONING-CONSOLIDATION-2026-08-11/02-quanisha-live-path-proof.md',
  'utf8',
)
const coverAssessment = readFileSync(
  'docs/operations/generated/JMP-PR473-LIVE-COMMISSIONING-CONSOLIDATION-2026-08-11/03-intentional-leader-cover-design-closeout-assessment.md',
  'utf8',
)

test('commissioning standard distinguishes implementation states', () => {
  for (const state of ['IMPLEMENTED', 'TESTED', 'DEPLOYED', 'LIVE-PROVEN', 'COMMISSIONED']) {
    assert.match(standard, new RegExp(`\\| ${state} \\|`))
  }
  assert.match(standard, /A pipeline segment is not fully commissioned until a real or production-faithful event traverses it end to end\./)
  assert.match(standard, /If Jackie must act, Jackie must know\./)
})

test('full journey contract preserves no-manual-force defect policy', () => {
  assert.match(contract, /'Til Death Do Us Part/)
  assert.match(contract, /Start condition: manuscript received/)
  assert.match(contract, /verified distribution/i)
  assert.match(contract, /Do not start before manuscript delivery\./)
  assert.match(contract, /Do not bypass author approval gates for speed\./)
  assert.match(standard, /The title is the probe\. The pipeline is what gets repaired\./)
})

test('PR473 evidence records live notification proof without duplicate send', () => {
  assert.match(inquiryProof, /JMP-INT-202608-0AOS7L/)
  assert.match(inquiryProof, /230ff233-ee95-f111-8076-000d3a14673b/)
  assert.match(inquiryProof, /Send count \\| 1/)
  assert.match(inquiryProof, /Duplicate replay count \\| 0/)
  assert.match(inquiryProof, /diagnosticId=572a89ef-cd95-f111-8076-7c1e525b15c2/)
})

test('PR473 evidence preserves Cover Design closeout blocker instead of forcing progression', () => {
  assert.ok(summary.includes('Cover Design closeout | BLOCKED / NOT CLOSED'))
  assert.match(coverAssessment, /Project status \\| InProgress/)
  assert.ok(coverAssessment.includes('Canonical Cover Design stage/gate/artifact closeout record exists | FAIL'))
  assert.match(coverAssessment, /Production progression is not inferred\./)
})
