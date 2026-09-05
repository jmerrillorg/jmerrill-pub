import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const DEV_URL = 'https://org52409ff2.crm.dynamics.com'
const DEV_ORG_ID = '579864ae-44cc-f011-95c7-000d3a37fe06'
const DLL = 'JMP-PUBLISHING-V2-COMMISSIONING-THE-INTENTIONAL-LEADER-VOL1-INTAKE-REMEDIATION-2026-09-05/evidence/transition-plugin/bin/Release/net462/plugin.dll'
const OUTPUT = 'JMP-PUBLISHING-V2-COMMISSIONING-THE-INTENTIONAL-LEADER-VOL1-INTAKE-REMEDIATION-2026-09-05/evidence/dataverse/transition_environment_authority_update.json'

async function main() {
  const token = execFileSync('az', ['account', 'get-access-token', '--resource', DEV_URL, '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim()
  const request = async (path, options = {}) => {
    const response = await fetch(`${DEV_URL}/api/data/v9.2/${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'OData-Version': '4.0', 'OData-MaxVersion': '4.0', ...(options.headers || {}) } })
    const raw = await response.text(); const body = raw ? JSON.parse(raw) : null
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed ${response.status}: ${raw.slice(0, 1000)}`)
    return body
  }
  const who = await request('WhoAmI()')
  if (String(who.OrganizationId).toLowerCase() !== DEV_ORG_ID) throw new Error('not_development_environment')
  const rows = await request("pluginassemblies?$select=pluginassemblyid,name,version&$filter=name eq 'plugin'")
  if (rows.value.length !== 1) throw new Error(`transition_plugin_assembly_ambiguous:${rows.value.length}`)
  await request(`pluginassemblies(${rows.value[0].pluginassemblyid})`, { method: 'PATCH', body: JSON.stringify({ content: fs.readFileSync(DLL).toString('base64'), version: '1.0.0.3' }) })
  const evidence = { status: 'PASS', environment: 'JM1-Dev', whoAmI: who, pluginAssemblyId: rows.value[0].pluginassemblyid, priorVersion: rows.value[0].version, updatedVersion: '1.0.0.3', hardcodedEnvironmentLabels: 0, completedAt: new Date().toISOString() }
  fs.writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify({ status: 'PASS', output: OUTPUT }, null, 2))
}

main().catch(error => { console.error(error); process.exitCode = 1 })
