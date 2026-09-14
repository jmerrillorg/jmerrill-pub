import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('publisher runtime auth selector supports managed identity and explicit rollback modes', () => {
  const source = read('lib/server/publisher-runtime-auth.ts')
  assert.match(source, /PUBLISHER_RUNTIME_AUTH_MODE/)
  assert.match(source, /MANAGED_IDENTITY/)
  assert.match(source, /LEGACY_CLIENT_CREDENTIAL/)
  assert.match(source, /IDENTITY_ENDPOINT/)
  assert.match(source, /IDENTITY_HEADER/)
  assert.match(source, /MSI_ENDPOINT/)
  assert.match(source, /MSI_SECRET/)
  assert.match(source, /PUBLISHER_MANAGED_IDENTITY_CLIENT_ID/)
  assert.match(source, /silentSecretFallback:\s*false/)
})

test('managed identity mode fails closed without silent client-secret fallback', () => {
  const source = read('lib/server/publisher-runtime-auth.ts')
  assert.match(
    source,
    /mode === 'MANAGED_IDENTITY'\s*\?\s*await acquireManagedIdentityToken[\s\S]*:\s*await acquireClientCredentialToken/,
  )
  assert.match(source, /MANAGED_IDENTITY_ENDPOINT_MISSING/)
  assert.doesNotMatch(source, /catch[\s\S]{0,240}acquireClientCredentialToken/)
})

test('Dataverse production runtime callers use the shared selector', () => {
  const files = [
    'lib/server/dataverse-server.ts',
    'lib/program003/dataverse.ts',
    'lib/publishing/intake/dataverse.ts',
    'lib/server/dataverse-execution-log.ts',
    'lib/server/author-onboarding-dataverse.ts',
    'lib/server/dataverse/catalog.ts',
    'lib/server/publishing/agreement-execution-reconciliation.ts',
    'lib/server/stripe/publishing-first-payment-billing.ts',
    'lib/server/stripe/publishing-payment-event.ts',
  ]

  for (const file of files) {
    const source = read(file)
    assert.match(source, /getDataverseRuntimeAccessToken/, file)
    assert.match(source, /getPublisherRuntimeAuthMode/, file)
  }
})

test('Graph and SharePoint file runtime callers use the shared selector', () => {
  const files = [
    'app/api/author/artifacts/[artifactId]/download/route.ts',
    'lib/publishing/intake/manuscriptUpload.ts',
    'lib/server/publishing-intake-manuscript-binding.ts',
    'lib/server/publishing-dispatch-service.ts',
  ]

  for (const file of files) {
    const source = read(file)
    assert.match(source, /getGraphSharePointRuntimeAccessToken/, file)
    assert.doesNotMatch(source, /https:\/\/login\.microsoftonline\.com\/\$\{[^}]+\}\/oauth2\/v2\.0\/token/, file)
    assert.doesNotMatch(source, /scope:\s*['"]https:\/\/graph\.microsoft\.com\/\.default['"]/, file)
  }
})

test('mail authority and interactive sign-in remain firewalled', () => {
  assert.doesNotMatch(read('lib/server/form-integrations.ts'), /publisher-runtime-auth/)
  assert.doesNotMatch(read('lib/server/author-durable-auth.ts'), /publisher-runtime-auth/)
})

test('GitHub OIDC workflow files were not changed by this branch', () => {
  const changed = execFileSync('git', ['diff', '--name-only'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  }).trim().split('\n').filter(Boolean)

  assert.deepEqual(changed.filter((path) => path.startsWith('.github/workflows/')), [])
})
