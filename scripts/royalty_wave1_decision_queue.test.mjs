import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const serverSource = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const clientSource = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')
const reconciliation = JSON.parse(
  readFileSync('docs/operations/generated/2026-07-18-JM1-2026-Royalty-Source-Row-Reconciliation.json', 'utf8'),
)
const monthlyClose = JSON.parse(readFileSync('docs/operations/generated/2026-07-18-JM1-2026-Royalty-Monthly-Close.json', 'utf8'))

const heldRows = reconciliation.rows.filter((row) => row.matchStatus !== 'MATCHED_CORE_IDENTIFIER')
const grouped = new Map()

for (const row of heldRows) {
  const key = [
    row.sourceSystem || '',
    row.month || '',
    row.account || '',
    row.currency || '',
    String(row.isbn || '').replace(/[^0-9XxA-Za-z]/g, '').toUpperCase(),
    String(row.title || '').trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' '),
  ].join('|')
  const current = grouped.get(key) || { rows: 0, net: 0 }
  current.rows += 1
  current.net += Number(row.net || 0)
  grouped.set(key, current)
}

assert.equal(reconciliation.rowCount, 297)
assert.equal(reconciliation.matched, 104)
assert.equal(reconciliation.heldTitle, 193)
assert.equal(heldRows.length, 193)
assert.equal(grouped.size, 180)

assert.match(serverSource, /function readRoyaltyDecisionCards/)
assert.match(serverSource, /HELD — JACKIE TITLE DECISION/)
assert.match(serverSource, /generatedRoyaltyReportPolicy/)
assert.match(serverSource, /Automated royalty reports are generated no later than the 10th/)
assert.match(serverSource, /manual reports may still be supplied later/i)
assert.match(serverSource, /januaryPodUsBDisposition: 'SUPERSEDED'/)

assert.match(clientSource, /Decision groups/)
assert.match(clientSource, /Affected dollars/)
assert.match(clientSource, /Matching basis/)
assert.match(clientSource, /Prior matching/)
assert.match(clientSource, /generatedReportPolicy/)

const june = monthlyClose.months.find((month) => month.month === 'June')
assert.ok(june)
assert.ok(june.sources.some((source) => source.label === 'KDP' && source.state === 'UPLOAD REQUIRED'))
assert.ok(june.sources.some((source) => source.label === 'ACX' && source.state === 'KNOWN UNAVAILABLE'))

console.log('Royalty Wave 1 decision queue contract verified.')
