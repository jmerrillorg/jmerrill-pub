export const roleIdentity = {
  id: 'a3fc4c02-7d09-4ca1-8e32-2090ad209dc2',
  name: 'JMP Fresh Title Commissioning Runtime',
}

export const expectedPrivileges = new Map([
  ['prvCreatejmpv2_LifecycleInstance', 1],
  ['prvCreatejmpv2_PublishingEngagement', 1],
  ['prvCreatejmpv2_StageInstance', 1],
  ['prvReadjmpv2_LifecycleInstance', 1],
  ['prvReadjmpv2_PublishingEngagement', 1],
  ['prvReadjmpv2_StageDefinition', 1],
  ['prvReadjmpv2_StageInstance', 1],
])

export const knownImportDefaults = new Map([
  ['prvCreateSharePointData', 8],
  ['prvReadSharePointData', 8],
  ['prvReadSharePointDocument', 8],
  ['prvWriteSharePointData', 8],
])

export function planRoleNormalization({ assignedUserCount, privileges }) {
  if (assignedUserCount !== 0) throw new Error('ROLE_ALREADY_ASSIGNED')

  const seen = new Set()
  const remove = []
  for (const privilege of privileges) {
    if (seen.has(privilege.name)) throw new Error(`DUPLICATE_PRIVILEGE:${privilege.name}`)
    seen.add(privilege.name)

    if (expectedPrivileges.has(privilege.name)) {
      if (privilege.depthMask !== expectedPrivileges.get(privilege.name)) {
        throw new Error(`EXPECTED_PRIVILEGE_WRONG_DEPTH:${privilege.name}:${privilege.depthMask}`)
      }
      continue
    }

    if (knownImportDefaults.get(privilege.name) !== privilege.depthMask) {
      throw new Error(`UNEXPECTED_PRIVILEGE:${privilege.name}:${privilege.depthMask}`)
    }
    remove.push(privilege)
  }

  for (const name of expectedPrivileges.keys()) {
    if (!seen.has(name)) throw new Error(`EXPECTED_PRIVILEGE_MISSING:${name}`)
  }
  return { remove }
}
