import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dataverseGithubOidcToken } from './dataverse-github-oidc-token.mjs'
test('federated token uses existing application and exact Dataverse scope; masks access token', async () => {
  const savedFetch = globalThis.fetch, savedLog = console.log
  const savedUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL, savedRequestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  const calls = [], logs = []
  try {
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL = 'https://example.invalid/oidc?x=1'
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = 'request-fixture'
    console.log = value => logs.push(value)
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), options })
      return new Response(JSON.stringify(calls.length === 1 ? { value: 'assertion-fixture' } : { access_token: 'access-fixture' }), { status: 200 })
    }
    assert.equal(await dataverseGithubOidcToken({ environmentUrl: 'https://jm1test.crm.dynamics.com/', applicationId: 'app-fixture', tenantId: 'tenant-fixture' }), 'access-fixture')
    assert.equal(new URL(calls[0].url).searchParams.get('audience'), 'api://AzureADTokenExchange')
    assert.equal(calls[1].options.body.get('scope'), 'https://jm1test.crm.dynamics.com/.default')
    assert.equal(calls[1].options.body.get('client_id'), 'app-fixture')
    assert.equal(calls[1].options.body.get('client_assertion'), 'assertion-fixture')
    assert.equal(calls[1].options.body.get('client_secret'), null)
    assert.deepEqual(logs, ['::add-mask::access-fixture'])
    globalThis.fetch = async () => new Response('{}', { status: 403 })
    await assert.rejects(dataverseGithubOidcToken({ environmentUrl: 'https://jm1test.crm.dynamics.com', applicationId: 'app-fixture', tenantId: 'tenant-fixture' }), /GITHUB_OIDC_HTTP_403/)
    delete process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
    await assert.rejects(dataverseGithubOidcToken({ environmentUrl: 'https://jm1test.crm.dynamics.com', applicationId: 'app-fixture', tenantId: 'tenant-fixture' }), /GITHUB_OIDC_UNAVAILABLE/)
  } finally {
    globalThis.fetch = savedFetch; console.log = savedLog
    if (savedUrl === undefined) delete process.env.ACTIONS_ID_TOKEN_REQUEST_URL; else process.env.ACTIONS_ID_TOKEN_REQUEST_URL = savedUrl
    if (savedRequestToken === undefined) delete process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN; else process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = savedRequestToken
  }
})
