import { writeFileSync } from 'node:fs'
import { expectedPrivileges, planRoleNormalization, roleIdentity } from './fresh-title-role-policy.mjs'

const targets = new Map([
  ['https://jm1test.crm.dynamics.com', 'bb7a9d9e-8e73-f111-b27b-000d3a31ff17'],
  ['https://jm1hq.crm.dynamics.com', '9dafb403-b493-f011-a700-000d3a106f37'],
])
const environmentUrl = process.env.DATAVERSE_ENVIRONMENT_URL?.replace(/\/$/, '')
const expectedOrganizationId = process.env.EXPECTED_ORGANIZATION_ID?.toLowerCase()
const token = process.env.DATAVERSE_ACCESS_TOKEN
const evidencePath = process.env.FRESH_TITLE_ROLE_EVIDENCE
if (!environmentUrl || targets.get(environmentUrl) !== expectedOrganizationId || !token || !evidencePath) {
  throw new Error('TARGET_TOKEN_OR_EVIDENCE_CONFIGURATION_INVALID')
}

const base = `${environmentUrl}/api/data/v9.2`
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'OData-Version': '4.0',
  'OData-MaxVersion': '4.0',
}
const evidence = {
  schemaVersion: 1,
  environmentUrl,
  expectedOrganizationId,
  roleId: roleIdentity.id,
  roleName: roleIdentity.name,
  status: 'IN_PROGRESS',
}

async function request(path, options = {}) {
  const response = await fetch(`${base}/${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path} ${response.status}: ${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : {}
}

async function readLiveRole() {
  const who = await request('WhoAmI()')
  if (who.OrganizationId.toLowerCase() !== expectedOrganizationId) throw new Error('WHOAMI_ORGANIZATION_MISMATCH')

  const role = await request(`roles(${roleIdentity.id})?$select=roleid,name,_businessunitid_value&$expand=systemuserroles_association($select=systemuserid)`)
  if (role.name !== roleIdentity.name) throw new Error('ROLE_IDENTITY_MISMATCH')
  const businessUnit = await request(`businessunits(${role._businessunitid_value})?$select=businessunitid,name,_parentbusinessunitid_value`)
  if (businessUnit._parentbusinessunitid_value) throw new Error('ROLE_NOT_IN_ROOT_BUSINESS_UNIT')

  const rows = await request(`roleprivilegescollection?$select=privilegeid,privilegedepthmask&$filter=roleid eq ${roleIdentity.id}`)
  const privileges = []
  for (const row of rows.value) {
    const privilege = await request(`privileges(${row.privilegeid})?$select=name`)
    privileges.push({ id: row.privilegeid, name: privilege.name, depthMask: row.privilegedepthmask })
  }
  return {
    organizationId: who.OrganizationId,
    role,
    businessUnit: { id: businessUnit.businessunitid, name: businessUnit.name },
    privileges,
  }
}

function save() {
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 })
}

try {
  const before = await readLiveRole()
  const assignedUserCount = before.role.systemuserroles_association.length
  evidence.before = {
    businessUnit: before.businessUnit,
    assignedUserCount,
    privileges: before.privileges.map(({ id, name, depthMask }) => ({ id, name, depthMask })),
  }
  save()

  const plan = planRoleNormalization({ assignedUserCount, privileges: before.privileges })
  evidence.removedKnownImportDefaults = []
  for (const privilege of plan.remove) {
    await request(`roles(${roleIdentity.id})/Microsoft.Dynamics.CRM.RemovePrivilegeRole`, {
      method: 'POST',
      body: JSON.stringify({
        Privilege: {
          '@odata.type': 'Microsoft.Dynamics.CRM.privilege',
          privilegeid: privilege.id,
        },
      }),
    })
    evidence.removedKnownImportDefaults.push({ id: privilege.id, name: privilege.name, depthMask: privilege.depthMask })
    save()
  }

  const after = await readLiveRole()
  const afterAssignmentCount = after.role.systemuserroles_association.length
  const finalPlan = planRoleNormalization({ assignedUserCount: afterAssignmentCount, privileges: after.privileges })
  if (finalPlan.remove.length) throw new Error('ROLE_STILL_HAS_EXTRA_PRIVILEGES_AFTER_NORMALIZATION')
  evidence.after = {
    businessUnit: after.businessUnit,
    assignedUserCount: afterAssignmentCount,
    privileges: after.privileges.map(({ id, name, depthMask }) => ({ id, name, depthMask })),
  }
  if (after.privileges.length !== expectedPrivileges.size) throw new Error('FINAL_PRIVILEGE_COUNT_MISMATCH')
  evidence.status = 'PASS'
  evidence.completedAt = new Date().toISOString()
  save()
  console.log(JSON.stringify(evidence, null, 2))
} catch (error) {
  evidence.status = 'FAIL'
  evidence.error = error.message
  evidence.completedAt = new Date().toISOString()
  save()
  console.error(error.message)
  process.exitCode = 1
}
