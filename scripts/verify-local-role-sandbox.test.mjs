import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
const id = '7d151c32-7534-4ef4-8b91-9e76f5a9fe45'
const names = ['prvCreatejmpv2_LifecycleInstance', 'prvCreatejmpv2_PublishingEngagement', 'prvCreatejmpv2_StageInstance', 'prvReadjmpv2_LifecycleInstance', 'prvReadjmpv2_PublishingEngagement', 'prvReadjmpv2_StageInstance', 'prvReadjmpv2_StageDefinition']
const solution = `<ImportExportXml><SolutionManifest><UniqueName>JMP_LocalRoleFixture_20261010</UniqueName><Managed>1</Managed><RootComponents><RootComponent type="20" id="{${id}}"/></RootComponents></SolutionManifest></ImportExportXml>`
const custom = `<ImportExportXml><Roles><Role id="{${id}}"><RolePrivileges>${names.map(n => `<RolePrivilege name="${n}" level="Basic"/>`).join('')}</RolePrivileges></Role></Roles></ImportExportXml>`
function validate(s, c) {
  const dir = mkdtempSync(join(tmpdir(), 'jmp-role-test-'))
  try {
    writeFileSync(join(dir, 'fixture-solution.xml'), s)
    writeFileSync(join(dir, 'fixture-customizations.xml'), c)
    return spawnSync(process.execPath, [new URL('./verify-local-role-sandbox.mjs', import.meta.url).pathname, 'package'], { encoding: 'utf8', env: { ...process.env, SANDBOX_PACKAGE_DIRECTORY: dir } })
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
test('exact disposable role accepted', () => assert.equal(validate(solution, custom).status, 0))
test('other component rejected', () => assert.notEqual(validate(solution.replace('</RootComponents>', '<RootComponent type="1" id="{x}"/></RootComponents>'), custom).status, 0))
test('other role rejected', () => assert.notEqual(validate(solution, custom.replace(id, 'different')).status, 0))
test('broader depth rejected', () => assert.notEqual(validate(solution, custom.replace('Basic', 'Global')).status, 0))
test('duplicate privilege rejected', () => assert.notEqual(validate(solution, custom.replace(names[6], names[0])).status, 0))
test('entity declaration rejected', () => assert.notEqual(validate('<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]>' + solution, custom).status, 0))
test('unmanaged package rejected', () => assert.notEqual(validate(solution.replace('<Managed>1', '<Managed>0'), custom).status, 0))
test('workflow remains sandbox-only and immutable fixture pinned', () => {
  const w = readFileSync(new URL('../.github/workflows/publishing-fresh-title-role-deploy.yml', import.meta.url), 'utf8')
  assert.ok(w.includes("if: github.ref == 'refs/heads/codex/fresh-role-sandbox-acceptance'"))
  assert.ok(w.includes('b4819aefaea7394239562fa33b8e3afb399cc32564964c5a7aaf64c4cb7740a0'))
  assert.ok(!w.includes('jm1hq.crm.dynamics.com'))
  assert.ok(!w.includes('environment: jm1-power-platform-production'))
  assert.ok(!w.includes('--publish-changes'))
})
