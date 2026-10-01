import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const BASE = 'https://jm1hq.crm.dynamics.com/api/data/v9.2/jm1pub_commercialcatalogitems'
const AUTHORITY = 'JMP_Publishing_Package_Addendum_v4.1.docx; founder catalog correction 2026-10-01'
const VERSION = 'JMP-PACKAGE-ADDENDUM-v4.1-2026-08-12'
const EFFECTIVE_DATE = '2026-08-12'

const SKU = {
  starter: 'JMP-PKG-STARTER',
  professional: 'JMP-PKG-PRO',
  premier: 'JMP-PKG-PREMIER',
  signature: 'JMP-PKG-SIGNATURE',
}

const ACTIVE = 100000000
const SUPERSEDED = 100000001
const SELLABLE = 100000000
const NOT_SELLABLE = 100000001
const QUOTABLE = 100000000
const NOT_QUOTABLE = 100000002
const CONTRACTABLE = 100000000
const NOT_CONTRACTABLE = 100000001
const PUBLIC = 100000000
const NON_PUBLIC = 100000001
const FIXED = 100000000

function assertUnique(rows, sku, required = true) {
  const matches = rows.filter((row) => row.jm1pub_canonicalsku === sku)
  if (matches.length > 1 || (required && matches.length !== 1)) {
    throw new Error(`Expected ${required ? 'one' : 'at most one'} row for ${sku}; found ${matches.length}`)
  }
  return matches[0] || null
}

function pricePatch(name, amount, description) {
  return {
    jm1pub_name: name,
    jm1pub_description: description,
    jm1pub_pricingmethod: FIXED,
    jm1pub_unitprice: amount,
    jm1pub_priceexpression: `$${amount.toLocaleString('en-US')}`,
    jm1pub_commercialstatus: ACTIVE,
    jm1pub_sellablestatus: SELLABLE,
    jm1pub_quotingstatus: QUOTABLE,
    jm1pub_contractstatus: CONTRACTABLE,
    jm1pub_publicvisibility: PUBLIC,
    jm1pub_sourceauthority: AUTHORITY,
    jm1pub_authorityversion: VERSION,
    jm1pub_effectivedate: EFFECTIVE_DATE,
    jm1pub_evidencereference: 'JMP-PACKAGE-ADDENDUM-v4.1-RECONCILIATION-2026-08-12/01-authoritative-source-map.md',
  }
}

export function buildPackagePlan(rows) {
  if (!Array.isArray(rows)) throw new Error('Catalog rows are required')
  const starter = assertUnique(rows, SKU.starter)
  const professional = assertUnique(rows, SKU.professional)
  const signature = assertUnique(rows, SKU.signature)
  const premier = assertUnique(rows, SKU.premier, false)
  if (rows.some((row) => row.jm1pub_catalogrowid === 'CAT-121' && row.jm1pub_canonicalsku !== SKU.premier)) {
    throw new Error('CAT-121 is occupied by another SKU')
  }
  if (signature.jm1pub_unitprice !== 7500) throw new Error('Signature historical price differs from $7,500')
  if (!signature._transactioncurrencyid_value) throw new Error('Signature USD currency binding is missing')

  const premierPatch = pricePatch('Premier Publishing Package', 7500, 'Four edition slots. AI narration included under the governed 8-PFH policy; human narration quoted separately.')
  const premierCreate = premier ? null : {
    ...premierPatch,
    jm1pub_catalogrowid: 'CAT-121',
    jm1pub_canonicalsku: SKU.premier,
    jm1pub_legacysku: SKU.premier,
    jm1pub_category: signature.jm1pub_category,
    jm1pub_publishingtrackapplicability: signature.jm1pub_publishingtrackapplicability,
    jm1pub_scopegate: signature.jm1pub_scopegate,
    jm1pub_sloteligibility: signature.jm1pub_sloteligibility,
    jm1pub_productformcode: signature.jm1pub_productformcode,
    jm1pub_releasemodelcode: signature.jm1pub_releasemodelcode,
    jm1pub_productionmodecode: signature.jm1pub_productionmodecode,
    jm1pub_requiresstatementofwork: false,
    'transactioncurrencyid@odata.bind': `/transactioncurrencies(${signature._transactioncurrencyid_value})`,
    jm1pub_jackieruling: 100000001,
    jm1pub_matrixversion: 'Package Addendum v4.1',
    jm1pub_migrationaction: 'New $7,500 package selection; historical Signature records remain unchanged.',
  }
  if (premierCreate) {
    const digest = createHash('sha256').update(JSON.stringify(premierCreate)).digest('hex')
    premierCreate.jm1pub_seedchecksum = digest
    premierCreate.jm1pub_recordfingerprint = digest
  }

  return {
    createPremier: premierCreate,
    updates: [
      { row: starter, patch: pricePatch('Starter Publishing Package', 1999, 'Two edition slots. Audiobook is a separate line item.') },
      { row: professional, patch: pricePatch('Professional Publishing Package', 4500, 'Three edition slots. Audiobook is a separate line item.') },
      ...(premier ? [{ row: premier, patch: premierPatch }] : []),
      {
        row: signature,
        patch: {
          jm1pub_commercialstatus: SUPERSEDED,
          jm1pub_sellablestatus: NOT_SELLABLE,
          jm1pub_quotingstatus: NOT_QUOTABLE,
          jm1pub_contractstatus: NOT_CONTRACTABLE,
          jm1pub_publicvisibility: NON_PUBLIC,
          jm1pub_sourceauthority: AUTHORITY,
          jm1pub_authorityversion: VERSION,
          jm1pub_effectivedate: EFFECTIVE_DATE,
          jm1pub_replacementreason: 'Superseded for new business by JMP-PKG-PREMIER; retain executed Signature history.',
          jm1pub_migrationaction: 'Use Premier for new quotes and contracts; preserve historical Signature transactions.',
        },
      },
    ],
  }
}

function authToken() {
  return execFileSync('az', ['account', 'get-access-token', '--resource', 'https://jm1hq.crm.dynamics.com', '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim()
}

async function request(token, url, method = 'GET', body, etag) {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'OData-Version': '4.0' }
  if (body) headers['Content-Type'] = 'application/json'
  if (etag) headers['If-Match'] = etag
  const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!response.ok) throw new Error(`${method} ${url.split('?')[0]}: HTTP ${response.status} ${(await response.text()).slice(0, 500)}`)
  return response.status === 204 ? null : response.json()
}

async function listRows(token) {
  const result = await request(token, `${BASE}?$top=5000`)
  if (result['@odata.nextLink']) throw new Error('Catalog pagination is not supported by this bounded correction')
  return result.value
}

function diff(row, patch) {
  return Object.fromEntries(Object.entries(patch).filter(([key, value]) => row[key] !== value))
}

function readback(rows) {
  const bySku = Object.fromEntries(Object.values(SKU).map((sku) => [sku, assertUnique(rows, sku, sku !== SKU.premier)]))
  const expected = [
    [SKU.starter, 1999],
    [SKU.professional, 4500],
    [SKU.premier, 7500],
  ]
  const packagesPass = expected.every(([sku, price]) => {
    const row = bySku[sku]
    return row && row.jm1pub_unitprice === price && row.jm1pub_commercialstatus === ACTIVE && row.jm1pub_sellablestatus === SELLABLE && row.jm1pub_quotingstatus === QUOTABLE && row.jm1pub_contractstatus === CONTRACTABLE
  })
  const signature = bySku[SKU.signature]
  const signaturePass = signature.jm1pub_commercialstatus === SUPERSEDED && signature.jm1pub_sellablestatus === NOT_SELLABLE && signature.jm1pub_quotingstatus === NOT_QUOTABLE && signature.jm1pub_contractstatus === NOT_CONTRACTABLE
  return { packagesPass, signaturePass, packageRows: Object.fromEntries(Object.entries(bySku).map(([sku, row]) => [sku, row && { id: row.jm1pub_commercialcatalogitemid, rowId: row.jm1pub_catalogrowid, status: row.jm1pub_commercialstatus, price: row.jm1pub_unitprice }])) }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const token = authToken()
  const rows = await listRows(token)
  const plan = buildPackagePlan(rows)
  const signature = assertUnique(rows, SKU.signature)
  const currency = await request(token, `https://jm1hq.crm.dynamics.com/api/data/v9.2/transactioncurrencies(${signature._transactioncurrencyid_value})?$select=isocurrencycode`)
  if (currency.isocurrencycode !== 'USD') throw new Error('Package currency is not USD')
  const changes = plan.updates.map(({ row, patch }) => ({ sku: row.jm1pub_canonicalsku, id: row.jm1pub_commercialcatalogitemid, changedFields: Object.keys(diff(row, patch)) }))
  console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY_RUN', catalogRows: rows.length, createPremier: !!plan.createPremier, changes }, null, 2))
  if (!apply) return
  if (plan.createPremier) await request(token, BASE, 'POST', plan.createPremier)
  for (const { row, patch } of plan.updates) {
    const changed = diff(row, patch)
    if (Object.keys(changed).length) await request(token, `${BASE}(${row.jm1pub_commercialcatalogitemid})`, 'PATCH', changed, row['@odata.etag'])
  }
  const proof = readback(await listRows(token))
  console.log(JSON.stringify({ readback: proof }, null, 2))
  if (!proof.packagesPass || !proof.signaturePass) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
