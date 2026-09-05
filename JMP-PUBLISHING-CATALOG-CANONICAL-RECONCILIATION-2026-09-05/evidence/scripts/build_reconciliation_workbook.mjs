import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool'

const packageRoot = path.resolve(import.meta.dirname, '../..')
const data = JSON.parse(await fs.readFile(path.join(packageRoot, 'evidence/reconciliation/catalog-reconciliation.json'), 'utf8'))
const validation = JSON.parse(await fs.readFile(path.join(packageRoot, 'evidence/dataverse/catalog-promotion-validation.json'), 'utf8'))
const replay = JSON.parse(await fs.readFile(path.join(packageRoot, 'evidence/dataverse/catalog-promotion-dry-run.json'), 'utf8'))
const authoritySearch = JSON.parse(await fs.readFile(path.join(packageRoot, 'evidence/source/authority-change-search.json'), 'utf8'))
const outputDir = path.resolve(packageRoot, '../outputs/catalog-canonical-reconciliation-20260905')
const outputPath = path.join(outputDir, 'JMP-Publishing-Catalog-Reconciliation-2026-09-05.xlsx')

const workbook = Workbook.create()
const colors = {
  ink: '#1F2937',
  navy: '#18324A',
  green: '#2F6B4F',
  paleGreen: '#E8F3EC',
  paleBlue: '#EAF1F7',
  paleGold: '#F6EFD9',
  border: '#D4DCE3',
  muted: '#5D6874',
  white: '#FFFFFF',
}

function textValue(value, key = '') {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(' | ')
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value
  if (/date$/i.test(key) && /^\d{4}-\d{2}-\d{2}/.test(String(value))) return new Date(`${String(value).slice(0, 10)}T00:00:00Z`)
  return String(value)
}

function styleTitle(sheet, title, subtitle, width) {
  sheet.showGridLines = false
  sheet.getRangeByIndexes(0, 0, 1, width).format.borders = { bottom: { style: 'medium', color: colors.navy } }
  sheet.getCell(0, 0).values = [[title]]
  sheet.getCell(0, 0).format.font = { name: 'Arial', size: 16, bold: true, color: colors.ink }
  sheet.getCell(1, 0).values = [[subtitle]]
  sheet.getRangeByIndexes(1, 0, 1, width).format.font = { name: 'Arial', size: 10, italic: true, color: colors.muted }
}

function addDataSheet(name, title, subtitle, rows, columns = null) {
  const sheet = workbook.worksheets.add(name)
  const headers = columns || Object.keys(rows[0] || {})
  styleTitle(sheet, title, subtitle, Math.max(headers.length, 1))
  const matrix = [headers, ...rows.map((row) => headers.map((key) => textValue(row[key], key)))]
  sheet.getRangeByIndexes(3, 0, matrix.length, headers.length).values = matrix
  const header = sheet.getRangeByIndexes(3, 0, 1, headers.length)
  header.format.fill = colors.navy
  header.format.font = { name: 'Arial', size: 10, bold: true, color: colors.white }
  header.format.horizontalAlignment = 'center'
  header.format.verticalAlignment = 'center'
  header.format.wrapText = true
  const body = sheet.getRangeByIndexes(4, 0, Math.max(rows.length, 1), headers.length)
  body.format.font = { name: 'Arial', size: 9, color: colors.ink }
  body.format.verticalAlignment = 'top'
  body.format.wrapText = true
  body.format.borders = { insideHorizontal: { style: 'thin', color: colors.border } }
  for (let i = 0; i < headers.length; i += 1) {
    const key = headers[i]
    const column = sheet.getRangeByIndexes(3, i, matrix.length, 1)
    column.format.columnWidth = /id|key|checksum/i.test(key) ? 24 : /title|author|relationship|state|interpretation|raw/i.test(key) ? 22 : 14
    if (/date$/i.test(key)) column.setNumberFormat('yyyy-mm-dd')
    if (/count|rows|score|number/i.test(key) && !/id/i.test(key)) column.setNumberFormat('#,##0')
  }
  sheet.getRangeByIndexes(3, 0, matrix.length, headers.length).format.autofitRows()
  header.format.rowHeight = 34
  sheet.freezePanes.freezeRows(4)
  sheet.freezePanes.freezeColumns(1)
  return sheet
}

const summary = workbook.worksheets.add('Executive Summary')
styleTitle(summary, 'JMP Publishing catalog reconciliation', 'Canonical source and Core Dataverse commissioning | 2026-09-05', 7)
summary.getRange('A4:B4').values = [['Population', 'Count']]
summary.getRange('A5:B10').values = [
  ['Source rows', data.proof.counts.SOURCE_ROWS],
  ['Reserved ISBNs', data.proof.counts.RESERVED_ISBNS],
  ['Canonical authors', data.proof.counts.CANONICAL_AUTHORS],
  ['Canonical works', data.proof.counts.CANONICAL_WORKS],
  ['Editions', data.proof.counts.EDITIONS],
  ['Format products', data.proof.counts.FORMAT_PRODUCTS],
]
summary.getRange('D4:E4').values = [['Authority state', 'Works']]
summary.getRange('D5:E10').values = [
  ['Publisher origin confirmed', data.proof.counts.PUBLISHER_ORIGIN_CONFIRMED],
  ['Authority changes found', data.proof.counts.AUTHORITY_CHANGES_FOUND],
  ['Active', data.proof.counts.ACTIVE_WORKS],
  ['Retired', data.proof.counts.RETIRED_WORKS],
  ['Unresolved', data.proof.counts.UNRESOLVED_WORKS],
  ['Marketing eligible', data.proof.counts.MARKETING_ELIGIBLE],
]
summary.getRange('A13:G13').values = [['Commissioning result', 'Value', '', '', '', '', '']]
summary.getRange('A14:B20').values = [
  ['Reconciliation classification', data.proof.classification],
  ['Operational classification', 'JMP CATALOG AUTHORITY - OPERATIONALLY RESTORED'],
  ['Production validation', validation.status],
  ['Initial production writes', 692],
  ['Deletes', replay.counts.deletes],
  ['Replay no-ops', replay.counts.noOps],
  ['Founder decisions required', 'Canon Candidate approval only'],
]
summary.getRange('A23:G23').values = [['Important findings', '', '', '', '', '', '']]
summary.getRange('A24:G28').values = [
  ['Shelley McIntosh', '3 canonical works; 8 format products', '', '', '', '', ''],
  ['The Shift', 'Sean A Crowley I | 2026-08-18 | NEW_RECENTLY_RELEASED', '', '', '', '', ''],
  ['Strategies for Success', 'Sean A Crowley I | 2026-09-22 | ACTIVE_LAUNCH_LIFECYCLE', '', '', '', '', ''],
  ['Authority search', authoritySearch.determination, '', '', '', '', ''],
  ['Search limitation', 'Microsoft Graph token lacked Files/Sites read scope; governed local evidence was retained.', '', '', '', '', ''],
]
for (const range of ['A4:B4', 'D4:E4', 'A13:G13', 'A23:G23']) {
  summary.getRange(range).format.fill = colors.navy
  summary.getRange(range).format.font = { name: 'Arial', size: 10, bold: true, color: colors.white }
}
summary.getRange('A5:B10').format.fill = colors.paleBlue
summary.getRange('D5:E10').format.fill = colors.paleGreen
summary.getRange('A14:B20').format.borders = { insideHorizontal: { style: 'thin', color: colors.border } }
summary.getRange('A24:G28').format.borders = { insideHorizontal: { style: 'thin', color: colors.border } }
summary.getRange('A1:G28').format.font = { name: 'Arial', size: 10, color: colors.ink }
summary.getCell(0, 0).format.font = { name: 'Arial', size: 16, bold: true, color: colors.ink }
summary.getCell(1, 0).format.font = { name: 'Arial', size: 10, italic: true, color: colors.muted }
summary.getRange('A1:A28').format.columnWidth = 30
summary.getRange('B1:B28').format.columnWidth = 58
summary.getRange('C1:C28').format.columnWidth = 3
summary.getRange('D1:D28').format.columnWidth = 29
summary.getRange('E1:E28').format.columnWidth = 14
summary.getRange('F1:G28').format.columnWidth = 3
summary.getRange('A1:G28').format.wrapText = true
summary.getRange('A1:G28').format.autofitRows()

addDataSheet('Authors', 'Canonical authors', 'Publisher-owned identities after alias reconciliation', data.authors)
addDataSheet('Works', 'Canonical works', 'Explicit current catalog and Marketing authority by work', data.works)
addDataSheet('Editions', 'Editions and releases', 'Edition families remain distinct from format products', data.editions)
addDataSheet('Products', 'Format products', 'Identifiers, product distribution, legacy evidence, and edition bindings', data.products)
addDataSheet('Reserved ISBNs', 'Reserved ISBN inventory', 'Unassigned allocations excluded from works and commercial eligibility', data.reserved)
addDataSheet('Title Variants', 'Normalized title variants', 'Display normalization that did not create duplicate works', data.normalizedDuplicates)
addDataSheet('Author Merges', 'Author identity merges', 'Historical labels resolved to stable Publisher author identities', data.authorMerges)
addDataSheet('Marketing Contract', 'Publishing to Marketing authority contract', 'Marketing consumes these explicit Publishing fields', data.marketingContract)

const evidenceFiles = []
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) await walk(full)
    else if (!entry.name.endsWith('.xlsx')) {
      const bytes = await fs.readFile(full)
      evidenceFiles.push({
        evidenceFile: path.relative(packageRoot, full),
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length,
      })
    }
  }
}
await walk(packageRoot)
addDataSheet('Evidence Index', 'Evidence index', 'Package-relative evidence files and SHA-256 checksums', evidenceFiles.sort((a, b) => a.evidenceFile.localeCompare(b.evidenceFile)))

await fs.mkdir(outputDir, { recursive: true })
const file = await SpreadsheetFile.exportXlsx(workbook)
await file.save(outputPath)

const summaryCheck = await workbook.inspect({
  kind: 'table',
  range: 'Executive Summary!A1:G28',
  include: 'values,formulas',
  tableMaxRows: 30,
  tableMaxCols: 8,
})
const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 },
  summary: 'final formula error scan',
})
console.log(summaryCheck.ndjson)
console.log(errors.ndjson)

const previewRanges = {
  'Executive Summary': 'A1:G28',
  Authors: 'A1:H24',
  Works: 'A1:S24',
  Editions: 'A1:H24',
  Products: 'A1:Y20',
  'Reserved ISBNs': 'A1:I24',
  'Title Variants': 'A1:D28',
  'Author Merges': 'A1:D12',
  'Marketing Contract': 'A1:Q20',
  'Evidence Index': 'A1:C38',
}
for (const [sheetName, range] of Object.entries(previewRanges)) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: 'png' })
  const previewBytes = new Uint8Array(await preview.arrayBuffer())
  await fs.writeFile(path.join(outputDir, `preview-${sheetName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`), previewBytes)
}

console.log(JSON.stringify({ outputPath, sheets: 10, evidenceFiles: evidenceFiles.length }, null, 2))
