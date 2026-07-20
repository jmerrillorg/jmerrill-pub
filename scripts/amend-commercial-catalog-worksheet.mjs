import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const inputPath = path.join(root, 'docs/operations/generated/2026-07-20-JMP-Catalog-Reconciliation-Worksheet.csv')
const outputCsvPath = path.join(root, 'docs/operations/generated/2026-07-20-JMP-Catalog-Reconciliation-Worksheet-Amended.csv')
const outputMdPath = path.join(root, 'docs/operations/generated/2026-07-20-JMP-Catalog-Reconciliation-Worksheet-Amended.md')
const outputJsonPath = path.join(root, 'docs/operations/generated/2026-07-20-JMP-Catalog-Reconciliation-Worksheet-Amended-Summary.json')

const sourceFiles = {
  existingWorksheet: inputPath,
  legacyFullCatalog: '/Volumes/UsersExternal/_INBOX/OneDrive_2_7-19-2026/JMP_Full_Catalog_v2_1.docx',
  legacyReferenceGuide: '/Volumes/UsersExternal/_INBOX/OneDrive_2_7-19-2026/JMP_Product_Reference_Guide_v1_1.docx',
  canonCandidate:
    '/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Architecture/00_CANON/Publishing/JMP_Products_Services_Catalog_v2.1_CANON-CANDIDATE.docx',
  matrixV11: '/Volumes/UsersExternal/_INBOX/JMP_Package_Edition_Program_Pricing_SKU_Matrix_v1.1.docx',
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
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

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const [headers, ...records] = rows.filter((item) => item.length > 1 || item[0])
  return {
    headers,
    records: records.map((fields) => Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? '']))),
  }
}

function writeCsv(headers, records) {
  const encode = (value) => {
    const text = String(value ?? '')
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  return [headers.join(','), ...records.map((record) => headers.map((header) => encode(record[header])).join(','))].join('\n') + '\n'
}

function extractSkusFromDocx(filePath) {
  try {
    const xml = execFileSync('unzip', ['-p', filePath, 'word/document.xml'], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 20,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const text = xml
      .replaceAll('<w:tab/>', '\t')
      .replace(/<[^>]+>/g, ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replace(/\s+/g, ' ')
    return {
      available: true,
      skuCount: new Set(text.match(/JMP-[A-Z0-9]+(?:-[A-Z0-9]+)*/g) ?? []).size,
      skus: [...new Set(text.match(/JMP-[A-Z0-9]+(?:-[A-Z0-9]+)*/g) ?? [])].sort(),
      error: null,
    }
  } catch (error) {
    return {
      available: false,
      skuCount: null,
      skus: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const candidateRows = [
  {
    legacy_sku: 'JMP-DIST-INGRAM-UPGRADE',
    legacy_name: 'Ingram Distribution Upgrade',
    legacy_price: 'Publisher review required',
    category: 'Distribution',
    matrix_v11_equivalent: 'JMP-DIST-ANNUAL / JMP-DIST-LSI-UPGRADE',
    'conflict (yes/no + detail)':
      'JACKIE DECISION REQUIRED - evaluate whether this is UNIQUE, OVERLAPS, or REPLACES Annual Distribution Fee ($30) and legacy LSI upgrade.',
    proposed_disposition: 'CANDIDATE-ACTIVE-PUBLISHER-REVIEW',
    jackie_ruling: '',
    notes:
      'Active candidate added by 2026-07-20 amendment. Do not activate until Jackie rules on relationship to Annual Distribution Fee and LSI/Ingram upgrade terminology.',
  },
  {
    legacy_sku: 'JMP-EDIT-COAUTHOR',
    legacy_name: 'Coauthor / Collaborative Editorial Support',
    legacy_price: 'Publisher review required',
    category: 'Editorial',
    matrix_v11_equivalent: '',
    'conflict (yes/no + detail)': 'no Matrix v1.1 equivalent identified; confirm scope and whether this is editorial service or ghostwriting relationship.',
    proposed_disposition: 'CANDIDATE-ACTIVE-PUBLISHER-REVIEW',
    jackie_ruling: '',
    notes: 'Active candidate added by 2026-07-20 amendment. Jackie ruling required before migration or public activation.',
  },
  {
    legacy_sku: 'JMP-EDIT-INDEX',
    legacy_name: 'Indexing',
    legacy_price: 'Publisher review required',
    category: 'Editorial',
    matrix_v11_equivalent: '',
    'conflict (yes/no + detail)': 'no Matrix v1.1 equivalent identified; likely unique editorial/production add-on pending price and scope.',
    proposed_disposition: 'CANDIDATE-ACTIVE-PUBLISHER-REVIEW',
    jackie_ruling: '',
    notes: 'Active candidate added by 2026-07-20 amendment. Jackie ruling required before activation.',
  },
  {
    legacy_sku: 'JMP-LEGAL-LCCN',
    legacy_name: 'Library of Congress Control Number / LCCN Handling',
    legacy_price: 'Publisher review required',
    category: 'Legal / Metadata',
    matrix_v11_equivalent: '',
    'conflict (yes/no + detail)':
      'JACKIE DECISION REQUIRED - model both options: publisher obligation vs author-purchased hybrid service. Do not decide in worksheet.',
    proposed_disposition: 'CANDIDATE-ACTIVE-PUBLISHER-REVIEW',
    jackie_ruling: '',
    notes:
      'Active candidate added by 2026-07-20 amendment. Keep as decision row until obligation/service boundary is approved.',
  },
  {
    legacy_sku: 'JMP-PROG-PARTNER-BASE',
    legacy_name: 'Partner Program - Base',
    legacy_price: 'Publisher review required',
    category: 'Program',
    matrix_v11_equivalent: 'JMP-PARTNER-PARTNER',
    'conflict (yes/no + detail)': 'possible overlap with legacy Publishing Partner annual program; confirm naming, terms, and commercial posture.',
    proposed_disposition: 'CANDIDATE-ACTIVE-PUBLISHER-REVIEW',
    jackie_ruling: '',
    notes: 'Active candidate added by 2026-07-20 amendment. Do not activate until Jackie resolves program naming and scope.',
  },
  {
    legacy_sku: 'JMP-PROG-PARTNER-PREMIER',
    legacy_name: 'Partner Program - Premier',
    legacy_price: 'Publisher review required',
    category: 'Program',
    matrix_v11_equivalent: 'JMP-PKG-PREMIER / JMP-PARTNER-SIGNATURE / JM Signature Partner',
    'conflict (yes/no + detail)':
      'JACKIE DECISION REQUIRED - naming collision among Premier Package, Partner Premier, and JM Signature Partner.',
    proposed_disposition: 'CANDIDATE-ACTIVE-PUBLISHER-REVIEW',
    jackie_ruling: '',
    notes:
      'Recommended naming strategy: reserve Premier for package tier, reserve Partner for annual/relationship program, reserve JM Signature for funding/relationship track. Do not rename until Jackie rules.',
  },
  {
    legacy_sku: 'JMP-PROG-LOYALTY',
    legacy_name: 'Loyalty / Returning Author Program',
    legacy_price: 'Publisher review required',
    category: 'Program',
    matrix_v11_equivalent: '',
    'conflict (yes/no + detail)': 'no Matrix v1.1 equivalent identified; confirm whether this is discount policy, membership, or author relationship program.',
    proposed_disposition: 'CANDIDATE-ACTIVE-PUBLISHER-REVIEW',
    jackie_ruling: '',
    notes: 'Active candidate added by 2026-07-20 amendment. Requires Jackie ruling before operational use.',
  },
  {
    legacy_sku: 'JMP-DES-INTERACTIVE',
    legacy_name: 'Interactive Design Capability',
    legacy_price: 'Internal only',
    category: 'Design / Interactive',
    matrix_v11_equivalent: 'JMP-INT-EPUB3-STD',
    'conflict (yes/no + detail)':
      'PROVISIONAL - evaluate separate SKU vs subordinate capability of JMP-INT-EPUB3-STD. Not public and not activated.',
    proposed_disposition: 'PROVISIONAL-INTERNAL-EVALUATION',
    jackie_ruling: '',
    notes: 'Provisional candidate added by 2026-07-20 amendment. Internal/non-public/not activated.',
  },
  {
    legacy_sku: 'JMP-ACCESS-DYSLEXIA',
    legacy_name: 'Dyslexia-Friendly Accessibility Capability',
    legacy_price: 'Internal only',
    category: 'Accessibility',
    matrix_v11_equivalent: 'JMP-ACC-EPUB-ENH',
    'conflict (yes/no + detail)':
      'PROVISIONAL - evaluate separate SKU vs sub-capability of JMP-ACC-EPUB-ENH. Not public and not activated.',
    proposed_disposition: 'PROVISIONAL-INTERNAL-EVALUATION',
    jackie_ruling: '',
    notes: 'Provisional candidate added by 2026-07-20 amendment. Internal/non-public/not activated.',
  },
  ...[
    ['JMP-AI-SERIES', 'AI Series Planning Capability', 'AI / Planning'],
    ['JMP-AUTH-PATRON', 'Author Patron / Supporter Program Capability', 'Author Program'],
    ['JMP-EDU-PODCAST', 'Educational Podcast Capability', 'Education / Media'],
    ['JMP-INTEL-AGENT', 'Author Intelligence Agent Capability', 'Intelligence'],
    ['JMP-INTEL-DASHBOARD', 'Author Intelligence Dashboard Capability', 'Intelligence'],
    ['JMP-INTEL-PREDICT', 'Predictive Author Intelligence Capability', 'Intelligence'],
    ['JMP-MKT-TIKTOK', 'TikTok Marketing Capability', 'Marketing'],
  ].map(([sku, name, category]) => ({
    legacy_sku: sku,
    legacy_name: name,
    legacy_price: 'Internal only',
    category,
    matrix_v11_equivalent: '',
    'conflict (yes/no + detail)': 'PROVISIONAL - internal evaluation only. Not public and not activated.',
    proposed_disposition: 'PROVISIONAL-INTERNAL-EVALUATION',
    jackie_ruling: '',
    notes: 'Provisional candidate added by 2026-07-20 amendment. Internal/non-public/not activated.',
  })),
]

const { headers, records } = parseCsv(fs.readFileSync(inputPath, 'utf8'))
const initialCount = records.length
const bySku = new Map(records.map((record) => [record.legacy_sku, record]))
let newRowsAdded = 0

for (const candidate of candidateRows) {
  if (!bySku.has(candidate.legacy_sku)) {
    records.push(candidate)
    bySku.set(candidate.legacy_sku, candidate)
    newRowsAdded += 1
  }
}

const amendedRows = new Set()
function amendNote(sku, addition) {
  const row = bySku.get(sku)
  if (!row) return
  if (!row.notes.includes(addition)) {
    row.notes = `${row.notes} Amendment note: ${addition}`
    amendedRows.add(sku)
  }
}

amendNote('JMP-DIST-ANNUAL', 'Evaluate relationship to JMP-DIST-INGRAM-UPGRADE before any activation or pricing change.')
amendNote('JMP-DIST-LSI-UPGRADE', 'Evaluate relationship to JMP-DIST-INGRAM-UPGRADE and Ingram/LSI naming before any consolidation.')
amendNote('JMP-PKG-SIGNATURE', 'Naming collision review now includes Premier Package, Partner Premier, and JM Signature Partner.')
amendNote('JMP-PARTNER-PARTNER', 'Program naming review now includes Partner Base and Partner Premier candidates.')
amendNote('JMP-PARTNER-SIGNATURE', 'Program naming review now includes Partner Premier and JM Signature Partner collision.')

const sourceEvidence = {
  fullCatalog: extractSkusFromDocx(sourceFiles.legacyFullCatalog),
  referenceGuide: extractSkusFromDocx(sourceFiles.legacyReferenceGuide),
  matrixV11: extractSkusFromDocx(sourceFiles.matrixV11),
  canonCandidate: extractSkusFromDocx(sourceFiles.canonCandidate),
}

const uniqueSkus = [...new Set(records.map((record) => record.legacy_sku))].sort()
const duplicateRowsRemoved = initialCount + newRowsAdded - uniqueSkus.length
const activeCandidates = candidateRows.filter((row) => row.proposed_disposition === 'CANDIDATE-ACTIVE-PUBLISHER-REVIEW').length
const provisionalCandidates = candidateRows.filter((row) => row.proposed_disposition === 'PROVISIONAL-INTERNAL-EVALUATION').length
const summary = {
  generatedAt: new Date().toISOString(),
  sourceFiles,
  existingWorksheetRows: initialCount,
  legacySourceRowsReviewed: sourceEvidence.fullCatalog.skuCount,
  legacyCanonCandidateLocallyReadable: sourceEvidence.canonCandidate.available,
  legacyCanonCandidateReadError: sourceEvidence.canonCandidate.error,
  matrixV11GoverningSkuCount: sourceEvidence.matrixV11.skuCount,
  uniqueSkus: uniqueSkus.length,
  duplicateRowsRemoved,
  newRowsAdded,
  existingRowsAmended: amendedRows.size,
  additionalUniqueServicesDiscovered: newRowsAdded,
  activeCandidates,
  provisionalCandidates,
  finalRowCount: records.length,
  jackieRulingBlankCount: records.filter((record) => record.jackie_ruling === '').length,
  sourceEvidence,
}

records.sort((left, right) => left.legacy_sku.localeCompare(right.legacy_sku))
fs.writeFileSync(outputCsvPath, writeCsv(headers, records))
fs.writeFileSync(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`)

const md = `# JMP Catalog Reconciliation Worksheet Amendment

Generated: ${summary.generatedAt}

## Boundary

Matrix v1.1 is treated as the governing commercial-rule structure for the activated public projection. It is not treated as the complete legacy 112-SKU catalog.

No Jackie ruling was filled in. No migration, retirement, repricing, renaming, consolidation, Dataverse activation, Business Central activation, contract activation, or financial posting was performed.

## Counts

| Measure | Count |
|---|---:|
| Existing worksheet rows | ${summary.existingWorksheetRows} |
| Legacy source rows reviewed | ${summary.legacySourceRowsReviewed} |
| Matrix v1.1 governing SKU count | ${summary.matrixV11GoverningSkuCount} |
| Unique SKUs after amendment | ${summary.uniqueSkus} |
| Duplicate rows removed | ${summary.duplicateRowsRemoved} |
| New rows added | ${summary.newRowsAdded} |
| Existing rows amended | ${summary.existingRowsAmended} |
| Additional unique services discovered | ${summary.additionalUniqueServicesDiscovered} |
| Final row count | ${summary.finalRowCount} |

## Explicit Candidate Records Added

### Active Candidates

- JMP-DIST-INGRAM-UPGRADE
- JMP-EDIT-COAUTHOR
- JMP-EDIT-INDEX
- JMP-LEGAL-LCCN
- JMP-PROG-PARTNER-BASE
- JMP-PROG-PARTNER-PREMIER
- JMP-PROG-LOYALTY

### Provisional Candidates

- JMP-DES-INTERACTIVE
- JMP-ACCESS-DYSLEXIA
- JMP-AI-SERIES
- JMP-AUTH-PATRON
- JMP-EDU-PODCAST
- JMP-INTEL-AGENT
- JMP-INTEL-DASHBOARD
- JMP-INTEL-PREDICT
- JMP-MKT-TIKTOK

## Required Evaluations Preserved

- JMP-DIST-INGRAM-UPGRADE: Jackie decision required to classify as UNIQUE, OVERLAPS, REPLACES, or DECISION REQUIRED against Annual Distribution Fee and legacy LSI upgrade evidence.
- JMP-LEGAL-LCCN: both publisher-obligation and author-purchased hybrid-service options are preserved; no decision was made.
- JMP-PROG-PARTNER-PREMIER: naming collision preserved across Premier Package, Partner Premier, and JM Signature Partner. Recommended strategy is to reserve Premier for package tier, Partner for annual/relationship program, and JM Signature for funding/relationship track.
- JMP-DES-INTERACTIVE: provisional evaluation preserved as separate SKU vs subordinate capability of JMP-INT-EPUB3-STD.
- JMP-ACCESS-DYSLEXIA: provisional evaluation preserved as separate SKU vs sub-capability of JMP-ACC-EPUB-ENH.

## Source Notes

- Full legacy catalog DOCX was locally readable and yielded ${summary.legacySourceRowsReviewed} unique SKU codes.
- Matrix v1.1 DOCX was locally readable and yielded ${summary.matrixV11GoverningSkuCount} governing SKU codes.
- The canon-candidate OneDrive DOCX path was present but not locally materialized as a readable DOCX zip during this run, so the amendment uses the prior 104-row worksheet as the established parsed canon-candidate/legacy reconciliation surface rather than inventing an unreadable source count.
`

fs.writeFileSync(outputMdPath, md)
console.log(JSON.stringify(summary, null, 2))
