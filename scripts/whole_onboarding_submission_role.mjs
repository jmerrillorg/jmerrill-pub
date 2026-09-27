import { execFileSync } from 'node:child_process'

const apply = process.argv.includes('--apply')
const initializeRoleId = process.argv.find(x => x.startsWith('--initialize-role='))?.split('=')[1]
const az = args => execFileSync('/Volumes/UsersExternal/JM1-PRIME/tooling/bin/az', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
const userId = 'e0e307e1-2fb0-f111-aaac-000d3a14673b'
const principalId = 'ce363f5a-94f3-4ea9-9ba3-061404fca098'
const roleName = 'JMP Author Onboarding Submission Capture'
const allowed = new Map([
  ['prvReadjm1pub_Submission', 'Local'],
  ['prvCreatejm1pub_Submission', 'Basic'],
  ['prvWritejm1pub_Submission', 'Basic'],
  ['prvAppendjm1pub_Submission', 'Basic'],
])
const settings = Object.fromEntries(JSON.parse(az(['webapp', 'config', 'appsettings', 'list', '-g', 'rg-jm1-web-prod-premium', '-n', 'app-jm1-pub-prod-v2', '-o', 'json'])).map(x => [x.name, x.value]))
const identity = JSON.parse(az(['webapp', 'identity', 'show', '-g', 'rg-jm1-web-prod-premium', '-n', 'app-jm1-pub-prod-v2', '-o', 'json']))
if (identity.principalId !== principalId) throw new Error('WEB_RUNTIME_IDENTITY_CHANGED')
const token = az(['account', 'get-access-token', '--resource', settings.DATAVERSE_RESOURCE_URL, '--query', 'accessToken', '-o', 'tsv'])
const base = settings.DATAVERSE_WEB_API_BASE_URL.replace(/\/$/, '')
async function call(path, method = 'GET', body) {
  const response = await fetch(`${base}/${path}`, { method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    ...(body ? { body: JSON.stringify(body) } : {}) })
  if (!response.ok) throw new Error(`DATAVERSE_${method}_${response.status}`)
  return response.status === 204 ? null : response.json()
}
const user = await call(`systemusers(${userId})?$select=systemuserid,azureactivedirectoryobjectid,_businessunitid_value`)
if (user.azureactivedirectoryobjectid !== principalId) throw new Error('DATAVERSE_RUNTIME_IDENTITY_CHANGED')
const roles = await call(`roles?${new URLSearchParams({ $filter: `name eq '${roleName}' and _businessunitid_value eq ${user._businessunitid_value}`, $select: 'roleid,name' })}`)
if (roles.value.length > 1) throw new Error('ROLE_IDENTITY_AMBIGUOUS')
let role = roles.value[0]
if (!role && apply) role = await call('roles', 'POST', { name: roleName, 'businessunitid@odata.bind': `/businessunits(${user._businessunitid_value})` })
const privileges = await call(`privileges?${new URLSearchParams({ $filter: "contains(name,'jm1pub_Submission')", $select: 'privilegeid,name' })}`)
const desired = [...allowed].map(([name, Depth]) => {
  const matches = privileges.value.filter(x => x.name === name)
  if (matches.length !== 1) throw new Error('SUBMISSION_PRIVILEGE_UNPROVEN')
  return { PrivilegeId: matches[0].privilegeid, Depth, BusinessUnitId: user._businessunitid_value }
})
const current = role ? (await call(`RetrieveRolePrivilegesRole(RoleId=${role.roleid})`)).RolePrivileges : []
const userRoles = (await call(`systemusers(${userId})/systemuserroles_association?$select=roleid`)).value
const baseline = []
for (const assigned of userRoles.filter(x => x.roleid !== role?.roleid)) {
  baseline.push(...(await call(`RetrieveRolePrivilegesRole(RoleId=${assigned.roleid})`)).RolePrivileges)
}
const depths = { Basic: 0, Local: 1, Deep: 2, Global: 3 }
const existingAuthority = privilege => baseline.some(x => x.PrivilegeId === privilege.PrivilegeId && depths[x.Depth] >= depths[privilege.Depth])
const unrelated = current.some(x => allowed.has(x.PrivilegeName)
  ? allowed.get(x.PrivilegeName) !== x.Depth : !existingAuthority(x))
const missing = desired.filter(x => !current.some(y => y.PrivilegeId === x.PrivilegeId && y.Depth === x.Depth))
const users = role ? (await call(`roles(${role.roleid})/systemuserroles_association?$select=systemuserid`)).value : []
if (users.some(x => x.systemuserid !== userId)) throw new Error('ROLE_SHARED_OUTSIDE_WEB_RUNTIME')
if (unrelated) {
  if (!apply || role.roleid !== initializeRoleId || users.length) throw new Error('ROLE_HAS_UNRELATED_PRIVILEGES')
  // Dataverse supplies default privileges to a new role. Narrow it before assignment.
  await call(`roles(${role.roleid})/Microsoft.Dynamics.CRM.ReplacePrivilegesRole`, 'POST', { Privileges: desired })
}
if (apply && missing.length) await call(`roles(${role.roleid})/Microsoft.Dynamics.CRM.AddPrivilegesRole`, 'POST', { Privileges: missing })
const after = role ? (await call(`RetrieveRolePrivilegesRole(RoleId=${role.roleid})`)).RolePrivileges : []
if (apply && (desired.some(x => !after.some(y => y.PrivilegeId === x.PrivilegeId && y.Depth === x.Depth)) ||
    after.some(x => allowed.has(x.PrivilegeName) ? allowed.get(x.PrivilegeName) !== x.Depth : !existingAuthority(x)))) throw new Error('ROLE_EXACT_SCOPE_READBACK_FAILED')
if (apply && !users.some(x => x.systemuserid === userId)) await call(`systemusers(${userId})/systemuserroles_association/$ref`, 'POST', { '@odata.id': `${base}/roles(${role.roleid})` })
console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'PLAN', principalId, userId, roleName, roleId: role?.roleid || null,
  privileges: after.map(x => ({ name: x.PrivilegeName, depth: x.Depth, alreadyHeld: existingAuthority(x) })), missingCount: missing.length,
  systemAdministratorAdded: false, sharedRolesModified: false }, null, 2))
