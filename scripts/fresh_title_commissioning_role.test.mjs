import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const root = 'powerplatform/solutions/JMPPublishingV2Phase6/src'
const roleId = 'A3FC4C02-7D09-4CA1-8E32-2090AD209DC2'
const role = readFileSync(`${root}/Roles/JMP Fresh Title Commissioning Runtime.xml`, 'utf8')
const solution = readFileSync(`${root}/Other/Solution.xml`, 'utf8')
const customizations = readFileSync(`${root}/Other/Customizations.xml`, 'utf8')
const expected = [
  'prvCreatejmpv2_LifecycleInstance',
  'prvCreatejmpv2_PublishingEngagement',
  'prvCreatejmpv2_StageInstance',
  'prvReadjmpv2_LifecycleInstance',
  'prvReadjmpv2_PublishingEngagement',
  'prvReadjmpv2_StageDefinition',
  'prvReadjmpv2_StageInstance',
].sort()

test('fresh title role has only the seven contract privileges at Basic depth', () => {
  const grants = [...role.matchAll(/<RolePrivilege name="([^"]+)" level="([^"]+)" \/>/g)]
    .map(([, name, level]) => ({ name, level }))
  assert.deepEqual(grants.map(({ name }) => name).sort(), expected)
  assert.ok(grants.every(({ level }) => level === 'Basic'))
  assert.match(role, new RegExp(`id="\\{${roleId}\\}"`))
  assert.match(solution, new RegExp(`<RootComponent type="20" id="\\{${roleId}\\}"`))
  assert.match(customizations, /<Roles \/>/)
  assert.match(solution, /<Version>1\.2\.0\.2<\/Version>/)
})
