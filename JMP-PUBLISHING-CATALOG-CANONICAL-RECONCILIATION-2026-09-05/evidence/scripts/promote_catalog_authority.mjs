#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const execute = process.argv.includes('--execute')
const resource = (process.env.DATAVERSE_ENVIRONMENT_URL || 'https://jm1hq.crm.dynamics.com').replace(/\/$/, '')
const apiBase = `${resource}/api/data/v9.2`
const root = resolve('JMP-PUBLISHING-CATALOG-CANONICAL-RECONCILIATION-2026-09-05')
const evidenceDir = resolve(root, 'evidence/dataverse')
const reconciliation = JSON.parse(readFileSync(resolve(root, 'evidence/reconciliation/catalog-reconciliation.json'), 'utf8'))
const correlationId = 'JMP-CATALOG-CANONICAL-20260905'
const sourceChecksum = reconciliation.proof.source.sha256
const sourceAuthority = `FOUNDER_CANONICAL_CATALOG_2026-09-05:${sourceChecksum}`
const token = execFileSync(
  'az',
  ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
).trim()

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0',
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } })
  const body = await response.text()
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${body.slice(0, 1200)}`)
  return { body: body ? JSON.parse(body) : null, headers: response.headers, status: response.status }
}

async function optional(path) {
  try {
    return (await request(path)).body
  } catch (error) {
    if (String(error.message).includes(': 404 ')) return null
    throw error
  }
}

async function all(entitySet, select) {
  let url = `/${entitySet}?$select=${select}&$top=5000`
  const rows = []
  while (url) {
    const page = (await request(url.startsWith('http') ? url.replace(apiBase, '') : url)).body
    rows.push(...(page.value || []))
    url = page['@odata.nextLink'] || ''
  }
  return rows
}

const titleFields = [
  'jm1pub_titleid', 'jm1pub_titlename', 'jm1pub_authorname', '_jm1_primaryauthor_value', 'jm1_canonicalstatus', 'jm1_canonicaltitlereference',
  'jm1_canonicalauthorcontactreference', 'jm1_sourceauthority', 'jm1_reconciliationcorrelationid', 'jm1pub_catalogworkkey',
  'jm1pub_publisheroriginstate', 'jm1pub_authoritychangefinding', 'jm1pub_currentcatalogstate', 'jm1pub_marketingauthoritystate',
  'jm1pub_cataloglifecycledetail',
  'jm1pub_retirementstate', 'jm1pub_rightsholdstate', 'jm1pub_catalogsourcechecksum', 'jm1pub_catalogcorrelationid',
  'jm1pub_currenteditionreference', 'modifiedon',
]
const editionFields = [
  'jm1pub_editionid', 'jm1pub_editionname', '_jm1pub_title_value', 'jm1pub_releasedate',
  'jm1pub_canonicaleditionkey', 'jm1pub_editionrelationship', 'jm1pub_catalogsourcechecksum', 'jm1pub_catalogcorrelationid',
  'jm1pub_publicationdatesource', 'modifiedon',
]
const assetFields = [
  'jm1pub_publishingassetid', 'jm1pub_name', '_jm1pub_titleid_value', '_jm1pub_editionid_value', 'jm1pub_iscurrentedition',
  'jm1pub_canonicalproductkey', 'jm1pub_catalogdistributionstate', 'jm1pub_rawlegacystatus', 'jm1pub_rawhouse',
  'jm1pub_rawcontract', 'jm1pub_rawisdistributed', 'jm1pub_catalogsourcechecksum', 'jm1pub_catalogcorrelationid',
  'jm1pub_sourcerownumber', 'modifiedon',
]
const allocationFields = [
  'jm1pub_isbnallocationid', 'jm1pub_name', 'jm1pub_normalizedisbn', 'jm1pub_allocationclassification', 'jm1pub_rawisbn13',
  'jm1pub_rawisbn', 'jm1pub_sourcerownumber', 'jm1pub_catalogsourcechecksum', 'jm1pub_catalogcorrelationid', 'jm1pub_isassigned', 'modifiedon',
]

const [currentTitles, currentEditions, currentAssets, currentAllocations] = await Promise.all([
  all('jm1pub_titles', titleFields.join(',')),
  all('jm1pub_editions', editionFields.join(',')),
  all('jm1pub_publishingassets', assetFields.join(',')),
  all('jm1pub_isbnallocations', allocationFields.join(',')),
])

const current = {
  contacts: new Map(),
  titles: new Map(currentTitles.map((row) => [row.jm1pub_titleid, row])),
  editions: new Map(currentEditions.map((row) => [row.jm1pub_editionid, row])),
  assets: new Map(currentAssets.map((row) => [row.jm1pub_publishingassetid, row])),
  allocations: new Map(currentAllocations.map((row) => [row.jm1pub_isbnallocationid, row])),
}

for (const author of reconciliation.authors.filter((row) => !row.existingContactMatched)) {
  current.contacts.set(author.canonicalAuthorId, await optional(`/contacts(${author.canonicalAuthorId})?$select=contactid,firstname,lastname,fullname,modifiedon`))
}

function currentEditionFor(workId) {
  const candidates = reconciliation.editions.filter((edition) => edition.canonicalWorkId === workId)
  return [...candidates].sort((a, b) => (b.publicationDates.at(-1) || '').localeCompare(a.publicationDates.at(-1) || ''))[0]
}

const operations = []
function plan(entitySet, idField, id, currentRow, payload, comparisons = {}) {
  const changes = {}
  for (const [field, expected] of Object.entries(payload)) {
    const actualField = comparisons[field] || field
    const actual = currentRow?.[actualField] ?? null
    const comparableExpected = field.endsWith('@odata.bind') ? String(expected).match(/\(([^)]+)\)/)?.[1] || expected : expected
    const dateEquivalent = /^\d{4}-\d{2}-\d{2}$/.test(String(comparableExpected || '')) && String(actual || '').startsWith(String(comparableExpected))
    if (!dateEquivalent && String(actual ?? '') !== String(comparableExpected ?? '')) changes[field] = { before: actual, after: expected }
  }
  operations.push({ entitySet, idField, id, action: currentRow ? (Object.keys(changes).length ? 'UPDATE' : 'NO_OP') : 'CREATE', changes, payload })
}

for (const author of reconciliation.authors.filter((row) => !row.existingContactMatched)) {
  const parts = author.authorDisplayName.split(/\s+/)
  const institution = ['Agape International Cathedral', 'USAF'].includes(author.authorDisplayName)
  const payload = institution
    ? { lastname: author.authorDisplayName }
    : { firstname: parts.slice(0, -1).join(' ') || author.authorDisplayName, lastname: parts.at(-1) || author.authorDisplayName }
  plan('contacts', 'contactid', author.canonicalAuthorId, current.contacts.get(author.canonicalAuthorId), payload)
}

for (const work of reconciliation.works) {
  const edition = currentEditionFor(work.canonicalWorkId)
  const payload = {
    jm1pub_titlename: work.title,
    jm1pub_authorname: work.authorDisplayName,
    'jm1_PrimaryAuthor@odata.bind': `/contacts(${work.canonicalAuthorId})`,
    jm1_canonicalstatus: 'CANONICAL_PUBLISHING_WORK',
    jm1_canonicaltitlereference: work.canonicalWorkId,
    jm1_canonicalauthorcontactreference: `contact:${work.canonicalAuthorId}`,
    jm1_sourceauthority: sourceAuthority,
    jm1_reconciliationcorrelationid: correlationId,
    jm1pub_catalogworkkey: work.canonicalWorkKey,
    jm1pub_publisheroriginstate: work.publisherOriginState,
    jm1pub_authoritychangefinding: work.authorityChangeFinding,
    jm1pub_currentcatalogstate: work.currentCatalogState,
    jm1pub_cataloglifecycledetail: work.lifecycleDetail,
    jm1pub_marketingauthoritystate: work.marketingAuthorityState,
    jm1pub_retirementstate: work.retirementState,
    jm1pub_rightsholdstate: work.rightsHoldState,
    jm1pub_catalogsourcechecksum: sourceChecksum,
    jm1pub_catalogcorrelationid: correlationId,
    jm1pub_currenteditionreference: edition?.canonicalEditionId || null,
  }
  plan('jm1pub_titles', 'jm1pub_titleid', work.canonicalWorkId, current.titles.get(work.canonicalWorkId), payload, {
    'jm1_PrimaryAuthor@odata.bind': '_jm1_primaryauthor_value',
  })
}

for (const edition of reconciliation.editions) {
  const releaseDate = edition.publicationDates.at(-1) || null
  const payload = {
    jm1pub_editionname: `${edition.workTitle} - ${edition.editionLabel}`.slice(0, 100),
    'jm1pub_Title@odata.bind': `/jm1pub_titles(${edition.canonicalWorkId})`,
    jm1pub_releasedate: releaseDate,
    jm1pub_canonicaleditionkey: edition.canonicalEditionKey,
    jm1pub_editionrelationship: edition.relationship,
    jm1pub_catalogsourcechecksum: sourceChecksum,
    jm1pub_catalogcorrelationid: correlationId,
    jm1pub_publicationdatesource: edition.publicationDates.join('|'),
  }
  plan('jm1pub_editions', 'jm1pub_editionid', edition.canonicalEditionId, current.editions.get(edition.canonicalEditionId), payload, {
    'jm1pub_Title@odata.bind': '_jm1pub_title_value',
  })
}

const formatValues = { PAPERBACK: 100000000, HARDCOVER: 100000001, EBOOK: 100000002, AUDIOBOOK: 100000003, OTHER: 100000006 }
for (const product of reconciliation.products) {
  const currentEdition = currentEditionFor(product.canonicalWorkId)
  const isNew = !current.assets.has(product.canonicalProductId)
  const payload = {
    'jm1pub_TitleId@odata.bind': `/jm1pub_titles(${product.canonicalWorkId})`,
    'jm1pub_EditionId@odata.bind': `/jm1pub_editions(${product.canonicalEditionId})`,
    jm1pub_iscurrentedition: product.canonicalEditionId === currentEdition?.canonicalEditionId,
    jm1pub_canonicalproductkey: product.canonicalProductKey,
    jm1pub_catalogdistributionstate: product.distributionState,
    jm1pub_rawlegacystatus: product.rawLegacyStatus || null,
    jm1pub_rawhouse: product.rawHouse || null,
    jm1pub_rawcontract: product.rawContract || null,
    jm1pub_rawisdistributed: product.raw.IsDistributed?.trim() || null,
    jm1pub_catalogsourcechecksum: sourceChecksum,
    jm1pub_catalogcorrelationid: correlationId,
    jm1pub_sourcerownumber: product.sourceRowNumber,
  }
  if (isNew) {
    Object.assign(payload, {
      jm1pub_name: `${product.title} - ${product.format} - ${product.isbn13 || product.legacyOrAudioIdentifier}`.slice(0, 200),
      jm1pub_assetformat: formatValues[product.format],
      jm1pub_editionlabel: reconciliation.editions.find((edition) => edition.canonicalEditionId === product.canonicalEditionId)?.editionLabel || 'CATALOG_EDITION',
      jm1pub_isbn13: product.isbn13 || null,
      jm1pub_normalizedisbn: product.isbn13 || String(product.legacyOrAudioIdentifier || '').replace(/[^A-Za-z0-9]/g, ''),
      jm1pub_asin: product.asin || null,
      jm1pub_acxproductid: /^BK_ACX/i.test(product.legacyOrAudioIdentifier) ? product.legacyOrAudioIdentifier : null,
      jm1pub_publicationdate: product.publicationDate || null,
      jm1pub_distributionstatus: product.distributionState === 'CURRENTLY_DISTRIBUTED' ? 100000001 : product.distributionState === 'NOT_CURRENTLY_DISTRIBUTED' ? 100000004 : 100000004,
      jm1pub_evidencesource: 'FOUNDER_CANONICAL_CATALOG_2026-09-05',
    })
  }
  plan('jm1pub_publishingassets', 'jm1pub_publishingassetid', product.canonicalProductId, current.assets.get(product.canonicalProductId), payload, {
    'jm1pub_TitleId@odata.bind': '_jm1pub_titleid_value',
    'jm1pub_EditionId@odata.bind': '_jm1pub_editionid_value',
  })
}

for (const allocation of reconciliation.reserved) {
  const payload = {
    jm1pub_name: `Reserved ISBN ${allocation.normalizedIsbn}`,
    jm1pub_normalizedisbn: allocation.normalizedIsbn,
    jm1pub_allocationclassification: allocation.classification,
    jm1pub_rawisbn13: allocation.raw.ISBN13 || null,
    jm1pub_rawisbn: allocation.raw.ISBN || null,
    jm1pub_sourcerownumber: allocation.sourceRowNumber,
    jm1pub_catalogsourcechecksum: sourceChecksum,
    jm1pub_catalogcorrelationid: correlationId,
    jm1pub_isassigned: false,
  }
  plan('jm1pub_isbnallocations', 'jm1pub_isbnallocationid', allocation.reservedIsbnInventoryId, current.allocations.get(allocation.reservedIsbnInventoryId), payload)
}

const mutationOperations = operations.filter((operation) => operation.action !== 'NO_OP')
const initialWriteLogPath = resolve(evidenceDir, 'catalog-promotion-write-log.json')
const executionLabel = execute && existsSync(initialWriteLogPath) ? 'incremental' : 'initial'
const writeLogPath = executionLabel === 'initial' ? initialWriteLogPath : resolve(evidenceDir, 'catalog-promotion-write-log-incremental.json')
const prewritePath = execute
  ? resolve(evidenceDir, executionLabel === 'initial' ? 'catalog-promotion-prewrite.json' : 'catalog-promotion-incremental-prewrite.json')
  : resolve(evidenceDir, 'catalog-promotion-dry-run.json')
const prewrite = {
  generatedAt: new Date().toISOString(),
  mode: execute ? 'EXECUTE' : 'DRY_RUN',
  environment: { resource, apiBase },
  correlationId,
  sourceChecksum,
  counts: {
    total: operations.length,
    creates: operations.filter((operation) => operation.action === 'CREATE').length,
    updates: operations.filter((operation) => operation.action === 'UPDATE').length,
    noOps: operations.filter((operation) => operation.action === 'NO_OP').length,
    deletes: 0,
  },
  operations,
}
mkdirSync(evidenceDir, { recursive: true })
writeFileSync(prewritePath, `${JSON.stringify(prewrite, null, 2)}\n`)

const writeLog = []
if (execute) {
  for (const [index, operation] of mutationOperations.entries()) {
    try {
      const result = await request(`/${operation.entitySet}(${operation.id})`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(operation.payload),
      })
      writeLog.push({ sequence: index + 1, entitySet: operation.entitySet, id: operation.id, plannedAction: operation.action, status: 'SUCCESS', responseStatus: result.status })
    } catch (error) {
      writeLog.push({ sequence: index + 1, entitySet: operation.entitySet, id: operation.id, plannedAction: operation.action, status: 'ERROR', error: String(error.message || error) })
      writeFileSync(writeLogPath, `${JSON.stringify(writeLog, null, 2)}\n`)
      throw error
    }
  }
  writeFileSync(writeLogPath, `${JSON.stringify(writeLog, null, 2)}\n`)
}

console.log(JSON.stringify({ mode: prewrite.mode, executionLabel, counts: prewrite.counts, evidence: prewritePath, writesCompleted: writeLog.length }, null, 2))
