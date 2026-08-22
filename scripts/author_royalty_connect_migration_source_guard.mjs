import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const EXACT_AUTHOR_SUFFIX = ', Author'

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      field += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(field)
      if (row.some((value) => value !== '')) rows.push(row)
      row = []
      field = ''
      continue
    }

    field += char
  }

  row.push(field)
  if (row.some((value) => value !== '')) rows.push(row)
  return rows
}

export function recordsFromCsv(text) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''))
  if (rows.length === 0) return []

  const headers = rows[0].map((header) => header.trim())
  return rows.slice(1).map((row) => {
    const record = {}
    headers.forEach((header, index) => {
      record[header] = row[index] ?? ''
    })
    return record
  })
}

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function analyzeBillComAuthorPopulation(csvText) {
  const records = recordsFromCsv(csvText)
  const exactAuthors = records.filter((record) => String(record['Vendor Name'] || '').endsWith(EXACT_AUTHOR_SUFFIX))
  const containsAuthor = records.filter((record) => String(record['Vendor Name'] || '').includes(EXACT_AUTHOR_SUFFIX))
  const excludedContains = containsAuthor.filter((record) => !String(record['Vendor Name'] || '').endsWith(EXACT_AUTHOR_SUFFIX))

  const emailCounts = new Map()
  for (const record of exactAuthors) {
    const email = normalizeEmail(record['Primary Email'])
    if (!email) continue
    emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
  }

  const duplicateEmailGroups = Array.from(emailCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([email, count]) => ({ emailHash: hashValue(email), count }))

  return {
    totalRows: records.length,
    exactAuthorSuffix: EXACT_AUTHOR_SUFFIX,
    exactAuthorRows: exactAuthors.length,
    containsAuthorRows: containsAuthor.length,
    excludedContainsAuthorRows: excludedContains.length,
    excludedContainsAuthorNames: excludedContains.map((record) => record['Vendor Name']),
    missingPrimaryEmailRows: exactAuthors.filter((record) => !normalizeEmail(record['Primary Email'])).length,
    uniquePrimaryEmails: emailCounts.size,
    duplicatePrimaryEmailGroups: duplicateEmailGroups.length,
    duplicatePrimaryEmailGroupHashes: duplicateEmailGroups,
    sensitiveColumnsPresent: [
      'Tax ID',
      'Account Number',
      'Vendor Bank Country',
      'Vendor Bank Account Status',
      'Payment Network ID',
      'W9 Status',
    ].filter((column) => Object.prototype.hasOwnProperty.call(records[0] || {}, column)),
  }
}

export function safeSourceSummary(filePath, csvText) {
  return {
    sourceFileName: basename(filePath),
    sourceSha256: createHash('sha256').update(csvText).digest('hex'),
    ...analyzeBillComAuthorPopulation(csvText),
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sourceFile = process.argv[2]
  if (!sourceFile) {
    console.error('Usage: node scripts/author_royalty_connect_migration_source_guard.mjs <billcom-vendor-export.csv>')
    process.exit(2)
  }

  const csvText = readFileSync(sourceFile, 'utf8')
  const summary = safeSourceSummary(sourceFile, csvText)
  console.log(JSON.stringify(summary, null, 2))

  if (summary.exactAuthorRows !== 70) {
    console.error(`Expected 70 exact ", Author" rows; found ${summary.exactAuthorRows}.`)
    process.exit(1)
  }
}
