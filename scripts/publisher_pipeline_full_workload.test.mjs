import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../lib/server/publisher-operating-center.ts', import.meta.url), 'utf8')
const start = source.indexOf('function buildTitleOperatingView(')
const end = source.indexOf('function loadCertifiedTitleProjectionItems(', start)
const projection = source.slice(start, end)

test('pipeline title cards include the full active workload, not only capped daily queues', () => {
  assert.match(projection, /\.\.\.input\.workload\.map\(workloadToTodayItem\)/)
  assert.match(projection, /byTitle\.set\(key,/)
  assert.match(projection, /titleOperatingKey\(item\)/)
})

test('live workload supersedes a frozen certified projection for the same title ID', () => {
  assert.match(projection, /activeWorkloadTitleIds = new Set\(input\.workload\.filter\(\(item\) => item\.evidenceLinks\?\.length\)\.map\(\(item\) => item\.titleId\)/)
  assert.match(projection, /loadCertifiedTitleProjectionItems\(\)\.filter\(/)
  assert.match(projection, /!item\.titleId \|\| !activeWorkloadTitleIds\.has\(item\.titleId\)/)
})

test('delivered pending review supplies exact artifact authority to the projection', () => {
  assert.match(source, /getDeliveredReviewArtifacts\(config, approvalGates, deliveryLogs\)/)
  assert.match(source, /sameProjectionTitle\(dataverseLookupId\(row, '_jm1pub_titleid_value'\), titleId\)/)
  assert.match(source, /sameProjectionTitle\(dataverseLookupId\(row, '_jm1pub_editorialstageid_value'\), stageId\)/)
  assert.match(source, /deliveredReviewChecksums\(stringValue\(row\.jm1_actiondescription\)\)\.includes\(checksum\)/)
  assert.match(source, /evidenceLinks: item\.evidenceLinks \|\| \[\]/)
})
