import { writeFileSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { dataverseGithubOidcToken } from './dataverse-github-oidc-token.mjs'
import { planRoleNormalization, canonicalRolePrivilegePairs } from '../../scripts/fresh-title-role-policy.mjs'

const env = 'https://jm1test.crm.dynamics.com'
const app = '97891ed1-6623-487c-b890-633bea440e22'
const org = 'bb7a9d9e-8e73-f111-b27b-000d3a31ff17'
const role = '7d151c32-7534-4ef4-8b91-9e76f5a9fe45'
const solution = 'JMP_FreshTitleAcceptance20261010'
const hash = '67d0778a6f4f05b0e9e1d17ba69170db093f96dbce27611f447b54fe883d0285'
const mode = process.argv[2]
const file = '/tmp/role-only-acceptance.json'
const proof = mode === 'after' ? JSON.parse(readFileSync(file, 'utf8')) : { at: new Date().toISOString(), reads: [], effects: [] }
const save = () => writeFileSync(file, JSON.stringify(proof, null, 2) + '\n')
const token = await dataverseGithubOidcToken({ environmentUrl: env, applicationId: app, tenantId: '352d075e-8e17-4169-9f8e-22e6946ce66d' })
async function request(path, method = 'GET', body) {
  const response = await fetch(`${env}/api/data/v9.2/${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000),
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  proof.reads.push({ at: new Date().toISOString(), path, method, status: response.status, requestId: response.headers.get('x-ms-service-request-id'), data })
  save()
  if (!response.ok && response.status !== 404) throw Error(`NATIVE_${response.status}_${data?.error?.code}`)
  return { status: response.status, data }
}
async function snapshot(id) {
  const identity = await request(`roles(${id})?$select=roleid,name,ismanaged,_businessunitid_value&$expand=systemuserroles_association($select=systemuserid)`)
  if (identity.status !== 200) throw Error('PROTECTED_ROLE_ABSENT')
  const rights = await request(`roleprivilegescollection?$select=privilegeid,privilegedepthmask&$filter=roleid eq ${id}`)
  if (rights.data['@odata.nextLink']) throw Error('RIGHTS_INCOMPLETE')
  return { identity: identity.data, rights: canonicalRolePrivilegePairs(rights.data.value) }
}
try {
  const who = (await request('WhoAmI()')).data
  if (who.OrganizationId !== org) throw Error('ORG_MISMATCH')
  const user = (await request(`systemusers(${who.UserId})?$select=applicationid,isdisabled`)).data
  if (user.applicationid !== app || user.isdisabled) throw Error('IMPORTER_MISMATCH')
  for (const name of ['prvCreateRole', 'prvWriteRole']) {
    const result = (await request(`systemusers(${who.UserId})/Microsoft.Dynamics.CRM.RetrieveUserPrivilegeByPrivilegeName(PrivilegeName='${name}',ExcludeTeamBasic=false)`)).data
    if (!result.RolePrivileges?.length || result.RolePrivileges.some(p => p.Depth !== 'Local')) throw Error(`LOCAL_SCOPE_NOT_PROVEN_${name}`)
  }
  if (mode === 'before') {
    const bytes = Buffer.from(process.env.FIXTURE_BASE64 ?? '', 'base64')
    if (createHash('sha256').update(bytes).digest('hex') !== hash) throw Error('FIXTURE_CHANGED')
    writeFileSync('/tmp/role-only-fixture.zip', bytes)
    execFileSync('unzip', ['-t', '/tmp/role-only-fixture.zip'])
    if ((await request(`roles(${role})?$select=roleid`)).status !== 404) throw Error('FIXTURE_ROLE_ALREADY_EXISTS')
    const existing = (await request(`solutions?$select=solutionid&$filter=uniquename eq '${solution}'`)).data
    if (existing.value.length || existing['@odata.nextLink']) throw Error('FIXTURE_SOLUTION_ALREADY_EXISTS')
    proof.protected = {}
    for (const id of ['a3fc4c02-7d09-4ca1-8e32-2090ad209dc2', '2f957237-1ab4-f111-aaac-70a8a59b112b']) proof.protected[id] = await snapshot(id)
    proof.status = 'READY'
  } else if (mode === 'after' && proof.status === 'READY') {
    const live = await snapshot(role)
    if (!live.identity.ismanaged || live.identity.name !== 'JMP Fresh Title Commissioning Runtime') throw Error('IMPORTED_ROLE_MISMATCH')
    const entries = []
    for (const p of live.rights) entries.push({ id: p.privilegeid, name: (await request(`privileges(${p.privilegeid})?$select=name`)).data.name, depthMask: p.privilegedepthmask })
    const plan = planRoleNormalization({ assignedUserCount: live.identity.systemuserroles_association.length, privileges: entries })
    for (const p of plan.remove) {
      await request(`roles(${role})/Microsoft.Dynamics.CRM.RemovePrivilegeRole`, 'POST', { Privilege: { '@odata.type': 'Microsoft.Dynamics.CRM.privilege', privilegeid: p.id } })
      proof.effects.push({ removedKnownDefault: p }); save()
    }
    const final = await snapshot(role)
    const expected = entries.filter(p => !plan.remove.some(r => r.id === p.id)).map(p => ({privilegeid:p.id, privilegedepthmask:p.depthMask})).sort((a,b) => a.privilegeid.localeCompare(b.privilegeid))
    if (JSON.stringify(final.rights) !== JSON.stringify(expected) || final.identity.systemuserroles_association.length) throw Error('FINAL_ROLE_PARITY_FAILED')
    for (const [id, before] of Object.entries(proof.protected)) {
      const after = await snapshot(id)
      delete before.identity['@odata.etag']; delete after.identity['@odata.etag']
      if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('PROTECTED_ROLE_CHANGED')
    }
    const installed = (await request(`solutions?$select=version,ismanaged&$filter=uniquename eq '${solution}'`)).data
    if (installed.value.length !== 1 || installed.value[0].version !== '1.0.0.0' || !installed.value[0].ismanaged) throw Error('SOLUTION_READBACK_FAILED')
    proof.status = 'PASS'; proof.completedAt = new Date().toISOString()
  } else throw Error('ACCEPTANCE_STATE_INVALID')
  save()
} catch (error) { proof.status = 'FAIL'; proof.error = error.message; save(); throw error }
