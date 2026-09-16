import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const governance = readFileSync('lib/server/royalty-decision-governance.ts', 'utf8')
const route = readFileSync('app/api/publisher/operating-center/actions/route.ts', 'utf8')
const client = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')
const registry = readFileSync('lib/publishing/automation-capability-registry.mjs', 'utf8')
const wave2 = JSON.parse(
  readFileSync('docs/operations/generated/2026-07-19-JM1-Royalty-Operations-Wave2-Decision-Packages.json', 'utf8'),
)

test('royalty decision surface preserves the four governed dispositions and disables generic resolution', () => {
  for (const disposition of ['APPROVE_MAPPING', 'CORRECT_MAPPING', 'OUT_OF_SCOPE', 'DEFER']) {
    assert.match(governance, new RegExp(disposition))
    assert.match(client, new RegExp(disposition))
  }

  assert.doesNotMatch(client, />\\s*RESOLVE\\s*</)
  assert.doesNotMatch(client, /APPROVE ALL/i)
  assert.match(route, /recordRoyaltyMappingDecision/)
  assert.match(route, /record_royalty_mapping_decision/)
})

test('royalty decisions require Founder identity, package authority, and evidence versioning', () => {
  assert.match(governance, /ANONYMOUS_DECISION_DENIED/)
  assert.match(governance, /WRONG_OPERATOR_DENIED/)
  assert.match(governance, /royalty_package_not_found/)
  assert.match(governance, /EvidenceVersion/)
  assert.match(governance, /SupersedesDecisionId/)
  assert.match(governance, /buildRoyaltyDecisionIdempotencyKey/)
  assert.match(governance, /findExistingRoyaltyDecision/)
})

test('approve and correct mappings cannot fabricate contract authority', () => {
  assert.match(governance, /CONTRACT_AUTHORITY_REQUIRED/)
  for (const required of ['canonicalWorkId', 'formatAssetId', 'rightsholderId', 'royaltyProfileId']) {
    assert.match(governance, new RegExp(required))
  }
  assert.match(governance, /No author visibility, no royalty payment, no statement release, no contract-rate inference/)
})

test('out-of-scope and defer decisions require governed reasons and keep rows held', () => {
  assert.match(governance, /out_of_scope_reason_required/)
  assert.match(governance, /defer_reason_required/)
  assert.match(governance, /rowReevaluation/)
  assert.match(governance, /'PENDING_RECOMPUTE' as const/)
  assert.match(governance, /'HELD' as const/)
  assert.match(client, /NOT_JM1/)
  assert.match(client, /DUPLICATE_SOURCE_ROW/)
  assert.match(client, /NONPAYABLE_SOURCE/)
  assert.match(client, /UNSUPPORTED_RIGHT/)
  assert.match(client, /OTHER_GOVERNED_REASON/)
})

test('starting royalty package evidence remains the 175 package / 193 held row workload', () => {
  assert.equal(wave2.summary.decisionPackages.count, 175)
  assert.equal(wave2.summary.decisionPackages.heldRows, 193)
  assert.equal(wave2.summary.decisionPackages.affectedDollars, 1487.97)
  assert.equal(wave2.summary.mappingResults.rowsReleased, 0)
  assert.equal(wave2.summary.statementReadiness.readyForJackieReview, 0)
  assert.equal(wave2.summary.boundaries.authorVisibility, 'Off')
  assert.equal(wave2.summary.boundaries.payments, 'Not authorized')
})

test('V1/V2 registry records the recommissioned royalty decision capability', () => {
  assert.match(registry, /P1-ROYALTY-MAPPING-DECISION-SURFACE/)
  assert.match(registry, /ROYALTY_MAPPING_DECISION_RECORDED/)
  assert.match(registry, /V2_OPERATIONAL_HUMAN_GATE/)
  assert.match(registry, /PARTIAL_V2_WRITE_BINDING_RECOMMISSIONED/)
})
