import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const access = jiti('../lib/server/author-portal-access.ts')

const PEPPER = 'pepper-test'
const CANONICAL_COMPACT = 'JMPBYGS7YACMKBS'
const LEGACY_DISPLAY = 'JMP-BYGS-7YAC-MKBS'
const STRONG_TEST_SECRET = 'jm1-author-portal-unit-secret-2026-Q3-7Kp9-R4t2-W8z5'
const OTHER_STRONG_TEST_SECRET = 'jm1-author-portal-other-secret-2026-Q3-8Lp9-S5u2-X9y5'

function hashPortalCode(value) {
  return createHash('sha256')
    .update(`${PEPPER}${value}`)
    .digest('hex')
}

function resetAccessEnv() {
  process.env.AUTHOR_PORTAL_ACCESS_CODE_PEPPER = PEPPER
  delete process.env.AUTHOR_PORTAL_SESSION_SECRET
  delete process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON
  delete process.env.AUTHOR_PORTAL_ACCESS_RECORDS_JSON
  delete process.env.AUTHOR_PORTAL_MASTER_ACCESS_CODE
  delete process.env.AUTHOR_ONBOARDING_ACCESS_CODE
}

function withEnv(env, fn) {
  const previous = {
    AUTHOR_PORTAL_SESSION_SECRET: process.env.AUTHOR_PORTAL_SESSION_SECRET,
    AUTHOR_PORTAL_ACCESS_CODE_PEPPER: process.env.AUTHOR_PORTAL_ACCESS_CODE_PEPPER,
    AUTHOR_PORTAL_ACCESS_REGISTRY_JSON: process.env.AUTHOR_PORTAL_ACCESS_REGISTRY_JSON,
    AUTHOR_PORTAL_ACCESS_RECORDS_JSON: process.env.AUTHOR_PORTAL_ACCESS_RECORDS_JSON,
    AUTHOR_PORTAL_MASTER_ACCESS_CODE: process.env.AUTHOR_PORTAL_MASTER_ACCESS_CODE,
    AUTHOR_ONBOARDING_ACCESS_CODE: process.env.AUTHOR_ONBOARDING_ACCESS_CODE,
    NODE_ENV: process.env.NODE_ENV,
  }

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    return fn()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

function buildLegacyFallbackCookie() {
  const payload = {
    v: 1,
    intakeReference: 'JMP-INT-202607-0W5PTQ',
    scope: 'project',
    issuedAt: '2026-07-26T00:00:00.000Z',
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = createHmac('sha256', 'jm1-author-portal-session').update(encodedPayload).digest('base64url')
  return `${encodedPayload}.${signature}`
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

test('production creates and validates sessions with a configured strong secret', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTHOR_PORTAL_SESSION_SECRET: STRONG_TEST_SECRET,
    },
    () => {
      const sessionValue = access.createAuthorPortalSession({
        code: 'JMP-AUTHOR-2026',
        intakeReference: 'JMP-INT-202607-0W5PTQ',
        scope: 'project',
      })

      const session = access.readAuthorPortalSession(sessionValue)
      assert.ok(session)
      assert.equal(session?.intakeReference, 'JMP-INT-202607-0W5PTQ')
      assert.equal(session?.scope, 'project')
    },
  )
})

test('production refuses to create sessions when AUTHOR_PORTAL_SESSION_SECRET is missing', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTHOR_PORTAL_SESSION_SECRET: undefined,
    },
    () => {
      assert.throws(
        () =>
          access.createAuthorPortalSession({
            code: 'JMP-AUTHOR-2026',
            scope: 'project',
          }),
        access.AuthorPortalSessionConfigurationError,
      )
    },
  )
})

test('production refuses the former static session fallback as a configured value', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTHOR_PORTAL_SESSION_SECRET: 'jm1-author-portal-session',
    },
    () => {
      assert.throws(
        () =>
          access.createAuthorPortalSession({
            code: 'JMP-AUTHOR-2026',
            scope: 'project',
          }),
        access.AuthorPortalSessionConfigurationError,
      )
    },
  )
})

test('production refuses placeholder and low-strength session secrets', () => {
  for (const configuredSecret of ['changeme', 'short-author-portal-secret']) {
    withEnv(
      {
        NODE_ENV: 'production',
        AUTHOR_PORTAL_SESSION_SECRET: configuredSecret,
      },
      () => {
        assert.throws(
          () =>
            access.createAuthorPortalSession({
              code: 'JMP-AUTHOR-2026',
              scope: 'project',
            }),
          access.AuthorPortalSessionConfigurationError,
        )
      },
    )
  }
})

test('test environment accepts an explicitly injected test session secret', () => {
  withEnv(
    {
      NODE_ENV: 'test',
      AUTHOR_PORTAL_SESSION_SECRET: STRONG_TEST_SECRET,
    },
    () => {
      const sessionValue = access.createAuthorPortalSession({
        code: 'JMP-AUTHOR-2026',
        contactId: '00000000-0000-0000-0000-000000000001',
        scope: 'relationship',
      })

      const session = access.readAuthorPortalSession(sessionValue)
      assert.equal(session?.contactId, '00000000-0000-0000-0000-000000000001')
      assert.equal(session?.scope, 'relationship')
    },
  )
})

test('forged cookies signed with the former fallback are rejected', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTHOR_PORTAL_SESSION_SECRET: STRONG_TEST_SECRET,
    },
    () => {
      assert.equal(access.readAuthorPortalSession(buildLegacyFallbackCookie()), null)
    },
  )
})

test('valid sessions are rejected after secret rotation', () => {
  let sessionValue = ''
  withEnv(
    {
      NODE_ENV: 'production',
      AUTHOR_PORTAL_SESSION_SECRET: STRONG_TEST_SECRET,
    },
    () => {
      sessionValue = access.createAuthorPortalSession({
        code: 'JMP-AUTHOR-2026',
        scope: 'project',
      })
      assert.ok(access.readAuthorPortalSession(sessionValue))
    },
  )

  withEnv(
    {
      NODE_ENV: 'production',
      AUTHOR_PORTAL_SESSION_SECRET: OTHER_STRONG_TEST_SECRET,
    },
    () => {
      assert.equal(access.readAuthorPortalSession(sessionValue), null)
    },
  )
})

test('shared route trust boundary fails closed when session configuration is unavailable', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTHOR_PORTAL_SESSION_SECRET: undefined,
    },
    () => {
      assert.equal(access.readAuthorPortalSession(buildLegacyFallbackCookie()), null)
    },
  )
})
