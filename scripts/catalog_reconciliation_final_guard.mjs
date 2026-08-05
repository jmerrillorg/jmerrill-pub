import { existsSync, readFileSync } from 'node:fs'

const packageDir = 'docs/architecture/generated/JMP-CATALOG-RECONCILIATION-FINAL-2026-08-05'
const registerPath = `${packageDir}/01-final-120-row-catalog-register.csv`
const manifestPath = `${packageDir}/09-slice2-seed-manifest.json`
const evidencePath = `${packageDir}/evidence-index.json`

function fail(message) {
  console.error(`FAIL ${message}`)
  process.exitCode = 1
}

function parseCsv(text) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }

  const [headers, ...data] = rows
  return data
    .filter((cells) => cells.some((cell) => cell !== ''))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])))
}

for (const path of [registerPath, manifestPath, evidencePath]) {
  if (!existsSync(path)) fail(`missing required reconciliation evidence: ${path}`)
}

const register = parseCsv(readFileSync(registerPath, 'utf8'))
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'))

const counts = new Map()
for (const row of register) {
  counts.set(row['Final Jackie Ruling'], (counts.get(row['Final Jackie Ruling']) ?? 0) + 1)
}

const expectedCounts = {
  MIGRATE: 93,
  MERGE: 10,
  AMEND: 5,
  RETIRE: 6,
  PROVISIONAL: 6,
}

if (register.length !== 120) fail(`expected 120 final rows, found ${register.length}`)
for (const [ruling, expected] of Object.entries(expectedCounts)) {
  const actual = counts.get(ruling) ?? 0
  if (actual !== expected) fail(`expected ${expected} ${ruling} rows, found ${actual}`)
}

const rowIds = new Set(register.map((row) => row['Row ID']))
if (rowIds.size !== register.length) fail('duplicate Row IDs detected')

const activeCanonicalSkus = register
  .filter((row) => row['Final Commercial Status'] === 'ACTIVE')
  .map((row) => row['Canonical SKU'])
const activeSkuSet = new Set(activeCanonicalSkus)
if (activeSkuSet.size !== activeCanonicalSkus.length) fail('duplicate active canonical SKUs detected')

const unknownRulings = register.filter((row) => !Object.hasOwn(expectedCounts, row['Final Jackie Ruling']))
if (unknownRulings.length) fail(`unknown Jackie rulings detected: ${unknownRulings.map((row) => row['Legacy SKU']).join(', ')}`)

const blankRulings = register.filter((row) => !row['Final Jackie Ruling'])
if (blankRulings.length) fail('blank Jackie rulings detected')

const blankDispositions = register.filter((row) => !row['Final Commercial Status'])
if (blankDispositions.length) fail('blank final commercial statuses detected')

const pf07Public = register.filter((row) => row['PF Mapping'] === 'PF-07' && row['Public Visibility'] !== 'NON-PUBLIC')
if (pf07Public.length) fail(`PF-07 public rows detected: ${pf07Public.map((row) => row['Legacy SKU']).join(', ')}`)

const pf07Quotable = register.filter((row) => row['PF Mapping'] === 'PF-07' && row['Quoting Status'] !== 'NOT QUOTABLE')
if (pf07Quotable.length) fail(`PF-07 quotable rows detected: ${pf07Quotable.map((row) => row['Legacy SKU']).join(', ')}`)

const pf08Bad = register.filter((row) => row['PF Mapping'] === 'PF-08' && row['Public Visibility'] !== 'CONDITIONAL' && row['Final Jackie Ruling'] === 'AMEND')
if (pf08Bad.length) fail(`PF-08 active/scoping-gated rows not conditional: ${pf08Bad.map((row) => row['Legacy SKU']).join(', ')}`)

const bornAccessible = register.find((row) => row['Legacy SKU'] === 'JMP-DES-EBOOK')
if (!bornAccessible || bornAccessible['Canonical SKU'] !== 'JMP-EDT-EB-STD' || bornAccessible['PF Mapping'] !== 'PF-03') {
  fail('born-accessible EPUB is not included in PF-03 canonical mapping')
}

const mergeRowsMissingSupersession = register.filter(
  (row) =>
    row['Final Jackie Ruling'] === 'MERGE' &&
    (!row['Superseded By'] || !row['Canonical Product Name'] || !row['Matrix v1.1 Price'] || !row['Downstream Remediation']),
)
if (mergeRowsMissingSupersession.length) {
  fail(`MERGE rows missing supersession requirements: ${mergeRowsMissingSupersession.map((row) => row['Legacy SKU']).join(', ')}`)
}

if (manifest.totalRows !== 120 || manifest.dryRunCounts.errors !== 0) {
  fail('Slice 2 seed manifest failed total/error reconciliation')
}

if (evidence.boundaries.dataverseMutations !== 0 || evidence.boundaries.deployments !== 0) {
  fail('evidence boundary violation: mutation or deployment recorded in reconciliation PR')
}

if (!process.exitCode) {
  console.log('PASS catalog reconciliation final guard')
}
