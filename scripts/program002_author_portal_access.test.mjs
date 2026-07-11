import assert from 'node:assert/strict'
import test from 'node:test'

const access = await import('../lib/server/author-portal-access.ts')

test('hashed access grant accepts normalized author-entered activation code variants', () => {
  process.env.AUTHOR_PORTAL_ACCESS_CODE_PEPPER = 'pepper-test'
  process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON = JSON.stringify([
    {
      status: 'active',
      accessCodeHash:
        'bc8996a851eb5ca0d0aea299ac6fa87fd492648f953ef7bb98d7a5b4ad02c3e3',
      intakeReference: 'JMP-INT-202607-0W5PTQ',
      scope: 'project',
    },
  ])

  const mixedFormatting = access.resolveAuthorPortalAccessGrant({
    code: ' jmp-bygs 7yac-mkbs ',
    requestedReference: 'JMP-INT-202607-0W5PTQ',
  })

  assert.ok(mixedFormatting)
  assert.equal(mixedFormatting?.intakeReference, 'JMP-INT-202607-0W5PTQ')
})

test('master access code also accepts normalized variants', () => {
  process.env.AUTHOR_PORTAL_MASTER_ACCESS_CODE = 'JMP-PORTAL-ADMIN-2026'
  delete process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON
  delete process.env.AUTHOR_PORTAL_ACCESS_RECORDS_JSON

  const grant = access.resolveAuthorPortalAccessGrant({
    code: 'jmp portal admin 2026',
    requestedReference: 'JMP-INT-202607-0W5PTQ',
  })

  assert.ok(grant)
  assert.equal(grant?.scope, 'project')
})
