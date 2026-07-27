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

test('App Service Bicep uses Key Vault references and health check path', () => {
  const bicep = readFileSync('infra/jm1-infra-006/app-service/main.bicep', 'utf8')
  assert.match(bicep, /@Microsoft\.KeyVault\(SecretUri=/)
  assert.match(bicep, /healthCheckPath: '\/api\/health'/)
  assert.match(bicep, /staging/)
})
