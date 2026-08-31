// Regression coverage for the public-catalog outage:
// dataverse_catalog_read_failed:jm1pub_titles:401 while a manual in-container
// token+Dataverse request with the same identity succeeded. Proven asymmetry
// in the source: the OAuth token POST had no explicit fetch cache directive
// while the Dataverse GET did. Fix: explicit cache:'no-store' on the token
// fetch, plus a bounded discard-token-and-retry-once-on-401 so a rejected
// token (whatever the exact cause) does not leave the catalog down for an
// entire deployment.
//
// Uses Node's built-in test runner with a mocked global.fetch — no live
// Dataverse/Azure AD call, no secret material involved.

import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

const REQUIRED_ENV = {
  DATAVERSE_TENANT_ID: 'test-tenant',
  DATAVERSE_CLIENT_ID: 'test-client',
  DATAVERSE_CLIENT_SECRET: 'test-secret-not-real',
  DATAVERSE_RESOURCE_URL: 'https://jm1hq.crm.dynamics.com',
  DATAVERSE_WEB_API_BASE_URL: 'https://jm1hq.crm.dynamics.com/api/data/v9.2',
}

let originalFetch: typeof fetch
let originalEnv: Record<string, string | undefined>

beforeEach(() => {
  originalFetch = global.fetch
  originalEnv = { ...process.env }
  for (const [key, value] of Object.entries(REQUIRED_ENV)) process.env[key] = value
})

afterEach(() => {
  global.fetch = originalFetch
  process.env = originalEnv
})

function tokenResponse(token: string) {
  return new Response(JSON.stringify({ access_token: token, expires_in: 3600 }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function dataverseUnauthorized() {
  return new Response(
    JSON.stringify({ error: { code: '0x80072560', message: 'Token validation failed.' } }),
    { status: 401, headers: { 'content-type': 'application/json', 'x-ms-service-request-id': 'req-123' } },
  )
}

function dataverseOk(rows: Array<Record<string, unknown>>) {
  return new Response(JSON.stringify({ value: rows }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

test('token fetch always specifies cache: no-store (regression: it previously had no cache directive at all)', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  global.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    if (String(url).includes('login.microsoftonline.com')) return tokenResponse('token-1')
    return dataverseOk([])
  }) as typeof fetch

  const { listPublicCatalogTitles } = await import('../catalog.ts')
  await listPublicCatalogTitles()

  const tokenCall = calls.find((c) => c.url.includes('login.microsoftonline.com'))
  assert.ok(tokenCall, 'expected a token request to be made')
  assert.equal(tokenCall!.init?.cache, 'no-store', 'token fetch must explicitly opt out of the Next.js fetch Data Cache')
})

test('a Dataverse 401 discards the token and retries exactly once with a fresh token', async () => {
  let tokenCalls = 0
  let dataverseCalls = 0
  global.fetch = (async (url: string) => {
    if (String(url).includes('login.microsoftonline.com')) {
      tokenCalls += 1
      return tokenResponse(`token-${tokenCalls}`)
    }
    dataverseCalls += 1
    if (dataverseCalls === 1) return dataverseUnauthorized()
    return dataverseOk([])
  }) as typeof fetch

  const { listPublicCatalogTitles } = await import('../catalog.ts')
  const result = await listPublicCatalogTitles()

  assert.equal(tokenCalls, 2, 'expected exactly one retry token request after the 401')
  assert.equal(dataverseCalls, 2, 'expected exactly one retry Dataverse request after the 401')
  assert.equal(result.ok, true, 'the retry should succeed and the catalog read should recover')
})

test('a second consecutive 401 fails closed — never an infinite retry loop', async () => {
  let tokenCalls = 0
  let dataverseCalls = 0
  global.fetch = (async (url: string) => {
    if (String(url).includes('login.microsoftonline.com')) {
      tokenCalls += 1
      return tokenResponse(`token-${tokenCalls}`)
    }
    dataverseCalls += 1
    return dataverseUnauthorized()
  }) as typeof fetch

  const { listPublicCatalogTitles } = await import('../catalog.ts')
  const result = await listPublicCatalogTitles()

  assert.equal(tokenCalls, 2, 'must not exceed one retry (two total token requests)')
  assert.equal(dataverseCalls, 2, 'must not exceed one retry (two total Dataverse requests)')
  assert.equal(result.ok, false, 'a second consecutive 401 must fail closed')
})

test('catalog succeeds on the first attempt when Dataverse succeeds (no unnecessary retry)', async () => {
  let tokenCalls = 0
  let dataverseCalls = 0
  global.fetch = (async (url: string) => {
    if (String(url).includes('login.microsoftonline.com')) {
      tokenCalls += 1
      return tokenResponse('token-1')
    }
    dataverseCalls += 1
    return dataverseOk([])
  }) as typeof fetch

  const { listPublicCatalogTitles } = await import('../catalog.ts')
  const result = await listPublicCatalogTitles()

  assert.equal(tokenCalls, 1)
  assert.equal(dataverseCalls, 1)
  assert.equal(result.ok, true)
})

test('no access token, client secret, or Authorization header ever appears in a logged/thrown value', async () => {
  const SECRET_MARKER = 'test-secret-not-real'
  const TOKEN_MARKER = 'super-sensitive-token-value'
  global.fetch = (async (url: string) => {
    if (String(url).includes('login.microsoftonline.com')) return tokenResponse(TOKEN_MARKER)
    return dataverseUnauthorized()
  }) as typeof fetch

  const originalError = console.error
  const originalWarn = console.warn
  const logged: string[] = []
  console.error = (...args: unknown[]) => { logged.push(JSON.stringify(args)) }
  console.warn = (...args: unknown[]) => { logged.push(JSON.stringify(args)) }

  try {
    const { listPublicCatalogTitles } = await import('../catalog.ts')
    const result = await listPublicCatalogTitles()
    assert.equal(result.ok, false)
  } finally {
    console.error = originalError
    console.warn = originalWarn
  }

  const combined = logged.join('\n')
  assert.equal(combined.includes(TOKEN_MARKER), false, 'the access token must never be logged')
  assert.equal(combined.includes(SECRET_MARKER), false, 'the client secret must never be logged')
  assert.equal(combined.toLowerCase().includes('bearer '), false, 'no Authorization header value should be logged')
})
