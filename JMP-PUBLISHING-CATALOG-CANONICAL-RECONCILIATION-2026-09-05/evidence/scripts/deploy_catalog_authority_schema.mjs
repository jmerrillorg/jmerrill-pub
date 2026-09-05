#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const LCID = 1033
const execute = process.argv.includes('--execute')
const environmentArg = process.argv.find((arg) => arg.startsWith('--environment='))?.split('=')[1] || 'dev'
const environments = {
  dev: 'https://org52409ff2.crm.dynamics.com',
  test: 'https://jm1test.crm.dynamics.com',
  core: 'https://jm1hq.crm.dynamics.com',
}
const resource = (environments[environmentArg] || environmentArg).replace(/\/$/, '')
const apiBase = `${resource}/api/data/v9.2`
const solutionUniqueName = 'JM1_Publishing'
const evidencePath = resolve(
  `JMP-PUBLISHING-CATALOG-CANONICAL-RECONCILIATION-2026-09-05/evidence/dataverse/schema-${environmentArg}-${execute ? 'deployment' : 'plan'}.json`,
)
const token = execFileSync(
  'az',
  ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
).trim()
const actions = []

const label = (value) => ({
  LocalizedLabels: [{ Label: value, LanguageCode: LCID }],
  UserLocalizedLabel: { Label: value, LanguageCode: LCID },
})
const required = (value = 'None') => ({
  Value: value,
  CanBeChanged: true,
  ManagedPropertyLogicalName: 'canmodifyrequirementlevelsettings',
})
const text = (schemaName, displayName, maxLength = 200) => ({
  logicalName: schemaName.toLowerCase(),
  metadata: {
    '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required(),
    MaxLength: maxLength,
    FormatName: { Value: 'Text' },
  },
})
const whole = (schemaName, displayName) => ({
  logicalName: schemaName.toLowerCase(),
  metadata: {
    '@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required(),
    MinValue: 0,
    MaxValue: 2147483647,
    Format: 'None',
  },
})
const bool = (schemaName, displayName) => ({
  logicalName: schemaName.toLowerCase(),
  metadata: {
    '@odata.type': 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required(),
    DefaultValue: false,
    OptionSet: {
      TrueOption: { Value: 1, Label: label('Yes') },
      FalseOption: { Value: 0, Label: label('No') },
      OptionSetType: 'Boolean',
    },
  },
})

const attributePlan = {
  jm1pub_title: [
    text('jm1pub_CatalogWorkKey', 'Canonical Work Key', 300),
    text('jm1pub_PublisherOriginState', 'Publisher Origin State', 100),
    text('jm1pub_AuthorityChangeFinding', 'Authority Change Finding', 100),
    text('jm1pub_CurrentCatalogState', 'Current Catalog State', 100),
    text('jm1pub_CatalogLifecycleDetail', 'Catalog Lifecycle Detail', 100),
    text('jm1pub_MarketingAuthorityState', 'Marketing Authority State', 100),
    text('jm1pub_RetirementState', 'Retirement State', 100),
    text('jm1pub_RightsHoldState', 'Rights Hold State', 100),
    text('jm1pub_CatalogSourceChecksum', 'Catalog Source Checksum', 64),
    text('jm1pub_CatalogCorrelationId', 'Catalog Correlation ID', 100),
    text('jm1pub_CurrentEditionReference', 'Current Edition Reference', 100),
  ],
  jm1pub_edition: [
    text('jm1pub_CanonicalEditionKey', 'Canonical Edition Key', 500),
    text('jm1pub_EditionRelationship', 'Edition Relationship', 100),
    text('jm1pub_CatalogSourceChecksum', 'Catalog Source Checksum', 64),
    text('jm1pub_CatalogCorrelationId', 'Catalog Correlation ID', 100),
    text('jm1pub_PublicationDateSource', 'Publication Date Source', 500),
  ],
  jm1pub_publishingasset: [
    text('jm1pub_CanonicalProductKey', 'Canonical Product Key', 300),
    text('jm1pub_CatalogDistributionState', 'Catalog Distribution State', 100),
    text('jm1pub_RawLegacyStatus', 'Raw Legacy Status', 200),
    text('jm1pub_RawHouse', 'Raw House', 50),
    text('jm1pub_RawContract', 'Raw Contract', 50),
    text('jm1pub_RawIsDistributed', 'Raw Is Distributed', 50),
    text('jm1pub_CatalogSourceChecksum', 'Catalog Source Checksum', 64),
    text('jm1pub_CatalogCorrelationId', 'Catalog Correlation ID', 100),
    whole('jm1pub_SourceRowNumber', 'Source Row Number'),
  ],
  jm1pub_isbnallocation: [
    text('jm1pub_NormalizedIsbn', 'Normalized ISBN', 30),
    text('jm1pub_AllocationClassification', 'Allocation Classification', 100),
    text('jm1pub_RawIsbn13', 'Raw ISBN13', 100),
    text('jm1pub_RawIsbn', 'Raw ISBN', 100),
    whole('jm1pub_SourceRowNumber', 'Source Row Number'),
    text('jm1pub_CatalogSourceChecksum', 'Catalog Source Checksum', 64),
    text('jm1pub_CatalogCorrelationId', 'Catalog Correlation ID', 100),
    bool('jm1pub_IsAssigned', 'Is Assigned'),
  ],
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      ...(options.headers || {}),
    },
  })
  const body = await response.text()
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${body.slice(0, 1200)}`)
  return body ? JSON.parse(body) : null
}

async function optional(path) {
  try {
    return await request(path)
  } catch (error) {
    if (String(error.message).includes(': 404 ')) return null
    throw error
  }
}

async function entity(logicalName) {
  return optional(`/EntityDefinitions(LogicalName='${logicalName}')?$select=MetadataId,LogicalName,SchemaName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute`)
}

async function attribute(table, logicalName) {
  return optional(`/EntityDefinitions(LogicalName='${table}')/Attributes(LogicalName='${logicalName}')?$select=MetadataId,LogicalName,SchemaName,AttributeType,IsValidForCreate,IsValidForUpdate`)
}

async function addComponent(type, id, name) {
  if (!execute) return
  try {
    await request('/AddSolutionComponent', {
      method: 'POST',
      body: JSON.stringify({ ComponentType: type, ComponentId: id, SolutionUniqueName: solutionUniqueName, AddRequiredComponents: false }),
    })
    actions.push({ kind: 'solution-component', name, status: 'ADDED' })
  } catch (error) {
    actions.push({ kind: 'solution-component', name, status: 'DEFERRED', detail: String(error.message || error) })
  }
}

async function ensureEntity() {
  let found = await entity('jm1pub_isbnallocation')
  if (found) {
    actions.push({ kind: 'table', name: 'jm1pub_isbnallocation', status: 'EXISTS', metadataId: found.MetadataId })
    return found
  }
  actions.push({ kind: 'table', name: 'jm1pub_isbnallocation', status: execute ? 'CREATE' : 'WOULD_CREATE' })
  if (!execute) return null
  await request('/EntityDefinitions', {
    method: 'POST',
    body: JSON.stringify({
      '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata',
      SchemaName: 'jm1pub_IsbnAllocation',
      DisplayName: label('ISBN Allocation'),
      DisplayCollectionName: label('ISBN Allocations'),
      Description: label('Publisher-owned ISBN allocation inventory, including reserved and unassigned identifiers.'),
      OwnershipType: 'UserOwned',
      IsActivity: false,
      HasActivities: false,
      HasNotes: true,
      Attributes: [
        {
          '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
          SchemaName: 'jm1pub_Name',
          DisplayName: label('Name'),
          RequiredLevel: required('ApplicationRequired'),
          MaxLength: 200,
          FormatName: { Value: 'Text' },
          IsPrimaryName: true,
        },
      ],
    }),
  })
  for (let attempt = 0; attempt < 30 && !found; attempt += 1) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2000))
    found = await entity('jm1pub_isbnallocation')
  }
  if (!found) throw new Error('Timed out waiting for jm1pub_isbnallocation')
  await addComponent(1, found.MetadataId, 'jm1pub_isbnallocation')
  return found
}

async function ensureAttributes(table, fields) {
  for (const field of fields) {
    let found = await attribute(table, field.logicalName)
    if (found) {
      actions.push({ kind: 'field', table, name: field.logicalName, status: 'EXISTS', metadataId: found.MetadataId })
      continue
    }
    actions.push({ kind: 'field', table, name: field.logicalName, status: execute ? 'CREATE' : 'WOULD_CREATE' })
    if (!execute) continue
    await request(`/EntityDefinitions(LogicalName='${table}')/Attributes`, { method: 'POST', body: JSON.stringify(field.metadata) })
    for (let attempt = 0; attempt < 30 && !found; attempt += 1) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500))
      found = await attribute(table, field.logicalName)
    }
    if (!found) throw new Error(`Timed out waiting for ${table}.${field.logicalName}`)
    await addComponent(2, found.MetadataId, `${table}.${field.logicalName}`)
  }
}

async function relationship(schemaName) {
  const result = await request(`/RelationshipDefinitions?$select=MetadataId,SchemaName&$filter=SchemaName eq '${schemaName}'`)
  return result.value?.[0] || null
}

async function ensureEditionLookup() {
  const schemaName = 'jm1pub_Edition_PublishingAssets'
  const found = await relationship(schemaName)
  if (found) {
    actions.push({ kind: 'relationship', name: schemaName, status: 'EXISTS', metadataId: found.MetadataId })
    return
  }
  actions.push({ kind: 'relationship', name: schemaName, status: execute ? 'CREATE' : 'WOULD_CREATE' })
  if (!execute) return
  await request('/RelationshipDefinitions', {
    method: 'POST',
    body: JSON.stringify({
      '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
      SchemaName: schemaName,
      ReferencedEntity: 'jm1pub_edition',
      ReferencedAttribute: 'jm1pub_editionid',
      ReferencingEntity: 'jm1pub_publishingasset',
      Lookup: {
        '@odata.type': 'Microsoft.Dynamics.CRM.LookupAttributeMetadata',
        SchemaName: 'jm1pub_EditionId',
        DisplayName: label('Edition'),
        RequiredLevel: required(),
      },
    }),
  })
}

const whoAmI = await request('/WhoAmI')
const existingTables = {}
for (const table of ['jm1pub_title', 'jm1pub_edition', 'jm1pub_publishingasset']) {
  existingTables[table] = await entity(table)
  if (!existingTables[table]) throw new Error(`Required existing table is missing: ${table}`)
}
await ensureEntity()
for (const [table, fields] of Object.entries(attributePlan)) await ensureAttributes(table, fields)
await ensureEditionLookup()
if (execute) await request('/PublishAllXml', { method: 'POST', body: '{}' })

const output = {
  generatedAt: new Date().toISOString(),
  mode: execute ? 'EXECUTE' : 'DRY_RUN',
  environment: { name: environmentArg, resource, organizationId: whoAmI.OrganizationId },
  solutionUniqueName,
  existingTables,
  actions,
  summary: Object.fromEntries(
    [...new Set(actions.map((action) => action.status))].map((status) => [status, actions.filter((action) => action.status === status).length]),
  ),
}
mkdirSync(dirname(evidencePath), { recursive: true })
writeFileSync(evidencePath, `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({ evidencePath, mode: output.mode, environment: output.environment, summary: output.summary }, null, 2))
