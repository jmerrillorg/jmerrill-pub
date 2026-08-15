import assert from 'node:assert/strict'
import { existsSync, symlinkSync, unlinkSync } from 'node:fs'
import test, { after } from 'node:test'

const shim = new URL('../lib/server/cc010-author-package-portfolio-reevaluation', import.meta.url)
let createdShim = false
if (!existsSync(shim)) {
  symlinkSync('cc010-author-package-portfolio-reevaluation.ts', shim)
  createdShim = true
}
after(() => {
  if (createdShim) unlinkSync(shim)
})

const {
  negativeProof,
  queuePortfolio,
  reevaluateAuthorGates,
} = await import('../lib/server/cc010-author-package-portfolio-reevaluation.ts')

test('author-facing package capability reclassifies Atta without bypassing live-send gates', () => {
  const [gate] = reevaluateAuthorGates([
    {
      gate_id: 'eeffc5fb-5698-f111-8076-000d3a14673b',
      title: 'Untitled',
      stage: 'A1 Editorial Review Acceptance',
      new_classification: 'ARTIFACT_BLOCKED',
      remaining_blocker: 'Internal-only Markdown artifact; governed author-facing Editorial Review package not established',
      sendable: 'NO',
      waiting_owner: 'SYSTEM/PUBLISHING_RELEASE',
    },
  ], { authorFacingEditorialReviewPackageAvailable: true })

  assert.equal(gate.reclassification, 'PACKAGE_READY_PENDING_PERSISTENCE')
  assert.equal(gate.newly_unblocked, 'YES')
  assert.equal(gate.sendable, 'NO')
  assert.match(gate.resume_action, /persist governed author-facing Editorial Review package/i)
})

test('existing responses are consumed without duplicate author review requests', () => {
  const [gate] = reevaluateAuthorGates([
    {
      gate_id: '5141f7db-0a8e-f111-8077-00224820105b',
      title: 'The Intentional Leader',
      stage: 'A7 Interior Layout Approval',
      new_classification: 'ALREADY_SENT_RESPONDED',
      remaining_blocker: 'Author already approved interior layout proof',
      sendable: 'NO',
      waiting_owner: 'SYSTEM',
    },
  ], { authorFacingEditorialReviewPackageAvailable: true })

  assert.equal(gate.reclassification, 'EXISTING_RESPONSE_CONSUMED')
  assert.equal(gate.resume_action, 'No new author request.')
})

test('portfolio queues are not serialized behind Atta and preserve stage providers', () => {
  const rows = queuePortfolio([
    {
      Title: 'Untitled',
      Author: 'Atta Boateng',
      Current_CC010_Stage: 'Stage 0 / Editorial Review',
      Waiting_On: 'System',
      Current_Blocker: 'Package persistence required',
      Next_Governed_Action: 'Generate author-facing package',
      Safe_to_Resume: 'YES_IF_SOURCE_AND_GATE_CHECKS_PASS',
      Mutation_Required: 'NO - evidence only',
    },
    {
      Title: 'The Long Watch',
      Author: 'Jackie Smith Jr',
      Current_CC010_Stage: 'Developmental Editing',
      Waiting_On: 'Author',
      Current_Blocker: 'Await Developmental Editing author response/full approval',
      Next_Governed_Action: 'Wait for author response',
      Safe_to_Resume: 'NO',
      Mutation_Required: 'NO - evidence only',
    },
    {
      Title: 'Copy Candidate',
      Author: 'Author',
      Current_CC010_Stage: 'Copyediting',
      Waiting_On: 'System',
      Current_Blocker: 'Ready for copyediting',
      Next_Governed_Action: 'Run copyediting',
      Safe_to_Resume: 'YES_IF_SOURCE_AND_GATE_CHECKS_PASS',
      Mutation_Required: 'NO - evidence only',
    },
  ])

  assert.deepEqual(rows.map((row) => row.provider), ['CLAUDE', 'CLAUDE', 'OPENAI'])
  assert.equal(rows.every((row) => row.portfolio_serialized_behind_atta === 'NO'), true)
  assert.equal(negativeProof([], rows).portfolio_serialized_behind_Atta, 0)
})
