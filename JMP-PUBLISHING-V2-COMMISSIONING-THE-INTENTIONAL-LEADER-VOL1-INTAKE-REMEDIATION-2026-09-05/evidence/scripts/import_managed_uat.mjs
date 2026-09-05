import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import crypto from 'node:crypto'

const URL = 'https://jm1test.crm.dynamics.com'
const ORG_ID = 'bb7a9d9e-8e73-f111-b27b-000d3a31ff17'
const SOLUTION = 'JMP_PublishingV2'
const VERSION = '1.0.4.0'
const ROOT = 'JMP-PUBLISHING-V2-COMMISSIONING-THE-INTENTIONAL-LEADER-VOL1-INTAKE-REMEDIATION-2026-09-05/evidence'
const ZIP = `${ROOT}/alm/JMP_PublishingV2_1_0_4_0_managed.zip`
const OUTPUT = `${ROOT}/alm/uat_managed_deployment_readback.json`

async function main() {
  const request = createClient(URL)
  const who = await request('WhoAmI()')
  if (String(who.OrganizationId).toLowerCase() !== ORG_ID) throw new Error('not_commissioning_uat_environment')
  const zip = fs.readFileSync(ZIP)
  await request('ImportSolution', { method: 'POST', body: JSON.stringify({ CustomizationFile: zip.toString('base64'), OverwriteUnmanagedCustomizations: false, PublishWorkflows: true, ImportJobId: crypto.randomUUID() }) })
  await request('PublishAllXml', { method: 'POST', body: '{}' })

  const environments = await request(`jmpv2_environmentauthorities?$select=jmpv2_environmentauthorityid&$filter=jmpv2_organizationid eq '${ORG_ID}'`)
  const environmentBody = JSON.stringify({ jmpv2_environmentkey: `ENV:${ORG_ID}`, jmpv2_organizationid: ORG_ID, jmpv2_environmentname: 'JM1-Test', jmpv2_classification: 'COMMISSIONING_UAT', jmpv2_resourceurl: URL, jmpv2_isactive: true })
  if (environments.value[0]) await request(`jmpv2_environmentauthorities(${environments.value[0].jmpv2_environmentauthorityid})`, { method: 'PATCH', body: environmentBody })
  else await request('jmpv2_environmentauthorities', { method: 'POST', body: environmentBody })

  const solution = await request(`solutions?$select=solutionid,version,ismanaged,uniquename&$filter=uniquename eq '${SOLUTION}'`)
  const api = await request("customapis?$select=customapiid,uniquename&$filter=uniquename eq 'jmpv2_SaveIntakeResponses'")
  const responseTable = await request("EntityDefinitions(LogicalName='jmpv2_intakeresponse')?$select=LogicalName,IsManaged")
  const environmentTable = await request("EntityDefinitions(LogicalName='jmpv2_environmentauthority')?$select=LogicalName,IsManaged")
  const configuredEnvironment = await request(`jmpv2_environmentauthorities?$select=jmpv2_environmentname,jmpv2_classification,jmpv2_organizationid,jmpv2_isactive&$filter=jmpv2_organizationid eq '${ORG_ID}'`)
  const evidence = { status: solution.value[0]?.version === VERSION && solution.value[0]?.ismanaged === true ? 'PASS' : 'FAIL', environment: 'JM1-Test', whoAmI: who, solution: solution.value[0], customApi: api.value[0], responseTable, environmentTable, environmentAuthority: configuredEnvironment.value[0], packageSha256: crypto.createHash('sha256').update(zip).digest('hex'), completedAt: new Date().toISOString() }
  fs.writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify(evidence, null, 2))
  if (evidence.status !== 'PASS') process.exitCode = 1
}

function createClient(resourceUrl) {
  const token = execFileSync('az', ['account', 'get-access-token', '--resource', resourceUrl, '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim()
  return async (path, options = {}) => {
    const response = await fetch(`${resourceUrl}/api/data/v9.2/${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'OData-Version': '4.0', 'OData-MaxVersion': '4.0', ...(options.headers || {}) } })
    const raw = await response.text(); const body = raw ? JSON.parse(raw) : null
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed ${response.status}: ${raw.slice(0, 1600)}`)
    return body
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
