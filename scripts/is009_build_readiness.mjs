#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const repoRoot = process.cwd()
const generalDir =
  '/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Documents/General'
const evidenceDir = join(repoRoot, 'docs/implementation/evidence/IS-009')
mkdirSync(evidenceDir, { recursive: true })

const sourceFiles = [
  'MONTHLY REPORTING 2026(1).xlsx',
  'IS report.csv',
  'LSI report.csv',
  'Total_Asset_Listing_20260706_0831.xlsx',
  'prefix-9781950719.csv',
  'prefix-9781954414.csv',
  'prefix-9781961475.csv',
  'prefix-9781969418.csv',
]

const targetTables = [
  { logicalName: 'contact', label: 'Contact' },
  { logicalName: 'jm1pub_contract', label: 'jm1pub_contract' },
  { logicalName: 'jm1pub_title', label: 'jm1pub_title' },
  { logicalName: 'jm1_executionlog', label: 'jm1_executionlog' },
  { logicalName: 'jm1pub_publishingasset', label: 'jm1pub_publishingasset conflict check' },
  { logicalName: 'jm1pub_assetmarketplace', label: 'jm1pub_assetmarketplace conflict check' },
]

function sha256(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(path)
    let bytes = 0
    stream.on('data', (chunk) => {
      bytes += chunk.length
      hash.update(chunk)
    })
    stream.on('error', reject)
    stream.on('end', () => resolve({ sha256: hash.digest('hex'), bytesRead: bytes }))
  })
}

async function freezeSources() {
  const rows = []
  for (const file of sourceFiles) {
    const path = join(generalDir, file)
    if (!existsSync(path)) {
      rows.push({ file, path, exists: false, status: 'MISSING' })
      continue
    }
    const stat = statSync(path)
    const digest = await sha256(path)
    rows.push({
      file,
      path,
      exists: true,
      sizeBytes: stat.size,
      bytesRead: digest.bytesRead,
      sha256: digest.sha256,
      modifiedAt: stat.mtime.toISOString(),
      status: stat.size === digest.bytesRead ? 'FROZEN' : 'READ_MISMATCH',
    })
  }
  return rows
}

function dataverseConfig() {
  const environmentUrl = cleanUrl(process.env.DATAVERSE_ENVIRONMENT_URL)
  const resourceUrl = cleanUrl(process.env.DATAVERSE_RESOURCE_URL || environmentUrl)
  const apiBase = cleanUrl(
    process.env.DATAVERSE_WEB_API_BASE_URL || (environmentUrl ? `${environmentUrl}/api/data/v9.2` : ''),
  )
  const config = {
    tenantId: process.env.DATAVERSE_TENANT_ID || '',
    clientId: process.env.DATAVERSE_CLIENT_ID || '',
    clientSecret: process.env.DATAVERSE_CLIENT_SECRET || '',
    resourceUrl,
    apiBase,
  }
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  return { ok: missing.length === 0, missing, value: config }
}

function cleanUrl(value) {
  return (value || '').replace(/\/$/, '')
}

async function token(config) {
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: `${config.resourceUrl}/.default`,
      grant_type: 'client_credentials',
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body.access_token) {
    throw new Error(`dataverse_token_failed:${response.status}`)
  }
  return body.access_token
}

async function dvGet(apiBase, accessToken, path) {
  const response = await fetch(`${apiBase}/${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      code: body?.error?.code || null,
      message: body?.error?.message || `HTTP ${response.status}`,
    }
  }
  return { ok: true, status: response.status, body }
}

async function inventoryDataverse() {
  const config = dataverseConfig()
  if (!config.ok) {
    return {
      status: 'SKIPPED_CONFIG_MISSING',
      missing: config.missing,
      tables: [],
    }
  }

  const accessToken = await token(config.value)
  const tables = []
  for (const target of targetTables) {
    const entity = await dvGet(
      config.value.apiBase,
      accessToken,
      `EntityDefinitions(LogicalName='${target.logicalName}')?$select=LogicalName,SchemaName,DisplayName,EntitySetName,OwnershipType,IsCustomEntity`,
    )
    if (!entity.ok) {
      tables.push({
        logicalName: target.logicalName,
        label: target.label,
        exists: false,
        readStatus: entity.status,
        errorCode: entity.code,
        errorMessage: entity.message,
      })
      continue
    }

    const attributes = await dvGet(
      config.value.apiBase,
      accessToken,
      `EntityDefinitions(LogicalName='${target.logicalName}')/Attributes?$select=LogicalName,SchemaName,AttributeType,RequiredLevel,IsCustomAttribute,IsPrimaryId,IsPrimaryName&$orderby=LogicalName`,
    )
    const relationships = await dvGet(
      config.value.apiBase,
      accessToken,
      `EntityDefinitions(LogicalName='${target.logicalName}')/ManyToOneRelationships?$select=SchemaName,ReferencingAttribute,ReferencedEntity,ReferencingEntity,ReferencedAttribute&$orderby=SchemaName`,
    )
    const keys = await dvGet(
      config.value.apiBase,
      accessToken,
      `EntityDefinitions(LogicalName='${target.logicalName}')/Keys?$select=KeyAttributes,LogicalName,SchemaName,DisplayName`,
    )

    tables.push({
      logicalName: target.logicalName,
      label: target.label,
      exists: true,
      entity: summarizeEntity(entity.body),
      attributes: attributes.ok ? attributes.body.value.map(summarizeAttribute) : [],
      attributeReadError: attributes.ok ? null : { status: attributes.status, message: attributes.message },
      manyToOneRelationships: relationships.ok ? relationships.body.value : [],
      relationshipReadError: relationships.ok ? null : { status: relationships.status, message: relationships.message },
      keys: keys.ok ? keys.body.value : [],
      keyReadError: keys.ok ? null : { status: keys.status, message: keys.message },
    })
  }

  return {
    status: 'READ',
    apiBase: config.value.apiBase.replace(/https:\/\/([^/]+).*/, 'https://$1/api/data/v9.2'),
    tables,
  }
}

function summarizeEntity(entity) {
  return {
    logicalName: entity.LogicalName,
    schemaName: entity.SchemaName,
    entitySetName: entity.EntitySetName,
    ownershipType: entity.OwnershipType,
    isCustomEntity: entity.IsCustomEntity,
    displayName: entity.DisplayName?.UserLocalizedLabel?.Label || null,
  }
}

function summarizeAttribute(attribute) {
  return {
    logicalName: attribute.LogicalName,
    schemaName: attribute.SchemaName,
    type: attribute.AttributeType,
    requiredLevel: attribute.RequiredLevel?.Value || null,
    isCustomAttribute: attribute.IsCustomAttribute,
    isPrimaryId: attribute.IsPrimaryId,
    isPrimaryName: attribute.IsPrimaryName,
  }
}

function markdownFreeze(rows, generatedAt) {
  const lines = [
    '# IS-009 Source Freeze Report',
    '',
    `**Generated:** ${generatedAt}`,
    '**Scope:** Read-only source file freeze for PAM / IS-009 build readiness.',
    '',
    '| Source | Size Bytes | Bytes Read | SHA-256 | Modified At | Status |',
    '| --- | ---: | ---: | --- | --- | --- |',
  ]
  for (const row of rows) {
    lines.push(
      `| ${row.file} | ${row.sizeBytes ?? ''} | ${row.bytesRead ?? ''} | ${row.sha256 ?? ''} | ${row.modifiedAt ?? ''} | ${row.status} |`,
    )
  }
  lines.push('', 'No source files were modified by this freeze.')
  return `${lines.join('\n')}\n`
}

async function main() {
  const generatedAt = new Date().toISOString()
  const freeze = await freezeSources()
  const inventory = await inventoryDataverse().catch((error) => ({
    status: 'FAILED',
    error: error.message,
    tables: [],
  }))

  const report = { generatedAt, sourceDirectory: generalDir, sourceFreeze: freeze, dataverseInventory: inventory }
  writeFileSync(join(evidenceDir, 'is009-readiness-evidence.json'), JSON.stringify(report, null, 2))
  writeFileSync(join(evidenceDir, 'IS-009-Source-Freeze-Report.md'), markdownFreeze(freeze, generatedAt))
  console.log(JSON.stringify({ generatedAt, sourceFreeze: freeze.map(({ file, status, sha256 }) => ({ file, status, sha256 })), dataverseInventoryStatus: inventory.status }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
