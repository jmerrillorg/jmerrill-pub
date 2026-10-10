import { readFileSync, writeFileSync } from 'node:fs'
import { dataverseGithubOidcToken } from './dataverse-github-oidc-token.mjs'
import { canonicalRolePrivilegePairs } from '../../scripts/fresh-title-role-policy.mjs'

const env = 'https://jm1hq.crm.dynamics.com'
const app = '97891ed1-6623-487c-b890-633bea440e22'
const user = '761a6aee-e692-f111-8077-000d3a14673b'
const org = '9dafb403-b493-f011-a700-000d3a106f37'
const protectedRole = '2f957237-1ab4-f111-aaac-70a8a59b112b'
const freshRole = 'a3fc4c02-7d09-4ca1-8e32-2090ad209dc2'
const mode = process.argv[2]
const file = '/tmp/role-only-production.json'
const proof = mode === 'after' ? JSON.parse(readFileSync(file, 'utf8')) : { at: new Date().toISOString(), reads: [], status: 'IN_PROGRESS' }
const save = () => writeFileSync(file, JSON.stringify(proof, null, 2) + '\n')
const token = await dataverseGithubOidcToken({ environmentUrl: env, applicationId: app, tenantId: '352d075e-8e17-4169-9f8e-22e6946ce66d' })
async function request(path) {
  const r = await fetch(`${env}/api/data/v9.2/${path}`, { headers: {Authorization:`Bearer ${token}`}, signal:AbortSignal.timeout(30000) })
  const data = await r.json()
  proof.reads.push({at:new Date().toISOString(),path,status:r.status,requestId:r.headers.get('x-ms-service-request-id'),data}); save()
  if (!r.ok && r.status !== 404) throw Error(`NATIVE_${r.status}_${data?.error?.code}`)
  if (data['@odata.nextLink']) throw Error('INCOMPLETE_READBACK')
  return { status:r.status, data }
}
async function snapshot() {
  const r = (await request(`roles(${protectedRole})?$select=roleid,name,ismanaged&$expand=systemuserroles_association($select=systemuserid)`)).data
  delete r['@odata.etag']; delete r['@odata.context']
  r.systemuserroles_association.sort((a,b)=>a.systemuserid.localeCompare(b.systemuserid))
  const rights = (await request(`roleprivilegescollection?$select=privilegeid,privilegedepthmask&$filter=roleid eq ${protectedRole}`)).data.value
  if (rights.length !== 45) throw Error('PHASE6_ROLE_PARITY_COUNT_CHANGED')
  return {role:r,rights:canonicalRolePrivilegePairs(rights)}
}
try {
  const who = (await request('WhoAmI()')).data
  if (who.OrganizationId !== org || who.UserId !== user || who.BusinessUnitId !== 'b589d1e7-e690-f011-b4cc-7c1e525b3eb3') throw Error('IMPORTER_TARGET_MISMATCH')
  if (mode === 'before') {
    const accepted = JSON.parse(readFileSync('/tmp/native-acceptance/role-only-acceptance.json','utf8'))
    if (accepted.status !== 'PASS' || !accepted.completedAt || !accepted.protected) throw Error('NATIVE_ACCEPTANCE_NOT_PROVEN')
    if (!accepted.reads.some(r=>r.path==='WhoAmI()' && r.data?.OrganizationId==='bb7a9d9e-8e73-f111-b27b-000d3a31ff17')) throw Error('ACCEPTANCE_TARGET_MISMATCH')
    for (const name of ['prvCreateRole','prvWriteRole']) {
      const rights = (await request(`systemusers(${user})/Microsoft.Dynamics.CRM.RetrieveUserPrivilegeByPrivilegeName(PrivilegeName='${name}',ExcludeTeamBasic=false)`)).data.RolePrivileges
      if (!rights?.length || rights.some(r=>r.Depth!=='Local')) throw Error(`EFFECTIVE_LOCAL_SCOPE_UNPROVEN_${name}`)
    }
    if ((await request(`roles(${freshRole})?$select=roleid`)).status !== 404) throw Error('ROLE_ALREADY_EXISTS')
    if ((await request("solutions?$select=solutionid&$filter=uniquename eq 'JMP_FreshTitleRuntimeRole'")).data.value.length) throw Error('SOLUTION_ALREADY_EXISTS')
    const phase6 = (await request("solutions?$select=version,ismanaged&$filter=uniquename eq 'JMP_PublishingV2_Phase6_Portable'")).data.value
    if (phase6.length!==1 || phase6[0].version!=='1.2.0.1' || !phase6[0].ismanaged) throw Error('PHASE6_BASELINE_CHANGED')
    const active = (await request('importjobs?$select=importjobid,startedon,completedon,progress&$filter=completedon eq null')).data.value
    if (active.length) throw Error('NATIVE_IMPORT_EXCLUSION_UNPROVEN')
    proof.before = await snapshot(); proof.status='READY'
  } else if (mode === 'after' && proof.status === 'READY') {
    proof.after = await snapshot()
    if (JSON.stringify(proof.before)!==JSON.stringify(proof.after)) throw Error('PHASE6_ROLE_CHANGED')
    const solution = (await request("solutions?$select=version,ismanaged&$filter=uniquename eq 'JMP_FreshTitleRuntimeRole'")).data.value
    if (solution.length!==1 || solution[0].version!=='1.0.0.0' || !solution[0].ismanaged) throw Error('IMPORTED_SOLUTION_MISMATCH')
    proof.status='PASS'; proof.completedAt=new Date().toISOString()
  } else throw Error('STATE_INVALID')
  save()
} catch (error) {proof.status='FAIL';proof.error=error.message;save();throw error}
