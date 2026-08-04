import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('app/api/health/route.ts', 'utf8')

test('health endpoint never returns raw environment values', () => {
  assert.doesNotMatch(source, /process\.env\[[^\]]+\]\s*[,}]/)
  assert.doesNotMatch(source, /clientSecret|secretValue|accessToken/i)
  assert.match(source, /present/)
  assert.match(source, /missing/)
})

test('health endpoint rejects the former author portal fallback', () => {
  assert.match(source, /jm1-author-portal-session/)
  assert.match(source, /former_static_fallback_rejected/)
})

test('health endpoint exposes payment gate state without enabling payments', () => {
  assert.match(source, /JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED/)
  assert.match(source, /disabled/)
  assert.doesNotMatch(source, /payouts\.create|transfers\.create|charges\.create|refunds\.create/)
})

test('health endpoint prefers immutable packaged release metadata', () => {
  assert.match(source, /readPackagedReleaseSha/)
  assert.match(source, /JM1_RELEASE_SHA/)
  assert.ok(source.indexOf('readPackagedReleaseSha()') < source.indexOf('process.env.JM1_RELEASE_SHA'))
})

test('App Service production promotion requires exact release identity', () => {
  const workflow = readFileSync('.github/workflows/azure-app-service-publishing.yml', 'utf8')
  assert.match(workflow, /Production Observation/)
  assert.match(workflow, /h\.release !== process\.argv\[2\]/)
  assert.match(workflow, /\$\{\{ github\.sha \}\}/)
})

test('App Service promotion has one authority and rejects staging auto-swap', () => {
  const workflow = readFileSync('.github/workflows/azure-app-service-publishing.yml', 'utf8')
  assert.match(workflow, /Preflight Single Promotion Authority/)
  assert.match(workflow, /autoSwapSlotName/)
  assert.match(workflow, /AZURE_AUTO_SWAP_CONFLICTS_WITH_EXPLICIT_GOVERNED_PROMOTION/)
  assert.match(workflow, /az webapp deployment slot swap/)
  assert.match(workflow, /--target-slot production/)
})

test('App Service Bicep uses Key Vault references and health check path', () => {
  const bicep = readFileSync('infra/jm1-infra-006/app-service/main.bicep', 'utf8')
  assert.match(bicep, /@Microsoft\.KeyVault\(SecretUri=/)
  assert.match(bicep, /healthCheckPath: '\/api\/health'/)
  assert.match(bicep, /staging/)
})
