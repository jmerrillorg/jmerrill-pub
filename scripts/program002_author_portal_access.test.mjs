import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'

const access = await import('../lib/server/author-portal-access.ts')

const STRONG_TEST_SECRET = 'jm1-author-portal-unit-secret-2026-Q3-7Kp9-R4t2-W8z5'
const OTHER_STRONG_TEST_SECRET = 'jm1-author-portal-other-secret-2026-Q3-8Lp9-S5u2-X9y5'

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
