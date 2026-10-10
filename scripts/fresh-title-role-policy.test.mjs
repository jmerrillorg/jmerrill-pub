import test from 'node:test'
import assert from 'node:assert/strict'
import { expectedPrivileges, knownImportDefaults, planRoleNormalization } from './fresh-title-role-policy.mjs'

const exact = [...expectedPrivileges].map(([name, depthMask]) => ({ name, depthMask }))
const importDefaults = [...knownImportDefaults].map(([name, depthMask]) => ({ name, depthMask }))

test('accepts an exact unassigned role without changes', () => {
  assert.deepEqual(planRoleNormalization({ assignedUserCount: 0, privileges: exact }), { remove: [] })
})

test('plans removal only for the four known import-time SharePoint defaults', () => {
  assert.deepEqual(planRoleNormalization({ assignedUserCount: 0, privileges: [...exact, ...importDefaults] }).remove, importDefaults)
})

test('fails closed on an assigned role', () => {
  assert.throws(() => planRoleNormalization({ assignedUserCount: 1, privileges: [...exact, ...importDefaults] }), /ROLE_ALREADY_ASSIGNED/)
})

test('fails closed on an unknown privilege or depth', () => {
  assert.throws(() => planRoleNormalization({ assignedUserCount: 0, privileges: [...exact, { name: 'prvDeleteAccount', depthMask: 8 }] }), /UNEXPECTED_PRIVILEGE/)
  assert.throws(() => planRoleNormalization({ assignedUserCount: 0, privileges: [...exact, { name: 'prvWriteSharePointData', depthMask: 1 }] }), /UNEXPECTED_PRIVILEGE/)
})

test('fails closed on incorrect depth or missing expected privilege', () => {
  assert.throws(() => planRoleNormalization({ assignedUserCount: 0, privileges: exact.map((p, i) => i ? p : { ...p, depthMask: 8 }) }), /EXPECTED_PRIVILEGE_WRONG_DEPTH/)
  assert.throws(() => planRoleNormalization({ assignedUserCount: 0, privileges: exact.slice(1) }), /EXPECTED_PRIVILEGE_MISSING/)
})
