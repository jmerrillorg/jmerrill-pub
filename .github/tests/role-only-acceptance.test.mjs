import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workflow = readFileSync(new URL('../workflows/publishing-fresh-title-role-deploy.yml', import.meta.url), 'utf8')
const adapter = readFileSync(new URL('../../powerplatform/deployment/accept-role-only-sandbox.mjs', import.meta.url), 'utf8')
test('acceptance uses existing staging federation, never production target', () => {
  assert.match(workflow, /environment: jmerrill-pub-staging/)
  assert.match(workflow, /97891ed1-6623-487c-b890-633bea440e22/)
  assert.doesNotMatch(workflow + adapter, /jm1hq\.crm|solution delete|solution upgrade/)
})
test('one non-cancelling bounded import follows exact preflight', () => {
  assert.equal((workflow.match(/solution import/g) ?? []).length, 1)
  assert.match(workflow, /cancel-in-progress: false/)
  assert.match(workflow, /timeout-minutes: 20/)
  assert.ok(workflow.indexOf('Exact importer and isolated fixture preflight') < workflow.indexOf('solution import'))
})
test('native identity and Local privilege scope are checked', () => {
  assert.match(adapter, /user\.applicationid !== app/)
  assert.match(adapter, /who\.OrganizationId !== org/)
  assert.match(adapter, /p\.Depth !== 'Local'/)
})
test('existing roles are read and compared, not normalized', () => {
  assert.match(adapter, /PROTECTED_ROLE_CHANGED/)
  assert.equal((adapter.match(/RemovePrivilegeRole/g) ?? []).length, 1)
  assert.match(adapter, /roles\(\$\{role\}\)\/Microsoft/)
})
test('fixture hash is pinned and existing fixture rejects replay', () => {
  assert.match(adapter, /67d0778a6f4f05b0e9e1d17ba69170db093f96dbce27611f447b54fe883d0285/)
  assert.match(adapter, /FIXTURE_ROLE_ALREADY_EXISTS/)
  assert.match(adapter, /FIXTURE_SOLUTION_ALREADY_EXISTS/)
})
test('readbacks survive failure without bodies or mail/business actions', () => {
  assert.match(workflow, /if: always\(\)/)
  assert.match(adapter, /proof\.status = 'FAIL'/)
  assert.doesNotMatch(adapter, /sendMail|jmpv2_(PublishingEngagement|StageInstance)\).*POST|api\/title/)
})
