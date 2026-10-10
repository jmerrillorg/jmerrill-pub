import { readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../azure-functions/diagnostic-ai-runner/package.json', import.meta.url))
const { DOMParser } = require('@xmldom/xmldom')
const expected = new Set(['prvCreatejmpv2_LifecycleInstance', 'prvCreatejmpv2_PublishingEngagement', 'prvCreatejmpv2_StageInstance', 'prvReadjmpv2_LifecycleInstance', 'prvReadjmpv2_PublishingEngagement', 'prvReadjmpv2_StageInstance', 'prvReadjmpv2_StageDefinition'])
const roleId = '7d151c32-7534-4ef4-8b91-9e76f5a9fe45'
const mode = process.argv[2]
if (mode === 'package') {
  const directory = process.env.SANDBOX_PACKAGE_DIRECTORY || '/tmp'
  const solution = readFileSync(`${directory}/fixture-solution.xml`, 'utf8')
  const custom = readFileSync(`${directory}/fixture-customizations.xml`, 'utf8')
  function parse(xml) {
    assert.ok(!/<!DOCTYPE|<!ENTITY/i.test(xml))
    return new DOMParser({ errorHandler: { warning: () => {}, error: message => { throw Error(message) }, fatalError: message => { throw Error(message) } } }).parseFromString(xml, 'application/xml')
  }
  const s = parse(solution), c = parse(custom)
  const roots = Array.from(s.getElementsByTagName('RootComponent'))
  assert.equal(roots.length, 1)
  assert.equal(roots[0].getAttribute('type'), '20')
  assert.equal(roots[0].getAttribute('id'), `{${roleId}}`)
  assert.equal(s.getElementsByTagName('UniqueName')[0].textContent, 'JMP_LocalRoleFixture_20261010')
  assert.equal(s.getElementsByTagName('Managed')[0].textContent, '1')
  const roles = Array.from(c.getElementsByTagName('Role'))
  assert.equal(roles.length, 1)
  assert.equal(roles[0].getAttribute('id'), `{${roleId}}`)
  const privileges = Array.from(c.getElementsByTagName('RolePrivilege'))
  assert.equal(privileges.length, 7)
  const names = new Set()
  for (const p of privileges) { const name = p.getAttribute('name'); names.add(name); assert.ok(expected.has(name)); assert.equal(p.getAttribute('level'), 'Basic') }
  assert.equal(names.size, 7)
  console.log('DISPOSABLE_PACKAGE_PASS')
} else {
  assert.ok(['before', 'after'].includes(mode))
  const base = process.env.DATAVERSE_ENVIRONMENT_URL
  assert.equal(base, 'https://jm1test.crm.dynamics.com')
  assert.equal(process.env.SANDBOX_ROLE_ID, roleId)
  const evidence = { mode, at: new Date().toISOString(), requests: [] }
  async function request(path, method = 'GET', body, allow404 = false) {
    const r = await fetch(`${base}/api/data/v9.2/${path}`, { method, headers: { Authorization: `Bearer ${process.env.DATAVERSE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) })
    const text = await r.text(); const data = text ? JSON.parse(text) : {}
    evidence.requests.push({ path, method, status: r.status, requestId: r.headers.get('x-ms-service-request-id'), result: data })
    if (r.status === 404 && allow404) return null
    if (!r.ok) throw new Error(`NATIVE_${r.status}_${data.error?.code}`)
    return data
  }
  try {
    const who = await request('WhoAmI()')
    assert.equal(who.OrganizationId.toLowerCase(), process.env.EXPECTED_ORGANIZATION_ID)
    assert.equal(who.UserId.toLowerCase(), process.env.SANDBOX_USER_ID)
    if (mode === 'before') {
      assert.equal(await request(`roles(${roleId})?$select=roleid`, 'GET', undefined, true), null)
    } else {
      const role = await request(`roles(${roleId})?$select=roleid,name,_businessunitid_value&$expand=systemuserroles_association($select=systemuserid)`)
      assert.equal(role.name, 'JMP Local Import Fixture 20261010')
      assert.equal(role._businessunitid_value, '28e7df8f-f171-f111-ab0e-7ced8d70f765')
      assert.equal(role.systemuserroles_association.length, 0)
      const defaults = new Set(['prvCreateSharePointData', 'prvReadSharePointData', 'prvReadSharePointDocument', 'prvWriteSharePointData', 'prvReadPluginAssembly', 'prvReadPluginType', 'prvReadSdkMessage', 'prvReadSdkMessageProcessingStep', 'prvReadSdkMessageProcessingStepImage'])
      const before = await request(`roleprivilegescollection?$select=privilegeid,privilegedepthmask&$filter=roleid eq ${roleId}`)
      for (const p of before.value) {
        const { name } = await request(`privileges(${p.privilegeid})?$select=name`)
        if (expected.has(name)) assert.equal(p.privilegedepthmask, 1)
        else {
          assert.ok(defaults.has(name)); assert.equal(p.privilegedepthmask, 8)
          await request(`roles(${roleId})/Microsoft.Dynamics.CRM.RemovePrivilegeRole`, 'POST', { Privilege: { '@odata.type': 'Microsoft.Dynamics.CRM.privilege', privilegeid: p.privilegeid } })
        }
      }
      const after = await request(`roleprivilegescollection?$select=privilegeid,privilegedepthmask&$filter=roleid eq ${roleId}`)
      assert.equal(after.value.length, 7)
      const names = new Set()
      for (const p of after.value) { const { name } = await request(`privileges(${p.privilegeid})?$select=name`); names.add(name); assert.ok(expected.has(name)); assert.equal(p.privilegedepthmask, 1) }
      assert.equal(names.size, 7)
    }
    evidence.status = 'PASS'
  } catch (error) { evidence.status = 'FAIL'; evidence.error = error.message; process.exitCode = 1 }
  writeFileSync(`/tmp/local-role-sandbox-${mode}.json`, JSON.stringify(evidence, null, 2), { mode: 0o600 })
  console.log(JSON.stringify({ mode, status: evidence.status, error: evidence.error }))
}
