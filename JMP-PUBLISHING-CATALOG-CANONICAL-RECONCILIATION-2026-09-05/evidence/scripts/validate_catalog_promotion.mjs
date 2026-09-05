#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const resource = 'https://jm1hq.crm.dynamics.com'
const apiBase = `${resource}/api/data/v9.2`
const root = resolve('JMP-PUBLISHING-CATALOG-CANONICAL-RECONCILIATION-2026-09-05')
const outputPath = resolve(root, 'evidence/dataverse/catalog-promotion-validation.json')
const expected = JSON.parse(readFileSync(resolve(root, 'evidence/reconciliation/catalog-reconciliation.json'), 'utf8'))
const replay = JSON.parse(readFileSync(resolve(root, 'evidence/dataverse/catalog-promotion-dry-run.json'), 'utf8'))
const writeLog = JSON.parse(readFileSync(resolve(root, 'evidence/dataverse/catalog-promotion-write-log.json'), 'utf8'))
const incrementalWriteLog = JSON.parse(readFileSync(resolve(root, 'evidence/dataverse/catalog-promotion-write-log-incremental.json'), 'utf8'))
const token = execFileSync('az', ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim()
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"' }

async function get(path) {
  const response = await fetch(`${apiBase}${path}`, { headers })
  const body = await response.text()
  if (!response.ok) throw new Error(`${response.status} ${path}: ${body.slice(0, 1000)}`)
  return JSON.parse(body)
}

async function all(entitySet, select, filter) {
  let url = `/${entitySet}?$select=${select}&$filter=${encodeURIComponent(filter)}&$top=5000`
  const rows = []
  while (url) {
    const page = await get(url.startsWith('http') ? url.replace(apiBase, '') : url)
    rows.push(...page.value)
    url = page['@odata.nextLink'] || ''
  }
  return rows
}

const correlation = 'JMP-CATALOG-CANONICAL-20260905'
const [titles, editions, products, allocations] = await Promise.all([
  all('jm1pub_titles', 'jm1pub_titleid,jm1pub_titlename,jm1pub_authorname,_jm1_primaryauthor_value,jm1pub_catalogworkkey,jm1pub_publisheroriginstate,jm1pub_authoritychangefinding,jm1pub_currentcatalogstate,jm1pub_cataloglifecycledetail,jm1pub_marketingauthoritystate,jm1pub_retirementstate,jm1pub_rightsholdstate,jm1pub_catalogsourcechecksum,jm1pub_currenteditionreference,jm1_reconciliationcorrelationid', `jm1_reconciliationcorrelationid eq '${correlation}'`),
  all('jm1pub_editions', 'jm1pub_editionid,jm1pub_editionname,_jm1pub_title_value,jm1pub_canonicaleditionkey,jm1pub_editionrelationship,jm1pub_catalogsourcechecksum,jm1pub_catalogcorrelationid', `jm1pub_catalogcorrelationid eq '${correlation}'`),
  all('jm1pub_publishingassets', 'jm1pub_publishingassetid,_jm1pub_titleid_value,_jm1pub_editionid_value,jm1pub_canonicalproductkey,jm1pub_catalogdistributionstate,jm1pub_catalogsourcechecksum,jm1pub_catalogcorrelationid,jm1pub_sourcerownumber', `jm1pub_catalogcorrelationid eq '${correlation}'`),
  all('jm1pub_isbnallocations', 'jm1pub_isbnallocationid,jm1pub_normalizedisbn,jm1pub_allocationclassification,jm1pub_catalogsourcechecksum,jm1pub_catalogcorrelationid,jm1pub_isassigned,jm1pub_sourcerownumber', `jm1pub_catalogcorrelationid eq '${correlation}'`),
])

const unique = (rows, field) => new Set(rows.map((row) => row[field])).size === rows.length
const titleById = new Map(titles.map((row) => [row.jm1pub_titleid, row]))
const editionById = new Map(editions.map((row) => [row.jm1pub_editionid, row]))
const sourceRows = new Set(products.map((row) => row.jm1pub_sourcerownumber))
const reservedRows = new Set(allocations.map((row) => row.jm1pub_sourcerownumber))
const checks = {
  titleCount129: titles.length === 129,
  editionCount133: editions.length === 133,
  productCount300: products.length === 300,
  reservedCount111: allocations.length === 111,
  uniqueWorkKeys: unique(titles, 'jm1pub_catalogworkkey'),
  uniqueEditionKeys: unique(editions, 'jm1pub_canonicaleditionkey'),
  uniqueProductKeys: unique(products, 'jm1pub_canonicalproductkey'),
  uniqueReservedIsbns: unique(allocations, 'jm1pub_normalizedisbn'),
  allPublisherOriginConfirmed: titles.every((row) => row.jm1pub_publisheroriginstate === 'PUBLISHER_ORIGIN_CONFIRMED'),
  noAuthorityChangeFound: titles.every((row) => row.jm1pub_authoritychangefinding === 'NO_AUTHORITY_CHANGE_FOUND'),
  allActive: titles.every((row) => row.jm1pub_currentcatalogstate === 'ACTIVE'),
  allMarketingEligible: titles.every((row) => row.jm1pub_marketingauthoritystate === 'MARKETING_ELIGIBLE'),
  allProductsBoundToWork: products.every((row) => titleById.has(row._jm1pub_titleid_value)),
  allProductsBoundToEdition: products.every((row) => editionById.has(row._jm1pub_editionid_value)),
  allEditionsBoundToWork: editions.every((row) => titleById.has(row._jm1pub_title_value)),
  allCurrentEditionReferencesResolve: titles.every((row) => editionById.has(row.jm1pub_currenteditionreference)),
  sourceChecksumsMatch: [...titles, ...editions, ...products, ...allocations].every((row) => row.jm1pub_catalogsourcechecksum === expected.proof.source.sha256),
  reservedExcludedFromProducts: [...reservedRows].every((row) => !sourceRows.has(row)),
  reservedUnassigned: allocations.every((row) => row.jm1pub_allocationclassification === 'RESERVED_UNASSIGNED_ISBN' && row.jm1pub_isassigned === false),
  writeLedgerComplete: writeLog.length === 692 && writeLog.every((row) => row.status === 'SUCCESS'),
  incrementalWriteLedgerComplete: incrementalWriteLog.length === 129 && incrementalWriteLog.every((row) => row.status === 'SUCCESS'),
  idempotentReplay: replay.counts.creates === 0 && replay.counts.updates === 0 && replay.counts.noOps === 692,
  noDeletes: replay.counts.deletes === 0,
  shelleyBaseline: titles.filter((row) => row.jm1pub_authorname === 'Shelley McIntosh').length === 3 && expected.products.filter((row) => row.authorDisplayName === 'Shelley McIntosh').length === 8,
  recentTitleProtection: titles.some((row) => row.jm1pub_titlename === 'The Shift' && row.jm1pub_authorname === 'Sean A Crowley I' && row.jm1pub_cataloglifecycledetail === 'NEW_RECENTLY_RELEASED') && titles.some((row) => row.jm1pub_titlename.toLowerCase() === 'strategies for success' && row.jm1pub_authorname === 'Sean A Crowley I' && row.jm1pub_cataloglifecycledetail === 'ACTIVE_LAUNCH_LIFECYCLE'),
}

const output = {
  generatedAt: new Date().toISOString(),
  environment: { resource, apiBase },
  correlation,
  counts: { titles: titles.length, editions: editions.length, products: products.length, reservedIsbns: allocations.length },
  checks,
  status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  rows: { titles, editions, products, allocations },
}
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
if (output.status !== 'PASS') throw new Error(`Promotion validation failed: ${JSON.stringify(checks)}`)
console.log(JSON.stringify({ outputPath, counts: output.counts, checks, status: output.status }, null, 2))
