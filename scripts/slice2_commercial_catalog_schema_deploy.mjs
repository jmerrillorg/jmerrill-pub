#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const args = new Map()
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i]
  if (!arg.startsWith('--')) continue
  const next = process.argv[i + 1]
  args.set(arg.slice(2), next && !next.startsWith('--') ? next : 'true')
  if (next && !next.startsWith('--')) i += 1
}

const manifestPath =
  args.get('manifest') ||
  'docs/architecture/generated/JMP-COMMERCIAL-CATALOG-SCHEMA-SPEC-2026-08-05/01-schema-manifest.json'
const seedPath =
  args.get('seed') ||
  'docs/architecture/generated/JMP-CATALOG-RECONCILIATION-FINAL-2026-08-05/09-slice2-seed-manifest.json'
const mode = args.get('mode') || 'readback'
const environmentUrl = (args.get('environment-url') || process.env.DATAVERSE_ENVIRONMENT_URL || '').replace(/\/+$/, '')
const evidencePath = args.get('evidence')

if (!['readback', 'provision'].includes(mode)) {
  throw new Error(`Unsupported mode ${mode}. Use readback or provision.`)
}
if (!environmentUrl) {
  throw new Error('--environment-url or DATAVERSE_ENVIRONMENT_URL is required.')
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
const resourceUrl = environmentUrl
const apiBase = `${environmentUrl}/api/data/v9.2`
const token = process.env.DATAVERSE_ACCESS_TOKEN || getAzureToken(resourceUrl)
const actions = []

function getAzureToken(resource) {
  const result = spawnSync(
    'az',
    ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'],
    { encoding: 'utf8' },
  )
  if (result.status !== 0) {
    throw new Error(`Azure token acquisition failed for ${resource}: ${result.stderr.trim()}`)
  }
  return result.stdout.trim()
}

function label(value) {
  return {
    LocalizedLabels: [{ Label: value, LanguageCode: 1033 }],
    UserLocalizedLabel: { Label: value, LanguageCode: 1033 },
  }
}

function required(value = 'None') {
  return {
    Value: value,
    CanBeChanged: true,
    ManagedPropertyLogicalName: 'canmodifyrequirementlevelsettings',
  }
}

function option(labelText, value) {
  return { Value: value, Label: label(labelText) }
}

function schemaSuffix(logicalName) {
  return logicalName
    .replace(/^jm1pub_/, '')
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('')
}

function textField(logicalName, displayName, maxLength = 500, req = 'None') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
    SchemaName: `jm1pub_${schemaSuffix(logicalName)}`,
    DisplayName: label(displayName),
    RequiredLevel: required(req),
    MaxLength: maxLength,
    FormatName: { Value: 'Text' },
  }
}

function memoField(logicalName, displayName) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.MemoAttributeMetadata',
    SchemaName: `jm1pub_${schemaSuffix(logicalName)}`,
    DisplayName: label(displayName),
    RequiredLevel: required('None'),
    MaxLength: 4000,
    FormatName: { Value: 'TextArea' },
  }
}

function picklistField(logicalName, displayName, values, req = 'ApplicationRequired') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata',
    SchemaName: `jm1pub_${schemaSuffix(logicalName)}`,
    DisplayName: label(displayName),
    RequiredLevel: required(req),
    OptionSet: {
      '@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata',
      IsGlobal: false,
      OptionSetType: 'Picklist',
      Options: values.map((item, index) => option(item, 100000000 + index)),
    },
  }
}

function moneyField(logicalName, displayName) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.MoneyAttributeMetadata',
    SchemaName: `jm1pub_${schemaSuffix(logicalName)}`,
    DisplayName: label(displayName),
    RequiredLevel: required('None'),
    MinValue: 0,
    MaxValue: 1000000000,
    PrecisionSource: 2,
  }
}

function boolField(logicalName, displayName) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata',
    SchemaName: `jm1pub_${schemaSuffix(logicalName)}`,
    DisplayName: label(displayName),
    RequiredLevel: required('ApplicationRequired'),
    OptionSet: {
      TrueOption: option('Yes', 1),
      FalseOption: option('No', 0),
    },
  }
}

function dateOnlyField(logicalName, displayName) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata',
    SchemaName: `jm1pub_${schemaSuffix(logicalName)}`,
    DisplayName: label(displayName),
    RequiredLevel: required('ApplicationRequired'),
    Format: 'DateOnly',
    DateTimeBehavior: { Value: 'DateOnly' },
  }
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
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${body}`)
  }
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function getMaybe(path) {
  try {
    return await request(path)
  } catch (error) {
    if (String(error.message).includes('404')) return null
    throw error
  }
}

async function waitFor(labelText, fn) {
  for (let i = 0; i < 30; i += 1) {
    const result = await fn()
    if (result) return result
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  throw new Error(`Timed out waiting for ${labelText}`)
}

async function getSolution(uniqueName) {
  const result = await request(
    `/solutions?$select=solutionid,uniquename,friendlyname,_publisherid_value&$filter=uniquename eq '${uniqueName}'`,
  )
  return result.value[0] || null
}

async function ensureSolution() {
  const existing = await getSolution(manifest.solution.uniqueName)
  if (existing) {
    actions.push({ type: 'solution', name: manifest.solution.uniqueName, status: 'exists' })
    return existing
  }

  const source = await getSolution(process.env.SLICE2_PUBLISHER_SOURCE_SOLUTION || 'JM1_Publishing')
  if (!source?._publisherid_value) throw new Error('Source publisher solution JM1_Publishing was not found.')

  await request('/solutions', {
    method: 'POST',
    body: JSON.stringify({
      uniquename: manifest.solution.uniqueName,
      friendlyname: manifest.solution.displayName,
      version: '1.0.0.0',
      'publisherid@odata.bind': `/publishers(${source._publisherid_value})`,
    }),
  })
  actions.push({ type: 'solution', name: manifest.solution.uniqueName, status: 'created' })
  return getSolution(manifest.solution.uniqueName)
}

async function getEntity() {
  return getMaybe(
    `/EntityDefinitions(LogicalName='${manifest.table.logicalName}')?$select=MetadataId,LogicalName,SchemaName,EntitySetName,OwnershipType,IsCustomEntity`,
  )
}

async function ensureEntity() {
  const existing = await getEntity()
  if (existing) {
    actions.push({ type: 'table', name: manifest.table.logicalName, status: 'exists' })
    await addSolutionComponent(1, existing.MetadataId, manifest.table.logicalName, true)
    const primaryName = await getAttribute(manifest.table.primaryName)
    if (primaryName?.MetadataId) {
      await addSolutionComponent(2, primaryName.MetadataId, manifest.table.primaryName, false)
    }
    return existing
  }
  await request('/EntityDefinitions', {
    method: 'POST',
    body: JSON.stringify({
      '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata',
      SchemaName: manifest.table.schemaName,
      DisplayName: label(manifest.table.displayName),
      DisplayCollectionName: label(manifest.table.pluralDisplayName),
      Description: label('JMP commercial SKU catalog authority for approved product, service, package, and program rows.'),
      OwnershipType: manifest.table.ownership,
      IsActivity: false,
      HasActivities: false,
      HasNotes: true,
      Attributes: [
        {
          '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
          SchemaName: 'jm1pub_Name',
          DisplayName: label('Name'),
          RequiredLevel: required('ApplicationRequired'),
          MaxLength: 250,
          FormatName: { Value: 'Text' },
          IsPrimaryName: true,
        },
      ],
    }),
  })
  const created = await waitFor(manifest.table.logicalName, getEntity)
  actions.push({ type: 'table', name: manifest.table.logicalName, status: 'created' })
  await addSolutionComponent(1, created.MetadataId, manifest.table.logicalName, true)
  return created
}

async function getAttribute(logicalName) {
  return getMaybe(
    `/EntityDefinitions(LogicalName='${manifest.table.logicalName}')/Attributes(LogicalName='${logicalName}')?$select=MetadataId,LogicalName,SchemaName,AttributeType`,
  )
}

async function ensureAttribute(logicalName, metadata) {
  const existing = await getAttribute(logicalName)
  if (existing) {
    actions.push({ type: 'field', name: logicalName, status: 'exists' })
    await addSolutionComponent(2, existing.MetadataId, logicalName, false)
    return existing
  }
  console.error(`[slice2-schema] creating field ${manifest.table.logicalName}.${logicalName}`)
  await request(`/EntityDefinitions(LogicalName='${manifest.table.logicalName}')/Attributes`, {
    method: 'POST',
    body: JSON.stringify(metadata),
  })
  const created = await waitFor(logicalName, () => getAttribute(logicalName))
  console.error(`[slice2-schema] field ready ${manifest.table.logicalName}.${logicalName}`)
  actions.push({ type: 'field', name: logicalName, status: 'created' })
  await addSolutionComponent(2, created.MetadataId, logicalName, false)
  return created
}

async function ensureSelfLookup() {
  const existing = await getAttribute('jm1pub_supersededby')
  if (existing) {
    actions.push({ type: 'relationship', name: 'jm1pub_supersededby', status: 'exists' })
    return existing
  }
  await request('/RelationshipDefinitions', {
    method: 'POST',
    body: JSON.stringify({
      '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
      SchemaName: 'jm1pub_CommercialCatalogItem_SupersededBy',
      ReferencedEntity: manifest.table.logicalName,
      ReferencingEntity: manifest.table.logicalName,
      AssociatedMenuConfiguration: {
        Behavior: 'UseLabel',
        Group: 'Details',
        Label: label('Superseded By'),
        Order: 10000,
      },
      CascadeConfiguration: {
        Assign: 'NoCascade',
        Delete: 'RemoveLink',
        Archive: 'RemoveLink',
        Merge: 'Cascade',
        Reparent: 'NoCascade',
        Share: 'NoCascade',
        Unshare: 'NoCascade',
        RollupView: 'NoCascade',
      },
      Lookup: {
        '@odata.type': 'Microsoft.Dynamics.CRM.LookupAttributeMetadata',
        SchemaName: 'jm1pub_SupersededBy',
        DisplayName: label('Superseded By'),
        RequiredLevel: required('None'),
      },
    }),
  })
  const created = await waitFor('jm1pub_supersededby', () => getAttribute('jm1pub_supersededby'))
  actions.push({ type: 'relationship', name: 'jm1pub_supersededby', status: 'created' })
  return created
}

async function getKeys() {
  const result = await request(
    `/EntityDefinitions(LogicalName='${manifest.table.logicalName}')/Keys?$select=KeyAttributes,LogicalName,SchemaName,DisplayName,EntityKeyIndexStatus`,
  )
  return result.value || []
}

async function ensureKey(key) {
  const existing = (await getKeys()).find((item) => item.LogicalName === key.logicalName || item.SchemaName === key.logicalName)
  if (existing) {
    actions.push({ type: 'alternate-key', name: key.logicalName, status: 'exists' })
    return existing
  }
  await request(`/EntityDefinitions(LogicalName='${manifest.table.logicalName}')/Keys`, {
    method: 'POST',
    body: JSON.stringify({
      '@odata.type': 'Microsoft.Dynamics.CRM.EntityKeyMetadata',
      SchemaName: key.logicalName,
      DisplayName: label(key.displayName),
      KeyAttributes: key.columns,
    }),
  })
  actions.push({ type: 'alternate-key', name: key.logicalName, status: 'created' })
  return null
}

async function addSolutionComponent(componentType, componentId, name, addRequiredComponents) {
  try {
    await request('/AddSolutionComponent', {
      method: 'POST',
      body: JSON.stringify({
        ComponentType: componentType,
        ComponentId: componentId,
        SolutionUniqueName: manifest.solution.uniqueName,
        AddRequiredComponents: addRequiredComponents,
      }),
    })
    actions.push({ type: 'solution-component', name, componentType, status: 'added' })
  } catch (error) {
    actions.push({
      type: 'solution-component',
      name,
      componentType,
      status: 'deferred',
      reason: String(error.message).slice(0, 240),
    })
  }
}

async function getRootBusinessUnit() {
  const result = await request('/businessunits?$select=businessunitid,name,_parentbusinessunitid_value&$top=100')
  return result.value.find((row) => !row._parentbusinessunitid_value) || result.value[0]
}

async function ensureRole(name) {
  const existing = await request(`/roles?$select=roleid,name&$filter=name eq '${name.replace(/'/g, "''")}'&$top=1`)
  if (existing.value[0]) {
    actions.push({ type: 'security-role', name, status: 'exists' })
    return existing.value[0]
  }
  const root = await getRootBusinessUnit()
  if (!root?.businessunitid) throw new Error('Root business unit not found for security role creation.')
  const role = await request('/roles', {
    method: 'POST',
    body: JSON.stringify({
      name,
      'businessunitid@odata.bind': `/businessunits(${root.businessunitid})`,
    }),
  })
  actions.push({ type: 'security-role', name, status: 'created' })
  if (role?.roleid) await addSolutionComponent(20, role.roleid, name, false)
  return role
}

async function publish() {
  await request('/PublishAllXml', { method: 'POST', body: JSON.stringify({}) })
  actions.push({ type: 'publish', status: 'completed' })
}

function uniqueSeedValues(field, fallback = []) {
  const values = [...new Set((seed.records || []).map((row) => row[field]).filter(Boolean))]
  return values.length ? values.sort() : fallback
}

function approvedFields() {
  return [
    ['jm1pub_canonicalsku', textField('jm1pub_canonicalsku', 'Canonical SKU', 120, 'ApplicationRequired')],
    ['jm1pub_legacysku', textField('jm1pub_legacysku', 'Legacy SKU', 120)],
    ['jm1pub_catalogrowid', textField('jm1pub_catalogrowid', 'Catalog Row ID', 80, 'ApplicationRequired')],
    ['jm1pub_category', picklistField('jm1pub_category', 'Category', uniqueSeedValues('category'))],
    ['jm1pub_description', memoField('jm1pub_description', 'Description')],
    ['jm1pub_jackieruling', picklistField('jm1pub_jackieruling', 'Jackie Ruling', ['MIGRATE', 'AMEND', 'RETIRE', 'MERGE', 'PROVISIONAL'])],
    [
      'jm1pub_commercialstatus',
      picklistField('jm1pub_commercialstatus', 'Commercial Status', [
        'ACTIVE',
        'SUPERSEDED',
        'RETIRED',
        'PROVISIONAL',
        'INTERNAL_ONLY',
        'SCHEMA_INERT',
      ]),
    ],
    ['jm1pub_sourceauthority', textField('jm1pub_sourceauthority', 'Source Authority', 500, 'ApplicationRequired')],
    ['jm1pub_matrixversion', textField('jm1pub_matrixversion', 'Matrix Version', 80, 'ApplicationRequired')],
    ['jm1pub_effectivedate', dateOnlyField('jm1pub_effectivedate', 'Effective Date')],
    ['jm1pub_evidencereference', textField('jm1pub_evidencereference', 'Evidence Reference', 1000, 'ApplicationRequired')],
    ['jm1pub_seedchecksum', textField('jm1pub_seedchecksum', 'Seed Checksum', 128, 'ApplicationRequired')],
    ['jm1pub_authorityversion', textField('jm1pub_authorityversion', 'Authority Version', 120, 'ApplicationRequired')],
    ['jm1pub_publicvisibility', picklistField('jm1pub_publicvisibility', 'Public Visibility', ['PUBLIC', 'NON_PUBLIC', 'CONDITIONAL'])],
    ['jm1pub_quotingstatus', picklistField('jm1pub_quotingstatus', 'Quoting Status', ['QUOTABLE', 'SOW_GATED', 'NOT_QUOTABLE'])],
    ['jm1pub_sellablestatus', picklistField('jm1pub_sellablestatus', 'Sellable Status', ['SELLABLE', 'NOT_SELLABLE'])],
    ['jm1pub_contractstatus', picklistField('jm1pub_contractstatus', 'Contract Status', ['CONTRACTABLE', 'NOT_CONTRACTABLE'])],
    [
      'jm1pub_pricingmethod',
      picklistField('jm1pub_pricingmethod', 'Pricing Method', [
        'FIXED',
        'STARTING_AT',
        'PER_FINISHED_HOUR',
        'TIERED',
        'QUOTED',
        'COMMISSION',
        'INCLUDED',
        'NOT_APPLICABLE',
      ]),
    ],
    ['jm1pub_unitprice', moneyField('jm1pub_unitprice', 'Unit Price')],
    ['jm1pub_priceexpression', textField('jm1pub_priceexpression', 'Price Expression', 500)],
    ['jm1pub_sloteligibility', picklistField('jm1pub_sloteligibility', 'Slot Eligibility', uniqueSeedValues('slotEligibility', ['Yes', 'No', 'Conditional']))],
    ['jm1pub_premiumupcharge', moneyField('jm1pub_premiumupcharge', 'Premium Upcharge')],
    ['jm1pub_publishingtrackapplicability', textField('jm1pub_publishingtrackapplicability', 'Publishing Track Applicability', 500, 'ApplicationRequired')],
    ['jm1pub_productformcode', picklistField('jm1pub_productformcode', 'Product Form Code', ['PF-01', 'PF-02', 'PF-03', 'PF-04', 'PF-05', 'PF-06', 'PF-07', 'PF-08', 'N/A'], 'None')],
    ['jm1pub_releasemodelcode', textField('jm1pub_releasemodelcode', 'Release Model Code', 120)],
    ['jm1pub_productionmodecode', textField('jm1pub_productionmodecode', 'Production Mode Code', 120)],
    ['jm1pub_scopegate', picklistField('jm1pub_scopegate', 'Scope Gate', ['NONE', 'SOW_GATED', 'CONDITIONAL', 'INTERNAL_ONLY'])],
    ['jm1pub_requiresstatementofwork', boolField('jm1pub_requiresstatementofwork', 'Requires Statement of Work')],
    ['jm1pub_replacementreason', textField('jm1pub_replacementreason', 'Replacement Reason', 500)],
    ['jm1pub_migrationaction', memoField('jm1pub_migrationaction', 'Migration Action')],
    ['jm1pub_downstreamremediation', memoField('jm1pub_downstreamremediation', 'Downstream Remediation')],
    ['jm1pub_recordfingerprint', textField('jm1pub_recordfingerprint', 'Record Fingerprint', 128, 'ApplicationRequired')],
  ]
}

async function provision() {
  await ensureSolution()
  await ensureEntity()
  for (const [logicalName, metadata] of approvedFields()) {
    await ensureAttribute(logicalName, metadata)
  }
  await ensureSelfLookup()
  for (const key of manifest.alternateKeys) {
    await ensureKey(key)
  }
  for (const role of manifest.securityRoles) {
    await ensureRole(role.name)
  }
  await publish()
}

async function readback() {
  const entity = await getEntity()
  const attributes = entity
    ? await request(
        `/EntityDefinitions(LogicalName='${manifest.table.logicalName}')/Attributes?$select=LogicalName,SchemaName,AttributeType,RequiredLevel,IsPrimaryId,IsPrimaryName&$orderby=LogicalName`,
      )
    : { value: [] }
  const keys = entity ? await getKeys() : []
  const roles = []
  for (const role of manifest.securityRoles) {
    const result = await request(`/roles?$select=roleid,name&$filter=name eq '${role.name.replace(/'/g, "''")}'&$top=1`)
    roles.push({ name: role.name, deployed: Boolean(result.value[0]) })
  }
  return {
    entity: entity
      ? {
          logicalName: entity.LogicalName,
          schemaName: entity.SchemaName,
          entitySetName: entity.EntitySetName,
          ownershipType: entity.OwnershipType,
          isCustomEntity: entity.IsCustomEntity,
        }
      : null,
    attributes: attributes.value.map((attribute) => ({
      logicalName: attribute.LogicalName,
      schemaName: attribute.SchemaName,
      type: attribute.AttributeType,
      requiredLevel: attribute.RequiredLevel?.Value || null,
      isPrimaryId: attribute.IsPrimaryId,
      isPrimaryName: attribute.IsPrimaryName,
    })),
    keys,
    securityRoles: roles,
  }
}

if (mode === 'provision') await provision()
const result = {
  generatedAt: new Date().toISOString(),
  mode,
  environmentUrl,
  solution: manifest.solution.uniqueName,
  table: manifest.table.logicalName,
  seedRows: seed.totalRows,
  actions,
  readback: await readback(),
  mutationBoundary: {
    catalogRowsSeeded: 0,
    businessCentralMutations: 0,
    publicWebsiteChanges: 0,
    authorCommunications: 0,
    clientTitleAutomation: 'FROZEN',
  },
}

if (evidencePath) {
  mkdirSync(dirname(evidencePath), { recursive: true })
  writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`)
}

console.log(JSON.stringify(result, null, 2))
