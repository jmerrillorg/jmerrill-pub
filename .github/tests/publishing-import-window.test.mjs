import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const workflow = readFileSync(new URL('../workflows/publishing-power-platform-solution-deploy.yml', import.meta.url), 'utf8')
const production = workflow.split('\n  production-import:\n')[1]
const name = 'Deny unrelated import during fresh-title release window'
const guard = production?.match(/      - name: Deny unrelated import during fresh-title release window\n([\s\S]*?)(?=\n      - name:)/)?.[1]
const body = guard?.split('        run: |\n')[1]?.split('\n').filter(line => line.startsWith('          ')).map(line => line.slice(10)).join('\n')

test('production lock is the first step and precedes credential acquisition', () => {
  assert.ok(guard && body)
  assert.match(production, new RegExp(`steps:\\s+- name: ${name}`))
  assert.ok(production.indexOf(name) < production.indexOf('Authenticate Power Platform with GitHub OIDC'))
  assert.ok(production.indexOf(name) < production.indexOf('Checkout Repository'))
  assert.ok(guard.includes('FRESH_TITLE_RELEASE_LOCK: ${{ vars.JMP_FRESH_TITLE_APPROVED_SOURCE_SHA }}'))
})

for (const lock of ['a'.repeat(40), 'invalid', ' ', '$(echo unsafe)']) {
  test(`nonempty lock denies import (${JSON.stringify(lock)})`, () => {
    const result = spawnSync('bash', ['-c', body], { env: { PATH: process.env.PATH, FRESH_TITLE_RELEASE_LOCK: lock }, encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stdout, /import is locked/)
    assert.doesNotMatch(result.stdout, /unsafe/)
  })
}

test('empty or absent lock leaves existing production approval checks intact', () => {
  for (const env of [{ PATH: process.env.PATH }, { PATH: process.env.PATH, FRESH_TITLE_RELEASE_LOCK: '' }]) {
    assert.equal(spawnSync('bash', ['-c', body], { env, encoding: 'utf8' }).status, 0)
  }
  assert.ok(production.includes("if: inputs.target_environment == 'production' && inputs.confirm == 'true'"))
  assert.ok(production.includes('test "${GITHUB_SHA}" = "${{ inputs.approved_source_sha }}"'))
})

test('validate-only job has no fresh-title lock or credentials', () => {
  const validation = workflow.split('\n  validate:\n')[1]?.split('\n  production-import:\n')[0]
  assert.ok(validation)
  assert.ok(validation.includes('Pack unmanaged validation artifact'))
  assert.ok(validation.includes('Preserve validation evidence'))
  assert.ok(!validation.includes('FRESH_TITLE_RELEASE_LOCK'))
  assert.ok(!validation.includes('JMP_FRESH_TITLE_APPROVED_SOURCE_SHA'))
  assert.ok(!validation.includes('auth create'))
  assert.ok(!validation.includes('environment: jm1-power-platform-production'))
})
