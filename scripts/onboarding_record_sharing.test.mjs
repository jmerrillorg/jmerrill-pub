import test from 'node:test'
import assert from 'node:assert/strict'
import { createJiti } from 'jiti'
const jiti = createJiti(import.meta.url)
const { ensureOnboardingProcessorRead: share, ONBOARDING_WEBSITE_USER: website, ONBOARDING_PROCESSOR_USER: user, ONBOARDING_PROCESSOR_PRINCIPAL: principal } = await jiti.import('../lib/server/onboarding-record-sharing.ts')
const id = '844406be-0c2e-59f7-bd66-0251ef079d3e', contact = 'd38aa56a-882a-f111-88b4-6045bdd69678'
const payload = { governedAuthority: { contactId: contact, titleId: 'f79006b7-f595-f111-8076-00224820105b', policyVersion: 'PUBLISHER_FUNDED_ONBOARDING_V1', agreementSha256: 'a'.repeat(64) }, rawFormData: { note: 'Private author answer' } }
function fixture(options = {}) {
  const calls = [], row = { jm1pub_submissionid: id, _ownerid_value: website, _createdby_value: website,
    _jm1pub_linkedcontact_value: contact, jm1pub_formtype: 'author-onboarding-attempt', jm1pub_rawpayload: JSON.stringify(payload), '@odata.etag': 'W/"1"', ...options.row }
  let access = options.access || 'None'
  const request = async (path, method = 'GET', body) => {
    calls.push({ path, method, body })
    if (path === 'WhoAmI()') return { UserId: website, OrganizationId: '9dafb403-b493-f011-a700-000d3a106f37', ...options.who }
    if (path.startsWith(`systemusers(${user})?$select`)) return { systemuserid: user, azureactivedirectoryobjectid: principal, isdisabled: false, ...options.recipient }
    if (path.startsWith('jm1pub_submissions(')) return structuredClone(row)
    if (path.includes('RetrievePrincipalAccess')) return { AccessRights: access }
    if (path.includes('RetrieveUserPrivilege')) return { RolePrivileges: options.privileges ?? [{ Depth: 'Basic' }] }
    if (path.startsWith('EntityDefinitions')) return { value: [{ CascadeConfiguration: { Share: options.cascade || 'NoCascade' } }] }
    if (path === 'GrantAccess') { if (options.fail) throw Error('transient'); access = 'ReadAccess'; if (options.ambiguous) throw Error('timeout'); return null }
    throw Error('Unexpected request ' + path)
  }
  return { calls, input: { submissionId: id, payload, enabled: true, request } }
}
test('isolated fixture uses the same writer identity and share path without binding a real author', async () => {
  const { default: f } = await import('../azure-functions/diagnostic-ai-runner/src/lifecycle/onboardingAccessFixture.js')
  const { buildSubmissionIdentity, buildSubmissionPayload } = await jiti.import('../lib/server/author-onboarding-dataverse.ts')
  const { createHash } = await import('node:crypto')
  const saved={...process.env}, key='1234567890abcdef1234567890abcdef'
  try {
    process.env.JM1_ONBOARDING_ACCESS_ACCEPTANCE_KEY=key
    process.env.JM1_ONBOARDING_ACCESS_ACCEPTANCE_EXPIRES_AT=new Date(Date.now()+3600000).toISOString()
    const payload=f.payloadFor(key), id=f.submissionId(key), row=buildSubmissionPayload(payload,new Date().toISOString(),true)
    const h=createHash('sha256').update(`attempt:${buildSubmissionIdentity(payload)}`).digest('hex').slice(0,32).split('');h[12]='5';h[16]=((parseInt(h[16],16)&3)|8).toString(16)
    assert.equal(id.replaceAll('-',''),h.join(''));assert.equal(row['jm1pub_LinkedContact@odata.bind'],undefined)
    const a=fixture({row:{...row,jm1pub_submissionid:id,_jm1pub_linkedcontact_value:null}}), input={...a.input,submissionId:id,payload}
    process.env.JM1_ONBOARDING_ACCESS_ACCEPTANCE_HOLD='true'
    assert.equal((await share(input)).code,'PROCESSOR_SHARING_SYNTHETIC_DEPENDENCY_HOLD')
    assert.ok(a.calls.every(x=>x.method==='GET'))
    process.env.JM1_ONBOARDING_ACCESS_ACCEPTANCE_HOLD='false'
    assert.equal((await share(input)).status,'READY');assert.equal((await share(input)).status,'READY')
    assert.equal(a.calls.filter(x=>x.method==='POST').length,1)
    assert.equal((await share({...input,submissionId:'00000000-0000-5000-8000-000000000000'})).code,'PROCESSOR_SHARING_SCOPE_DENIED')
    delete process.env.JM1_ONBOARDING_ACCESS_ACCEPTANCE_KEY
    assert.equal((await share(input)).code,'PROCESSOR_SHARING_SCOPE_DENIED')
  } finally {for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved)}
})
test('shares only exact record ReadAccess with pinned recipient; replay makes no second write', async () => {
  const f = fixture(); assert.equal((await share(f.input)).status, 'READY'); assert.equal((await share(f.input)).status, 'READY')
  const writes = f.calls.filter(c => c.method !== 'GET'); assert.equal(writes.length, 1)
  assert.deepEqual(writes[0].body, { Target: { '@odata.type': 'Microsoft.Dynamics.CRM.jm1pub_submission', jm1pub_submissionid: id }, PrincipalAccess: { Principal: { '@odata.type': 'Microsoft.Dynamics.CRM.systemuser', systemuserid: user }, AccessMask: 'ReadAccess' } })
})
test('disabled mode makes no requests', async () => { const f=fixture(); assert.equal((await share({...f.input,enabled:false})).status,'HELD'); assert.equal(f.calls.length,0) })
test('missing Basic Share is an explicit gate without a write', async () => { const f=fixture({privileges:[]}); assert.equal((await share(f.input)).code,'PROCESSOR_SHARING_BASIC_SHARE_REQUIRED'); assert.ok(f.calls.every(c=>c.method==='GET')) })
test('wrong owner, recipient, organization, terms, or cohort fails closed', async () => {
  for (const options of [{row:{_ownerid_value:'other'}},{recipient:{azureactivedirectoryobjectid:'other'}},{who:{OrganizationId:'other'}},{row:{jm1pub_rawpayload:'{}'}}]) {
    const f=fixture(options); assert.equal((await share(f.input)).status,'HELD'); assert.ok(f.calls.every(c=>c.method==='GET'))
  }
  const f=fixture(); assert.equal((await share({...f.input,payload:{...payload,governedAuthority:{...payload.governedAuthority,titleId:'unrelated'}}})).status,'HELD'); assert.equal(f.calls.length,0)
})
test('broader privileges, cascading shares, or excess existing rights are rejected', async () => {
  for(const options of [{privileges:[{Depth:'Local'}]},{cascade:'Cascade'},{access:'ReadAccess, WriteAccess'}]) {
    const f=fixture(options); assert.equal((await share(f.input)).status,'HELD'); assert.ok(f.calls.every(c=>c.method==='GET'))
  }
})
test('failed dependency preserves receipt and ambiguous success recovers by readback', async () => {
  const failed=fixture({fail:true}); assert.equal((await share(failed.input)).status,'HELD')
  const f=fixture({ambiguous:true}); assert.equal((await share(f.input)).status,'HELD'); assert.equal((await share(f.input)).status,'READY'); assert.equal(f.calls.filter(c=>c.method==='POST').length,1)
})

test('routing-log failure cannot turn a persisted funded receipt into a request to submit again', async () => {
  const { writeAuthorOnboardingDataverseFallback } = await jiti.import('../lib/server/author-onboarding-dataverse.ts')
  const saved = { ...process.env }, fetchBefore = globalThis.fetch, logBefore = console.error, calls = [], logs = []
  try {
    Object.assign(process.env, { PUBLISHER_RUNTIME_AUTH_MODE: 'LEGACY_CLIENT_CREDENTIAL', DATAVERSE_WEB_API_BASE_URL: 'https://fixture.invalid/api/data/v9.2', DATAVERSE_RESOURCE_URL: 'https://fixture.invalid', DATAVERSE_TENANT_ID: 'fixture', DATAVERSE_CLIENT_ID: 'fixture', DATAVERSE_CLIENT_SECRET: 'fixture-not-a-credential' })
    console.error = (...args) => logs.push(args)
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), method: options?.method })
      if (String(url).startsWith('https://login.microsoftonline.com/')) return Response.json({ access_token: 'fixture-token' })
      if (String(url).includes('/jm1pub_submissions(')) return Response.json({ jm1pub_submissionid: id }, { status: 201 })
      if (String(url).includes('/jm1_executionlogs(')) return Response.json({ error: { code: '0x80000000', message: 'unavailable' } }, { status: 503 })
      throw Error('Unexpected network operation')
    }
    const result = await writeAuthorOnboardingDataverseFallback(payload, 'fixture', true)
    assert.equal(result.status, 'success'); assert.equal(result.submissionId, id)
    assert.equal(result.processorAccess.code, 'PROCESSOR_ROUTING_EVIDENCE_PENDING')
    assert.equal(calls.filter(c => c.url.includes('/jm1pub_submissions(')).length, 1)
    assert.ok(!JSON.stringify(logs).includes('Private author answer'))
  } finally {
    globalThis.fetch = fetchBefore; console.error = logBefore
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]
    Object.assign(process.env, saved)
  }
})
