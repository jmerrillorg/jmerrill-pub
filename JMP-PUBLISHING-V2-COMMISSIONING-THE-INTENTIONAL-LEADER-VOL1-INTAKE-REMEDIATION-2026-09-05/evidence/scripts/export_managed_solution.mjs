import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import crypto from 'node:crypto'

const URL = 'https://org52409ff2.crm.dynamics.com'
const ORG_ID = '579864ae-44cc-f011-95c7-000d3a37fe06'
const SOLUTION = 'JMP_PublishingV2'
const VERSION = '1.0.4.0'
const ROOT = 'JMP-PUBLISHING-V2-COMMISSIONING-THE-INTENTIONAL-LEADER-VOL1-INTAKE-REMEDIATION-2026-09-05/evidence'
const ZIP = `${ROOT}/alm/JMP_PublishingV2_1_0_4_0_managed.zip`
const OUTPUT = `${ROOT}/alm/dev_managed_export.json`

async function main() {
  const request = createClient(URL)
  const who = await request('WhoAmI()')
  if (String(who.OrganizationId).toLowerCase() !== ORG_ID) throw new Error('not_development_environment')
  const solutions = await request(`solutions?$select=solutionid,version,uniquename&$filter=uniquename eq '${SOLUTION}'`)
  if (solutions.value.length !== 1) throw new Error('solution_not_unique')
  const solution = solutions.value[0]
  await request(`solutions(${solution.solutionid})`, { method: 'PATCH', body: JSON.stringify({ version: VERSION }) })
  await request('PublishAllXml', { method: 'POST', body: '{}' })
  const exported = await request('ExportSolution', { method: 'POST', body: JSON.stringify({ SolutionName: SOLUTION, Managed: true }) })
  const bytes = Buffer.from(exported.ExportSolutionFile, 'base64')
  fs.writeFileSync(ZIP, bytes)
  const evidence = { status: 'PASS', environment: 'JM1-Dev', whoAmI: who, solution: SOLUTION, priorVersion: solution.version, version: VERSION, managed: true, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), path: ZIP, completedAt: new Date().toISOString() }
  fs.writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify(evidence, null, 2))
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

main().catch(error => { console.error(error); process.exitCode = 1 })
