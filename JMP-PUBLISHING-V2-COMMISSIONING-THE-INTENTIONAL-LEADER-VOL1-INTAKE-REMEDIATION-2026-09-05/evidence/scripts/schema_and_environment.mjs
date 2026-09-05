import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const DEV_URL = 'https://org52409ff2.crm.dynamics.com'
const DEV_ORG_ID = '579864ae-44cc-f011-95c7-000d3a37fe06'
const SOLUTION = 'JMP_PublishingV2'
const OUTPUT = 'JMP-PUBLISHING-V2-COMMISSIONING-THE-INTENTIONAL-LEADER-VOL1-INTAKE-REMEDIATION-2026-09-05/evidence/dataverse/schema_environment_evidence.json'

const tables = [
  table('jmpv2_intakeresponse', 'jmpv2_IntakeResponse', 'V2 Intake Response', 'V2 Intake Responses', [
    text('jmpv2_responsekey', 'jmpv2_ResponseKey', 'Response Key', 240, true),
    text('jmpv2_authorcontactid', 'jmpv2_AuthorContactId', 'Author Contact ID', 80),
    text('jmpv2_publishingengagementid', 'jmpv2_PublishingEngagementId', 'Publishing Engagement ID', 80),
    text('jmpv2_lifecycleinstanceid', 'jmpv2_LifecycleInstanceId', 'Lifecycle Instance ID', 80),
    text('jmpv2_intakesubmissionid', 'jmpv2_IntakeSubmissionId', 'Intake Submission ID', 80),
    text('jmpv2_questioncode', 'jmpv2_QuestionCode', 'Question Code', 100),
    text('jmpv2_fieldname', 'jmpv2_FieldName', 'Field Name', 100),
    memo('jmpv2_responsevalue', 'jmpv2_ResponseValue', 'Response Value', 4000),
    integer('jmpv2_responseversion', 'jmpv2_ResponseVersion', 'Response Version'),
    text('jmpv2_submissionstatus', 'jmpv2_SubmissionStatus', 'Submission Status', 40),
    text('jmpv2_authoritycontext', 'jmpv2_AuthorityContext', 'Authority Context', 160),
    text('jmpv2_correlationid', 'jmpv2_CorrelationId', 'Correlation ID', 160),
    text('jmpv2_environment', 'jmpv2_Environment', 'Environment', 80),
    date('jmpv2_updatedat', 'jmpv2_UpdatedAt', 'Updated At'),
  ]),
  table('jmpv2_environmentauthority', 'jmpv2_EnvironmentAuthority', 'V2 Environment Authority', 'V2 Environment Authorities', [
    text('jmpv2_environmentkey', 'jmpv2_EnvironmentKey', 'Environment Key', 160, true),
    text('jmpv2_organizationid', 'jmpv2_OrganizationId', 'Organization ID', 80),
    text('jmpv2_environmentname', 'jmpv2_EnvironmentName', 'Environment Name', 100),
    text('jmpv2_classification', 'jmpv2_Classification', 'Classification', 100),
    text('jmpv2_resourceurl', 'jmpv2_ResourceUrl', 'Resource URL', 300),
    bool('jmpv2_isactive', 'jmpv2_IsActive', 'Is Active'),
  ]),
]

async function main() {
  const request = createClient(DEV_URL)
  const evidence = { startedAt: new Date().toISOString(), environment: 'JM1-Dev', operations: [] }
  const who = await request('WhoAmI()')
  if (String(who.OrganizationId).toLowerCase() !== DEV_ORG_ID) throw new Error('not_development_environment')
  evidence.whoAmI = who

  for (const definition of tables) await ensureTable(request, definition, evidence)
  await request('PublishAllXml', { method: 'POST', body: '{}' })
  await ensureKey(request, 'jmpv2_intakeresponse', 'jmpv2_IntakeResponse_ResponseKey', ['jmpv2_responsekey'], evidence)
  await ensureKey(request, 'jmpv2_environmentauthority', 'jmpv2_EnvironmentAuthority_Organization', ['jmpv2_organizationid'], evidence)
  await upsertEnvironment(request, {
    key: `ENV:${DEV_ORG_ID}`,
    organizationId: DEV_ORG_ID,
    name: 'JM1-Dev',
    classification: 'DEVELOPMENT',
    resourceUrl: DEV_URL,
  }, evidence)

  evidence.completedAt = new Date().toISOString()
  fs.writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify({ status: 'PASS', output: OUTPUT }, null, 2))
}

function createClient(resourceUrl) {
  const token = execFileSync('az', ['account', 'get-access-token', '--resource', resourceUrl, '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim()
  return async (path, options = {}) => {
    const response = await fetch(`${resourceUrl}/api/data/v9.2/${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'OData-Version': '4.0', 'OData-MaxVersion': '4.0', ...(options.headers || {}) },
    })
    const raw = await response.text()
    const body = raw ? JSON.parse(raw) : null
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed ${response.status}: ${raw.slice(0, 900)}`)
    return body
  }
}

async function ensureTable(request, definition, evidence) {
  const found = await request(`EntityDefinitions(LogicalName='${definition.logicalName}')?$select=LogicalName`).catch(error => String(error).includes('404') ? null : Promise.reject(error))
  if (!found) {
    await request('EntityDefinitions', {
      method: 'POST', headers: { 'MSCRM.SolutionUniqueName': SOLUTION },
      body: JSON.stringify({ '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata', SchemaName: definition.schemaName, DisplayName: label(definition.displayName), DisplayCollectionName: label(definition.pluralName), Description: label('Governed JMP Publishing V2 Intake authority.'), OwnershipType: 'UserOwned', HasActivities: false, HasNotes: false, IsActivity: false, Attributes: [{ ...definition.attributes[0], IsPrimaryName: true }] }),
    })
    evidence.operations.push({ operation: 'table_created', table: definition.logicalName })
    await request('PublishAllXml', { method: 'POST', body: '{}' })
    await wait(12000)
  } else evidence.operations.push({ operation: 'table_reused', table: definition.logicalName })

  for (const attribute of definition.attributes.slice(1)) {
    const foundAttribute = await request(`EntityDefinitions(LogicalName='${definition.logicalName}')/Attributes(LogicalName='${attribute.LogicalName}')?$select=LogicalName`).catch(error => String(error).includes('404') ? null : Promise.reject(error))
    if (foundAttribute) evidence.operations.push({ operation: 'attribute_reused', table: definition.logicalName, attribute: attribute.LogicalName })
    else {
      await request(`EntityDefinitions(LogicalName='${definition.logicalName}')/Attributes`, { method: 'POST', headers: { 'MSCRM.SolutionUniqueName': SOLUTION }, body: JSON.stringify(attribute) })
      evidence.operations.push({ operation: 'attribute_created', table: definition.logicalName, attribute: attribute.LogicalName })
    }
  }
}

async function ensureKey(request, entity, schemaName, fields, evidence) {
  const keys = await request(`EntityDefinitions(LogicalName='${entity}')/Keys?$select=SchemaName`)
  if (keys.value.some(key => key.SchemaName === schemaName)) return
  await request(`EntityDefinitions(LogicalName='${entity}')/Keys`, { method: 'POST', headers: { 'MSCRM.SolutionUniqueName': SOLUTION }, body: JSON.stringify({ '@odata.type': 'Microsoft.Dynamics.CRM.EntityKeyMetadata', SchemaName: schemaName, DisplayName: label(schemaName), KeyAttributes: fields }) })
  evidence.operations.push({ operation: 'alternate_key_created', entity, schemaName })
}

async function upsertEnvironment(request, environment, evidence) {
  const rows = await request(`jmpv2_environmentauthorities?$select=jmpv2_environmentauthorityid&$filter=jmpv2_organizationid eq '${environment.organizationId}'`)
  const body = JSON.stringify({ jmpv2_environmentkey: environment.key, jmpv2_organizationid: environment.organizationId, jmpv2_environmentname: environment.name, jmpv2_classification: environment.classification, jmpv2_resourceurl: environment.resourceUrl, jmpv2_isactive: true })
  if (rows.value[0]) await request(`jmpv2_environmentauthorities(${rows.value[0].jmpv2_environmentauthorityid})`, { method: 'PATCH', body })
  else await request('jmpv2_environmentauthorities', { method: 'POST', body })
  evidence.operations.push({ operation: 'environment_authority_configured', organizationId: environment.organizationId, name: environment.name })
}

function table(logicalName, schemaName, displayName, pluralName, attributes) { return { logicalName, schemaName, displayName, pluralName, attributes } }
function label(value) { return { '@odata.type': 'Microsoft.Dynamics.CRM.Label', LocalizedLabels: [{ Label: value, LanguageCode: 1033 }] } }
function text(LogicalName, SchemaName, display, MaxLength, required = false) { return { '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata', AttributeType: 'String', AttributeTypeName: { Value: 'StringType' }, LogicalName, SchemaName, DisplayName: label(display), RequiredLevel: { Value: required ? 'ApplicationRequired' : 'None' }, MaxLength, FormatName: { Value: 'Text' } } }
function memo(LogicalName, SchemaName, display, MaxLength) { return { '@odata.type': 'Microsoft.Dynamics.CRM.MemoAttributeMetadata', AttributeType: 'Memo', AttributeTypeName: { Value: 'MemoType' }, LogicalName, SchemaName, DisplayName: label(display), RequiredLevel: { Value: 'None' }, MaxLength, Format: 'TextArea' } }
function integer(LogicalName, SchemaName, display) { return { '@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata', AttributeType: 'Integer', AttributeTypeName: { Value: 'IntegerType' }, LogicalName, SchemaName, DisplayName: label(display), RequiredLevel: { Value: 'None' }, MinValue: 0, MaxValue: 1000000 } }
function date(LogicalName, SchemaName, display) { return { '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata', AttributeType: 'DateTime', AttributeTypeName: { Value: 'DateTimeType' }, LogicalName, SchemaName, DisplayName: label(display), RequiredLevel: { Value: 'None' }, Format: 'DateAndTime' } }
function bool(LogicalName, SchemaName, display) { return { '@odata.type': 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata', AttributeType: 'Boolean', AttributeTypeName: { Value: 'BooleanType' }, LogicalName, SchemaName, DisplayName: label(display), RequiredLevel: { Value: 'None' }, OptionSet: { TrueOption: { Value: 1, Label: label('Yes') }, FalseOption: { Value: 0, Label: label('No') } } } }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

main().catch(error => { console.error(error); process.exitCode = 1 })
