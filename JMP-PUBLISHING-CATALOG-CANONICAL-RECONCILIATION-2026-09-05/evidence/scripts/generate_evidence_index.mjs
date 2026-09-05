import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const packageRoot = path.resolve(import.meta.dirname, '../..')
const workbookPath = path.resolve(packageRoot, '../outputs/catalog-canonical-reconciliation-20260905/JMP-Publishing-Catalog-Reconciliation-2026-09-05.xlsx')
const outputPath = path.join(packageRoot, 'EVIDENCE-INDEX.md')

const files = []
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) await walk(full)
    else if (full !== outputPath) files.push(full)
  }
}

await walk(packageRoot)
files.push(workbookPath)

const rows = []
for (const file of files.sort()) {
  const bytes = await fs.readFile(file)
  rows.push({
    file: file === workbookPath ? `Workbook: ${path.basename(file)}` : path.relative(packageRoot, file),
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  })
}

const lines = [
  '# Evidence Index',
  '',
  'Package: JMP Publishing Catalog Canonical Reconciliation 2026-09-05  ',
  'Correlation ID: `JMP-CATALOG-CANONICAL-20260905`',
  '',
  '| Evidence file | Bytes | SHA-256 |',
  '|---|---:|---|',
  ...rows.map((row) => `| ${row.file.replaceAll('|', '\\|')} | ${row.bytes} | \`${row.sha256}\` |`),
  '',
  'The workbook is delivered from the repository output directory and is listed here by checksum. Preview images and inspect sidecars are verification aids and are not final deliverables.',
  '',
]

await fs.writeFile(outputPath, lines.join('\n'), 'utf8')
console.log(JSON.stringify({ outputPath, entries: rows.length }, null, 2))
