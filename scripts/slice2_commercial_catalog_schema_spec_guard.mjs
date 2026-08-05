import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const manifestPath =
  'docs/architecture/generated/JMP-COMMERCIAL-CATALOG-SCHEMA-SPEC-2026-08-05/01-schema-manifest.json'
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

test('Slice 2 commercial catalog schema manifest preserves approved identity and boundary', () => {
  assert.equal(manifest.disposition, 'NEW_ENTITY_REQUIRED')
  assert.equal(manifest.table.logicalName, 'jm1pub_commercialcatalogitem')
  assert.equal(manifest.table.displayName, 'JMP Commercial Catalog Item')
  assert.equal(manifest.table.expectedEntitySetName, 'jm1pub_commercialcatalogitems')
  assert.equal(manifest.table.entitySetVerification, 'REQUIRED_AFTER_LIVE_METADATA_READBACK')
  assert.equal(manifest.solution.displayName, 'JM1 Publishing Commercial Catalog')
  assert.equal(manifest.solution.provisioningStatus, 'HELD_FOR_HUMAN_REVIEW')
  assert.equal(manifest.executor.retargetingStatus, 'HELD_UNTIL_LIVE_ENTITY_SET_VERIFICATION')
  assert.equal(manifest.mutationBoundary.dataverseCatalogMutations, 0)
  assert.equal(manifest.mutationBoundary.businessCentralMutations, 0)
  assert.equal(manifest.mutationBoundary.publicWebsiteChanges, 0)
  assert.equal(manifest.mutationBoundary.authorCommunications, 0)
  assert.equal(manifest.clientTitleAutomation, 'FROZEN')
})

test('required fields and alternate keys are present', () => {
  const columns = new Set(manifest.columns.map((column) => column.logicalName))
  for (const required of [
    'jm1pub_canonicalsku',
    'jm1pub_name',
    'jm1pub_catalogrowid',
    'jm1pub_category',
    'jm1pub_description',
    'jm1pub_jackieruling',
    'jm1pub_commercialstatus',
    'jm1pub_publicvisibility',
    'jm1pub_quotingstatus',
    'jm1pub_sellablestatus',
    'jm1pub_contractstatus',
    'jm1pub_pricingmethod',
    'jm1pub_unitprice',
    'jm1pub_priceexpression',
    'jm1pub_matrixversion',
    'jm1pub_productformcode',
    'jm1pub_scopegate',
    'jm1pub_requiresstatementofwork',
    'jm1pub_supersededby',
    'jm1pub_seedchecksum',
    'jm1pub_recordfingerprint',
  ]) {
    assert.ok(columns.has(required), `${required} missing from manifest`)
  }

  assert.deepEqual(manifest.alternateKeys[0].columns, ['jm1pub_canonicalsku'])
  assert.equal(manifest.alternateKeys[0].required, true)
  assert.deepEqual(manifest.alternateKeys[1].columns, ['jm1pub_catalogrowid'])
})

test('choice values and fail-closed rules preserve Jackie-approved commercial boundaries', () => {
  const byName = new Map(manifest.columns.map((column) => [column.logicalName, column]))
  assert.deepEqual(byName.get('jm1pub_jackieruling').choices, [
    'MIGRATE',
    'AMEND',
    'RETIRE',
    'MERGE',
    'PROVISIONAL',
  ])
  assert.deepEqual(byName.get('jm1pub_commercialstatus').choices, [
    'ACTIVE',
    'SUPERSEDED',
    'RETIRED',
    'PROVISIONAL',
    'INTERNAL_ONLY',
    'SCHEMA_INERT',
  ])
  assert.deepEqual(byName.get('jm1pub_pricingmethod').choices, [
    'FIXED',
    'STARTING_AT',
    'PER_FINISHED_HOUR',
    'TIERED',
    'QUOTED',
    'COMMISSION',
    'INCLUDED',
    'NOT_APPLICABLE',
  ])

  for (const rule of [
    'DUPLICATE_ACTIVE_CANONICAL_SKU',
    'MERGE_REPLACEMENT_UNRESOLVED',
    'PF07_PUBLIC_QUOTABLE_SELLABLE_OR_CONTRACTABLE',
    'PF08_NOT_ACTIVE_AND_SOW_GATED',
    'REQUIRED_PRICE_WITHOUT_UNIT_PRICE_OR_PRICE_EXPRESSION',
    'CATALOG_ROW_NOT_REPRESENTED_EXACTLY_ONCE',
    'LIVE_ENTITY_SET_NOT_VERIFIED',
  ]) {
    assert.ok(manifest.executorFailClosedRules.includes(rule), `${rule} missing`)
  }
})
