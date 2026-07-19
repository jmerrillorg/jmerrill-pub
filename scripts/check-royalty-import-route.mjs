import { readFileSync } from 'node:fs'

const route = readFileSync('app/api/publisher/royalties/import/route.ts', 'utf8')

const requiredSnippets = [
  "import { strFromU8, unzipSync } from 'fflate'",
  'parseRoyaltySource(fileBuffer, file.name, sourceSystem)',
  "'ROYALTY_SOURCE_FILE_IMPORTED'",
  'IMPORTED — RECONCILED',
  'IMPORTED — EXCEPTIONS',
  'idempotencyKey',
  'dataverseFirst(config,',
  'parseTabularRows',
  'parseXlsxRows',
  'No importable source rows were found.',
]

const missing = requiredSnippets.filter((snippet) => !route.includes(snippet))

if (missing.length) {
  console.error('Royalty import route is missing required ingestion contract snippets:')
  for (const snippet of missing) console.error(`- ${snippet}`)
  process.exit(1)
}

if (/const state =[\s\S]*?RECEIVED — NOT PROCESSED[\s\S]*?const eventType[\s\S]*?ROYALTY_SOURCE_FILE_IMPORTED[\s\S]*?: 'ROYALTY_SOURCE_UPLOAD_RECEIVED'/.test(route) === false) {
  console.error('Royalty source import must keep unparsed uploads on the upload-received path.')
  process.exit(1)
}

console.log('Royalty import route ingestion contract verified.')
