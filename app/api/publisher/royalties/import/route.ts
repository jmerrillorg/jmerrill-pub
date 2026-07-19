import { createHash } from 'crypto'
import { strFromU8, unzipSync } from 'fflate'
import { NextResponse } from 'next/server'

import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'
import { dataverseCreate, dataverseFirst, getDataverseServerConfig } from '@/lib/server/dataverse-server'

export const runtime = 'nodejs'

const ALLOWED_SOURCES = new Set(['INGRAM', 'KDP', 'ACX', 'DIRECT_SALES'])
const FINAL_IMPORT_STATES = new Set([
  'IMPORTED — RECONCILED',
  'IMPORTED — EXCEPTIONS',
  'NO ACTIVITY CONFIRMED',
])

export async function POST(req: Request) {
  const session = await getPublisherOperatingCenterSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Publisher session not found.' }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const sourceSystem = clean(form?.get('sourceSystem')).toUpperCase()
  const reportingMonth = clean(form?.get('reportingMonth'))
  const noActivity = clean(form?.get('noActivity')) === 'true'
  const file = form?.get('file')

  if (!ALLOWED_SOURCES.has(sourceSystem)) {
    return NextResponse.json({ error: 'Unsupported royalty source.' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}$/.test(reportingMonth)) {
    return NextResponse.json({ error: 'Reporting month must use YYYY-MM.' }, { status: 400 })
  }
  if (!noActivity && !(file instanceof File)) {
    return NextResponse.json({ error: 'A source report file is required.' }, { status: 400 })
  }

  const fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : null
  const fileEvidence =
    file instanceof File && fileBuffer
      ? {
          fileName: file.name,
          size: file.size,
          sha256: createHash('sha256').update(fileBuffer).digest('hex'),
        }
      : null
  const parsed = fileBuffer && file instanceof File ? parseRoyaltySource(fileBuffer, file.name, sourceSystem) : null
  const state = noActivity
    ? 'NO ACTIVITY CONFIRMED'
    : parsed?.rows.length
      ? parsed.exceptions.length
        ? 'IMPORTED — EXCEPTIONS'
        : 'IMPORTED — RECONCILED'
      : 'RECEIVED — NOT PROCESSED'
  const idempotencyKey = `${sourceSystem}:${reportingMonth}:${fileEvidence?.sha256 || 'no-activity'}`
  const eventType = noActivity
    ? 'ROYALTY_SOURCE_NO_ACTIVITY_CONFIRMED'
    : FINAL_IMPORT_STATES.has(state)
      ? 'ROYALTY_SOURCE_FILE_IMPORTED'
      : 'ROYALTY_SOURCE_UPLOAD_RECEIVED'
  const description = [
    `${sourceSystem} royalty source ${state.toLowerCase()} for ${reportingMonth}.`,
    fileEvidence ? `File ${fileEvidence.fileName}; sha256:${fileEvidence.sha256}; size:${fileEvidence.size}.` : '',
    parsed
      ? `Parsed ${parsed.rows.length} source row(s); units:${parsed.totals.units}; royalty:${parsed.totals.royalty.toFixed(
          2,
        )}; net:${parsed.totals.net.toFixed(2)}.`
      : '',
    parsed?.exceptions.length ? `Exceptions: ${parsed.exceptions.join('; ')}.` : '',
    'Rows are not author-visible until imported, reconciled, and approved through the royalty close path.',
  ]
    .filter(Boolean)
    .join(' ')

  const config = getDataverseServerConfig()
  let executionLogId: string | null = null
  let idempotent = false
  if (config) {
    const existing = await dataverseFirst(config, 'jm1_executionlogs', {
      $select: 'jm1_executionlogid,jm1_actiontype,jm1_sourcerecordid',
      $filter: `jm1_sourcerecordid eq '${escapeODataLiteral(idempotencyKey)}'`,
      $top: '1',
    }).catch(() => null)
    if (existing?.jm1_executionlogid) {
      idempotent = true
      executionLogId = String(existing.jm1_executionlogid)
    } else {
      const created = await dataverseCreate(config, 'jm1_executionlogs', {
        jm1_name: `${eventType} - ${sourceSystem} ${reportingMonth}`,
        jm1_actiontype: eventType,
        jm1_actiondescription: description,
        jm1_agentname: 'Publisher Operating Center',
        jm1_agentmodel: 'Governed API',
        jm1_bandlevel: 835500000,
        jm1_executionstatus: 835500001,
        jm1_startedon: new Date().toISOString(),
        jm1_completedon: new Date().toISOString(),
        jm1_sourceentity: 'royalty_source_upload',
        jm1_sourcerecordid: idempotencyKey,
      })
      executionLogId = parseDataverseId(created)
    }
  }

  return NextResponse.json(
    {
      ok: true,
      sourceSystem,
      reportingMonth,
      state,
      file: fileEvidence,
      parsed: parsed
        ? {
            rows: parsed.rows.length,
            totals: parsed.totals,
            exceptions: parsed.exceptions,
          }
        : null,
      idempotent,
      executionLogId,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

function clean(value: FormDataEntryValue | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseDataverseId(entityUrl: string) {
  const match = entityUrl.match(/\(([^)]+)\)/)
  return match?.[1] || null
}

type ParsedRoyaltyRow = {
  rowNumber: number
  identifier: string
  title: string
  format: string
  units: number
  net: number
  royalty: number
  currency: string
  marketplace: string
}

function parseRoyaltySource(buffer: Buffer, fileName: string, sourceSystem: string) {
  const rows = parseTabularRows(buffer, fileName)
  const headerIndex = rows.findIndex(
    (row) =>
      row.some((cell) => /title|asin|isbn|product.*id/i.test(cell)) &&
      row.some((cell) => /royalt|earning|units|quantity|total/i.test(cell)),
  )
  const header = headerIndex >= 0 ? rows[headerIndex].map(normalizeHeader) : []
  const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : []
  const parsedRows: ParsedRoyaltyRow[] = []
  const exceptions: string[] = []

  dataRows.forEach((row, index) => {
    if (!row.some(Boolean)) return
    const value = (patterns: RegExp[]) => getCell(row, header, patterns)
    const identifier = value([/isbn/, /asin/, /acx.*id/, /product.*id/, /royalty earner/, /identifier/])
    const title = value([/title/, /book/])
    const units = parseNumber(value([/units/, /quantity/, /net.*sold/]))
    const net = parseNumber(value([/net.*publisher/, /net.*sales/, /publisher.*comp/, /earnings/, /royalty/]))
    const royalty = parseNumber(value([/royalty/, /earnings/]))

    if (!identifier && !title) return

    parsedRows.push({
      rowNumber: headerIndex + index + 2,
      identifier,
      title,
      format: value([/format/, /type/]) || inferFormat(sourceSystem, fileName),
      units,
      net,
      royalty: royalty || net,
      currency: value([/currency/]) || inferCurrency(fileName),
      marketplace: value([/marketplace/, /territory/, /store/]) || sourceSystem,
    })
  })

  if (headerIndex < 0) exceptions.push('Header row was not recognized.')
  if (!parsedRows.length) exceptions.push('No importable source rows were found.')
  if (parsedRows.some((row) => !row.identifier)) exceptions.push('One or more rows lack ISBN/ASIN/ACX identifier.')
  if (parsedRows.some((row) => !row.title)) exceptions.push('One or more rows lack title text.')

  return {
    rows: parsedRows,
    totals: {
      units: parsedRows.reduce((sum, row) => sum + row.units, 0),
      net: roundMoney(parsedRows.reduce((sum, row) => sum + row.net, 0)),
      royalty: roundMoney(parsedRows.reduce((sum, row) => sum + row.royalty, 0)),
    },
    exceptions: [...new Set(exceptions)],
  }
}

function parseTabularRows(buffer: Buffer, fileName: string) {
  if (/\.xlsx?$/i.test(fileName)) {
    return parseXlsxRows(buffer)
  }

  const text = buffer.toString('utf8')
  const delimiter = text.includes('\t') ? '\t' : ','
  return text
    .split(/\r?\n/)
    .map((line) => line.split(delimiter).map((cell) => cell.replace(/^"|"$/g, '').trim()))
    .filter((row) => row.some(Boolean))
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function getCell(row: string[], header: string[], patterns: RegExp[]) {
  const index = header.findIndex((name) => patterns.some((pattern) => pattern.test(name)))
  return index >= 0 ? row[index]?.trim() || '' : ''
}

function parseNumber(value: string) {
  const cleaned = value.replace(/[$,]/g, '').replace(/^\((.*)\)$/, '-$1').trim()
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function inferCurrency(fileName: string) {
  if (/gbp|uk/i.test(fileName)) return 'GBP'
  if (/cad|canada/i.test(fileName)) return 'CAD'
  return 'USD'
}

function inferFormat(sourceSystem: string, fileName: string) {
  if (sourceSystem === 'ACX') return 'Audiobook'
  if (/ebook|kindle|kdp/i.test(fileName)) return 'Ebook'
  if (/pod|print/i.test(fileName)) return 'Print'
  return ''
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function escapeODataLiteral(value: string) {
  return value.replace(/'/g, "''")
}

function parseXlsxRows(buffer: Buffer) {
  const archive = unzipSync(new Uint8Array(buffer))
  const sharedStrings = parseSharedStrings(archive['xl/sharedStrings.xml'])
  const worksheetNames = Object.keys(archive)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  return worksheetNames.flatMap((name) => parseWorksheetRows(strFromU8(archive[name]), sharedStrings))
}

function parseSharedStrings(file?: Uint8Array) {
  if (!file) return []
  const xml = strFromU8(file)
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1])).join(''),
  )
}

function parseWorksheetRows(xml: string, sharedStrings: string[]) {
  const rows: string[][] = []
  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = []
    for (const cellMatch of rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1]
      const body = cellMatch[2]
      const ref = attrs.match(/\sr="([A-Z]+)\d+"/)?.[1] || ''
      const index = ref ? columnIndex(ref) : row.length
      const type = attrs.match(/\st="([^"]+)"/)?.[1] || ''
      const rawValue = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] || body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || ''
      row[index] = type === 's' ? sharedStrings[Number(rawValue)] || '' : decodeXml(rawValue)
    }
    rows.push(row.map((cell) => String(cell || '').trim()))
  }
  return rows
}

function columnIndex(column: string) {
  return [...column].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1
}

function decodeXml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
