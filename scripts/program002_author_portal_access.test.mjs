import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

const access = await import('../lib/server/author-portal-access.ts')

const PEPPER = 'pepper-test'
const CANONICAL_COMPACT = 'JMPBYGS7YACMKBS'
const LEGACY_DISPLAY = 'JMP-BYGS-7YAC-MKBS'

function hashPortalCode(value) {
  return createHash('sha256')
    .update(`${PEPPER}${value}`)
    .digest('hex')
}

function resetAccessEnv() {
  process.env.AUTHOR_PORTAL_ACCESS_CODE_PEPPER = PEPPER
  delete process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON
  delete process.env.AUTHOR_PORTAL_ACCESS_RECORDS_JSON
  delete process.env.AUTHOR_PORTAL_MASTER_ACCESS_CODE
  delete process.env.AUTHOR_ONBOARDING_ACCESS_CODE
}

test.beforeEach(() => {
  resetAccessEnv()
})

test('legacy hashed access grant accepts all approved visual variants of the same code', () => {
  process.env.AUTHOR_PORTAL_ACCESS_CODE_PEPPER = 'pepper-test'
  process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON = JSON.stringify([
    {
      status: 'active',
      accessCodeHash: hashPortalCode(LEGACY_DISPLAY),
      accessCodeVersion: 'activation-code-v1',
      intakeReference: 'JMP-INT-202607-0W5PTQ',
      scope: 'project',
    },
  ])

  for (const variant of [
    'JMP-BYGS-7YAC-MKBS',
    'jmp-bygs-7yac-mkbs',
    '  JMP-BYGS-7YAC-MKBS  ',
    'JMP BYGS 7YAC MKBS',
    'jmp-bygs 7yac-mkbs',
    'JMPBYGS7YACMKBS',
  ]) {
    const grant = access.resolveAuthorPortalAccessGrant({
      code: variant,
      requestedReference: 'JMP-INT-202607-0W5PTQ',
    })

    assert.ok(grant, `expected variant to resolve: ${variant}`)
    assert.equal(grant?.intakeReference, 'JMP-INT-202607-0W5PTQ')
  }
})

test('v2 canonical hashed access grant accepts approved variants through compact canonical comparison', () => {
  process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON = JSON.stringify([
    {
      status: 'active',
      accessCodeHash: hashPortalCode(CANONICAL_COMPACT),
      accessCodeVersion: 'activation-code-v2',
      intakeReference: 'JMP-INT-202607-0W5PTQ',
      scope: 'project',
    },
  ])

  const compactGrant = access.resolveAuthorPortalAccessGrant({
    code: 'jmp-bygs 7yac-mkbs',
    requestedReference: 'JMP-INT-202607-0W5PTQ',
  })

  assert.ok(compactGrant)
  assert.equal(compactGrant?.intakeReference, 'JMP-INT-202607-0W5PTQ')
})

test('master access code also accepts normalized variants', () => {
  process.env.AUTHOR_PORTAL_MASTER_ACCESS_CODE = 'JMP-PORTAL-ADMIN-2026'

  const grant = access.resolveAuthorPortalAccessGrant({
    code: 'jmp portal admin 2026',
    requestedReference: 'JMP-INT-202607-0W5PTQ',
  })

  assert.ok(grant)
  assert.equal(grant?.scope, 'project')
})

test('unsupported punctuation is rejected even when the underlying characters are otherwise valid', () => {
  process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON = JSON.stringify([
    {
      status: 'active',
      accessCodeHash: hashPortalCode(LEGACY_DISPLAY),
      accessCodeVersion: 'activation-code-v1',
      intakeReference: 'JMP-INT-202607-0W5PTQ',
      scope: 'project',
    },
  ])

  const grant = access.resolveAuthorPortalAccessGrant({
    code: 'JMP_BYGS_7YAC_MKBS',
    requestedReference: 'JMP-INT-202607-0W5PTQ',
  })

  assert.equal(grant, null)
})

test('missing character is rejected', () => {
  process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON = JSON.stringify([
    {
      status: 'active',
      accessCodeHash: hashPortalCode(CANONICAL_COMPACT),
      accessCodeVersion: 'activation-code-v2',
      intakeReference: 'JMP-INT-202607-0W5PTQ',
      scope: 'project',
    },
  ])

  const grant = access.resolveAuthorPortalAccessGrant({
    code: 'JMP-BYGS-7YAC-MKB',
    requestedReference: 'JMP-INT-202607-0W5PTQ',
  })

  assert.equal(grant, null)
})
