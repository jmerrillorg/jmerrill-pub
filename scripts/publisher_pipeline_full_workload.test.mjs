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
