import { createHash } from 'node:crypto'
import { parse } from 'csv-parse/sync'

export const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
export type SalesRow = {
  sourceRow: number; identifier: string; title: string; format: string; transactionId: string
  transactionDate: string | null; units: number; publisherProceedsMinor: number; currency: string
  territory: string; raw: string[]
}
export type SourceStatement = {
  provider: 'INGRAM'; account: string; kind: 'POD' | 'EBOOK'; salesPeriod: string
  statementId: string; sourceHash: string; semanticHash: string; rows: SalesRow[]
  totals: { rows: number; units: number; publisherProceedsMinor: number; currency: string }
  headers: string[]
}
export function minor(value: string): number {
  const match = /^(-?)(\d*)(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!match || (!match[2] && !match[3])) throw Error('SOURCE_MONEY_INVALID')
  const result = (Number(match[2] || '0') * 100 + Number((match[3] || '').padEnd(2, '0'))) * (match[1] ? -1 : 1)
  if (!Number.isSafeInteger(result)) throw Error('SOURCE_MONEY_RANGE')
  return result
}
function integer(value: string) {
  if (!/^-?\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value))) throw Error('SOURCE_UNITS_INVALID')
  return Number(value)
}
function single(values: string[]) {
  const unique = [...new Set(values)]
  if (unique.length !== 1 || !unique[0]) throw Error('SOURCE_MIXED_OR_MISSING_AUTHORITY')
  return unique[0]
}
export function parseIngram(bytes: Buffer): SourceStatement {
  if (!bytes.length || bytes.length > 8 * 1024 * 1024 || bytes.includes(0)) throw Error('SOURCE_FORMAT_UNSUPPORTED')
  const table = parse(bytes, { delimiter: '\t', bom: true, skip_empty_lines: true, relax_quotes: true }) as string[][]
  const headers = table.shift() || []
  const rows = table.filter(row => row.some(value => value.trim()))
  if (!rows.length || rows.length > 20000) throw Error('SOURCE_ROW_COUNT_INVALID')
  const get = (row: string[], name: string) => {
    const positions = headers.flatMap((h, i) => h === name ? [i] : [])
    if (positions.length !== 1 || row.length !== headers.length) throw Error('SOURCE_HEADER_INVALID')
    return row[positions[0]].trim()
  }
  const pod = headers.includes('MTD_net_pub_comp')
  const ebook = headers.includes('ProceedsOfSaleDuePublisher')
  if (pod === ebook) throw Error('SOURCE_FORMAT_UNSUPPORTED')
  const account = single(rows.map(r => get(r, pod ? 'publisher_number' : 'PublisherID#')))
  const currency = single(rows.map(r => get(r, pod ? 'reporting_currency_code' : 'ReportingCurrency')))
  if (!/^[A-Z]{3}$/.test(currency)) throw Error('SOURCE_CURRENCY_INVALID')
  let salesPeriod: string
  if (pod) {
    const period = single(rows.map(r => get(r, 'period_name')))
    const m = /^'?(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-(\d{2})$/.exec(period)
    if (!m) throw Error('SOURCE_PERIOD_INVALID')
    salesPeriod = `20${m[2]}-${String('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ').indexOf(m[1]) + 1).padStart(2, '0')}`
  } else {
    const from = single(rows.map(r => get(r, 'ReportPeriodFrom')))
    const to = single(rows.map(r => get(r, 'ReportPeriodTo')))
    if (!/^20\d{2}(0[1-9]|1[0-2])01$/.test(from) || to.slice(0, 6) !== from.slice(0, 6)) throw Error('SOURCE_PERIOD_INVALID')
    const lastDay = new Date(Date.UTC(Number(from.slice(0, 4)), Number(from.slice(4, 6)), 0)).getUTCDate()
    if (to !== from.slice(0, 6) + lastDay) throw Error('SOURCE_PARTIAL_PERIOD')
    salesPeriod = `${from.slice(0, 4)}-${from.slice(4, 6)}`
  }
  const normalized = rows.map((r, i): SalesRow => {
    const identifier = get(r, pod ? 'isbn_13' : 'MainProductID#')
    if (!/^\d{13}$/.test(identifier)) throw Error('SOURCE_IDENTIFIER_INVALID')
    return { sourceRow: i + 2, identifier, title: get(r, pod ? 'title' : 'ProductTitle'),
      format: pod ? get(r, 'binding_type') : get(r, 'ProductFormat'),
      transactionId: pod ? `${identifier}:${get(r, 'market')}:${get(r, 'sales_category')}` : get(r, 'LineItemID#'),
      transactionDate: pod ? null : get(r, 'TransactionDateTime'),
      units: integer(get(r, pod ? 'MTD_net_quantity' : 'NetSoldQuantity')),
      publisherProceedsMinor: minor(get(r, pod ? 'MTD_net_pub_comp' : 'ProceedsOfSaleDuePublisher')),
      currency, territory: pod ? get(r, 'market') : r[headers.lastIndexOf('SalesTerritory')].trim(), raw: r }
  })
  if (new Set(normalized.map(r => r.transactionId)).size !== normalized.length) throw Error('SOURCE_DUPLICATE_ROW_IDENTITY')
  const totals = { rows: normalized.length, units: normalized.reduce((s,r) => s+r.units,0),
    publisherProceedsMinor: normalized.reduce((s,r) => s+r.publisherProceedsMinor,0), currency }
  if (ebook) {
    if (integer(single(rows.map(r => get(r, 'TotalNumberOfLineItems')))) !== totals.rows ||
        integer(single(rows.map(r => get(r, 'TotalNetSoldQuantity')))) !== totals.units ||
        minor(single(rows.map(r => get(r, 'TotalProceedsDueToPublisher')))) !== totals.publisherProceedsMinor) throw Error('SOURCE_CONTROL_TOTAL_MISMATCH')
  }
  const kind = pod ? 'POD' : 'EBOOK'
  const statementId = pod ? `INGRAM:${account}:${kind}:${currency}:${salesPeriod}` : single(rows.map(r => get(r, 'ReportID')))
  const semantic = normalized.map(({sourceRow, raw, ...r}) => r).sort((a,b) => a.transactionId.localeCompare(b.transactionId))
  return { provider: 'INGRAM', account, kind, salesPeriod, statementId, sourceHash: digest(bytes),
    semanticHash: digest(JSON.stringify(semantic)), rows: normalized, totals, headers }
}
