import assert from 'node:assert/strict'
import test from 'node:test'

import {
  analyzeBillComAuthorPopulation,
  recordsFromCsv,
  safeSourceSummary,
} from './author_royalty_connect_migration_source_guard.mjs'

test('parses quoted Bill.com CSV fields without splitting inside quotes', () => {
  const rows = recordsFromCsv('Vendor Name,Primary Email,Description\n"Doe, Jane, Author",jane@example.com,"Author, legacy"\n')

  assert.equal(rows.length, 1)
  assert.equal(rows[0]['Vendor Name'], 'Doe, Jane, Author')
  assert.equal(rows[0]['Description'], 'Author, legacy')
})

test('uses exact ", Author" suffix and excludes contains-only records', () => {
  const csv = [
    'Vendor Name,Primary Email,Tax ID,Vendor Bank Account Status',
    '"Smith, Pat, Author",pat@example.com,,Connected',
    '"Dennis Brown, Author/Editor",dennis@example.com,,Connected',
    '"Alice V. Pryor, Author (deleted)",alice@example.com,,Connected',
    '"Author Services Vendor",vendor@example.com,,Connected',
  ].join('\n')

  const result = analyzeBillComAuthorPopulation(csv)

  assert.equal(result.exactAuthorRows, 1)
  assert.equal(result.containsAuthorRows, 3)
  assert.deepEqual(result.excludedContainsAuthorNames, [
    'Dennis Brown, Author/Editor',
    'Alice V. Pryor, Author (deleted)',
  ])
})

test('summarizes duplicate emails with hashes instead of raw addresses', () => {
  const csv = [
    'Vendor Name,Primary Email',
    '"Smith, Pat, Author",shared@example.com',
    '"Smith, Alex, Author",shared@example.com',
  ].join('\n')

  const result = safeSourceSummary('/tmp/source.csv', csv)

  assert.equal(result.exactAuthorRows, 2)
  assert.equal(result.uniquePrimaryEmails, 1)
  assert.equal(result.duplicatePrimaryEmailGroups, 1)
  assert.equal(result.duplicatePrimaryEmailGroupHashes[0].count, 2)
  assert.doesNotMatch(JSON.stringify(result), /shared@example\.com/)
})
