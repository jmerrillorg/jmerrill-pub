#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const resource = (process.env.DATAVERSE_ENVIRONMENT_URL || 'https://jm1hq.crm.dynamics.com').replace(/\/$/, '')
const apiBase = `${resource}/api/data/v9.2`
const outputPath = resolve(
  process.argv[2] ||
    'JMP-PUBLISHING-CATALOG-CANONICAL-RECONCILIATION-2026-09-05/evidence/dataverse/core_catalog_preflight.json',
)

const token = execFileSync(
  'az',
  ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
).trim()

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0',
}

async function request(url) {
  const response = await fetch(url, { headers })
  const body = await response.text()
  if (!response.ok) throw new Error(`${response.status} ${url}: ${body.slice(0, 1000)}`)
  return body ? JSON.parse(body) : {}
}

async function all(entitySet, select) {
  let url = `${apiBase}/${entitySet}?$select=${select}&$top=5000`
  const rows = []
  while (url) {
    const page = await request(url)
    rows.push(...(page.value || []))
    url = page['@odata.nextLink'] || ''
  }
  return rows
}

const selections = {
  jm1pub_titles: [
    'jm1pub_titleid',
    'jm1pub_name',
    'jm1pub_titlename',
    'jm1pub_authorname',
    'jm1pub_authordisplayname',
    '_jm1_author_value',
    '_jm1pub_authorid_value',
    '_jm1pub_contractid_value',
    'jm1pub_stage',
    'jm1pub_publicationstatus',
    'jm1pub_publiccatalogstatus',
    'jm1pub_publicationdate',
    'jm1pub_releasedate',
    'jm1pub_imprint',
    'jm1pub_certifiedimprint',
    'jm1pub_slug',
    'jm1pub_assetregistrystatus',
    'statecode',
    'statuscode',
    'createdon',
    'modifiedon',
  ],
  jm1pub_editions: [
    'jm1pub_editionid',
    'jm1pub_name',
    'jm1pub_editionname',
    '_jm1pub_titleid_value',
    'jm1pub_format',
    'jm1pub_isbn',
    'jm1pub_releasedate',
    'statecode',
    'statuscode',
    'createdon',
    'modifiedon',
  ],
  jm1pub_publishingassets: [
    'jm1pub_publishingassetid',
    'jm1pub_name',
    '_jm1pub_titleid_value',
    '_jm1pub_contractid_value',
    'jm1pub_assetformat',
    'jm1pub_editionlabel',
    'jm1pub_iscurrentedition',
    'jm1pub_isbn13',
    'jm1pub_normalizedisbn',
    'jm1pub_asin',
    'jm1pub_acxproductid',
    'jm1pub_lsiid',
    'jm1pub_coresourceid',
    'jm1pub_publicationdate',
    'jm1pub_retailprice',
    'jm1pub_distributionstatus',
    'jm1pub_assetstatus',
    'jm1pub_evidencesource',
    'jm1pub_evidencepath',
    'statecode',
    'statuscode',
    'createdon',
    'modifiedon',
  ],
  jm1pub_assetmarketplaces: [
    'jm1pub_assetmarketplaceid',
    'jm1pub_name',
    '_jm1pub_publishingassetid_value',
    'jm1pub_marketplace',
    'jm1pub_marketplacestatus',
    'jm1pub_marketplaceidentifier',
    'jm1pub_listingurl',
    'jm1pub_evidencesource',
    'statecode',
    'statuscode',
    'createdon',
    'modifiedon',
  ],
  jm1pub_contracts: [
    'jm1pub_contractid',
    'jm1pub_name',
    'jm1pub_contractstatus',
    'jm1pub_effectivedate',
    'jm1pub_expirationdate',
    '_jm1pub_contactid_value',
    '_jm1pub_titleid_value',
    'statecode',
    'statuscode',
    'createdon',
    'modifiedon',
  ],
  contacts: [
    'contactid',
    'fullname',
    'firstname',
    'middlename',
    'lastname',
    'emailaddress1',
    'statecode',
    'statuscode',
    'createdon',
    'modifiedon',
  ],
}

const results = {}
for (const [entitySet, fields] of Object.entries(selections)) {
  try {
    results[entitySet] = {
      fields,
      rows: await all(entitySet, fields.join(',')),
    }
  } catch (error) {
    // Schema has evolved. Preserve the failure and retry without an explicit projection.
    results[entitySet] = {
      fields,
      projectionError: String(error.message || error),
      rows: await all(entitySet, '*'),
    }
  }
}

const sourcePath = resolve(
  'JMP-PUBLISHING-CATALOG-CANONICAL-RECONCILIATION-2026-09-05/evidence/source/canonical_catalog_source.tsv',
)
const targetedAuthorContacts = []
if (existsSync(sourcePath)) {
  const lines = readFileSync(sourcePath, 'utf8').split(/\r?\n/).filter(Boolean)
  const sourceHeaders = lines.shift().split('\t').map((value) => value.trim())
  const authorIndex = sourceHeaders.indexOf('Author')
  const sourceAuthors = [...new Set(lines.map((line) => (line.split('\t')[authorIndex] || '').trim()).filter(Boolean))].sort()
  const aliasesPath = resolve('data/author-name-to-master-name.ts')
  const aliasPairs = existsSync(aliasesPath)
    ? [...readFileSync(aliasesPath, 'utf8').matchAll(/^\s*'([^']+)':\s*'([^']+)',?$/gm)].map((match) => [match[1], match[2]])
    : []
  const searchNames = new Set(sourceAuthors)
  for (const governedName of ['Bailey Cunningham', 'Natasha Gilchrist', 'Sean A Crowley I', 'Tawonna Mars']) searchNames.add(governedName)
  for (const author of sourceAuthors) {
    for (const [alias, canonical] of aliasPairs) {
      if (author === alias || author === canonical) {
        searchNames.add(alias)
        searchNames.add(canonical)
      }
    }
  }
  for (const author of [...searchNames].sort()) {
    const escaped = author.replace(/'/g, "''")
    const url = `${apiBase}/contacts?$select=contactid,fullname,firstname,middlename,lastname,emailaddress1,statecode,statuscode,createdon,modifiedon&$filter=${encodeURIComponent(`fullname eq '${escaped}'`)}&$top=50`
    const response = await request(url)
    targetedAuthorContacts.push({ sourceAuthor: author, rows: response.value || [] })
  }
}

const whoAmI = await request(`${apiBase}/WhoAmI`)
const output = {
  generatedAt: new Date().toISOString(),
  mode: 'READ_ONLY',
  environment: {
    resource,
    apiBase,
    organizationId: whoAmI.OrganizationId,
    userId: whoAmI.UserId,
    businessUnitId: whoAmI.BusinessUnitId,
  },
  counts: Object.fromEntries(Object.entries(results).map(([key, value]) => [key, value.rows.length])),
  targetedAuthorContacts,
  entities: results,
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({ outputPath, counts: output.counts, environment: output.environment }, null, 2))
