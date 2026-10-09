import { getDataverseRuntimeAccessToken } from '@/lib/server/publisher-runtime-auth'

// Verified jm1hq entity privilege; this check never creates an intake or reads an inquiry.
const INTAKE_CREATE_PRIVILEGE = 'f11ad032-3f79-44af-80aa-dc14c182ed57'
type Result = { status: 'ready' | 'degraded'; notes: string[] }
let cached: { expires: number; result: Result } | undefined

export async function intakeAuthorityHealth(): Promise<Result> {
  if (cached && cached.expires > Date.now()) return cached.result
  const base = process.env.DATAVERSE_WEB_API_BASE_URL?.replace(/\/$/, '')
  const resource = process.env.DATAVERSE_RESOURCE_URL
  if (!base || !resource) return { status: 'degraded', notes: ['intake_authority_configuration_missing'] }
  let result: Result
  try {
    result = await readIntakeCreateAuthority(base, await getDataverseRuntimeAccessToken(resource))
  } catch {
    result = { status: 'degraded', notes: ['intake_authority_readback_failed'] }
  }
  cached = { expires: Date.now() + 60000, result }
  return result
}

export async function readIntakeCreateAuthority(base: string, token: string, request: typeof fetch = fetch): Promise<Result> {
  const options = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(3000) }
  const identity = await request(`${base}/WhoAmI`, options)
  if (!identity.ok) return { status: 'degraded', notes: ['intake_authority_identity_read_failed'] }
  const body = await identity.json() as { UserId?: unknown }
  if (typeof body.UserId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.UserId)) {
    return { status: 'degraded', notes: ['intake_authority_identity_invalid'] }
  }
  const privileges = await request(`${base}/systemusers(${body.UserId})/Microsoft.Dynamics.CRM.RetrieveUserPrivileges`, {
    ...options, signal: AbortSignal.timeout(3000),
  })
  if (!privileges.ok) return { status: 'degraded', notes: ['intake_authority_privilege_read_failed'] }
  const readback = await privileges.json() as { RolePrivileges?: { PrivilegeId?: string }[] }
  const canCreate = Array.isArray(readback.RolePrivileges) && readback.RolePrivileges.some(row => row.PrivilegeId?.toLowerCase() === INTAKE_CREATE_PRIVILEGE)
  return { status: canCreate ? 'ready' : 'degraded', notes: [canCreate ? 'intake_create_authority_verified' : 'intake_create_authority_missing'] }
}
