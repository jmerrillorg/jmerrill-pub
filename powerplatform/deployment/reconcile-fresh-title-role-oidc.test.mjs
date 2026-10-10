import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
const script = new URL('./reconcile-fresh-title-role-oidc.mjs', import.meta.url).pathname
test('wrong production identity fails before credential exchange', () => {
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8', env: {} })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /APPROVED_PRODUCTION_TOKEN_TARGET_MISMATCH/)
})
test('preexisting token cannot substitute another identity', () => {
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8', env: { DATAVERSE_ACCESS_TOKEN: 'fixture' } })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /PREEXISTING_TOKEN_NOT_PERMITTED/)
})
test('production readback uses the existing role normalizer and preserves target guards', () => {
  const w = readFileSync(new URL('../../.github/workflows/publishing-fresh-title-role-deploy.yml', import.meta.url), 'utf8')
  assert.ok(w.includes('node powerplatform/deployment/reconcile-fresh-title-role-oidc.mjs'))
  assert.ok(!w.includes('auth token'))
  assert.ok(w.indexOf('verify-fresh-title-release-binding.mjs') < w.indexOf('Authenticate with GitHub OIDC'))
  assert.ok(w.includes('environment: jm1-power-platform-production'))
  const wrapper = readFileSync(script, 'utf8')
  assert.ok(wrapper.includes("await import('../../scripts/reconcile-fresh-title-role.mjs')"))
  assert.ok(wrapper.includes('delete process.env.DATAVERSE_ACCESS_TOKEN'))
})
