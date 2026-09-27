import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const { resolveOnboardingAuthority } = jiti('../lib/server/author-onboarding-authority.ts')
const contactId = '106a78d0-fb9a-f111-b8dc-6045bdd69738'
const titleId = 'daf8180f-85a3-f111-b8de-000d3a14673b'
const identity = { contactId, titleId, email: 'jackie2doreen@att.net' }
process.env.PUBLISHER_RUNTIME_AUTH_MODE = 'MANAGED_IDENTITY'

function reader(overrides = {}) {
  const calls = []
  const records = {
    contacts: { contactid: contactId, emailaddress1: identity.email },
    jm1pub_titles: { jm1pub_titleid: titleId, _jm1_primaryauthor_value: contactId },
    jm1_authorprofiles: { jm1_authorprofileid: '28e62257-d045-5e10-a15d-d1c9268cf426', _jm1_contact_value: contactId },
    ...overrides,
  }
  return { calls, read: async (_config, entity, query) => {
    calls.push({ entity, query })
    assert.ok(Object.hasOwn(records, entity), `unexpected supplemental read: ${entity}`)
    return records[entity]
  } }
}

test('exact canonical relationship succeeds without reading submissions or lifecycle display state', async () => {
  const fixture = reader()
  const result = await resolveOnboardingAuthority(identity, fixture.read)
  assert.equal(result.contactId, contactId)
  assert.equal(result.titleId, titleId)
  assert.equal(fixture.calls.length, 3)
  assert.ok(fixture.calls.every(row => !row.entity.includes('submission')))
})

test('email and immutable IDs normalize case and surrounding whitespace', async () => {
  const fixture = reader()
  assert.ok(await resolveOnboardingAuthority({ contactId: ` ${contactId.toUpperCase()} `, titleId: titleId.toUpperCase(), email: ' JACKIE2DOREEN@ATT.NET ' }, fixture.read))
})

for (const [label, overrides] of [
  ['wrong author/title pair', { jm1pub_titles: { jm1pub_titleid: titleId, _jm1_primaryauthor_value: '60937251-d589-f111-ab10-6045bdd69678' } }],
  ['wrong title record', { jm1pub_titles: { jm1pub_titleid: 'ca68c994-fd89-f111-ab10-00224820105b', _jm1_primaryauthor_value: contactId } }],
  ['missing contact', { contacts: null }],
  ['unknown email', { contacts: { contactid: contactId, emailaddress1: 'other@example.com' } }],
]) test(`${label} denies without profile lookup`, async () => {
  const fixture = reader(overrides)
  assert.equal(await resolveOnboardingAuthority(identity, fixture.read), null)
  assert.equal(fixture.calls.length, 2)
})

test('malformed identity denies before any data read', async () => {
  const fixture = reader()
  assert.equal(await resolveOnboardingAuthority({ ...identity, contactId: '' }, fixture.read), null)
  assert.equal(fixture.calls.length, 0)
})

test('authoritative read failure is not converted into relationship denial or approval', async () => {
  await assert.rejects(resolveOnboardingAuthority(identity, async () => { throw new Error('dataverse_query_failed:contacts:403') }), /403/)
})
