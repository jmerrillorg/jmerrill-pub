import { execFileSync } from 'node:child_process'

const environmentUrl = 'https://org52409ff2.crm.dynamics.com'
const expectedOrganizationId = '579864ae-44cc-f011-95c7-000d3a37fe06'
const businessUnitId = 'bada8118-d0c5-f011-bbd2-000d3a307e8c'
const roleId = 'a3fc4c02-7d09-4ca1-8e32-2090ad209dc2'
const roleName = 'JMP Fresh Title Commissioning Runtime'
const solutionName = 'JMP_PublishingV2_Phase6_Portable'
const solutionVersion = '1.2.0.2'
const allowedPrivileges = [
  'prvCreatejmpv2_LifecycleInstance',
  'prvCreatejmpv2_PublishingEngagement',
  'prvCreatejmpv2_StageInstance',
  'prvReadjmpv2_LifecycleInstance',
  'prvReadjmpv2_PublishingEngagement',
  'prvReadjmpv2_StageDefinition',
  'prvReadjmpv2_StageInstance',
]
const token = execFileSync('az', [
  'account', 'get-access-token', '--resource', environmentUrl, '--query', 'accessToken', '-o', 'tsv',
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
const base = `${environmentUrl}/api/data/v9.2`
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'OData-Version': '4.0',
  'OData-MaxVersion': '4.0',
}

async function request(path, options = {}) {
  const response = await fetch(`${base}/${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path} ${response.status}: ${text.slice(0, 600)}`)
  return text ? JSON.parse(text) : {}
}

async function main() {
  const who = await request('WhoAmI()')
  if (who.OrganizationId !== expectedOrganizationId) throw new Error('Refusing unexpected authoring organization')

  const businessUnit = await request(`businessunits(${businessUnitId})?$select=businessunitid,name,_parentbusinessunitid_value`)
  if (businessUnit._parentbusinessunitid_value) throw new Error('Authoring business unit is not the environment root')

  const existingRole = await request(`roles(${roleId})?$select=roleid,name,_businessunitid_value`).catch(() => null)
  if (existingRole && (existingRole.name !== roleName || existingRole._businessunitid_value !== businessUnitId)) {
    throw new Error('Role ID is already bound to a different identity or business unit')
  }
  if (!existingRole) {
    await request('roles', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        roleid: roleId,
        name: roleName,
        'businessunitid@odata.bind': `/businessunits(${businessUnitId})`,
        isautoassigned: 0,
      }),
    })
  }

  const assignmentReadback = await request(`roles(${roleId})?$select=roleid&$expand=systemuserroles_association($select=systemuserid)`)
  if (assignmentReadback.systemuserroles_association.length) throw new Error('Refusing to replace privileges on an assigned role')

  const privileges = []
  for (const name of allowedPrivileges) {
    const rows = await request(`privileges?$select=privilegeid,name&$filter=name eq '${name}'`)
    if (rows.value.length !== 1) throw new Error(`Privilege lookup was not unique: ${name}`)
    privileges.push({ PrivilegeId: rows.value[0].privilegeid, Depth: '0', BusinessUnitId: businessUnitId })
  }

  const readRolePrivileges = async () => request(`roleprivilegescollection?$select=privilegeid,privilegedepthmask&$filter=roleid eq ${roleId}`)
  let rolePrivileges = await readRolePrivileges()
  const current = []
  for (const row of rolePrivileges.value) {
    const privilege = await request(`privileges(${row.privilegeid})?$select=name`)
    current.push({ name: privilege.name, depthMask: row.privilegedepthmask })
  }
  for (const row of rolePrivileges.value) {
    const privilege = await request(`privileges(${row.privilegeid})?$select=name`)
    if (!allowedPrivileges.includes(privilege.name)) {
      await request(`roles(${roleId})/Microsoft.Dynamics.CRM.RemovePrivilegeRole`, {
        method: 'POST',
        body: JSON.stringify({
          Privilege: {
            '@odata.type': 'Microsoft.Dynamics.CRM.privilege',
            privilegeid: row.privilegeid,
          },
        }),
      })
    }
  }
  rolePrivileges = await readRolePrivileges()
  const currentIds = new Set(rolePrivileges.value.map(({ privilegeid }) => privilegeid.toLowerCase()))
  const missingPrivileges = privileges.filter(({ PrivilegeId }) => !currentIds.has(PrivilegeId.toLowerCase()))
  if (missingPrivileges.length) {
    await request(`roles(${roleId})/Microsoft.Dynamics.CRM.AddPrivilegesRole`, {
      method: 'POST',
      body: JSON.stringify({ Privileges: missingPrivileges }),
    })
    rolePrivileges = await readRolePrivileges()
  }

  const effective = []
  for (const row of rolePrivileges.value) {
    const privilege = await request(`privileges(${row.privilegeid})?$select=name`)
    effective.push({ name: privilege.name, depthMask: row.privilegedepthmask })
  }
  const actualNames = effective.map(({ name }) => name).sort()
  if (JSON.stringify(actualNames) !== JSON.stringify([...allowedPrivileges].sort()) || effective.some(({ depthMask }) => depthMask !== 1)) {
    throw new Error(`Effective role did not match the exact Basic-only contract: ${JSON.stringify(effective)}`)
  }

  const solutionRows = await request(`solutions?$select=solutionid,version&$filter=uniquename eq '${solutionName}'`)
  const solution = solutionRows.value[0]
  if (!solution || !['1.2.0.1', solutionVersion].includes(solution.version)) throw new Error('Owning solution/version precondition failed')
  const components = await request(`solutioncomponents?$select=solutioncomponentid&$filter=objectid eq ${roleId} and _solutionid_value eq ${solution.solutionid}`)
  if (!components.value.length) {
    await request('AddSolutionComponent', {
      method: 'POST',
      body: JSON.stringify({
        ComponentId: roleId,
        ComponentType: 20,
        SolutionUniqueName: solutionName,
        AddRequiredComponents: false,
        DoNotIncludeSubcomponents: false,
        IncludedComponentSettingsValues: null,
      }),
    })
  }
  if (solution.version !== solutionVersion) {
    await request(`solutions(${solution.solutionid})`, { method: 'PATCH', body: JSON.stringify({ version: solutionVersion }) })
  }

  console.log(JSON.stringify({
    status: 'PASS',
    environmentUrl,
    organizationId: who.OrganizationId,
    roleId,
    roleName,
    businessUnitId,
    privilegeCount: effective.length,
    privileges: effective,
    solutionName,
    solutionVersion,
    assignedToRuntime: false,
  }, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
