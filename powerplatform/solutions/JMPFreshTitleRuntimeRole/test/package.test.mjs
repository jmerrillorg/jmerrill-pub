import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { expectedPrivileges, planRoleNormalization, roleIdentity } from '../../../../scripts/fresh-title-role-policy.mjs'

const require = createRequire(import.meta.url)
const { DOMParser } = require('../../../../azure-functions/diagnostic-ai-runner/node_modules/@xmldom/xmldom')
const parse = xml => new DOMParser().parseFromString(xml, 'application/xml')
const source = new URL('../src/', import.meta.url)
const manifest = readFileSync(new URL('Other/Solution.xml', source), 'utf8')
const role = readFileSync(new URL('Roles/JMP Fresh Title Commissioning Runtime.xml', source), 'utf8')
const customizations = readFileSync(new URL('Other/Customizations.xml', source), 'utf8')

function validate(solutionXml, customizationXml) {
  const solution = parse(solutionXml)
  const roots = Array.from(solution.getElementsByTagName('RootComponent'))
  assert.equal(roots.length, 1)
  assert.equal(roots[0].getAttribute('type'), '20')
  assert.equal(roots[0].getAttribute('id').replace(/[{}]/g, '').toLowerCase(), roleIdentity.id)
  assert.equal(solution.getElementsByTagName('Managed')[0].textContent, '1')
  assert.equal(solution.getElementsByTagName('UniqueName')[0].textContent, 'JMP_FreshTitleRuntimeRole')
  const document = parse(customizationXml)
  assert.equal(document.getElementsByTagName('Entity').length, 0)
  assert.equal(document.getElementsByTagName('PluginAssembly').length, 0)
  assert.equal(document.getElementsByTagName('SdkMessageProcessingStep').length, 0)
  const roles = Array.from(document.getElementsByTagName('Role'))
  assert.equal(roles.length, 1)
  assert.equal(roles[0].getAttribute('id').replace(/[{}]/g, '').toLowerCase(), roleIdentity.id)
  const privileges = Array.from(roles[0].getElementsByTagName('RolePrivilege')).map(p => ({ name: p.getAttribute('name'), depthMask: p.getAttribute('level') === 'Basic' ? 1 : 8 }))
  assert.equal(privileges.length, expectedPrivileges.size)
  assert.deepEqual(planRoleNormalization({ assignedUserCount: 0, privileges }), { remove: [] })
}

test('candidate retains exact original role bytes and publisher, with no original solution edit', () => {
  assert.equal(role, readFileSync(new URL('../../JMPPublishingV2Phase6/src/Roles/JMP Fresh Title Commissioning Runtime.xml', import.meta.url), 'utf8'))
  const original = parse(readFileSync(new URL('../../JMPPublishingV2Phase6/src/Other/Solution.xml', import.meta.url), 'utf8'))
  assert.equal(parse(manifest).getElementsByTagName('Publisher')[0].toString(), original.getElementsByTagName('Publisher')[0].toString())
})
test('source contains only one role and seven Basic privileges', () => {
  validate(manifest, customizations.replace('<Roles />', `<Roles>${role.replace(/<\?xml[^?]*\?>/, '')}</Roles>`))
})
test('rejects an unrelated plugin root', () => {
  assert.throws(() => validate(manifest.replace('</RootComponents>', '<RootComponent type="91" /></RootComponents>'), customizations))
})
test('rejects an unexpected role privilege', () => {
  assert.throws(() => validate(manifest, `<ImportExportXml>${role.replace('</RolePrivileges>', '<RolePrivilege name="prvWriteRole" level="Local" /></RolePrivileges>')}</ImportExportXml>`))
})
test('rejects a role-ID replacement', () => {
  assert.throws(() => validate(manifest.replaceAll('A3FC4C02', 'B3FC4C02'), customizations))
})
test('PAC managed candidate contains only XML and passes the same component contract', { skip: !process.env.CANDIDATE_ZIP }, () => {
  const zip = process.env.CANDIDATE_ZIP
  const entries = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n').sort()
  assert.deepEqual(entries, ['[Content_Types].xml', 'customizations.xml', 'solution.xml'])
  validate(execFileSync('unzip', ['-p', zip, 'solution.xml'], { encoding: 'utf8' }), execFileSync('unzip', ['-p', zip, 'customizations.xml'], { encoding: 'utf8' }))
})
