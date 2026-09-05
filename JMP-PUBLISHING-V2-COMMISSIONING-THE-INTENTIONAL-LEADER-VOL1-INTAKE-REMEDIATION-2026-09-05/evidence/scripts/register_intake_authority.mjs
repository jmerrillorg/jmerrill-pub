import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const DEV_URL = 'https://org52409ff2.crm.dynamics.com'
const DEV_ORG_ID = '579864ae-44cc-f011-95c7-000d3a37fe06'
const SOLUTION = 'JMP_PublishingV2'
const ROOT = 'JMP-PUBLISHING-V2-COMMISSIONING-THE-INTENTIONAL-LEADER-VOL1-INTAKE-REMEDIATION-2026-09-05/evidence'
const DLL = `${ROOT}/plugin/bin/Release/net462/intakeremediation.dll`
const OUTPUT = `${ROOT}/dataverse/intake_authority_registration.json`
const ASSEMBLY = 'intakeremediation'
const API = 'jmpv2_SaveIntakeResponses'

const inputs = ['AuthorContactId', 'PublishingEngagementId', 'LifecycleInstanceId', 'IntakeSubmissionId', 'ResponsesJson', 'Mode', 'AuthorityContext', 'V2CorrelationId']
const outputs = [['Accepted', 0], ['ReasonCode', 10], ['CompletenessStatus', 10], ['CompletenessReasons', 10], ['OutstandingCount', 7], ['Environment', 10]]

async function main() {
  const request = createClient(DEV_URL)
  const evidence = { startedAt: new Date().toISOString(), environment: 'JM1-Dev', operations: [] }
  const who = await request('WhoAmI()')
  if (String(who.OrganizationId).toLowerCase() !== DEV_ORG_ID) throw new Error('not_development_environment')
  evidence.whoAmI = who

  const assembly = await ensureAssembly(request, evidence)
  const authority = await ensureType(request, assembly.pluginassemblyid, 'plugin.V2IntakeAuthorityPlugin', 'V2 Intake Response Authority', evidence)
  const guard = await ensureType(request, assembly.pluginassemblyid, 'plugin.V2IntakeDirectWriteGuardPlugin', 'V2 Intake Direct Write Guard', evidence)
  const api = await ensureApi(request, authority.plugintypeid, evidence)
  for (const name of inputs) await ensureInput(request, api.customapiid, name, evidence)
  for (const [name, type] of outputs) await ensureOutput(request, api.customapiid, name, type, evidence)
  for (const message of ['Create', 'Update', 'Delete']) await ensureStep(request, guard.plugintypeid, message, 'jmpv2_intakeresponse', `JMP V2 Deny Direct ${message} Intake Response`, evidence)
  await ensureStep(request, guard.plugintypeid, 'Update', 'jmpv2_intakesubmission', 'JMP V2 Deny Direct Intake Completeness Update', evidence)
  await request('PublishAllXml', { method: 'POST', body: '{}' })

  evidence.completedAt = new Date().toISOString()
  fs.writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify({ status: 'PASS', api: API, output: OUTPUT }, null, 2))
}

function createClient(resourceUrl) {
  const token = execFileSync('az', ['account', 'get-access-token', '--resource', resourceUrl, '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim()
  return async (path, options = {}) => {
    const response = await fetch(`${resourceUrl}/api/data/v9.2/${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'OData-Version': '4.0', 'OData-MaxVersion': '4.0', ...(options.headers || {}) } })
    const raw = await response.text(); const body = raw ? JSON.parse(raw) : null
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed ${response.status}: ${raw.slice(0, 1200)}`)
    return body
  }
}

async function ensureAssembly(request, evidence) {
  const rows = await request(`pluginassemblies?$select=pluginassemblyid,name&$filter=name eq '${ASSEMBLY}'`)
  const content = fs.readFileSync(DLL).toString('base64')
  if (rows.value[0]) { await request(`pluginassemblies(${rows.value[0].pluginassemblyid})`, { method: 'PATCH', body: JSON.stringify({ content, version: '1.0.0.2' }) }); evidence.operations.push({ operation: 'assembly_updated' }); return rows.value[0] }
  const created = await request('pluginassemblies', { method: 'POST', headers: { Prefer: 'return=representation', 'MSCRM.SolutionUniqueName': SOLUTION }, body: JSON.stringify({ name: ASSEMBLY, culture: 'neutral', publickeytoken: 'fffbe8b3d67a6cc0', sourcetype: 0, isolationmode: 2, version: '1.0.0.2', content }) })
  evidence.operations.push({ operation: 'assembly_created', id: created.pluginassemblyid }); return created
}

async function ensureType(request, assemblyId, typename, name, evidence) {
  const rows = await request(`plugintypes?$select=plugintypeid,typename&$filter=typename eq '${typename}'`)
  if (rows.value[0]) return rows.value[0]
  const created = await request('plugintypes', { method: 'POST', headers: { Prefer: 'return=representation', 'MSCRM.SolutionUniqueName': SOLUTION }, body: JSON.stringify({ typename, name, friendlyname: name, description: name, 'pluginassemblyid@odata.bind': `/pluginassemblies(${assemblyId})` }) })
  evidence.operations.push({ operation: 'plugin_type_created', typename }); return created
}

async function ensureApi(request, pluginTypeId, evidence) {
  const rows = await request(`customapis?$select=customapiid,uniquename&$filter=uniquename eq '${API}'`)
  if (rows.value[0]) return rows.value[0]
  const created = await request('customapis', { method: 'POST', headers: { Prefer: 'return=representation', 'MSCRM.SolutionUniqueName': SOLUTION }, body: JSON.stringify({ uniquename: API, name: API, displayname: 'JMP V2 Save Intake Responses', description: 'Server-side authority for partial Intake save and final author submission.', bindingtype: 0, isfunction: false, isprivate: false, allowedcustomprocessingsteptype: 0, workflowsdkstepenabled: false, 'PluginTypeId@odata.bind': `/plugintypes(${pluginTypeId})` }) })
  evidence.operations.push({ operation: 'custom_api_created', id: created.customapiid }); return created
}

async function ensureInput(request, apiId, name, evidence) {
  const rows = await request(`customapirequestparameters?$select=customapirequestparameterid,_customapiid_value&$filter=uniquename eq '${name}'`)
  if (rows.value.some(row => String(row._customapiid_value).toLowerCase() === apiId.toLowerCase())) return
  await request('customapirequestparameters', { method: 'POST', headers: { 'MSCRM.SolutionUniqueName': SOLUTION }, body: JSON.stringify({ uniquename: name, name, displayname: name, description: `${name} for governed Intake response capture.`, type: 10, isoptional: false, 'CustomAPIId@odata.bind': `/customapis(${apiId})` }) })
  evidence.operations.push({ operation: 'input_created', name })
}

async function ensureOutput(request, apiId, name, type, evidence) {
  const rows = await request(`customapiresponseproperties?$select=customapiresponsepropertyid,_customapiid_value&$filter=uniquename eq '${name}'`)
  if (rows.value.some(row => String(row._customapiid_value).toLowerCase() === apiId.toLowerCase())) return
  await request('customapiresponseproperties', { method: 'POST', headers: { 'MSCRM.SolutionUniqueName': SOLUTION }, body: JSON.stringify({ uniquename: name, name, displayname: name, description: `${name} from governed Intake response capture.`, type, 'CustomAPIId@odata.bind': `/customapis(${apiId})` }) })
  evidence.operations.push({ operation: 'output_created', name })
}

async function ensureStep(request, pluginTypeId, messageName, entity, name, evidence) {
  const rows = await request(`sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid&$filter=name eq '${name}'`)
  if (rows.value[0]) return
  const messages = await request(`sdkmessages?$select=sdkmessageid&$filter=name eq '${messageName}'`)
  const messageId = messages.value[0]?.sdkmessageid
  const filters = await request(`sdkmessagefilters?$select=sdkmessagefilterid&$filter=_sdkmessageid_value eq ${messageId} and primaryobjecttypecode eq '${entity}'`)
  if (!filters.value[0]) throw new Error(`message_filter_not_found:${messageName}:${entity}`)
  await request('sdkmessageprocessingsteps', { method: 'POST', headers: { 'MSCRM.SolutionUniqueName': SOLUTION }, body: JSON.stringify({ name, description: 'Deny direct Intake evidence and derived completeness writes.', stage: 20, mode: 0, rank: 1, supporteddeployment: 0, 'plugintypeid@odata.bind': `/plugintypes(${pluginTypeId})`, 'sdkmessageid@odata.bind': `/sdkmessages(${messageId})`, 'sdkmessagefilterid@odata.bind': `/sdkmessagefilters(${filters.value[0].sdkmessagefilterid})` }) })
  evidence.operations.push({ operation: 'guard_step_created', name })
}

main().catch(error => { console.error(error); process.exitCode = 1 })
