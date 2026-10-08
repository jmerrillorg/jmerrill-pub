import assert from 'node:assert/strict'
import test from 'node:test'
import { createJiti } from 'jiti'
const jiti = createJiti(import.meta.url, { alias: { '@': new URL('..', import.meta.url).pathname } })
const { readIntakeCreateAuthority } = await jiti.import('../lib/publishing/intake/authorityHealth.ts')
for (const present of [false, true]) {
  test(`effective intake Create authority ${present ? 'passes' : 'fails closed'} without business or content access`, async () => {
    const paths = []
    const readback = await readIntakeCreateAuthority('https://fixture.invalid/api/data/v9.2', 'synthetic-token', async (url, options) => {
      assert.ok(options.signal)
      assert.equal(options.method, undefined)
      paths.push(url)
      return Response.json(url.endsWith('/WhoAmI') ? { UserId: 'e0e307e1-2fb0-f111-aaac-000d3a14673b' }
        : { RolePrivileges: present ? [{ PrivilegeId: 'f11ad032-3f79-44af-80aa-dc14c182ed57' }] : [] })
    })
    assert.equal(readback.status, present ? 'ready' : 'degraded')
    assert.equal(paths.length, 2)
    assert.doesNotMatch(JSON.stringify(readback), /synthetic-token|e0e307e1/)
    assert.ok(paths.every(path => path.endsWith('/WhoAmI') || path.endsWith('/Microsoft.Dynamics.CRM.RetrieveUserPrivileges')))
  })
}
test('denied platform privilege read is not a healthy intake claim', async () => {
  const result = await readIntakeCreateAuthority('https://fixture.invalid', 'synthetic-token', async () => new Response(null, { status: 403 }))
  assert.equal(result.status, 'degraded')
})
