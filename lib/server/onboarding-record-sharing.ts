import { createHash } from 'node:crypto'
import { decode } from '../../azure-functions/diagnostic-ai-runner/src/lifecycle/onboardingPayloadCodec'
import { CONTACT, TITLES } from '../../azure-functions/diagnostic-ai-runner/src/lifecycle/jackieInternalTitlePolicy'

export const ONBOARDING_PROCESSOR_USER = 'cb6e97e5-1d6a-f111-a826-000d3a9eacee'
export const ONBOARDING_PROCESSOR_PRINCIPAL = 'e8c51a80-bdb0-46fa-b398-9109719d6427'
export const ONBOARDING_WEBSITE_USER = 'e0e307e1-2fb0-f111-aaac-000d3a14673b'
const ORGANIZATION = '9dafb403-b493-f011-a700-000d3a106f37'
type Request = (path: string, method?: 'GET' | 'POST', body?: unknown) => Promise<any>
type Result = { status: 'READY' | 'HELD'; code: string; granted: boolean }
const deny = (code: string): never => { throw Object.assign(new Error(code), { sharingCode: code }) }
const fingerprint = (value: string) => createHash('sha256').update(value).digest('hex')
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]))
  return value
}

// Sharing is deliberately limited to the existing funded five-title owner lane.
// A later author cohort needs its own governed admission, not an expanded caller ID.
export async function ensureOnboardingProcessorRead(input: {
  submissionId: string; payload: Record<string, any>; enabled: boolean; request: Request
}): Promise<Result> {
  if (!input.enabled) return { status: 'HELD', code: 'PROCESSOR_SHARING_DISABLED', granted: false }
  let granted = false
  try {
    const { submissionId: id, payload, request } = input, a = payload.governedAuthority
    if (!/^[a-f0-9-]{36}$/.test(id) || a?.contactId !== CONTACT || !Object.hasOwn(TITLES, a?.titleId || '') ||
      a.policyVersion !== 'PUBLISHER_FUNDED_ONBOARDING_V1' || !/^[a-f0-9]{64}$/.test(a.agreementSha256 || '')) deny('PROCESSOR_SHARING_SCOPE_DENIED')
    const who = await request('WhoAmI()')
    if (who.UserId !== ONBOARDING_WEBSITE_USER || who.OrganizationId !== ORGANIZATION) deny('PROCESSOR_SHARING_OWNER_IDENTITY_CONFLICT')
    const recipient = await request(`systemusers(${ONBOARDING_PROCESSOR_USER})?$select=systemuserid,azureactivedirectoryobjectid,isdisabled`)
    if (recipient.systemuserid !== ONBOARDING_PROCESSOR_USER || recipient.azureactivedirectoryobjectid !== ONBOARDING_PROCESSOR_PRINCIPAL || recipient.isdisabled !== false) deny('PROCESSOR_SHARING_RECIPIENT_CONFLICT')
    const path = `jm1pub_submissions(${id})?$select=jm1pub_submissionid,_ownerid_value,_createdby_value,_jm1pub_linkedcontact_value,jm1pub_formtype,jm1pub_rawpayload`
    const row = await request(path)
    if (row.jm1pub_submissionid !== id || row._ownerid_value !== ONBOARDING_WEBSITE_USER ||
      row._createdby_value !== ONBOARDING_WEBSITE_USER || row._jm1pub_linkedcontact_value !== CONTACT ||
      row.jm1pub_formtype !== 'author-onboarding-attempt' || !row['@odata.etag'] ||
      JSON.stringify(canonical(decode(row.jm1pub_rawpayload))) !== JSON.stringify(canonical(payload))) deny('PROCESSOR_SHARING_RECORD_CONFLICT')
    const accessPath = `systemusers(${ONBOARDING_PROCESSOR_USER})/Microsoft.Dynamics.CRM.RetrievePrincipalAccess(Target=@p1)?` +
      new URLSearchParams({ '@p1': JSON.stringify({ '@odata.id': `jm1pub_submissions(${id})` }) })
    const access = await request(accessPath)
    if (!['None', 'ReadAccess'].includes(access.AccessRights)) deny('PROCESSOR_SHARING_EXCESS_ACCESS')
    if (access.AccessRights === 'None') {
      const privileges = await request(`systemusers(${ONBOARDING_WEBSITE_USER})/Microsoft.Dynamics.CRM.RetrieveUserPrivilegeByPrivilegeName(PrivilegeName='prvSharejm1pub_Submission',ExcludeTeamBasic=false)`)
      if (!privileges.RolePrivileges?.length) deny('PROCESSOR_SHARING_BASIC_SHARE_REQUIRED')
      if (privileges.RolePrivileges.some((p: any) => p.Depth !== 'Basic')) deny('PROCESSOR_SHARING_PRIVILEGE_SCOPE_CONFLICT')
      const relations = await request("EntityDefinitions(LogicalName='jm1pub_submission')/OneToManyRelationships?$select=SchemaName,CascadeConfiguration")
      if (!Array.isArray(relations.value) || relations['@odata.nextLink'] || relations.value.some((r: any) => r.CascadeConfiguration?.Share !== 'NoCascade')) deny('PROCESSOR_SHARING_CASCADE_SCOPE_UNPROVEN')
      await request('GrantAccess', 'POST', {
        Target: { '@odata.type': 'Microsoft.Dynamics.CRM.jm1pub_submission', jm1pub_submissionid: id },
        PrincipalAccess: { Principal: { '@odata.type': 'Microsoft.Dynamics.CRM.systemuser', systemuserid: ONBOARDING_PROCESSOR_USER }, AccessMask: 'ReadAccess' },
      })
      granted = true
    }
    if ((await request(accessPath)).AccessRights !== 'ReadAccess') deny('PROCESSOR_SHARING_READBACK_FAILED')
    const after = await request(path)
    if (after._ownerid_value !== row._ownerid_value || after['@odata.etag'] !== row['@odata.etag'] ||
      fingerprint(after.jm1pub_rawpayload) !== fingerprint(row.jm1pub_rawpayload)) deny('PROCESSOR_SHARING_RECORD_CHANGED')
    return { status: 'READY', code: 'EXACT_RECORD_READ_VERIFIED', granted }
  } catch (error) {
    const code = (error as { sharingCode?: string }).sharingCode
    return { status: 'HELD', code: code?.startsWith('PROCESSOR_SHARING_') ? code : 'PROCESSOR_SHARING_DEPENDENCY_FAILED', granted }
  }
}
