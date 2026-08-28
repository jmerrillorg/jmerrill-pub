import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { RESIDUAL_ROWS } from './residual_author_facing_artifact_authority_reconciliation.mjs'

test('residual reconciliation targets only the three known historical rows', () => {
  assert.equal(RESIDUAL_ROWS.length, 3)
  assert.deepEqual(
    RESIDUAL_ROWS.map((row) => row.gateId),
    [
      'e996abe7-2f8e-f111-8077-000d3a14673b',
      '0fddf310-308e-f111-8077-6045bdd69738',
      '899ef3cd-fb7b-f111-ab0f-7c1e525b15c2',
    ],
  )
  assert.deepEqual(
    RESIDUAL_ROWS.map((row) => row.disposition),
    [
      'DETERMINISTICALLY_REPAIRED_CURRENT_AUTHOR_WAIT_VALID',
      'HISTORICAL_CONTAINED_SUPERSEDED_BY_CURRENT_LINE_GATE',
      'HISTORICAL_CONTAINED_SUPERSEDED_A2_EVIDENCE',
    ],
  )
})

test('residual reconciliation does not weaken author-facing artifact authority canon', () => {
  const source = readFileSync(new URL('../lib/server/author-review-package-engine.ts', import.meta.url), 'utf8')
  assert.match(source, /policyId:\s*'JMP-AUTHOR-FACING-ARTIFACT-AUTHORITY-v1'/)
  assert.match(source, /status:\s*'CANON'/)
  assert.match(source, /authorWaitRequiresCurrentAuthorFacingArtifact:\s*true/)
  assert.match(source, /approvalRequiresExactDeliveredArtifactBinding:\s*true/)
  assert.match(source, /checksumOnlyPatchPermitted:\s*false/)
})
